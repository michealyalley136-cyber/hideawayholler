import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { LeaseWorkflowStatus, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { savePrivateFile } from '../utils/storage';
import { generateSignedLeasePdf, resolvePrivateLeasePath } from '../services/leasePdf.service';
import { logAuditEvent } from '../services/audit.service';

function includeLeaseRelations() {
  return { season: true, user: { include: { profile: true } } };
}

function canAccessLease(req: AuthRequest, lease: { userId: string | null }) {
  return req.user!.role === UserRole.ADMIN || lease.userId === req.user!.userId;
}

function leaseDownloadName(title: string, fileName?: string | null) {
  const fallback = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
  return fileName || fallback;
}

async function updateResidentLeaseStatus(userId: string, seasonId: string | null | undefined, status: 'LEASE_SENT' | 'LEASE_SIGNED') {
  await prisma.residentProfile.update({ where: { userId }, data: { currentStatus: status } }).catch(() => undefined);
  if (seasonId) {
    await prisma.seasonResident.update({
      where: { userId_seasonId: { userId, seasonId } },
      data: { status },
    }).catch(() => undefined);
  }
}

async function backfillLegacyLeaseStatuses() {
  await prisma.lease.updateMany({
    where: { status: LeaseWorkflowStatus.DRAFT, userId: { not: null }, acknowledged: true },
    data: { status: LeaseWorkflowStatus.SIGNED_BY_RESIDENT },
  });
  await prisma.lease.updateMany({
    where: { status: LeaseWorkflowStatus.DRAFT, userId: { not: null }, acknowledged: false },
    data: { status: LeaseWorkflowStatus.PENDING_SIGNATURE },
  });
}

export async function listLeases(req: AuthRequest, res: Response) {
  await backfillLegacyLeaseStatuses();
  const where: Record<string, unknown> = {};
  if (req.user!.role !== UserRole.ADMIN) where.userId = req.user!.userId;
  if (req.query.seasonId) where.seasonId = req.query.seasonId;
  if (req.query.userId && req.user!.role === UserRole.ADMIN) where.userId = req.query.userId;

  const leases = await prisma.lease.findMany({
    where,
    include: includeLeaseRelations(),
    orderBy: { createdAt: 'desc' },
  });
  res.json({ leases });
}

function resolveLeaseId(req: AuthRequest) {
  const fromBody = (req.body as { leaseId?: string } | undefined)?.leaseId;
  return req.params.id || fromBody || String(req.query.leaseId || '');
}

export async function createLease(req: AuthRequest, res: Response) {
  const { userId, seasonId, title, sentAt, expiresAt, notes, status } = req.body;

  if (!String(title || '').trim()) {
    return res.status(400).json({ error: 'Lease title is required' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'Resident is required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Lease PDF is required' });
  }

  let filePath: string | undefined;
  let fileName: string | undefined;

  if (req.file) {
    const saved = savePrivateFile(fs.readFileSync(req.file.path), req.file.originalname, 'leases');
    filePath = saved.filePath;
    fileName = saved.fileName;
  }

  const assigned = Boolean(userId);
  const leaseStatus =
    status === LeaseWorkflowStatus.DRAFT
      ? LeaseWorkflowStatus.DRAFT
      : assigned
        ? LeaseWorkflowStatus.PENDING_SIGNATURE
        : LeaseWorkflowStatus.DRAFT;

  const lease = await prisma.lease.create({
    data: {
      userId: userId || undefined,
      seasonId: seasonId || undefined,
      title,
      filePath,
      fileName,
      status: leaseStatus,
      sentAt: assigned ? (sentAt ? new Date(sentAt) : new Date()) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes,
    },
    include: includeLeaseRelations(),
  });

  if (userId) await updateResidentLeaseStatus(userId, seasonId, 'LEASE_SENT');

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'LEASE_CREATED',
    entityType: 'Lease',
    entityId: lease.id,
    metadata: { userId, seasonId, status: lease.status },
  });

  res.status(201).json({ lease });
}

