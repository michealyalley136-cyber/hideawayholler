import { Response } from 'express';
import fs from 'fs';
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

function leaseError(res: Response, status: number, error: string) {
  return res.status(status).json({ success: false, error });
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

function resolveLeaseId(req: AuthRequest) {
  const fromBody = (req.body as { leaseId?: string } | undefined)?.leaseId;
  return req.params.id || fromBody || String(req.query.leaseId || '');
}

export async function listLeases(req: AuthRequest, res: Response) {
  try {
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
  } catch (err) {
    console.error('[leases] list failed', err);
    return leaseError(res, 500, 'Unable to load leases.');
  }
}

function formatAssignError(err: unknown) {
  if (err && typeof err === 'object' && 'code' in err) {
    const prismaErr = err as { code?: string; meta?: { field_name?: string } };
    if (prismaErr.code === 'P2003') return 'Invalid resident or season reference.';
    if (prismaErr.code === 'P2002') return 'A lease with this assignment already exists.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Unable to assign lease. Please verify the PDF and try again.';
}

export async function createLease(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.userId) {
      return leaseError(res, 401, 'Not authenticated');
    }

    const { userId, seasonId, title, sentAt, expiresAt, notes, status } = req.body;

    console.info({
      route: 'ASSIGN_LEASE',
      body: req.body,
      file: req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
          }
        : null,
      user: req.user,
    });

    if (!String(title || '').trim()) {
      return leaseError(res, 400, 'Lease title is required');
    }
    if (!userId) {
      return leaseError(res, 400, 'Resident is required');
    }
    if (!req.file) {
      return leaseError(res, 400, 'Lease PDF is required');
    }

    const resident = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!resident) {
      return leaseError(res, 400, 'Resident not found');
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    if (!fileBuffer.length) {
      return leaseError(res, 400, 'Uploaded lease PDF is empty');
    }

    const saved = savePrivateFile(fileBuffer, req.file.originalname, 'leases');
    const assigned = Boolean(userId);
    const leaseStatus =
      status === LeaseWorkflowStatus.DRAFT
        ? LeaseWorkflowStatus.DRAFT
        : assigned
          ? LeaseWorkflowStatus.PENDING_SIGNATURE
          : LeaseWorkflowStatus.DRAFT;

    const createPayload = {
      userId: String(userId),
      seasonId: seasonId ? String(seasonId) : undefined,
      title: String(title).trim(),
      filePath: saved.filePath,
      fileName: saved.fileName,
      status: leaseStatus,
      sentAt: assigned ? (sentAt ? new Date(sentAt) : new Date()) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes: notes ? String(notes) : undefined,
    };

    console.info({ route: 'ASSIGN_LEASE', createPayload });

    const lease = await prisma.lease.create({
      data: createPayload,
      include: includeLeaseRelations(),
    });

    if (userId) await updateResidentLeaseStatus(String(userId), seasonId ? String(seasonId) : undefined, 'LEASE_SENT');

    await logAuditEvent({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'LEASE_CREATED',
      entityType: 'Lease',
      entityId: lease.id,
      metadata: { userId, seasonId, status: lease.status },
    }).catch(() => undefined);

    res.status(201).json({ success: true, lease });
  } catch (err) {
    console.error({
      route: 'ASSIGN_LEASE',
      body: req.body,
      file: req.file,
      user: req.user,
      error: err,
    });
    return leaseError(res, 500, formatAssignError(err));
  }
}

export async function signLease(req: AuthRequest, res: Response) {
  try {
    const leaseId = resolveLeaseId(req);
    if (!leaseId) return leaseError(res, 400, 'Lease ID is required');

    const { signatureData } = req.body as { signatureData?: string };
    const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: includeLeaseRelations() });
    if (!lease) return leaseError(res, 404, 'Lease not found');
    if (lease.userId !== req.user!.userId) return leaseError(res, 403, 'Forbidden');
    if (lease.status === LeaseWorkflowStatus.COMPLETED || lease.status === LeaseWorkflowStatus.ARCHIVED) {
      return leaseError(res, 409, 'Completed or archived leases cannot be altered');
    }
    if (!signatureData) return leaseError(res, 400, 'Signature is required');

    const signedAt = new Date();
    const residentName = lease.user?.profile?.fullName || lease.user?.email || 'Resident';

    let signedPdf;
    try {
      signedPdf = await generateSignedLeasePdf({
        originalFilePath: lease.filePath,
        leaseTitle: lease.title,
        residentName,
        signatureData,
        signedAt,
      });
    } catch (pdfErr) {
      console.error('[leases] signed PDF generation failed', { leaseId, pdfErr });
      return leaseError(res, 500, 'Unable to generate signed lease PDF. Please try again.');
    }

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
    }).catch(() => undefined);

    res.json({ success: true, lease: updated });
  } catch (err) {
    console.error('[leases] sign failed', err);
    return leaseError(res, 500, 'Unable to sign lease.');
  }
}