export async function signLease(req: AuthRequest, res: Response) {
  const leaseId = resolveLeaseId(req);
  if (!leaseId) return res.status(400).json({ error: 'Lease ID is required' });

  const { signatureData } = req.body as { signatureData?: string };
  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: includeLeaseRelations() });
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  if (lease.userId !== req.user!.userId) return res.status(403).json({ error: 'Forbidden' });
  if (lease.status === LeaseWorkflowStatus.COMPLETED || lease.status === LeaseWorkflowStatus.ARCHIVED) {
    return res.status(409).json({ error: 'Completed or archived leases cannot be altered' });
  }
  if (!signatureData) return res.status(400).json({ error: 'Signature is required' });

  const signedAt = new Date();
  const residentName = lease.user?.profile?.fullName || lease.user?.email || 'Resident';
  const signedPdf = await generateSignedLeasePdf({
    originalFilePath: lease.filePath,
    leaseTitle: lease.title,
    residentName,
    signatureData,
    signedAt,
  });

  const updated = await prisma.lease.update({
    where: { id: leaseId },
    data: {
      acknowledged: true,
      acknowledgedAt: signedAt,
      signedAt,
      signatureData,
      signatureIp: req.ip,
      signatureUserAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      signedFilePath: signedPdf.filePath,
      signedFileName: signedPdf.fileName,
      status: LeaseWorkflowStatus.SIGNED_BY_RESIDENT,
    },
    include: includeLeaseRelations(),
  });

  await updateResidentLeaseStatus(lease.userId!, lease.seasonId, 'LEASE_SIGNED');
  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'LEASE_SIGNED',
    entityType: 'Lease',
    entityId: lease.id,
    metadata: { signedAt },
  });

  res.json({ lease: updated });
}

export async function getLease(req: AuthRequest, res: Response) {
  const lease = await prisma.lease.findUnique({
    where: { id: req.params.id },
    include: includeLeaseRelations(),
  });
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  if (!canAccessLease(req, lease)) return res.status(403).json({ error: 'Forbidden' });
  res.json({ lease });
}

export async function leaseAction(req: AuthRequest, res: Response) {
  const { action, userId, seasonId } = req.body as { action?: string; userId?: string; seasonId?: string };
  const leaseId = resolveLeaseId(req);
  if (!leaseId) return res.status(400).json({ error: 'Lease ID is required' });
  if (!action) return res.status(400).json({ error: 'Lease action is required' });

  const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  if (lease.status === LeaseWorkflowStatus.COMPLETED && action !== 'ARCHIVE') {
    return res.status(409).json({ error: 'Completed leases cannot be altered' });
  }
  if (action === 'APPROVE' && lease.status !== LeaseWorkflowStatus.SIGNED_BY_RESIDENT) {
    return res.status(409).json({ error: 'Only resident-signed leases can be approved' });
  }
  if (action === 'ARCHIVE' && lease.status === LeaseWorkflowStatus.ARCHIVED) {
    return res.status(409).json({ error: 'Lease is already archived' });
  }

  const now = new Date();
  const data: Record<string, unknown> =
    action === 'ASSIGN'
      ? {
          userId: userId || lease.userId,
          seasonId: seasonId || lease.seasonId,
          status: LeaseWorkflowStatus.PENDING_SIGNATURE,
          sentAt: now,
        }
      : action === 'RESEND'
        ? { status: LeaseWorkflowStatus.PENDING_SIGNATURE, sentAt: now }
        : action === 'APPROVE'
          ? { status: LeaseWorkflowStatus.APPROVED_BY_ADMIN, approvedAt: now, approvedBy: req.user!.userId }
          : action === 'COMPLETE'
            ? { status: LeaseWorkflowStatus.COMPLETED, completedAt: now }
            : action === 'ARCHIVE'
              ? { status: LeaseWorkflowStatus.ARCHIVED, archivedAt: now }
              : {};

  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Unsupported lease action' });

  const updated = await prisma.lease.update({
    where: { id: lease.id },
    data,
    include: includeLeaseRelations(),
  });

  if (updated.userId && (action === 'ASSIGN' || action === 'RESEND')) {
    await updateResidentLeaseStatus(updated.userId, updated.seasonId, 'LEASE_SENT');
  }

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: `LEASE_${action}`,
    entityType: 'Lease',
    entityId: lease.id,
    metadata: data,
  });

  res.json({ lease: updated });
}

export async function downloadLease(req: AuthRequest, res: Response) {
  const leaseId = resolveLeaseId(req);
  if (!leaseId) return res.status(400).json({ error: 'Lease ID is required' });

  const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  if (!canAccessLease(req, lease)) return res.status(403).json({ error: 'Forbidden' });

  const type = req.query.type === 'signed' ? 'signed' : 'original';
  const relativePath = type === 'signed' ? lease.signedFilePath : lease.filePath;
  if (!relativePath) return res.status(404).json({ error: 'Requested lease file is not available' });

  const fullPath = resolvePrivateLeasePath(relativePath);
  if (!fullPath) return res.status(404).json({ error: 'Requested lease file is not available' });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: type === 'signed' ? 'LEASE_SIGNED_DOWNLOAD' : 'LEASE_ORIGINAL_DOWNLOAD',
    entityType: 'Lease',
    entityId: lease.id,
  });

  res.download(fullPath, leaseDownloadName(lease.title, type === 'signed' ? lease.signedFileName : lease.fileName));
}