export async function getLease(req: AuthRequest, res: Response) {
  try {
    const leaseId = resolveLeaseId(req);
    if (!leaseId) return leaseError(res, 400, 'Lease ID is required');

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: includeLeaseRelations(),
    });
    if (!lease) return leaseError(res, 404, 'Lease not found');
    if (!canAccessLease(req, lease)) return leaseError(res, 403, 'Forbidden');
    res.json({ lease });
  } catch (err) {
    console.error('[leases] get failed', err);
    return leaseError(res, 500, 'Unable to load lease.');
  }
}

export async function leaseAction(req: AuthRequest, res: Response) {
  try {
    const { action, userId, seasonId } = req.body as { action?: string; userId?: string; seasonId?: string };
    const leaseId = resolveLeaseId(req);
    if (!leaseId) return leaseError(res, 400, 'Lease ID is required');
    if (!action) return leaseError(res, 400, 'Lease action is required');

    const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) return leaseError(res, 404, 'Lease not found');
    if (lease.status === LeaseWorkflowStatus.COMPLETED && action !== 'ARCHIVE') {
      return leaseError(res, 409, 'Completed leases cannot be altered');
    }

    if (action === 'APPROVE') {
      if (lease.status !== LeaseWorkflowStatus.SIGNED_BY_RESIDENT) {
        return leaseError(res, 409, 'Resident must sign lease before approval.');
      }
      if (!lease.signedAt && !lease.signatureData && !lease.signedFilePath) {
        return leaseError(res, 409, 'Resident must sign lease before approval.');
      }
    }

    if (action === 'ARCHIVE' && lease.status === LeaseWorkflowStatus.ARCHIVED) {
      return leaseError(res, 409, 'Lease is already archived');
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

    if (Object.keys(data).length === 0) return leaseError(res, 400, 'Unsupported lease action');

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
    }).catch(() => undefined);

    res.json({ success: true, lease: updated });
  } catch (err) {
    console.error('[leases] action failed', { action: req.body?.action, leaseId: resolveLeaseId(req), err });
    return leaseError(res, 500, 'Unable to update lease. Please try again.');
  }
}

export async function downloadLease(req: AuthRequest, res: Response) {
  try {
    const leaseId = resolveLeaseId(req);
    if (!leaseId) return leaseError(res, 400, 'Lease ID is required');

    const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) return leaseError(res, 404, 'Lease not found');
    if (!canAccessLease(req, lease)) return leaseError(res, 403, 'Forbidden');

    const type = req.query.type === 'signed' ? 'signed' : 'original';
    const relativePath = type === 'signed' ? lease.signedFilePath : lease.filePath;
    if (!relativePath) {
      return leaseError(res, 404, 'Lease document is not available. Please contact management.');
    }

    const fullPath = resolvePrivateLeasePath(relativePath);
    if (!fullPath) {
      return leaseError(res, 404, 'Lease document is not available. Please contact management.');
    }

    const fileStat = fs.statSync(fullPath);
    if (fileStat.size < 50) {
      return leaseError(res, 404, 'Lease document is not available. Please contact management.');
    }

    await logAuditEvent({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: type === 'signed' ? 'LEASE_SIGNED_DOWNLOAD' : 'LEASE_ORIGINAL_DOWNLOAD',
      entityType: 'Lease',
      entityId: lease.id,
    }).catch(() => undefined);

    res.download(fullPath, leaseDownloadName(lease.title, type === 'signed' ? lease.signedFileName : lease.fileName));
  } catch (err) {
    console.error('[leases] download failed', err);
    return leaseError(res, 500, 'Unable to download lease file.');
  }
}
