import { Response } from 'express';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { saveFile } from '../utils/storage';

export async function listLeases(req: AuthRequest, res: Response) {
  const where: Record<string, unknown> = {};
  if (req.user!.role !== 'ADMIN') where.userId = req.user!.userId;
  if (req.query.seasonId) where.seasonId = req.query.seasonId;
  if (req.query.userId && req.user!.role === 'ADMIN') where.userId = req.query.userId;

  const leases = await prisma.lease.findMany({
    where,
    include: { season: true, user: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ leases });
}

export async function createLease(req: AuthRequest, res: Response) {
  const { userId, seasonId, title, sentAt, expiresAt, notes } = req.body;
  let filePath: string | undefined;
  let fileName: string | undefined;

  if (req.file) {
    const saved = saveFile(fs.readFileSync(req.file.path), req.file.originalname, 'leases');
    filePath = saved.filePath;
    fileName = saved.fileName;
  }

  const lease = await prisma.lease.create({
    data: {
      userId,
      seasonId,
      title,
      filePath,
      fileName,
      sentAt: sentAt ? new Date(sentAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes,
    },
    include: { user: { include: { profile: true } }, season: true },
  });

  await prisma.residentProfile.update({
    where: { userId },
    data: { currentStatus: 'LEASE_SENT' },
  });
  await prisma.seasonResident.update({
    where: { userId_seasonId: { userId, seasonId } },
    data: { status: 'LEASE_SENT' },
  });

  res.status(201).json({ lease });
}

export async function signLease(req: AuthRequest, res: Response) {
  const { signatureData } = req.body;
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id } });
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  if (lease.userId !== req.user!.userId) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.lease.update({
    where: { id: req.params.id },
    data: {
      acknowledged: true,
      acknowledgedAt: new Date(),
      signedAt: new Date(),
      signatureData,
    },
  });

  await prisma.residentProfile.update({
    where: { userId: lease.userId },
    data: { currentStatus: 'LEASE_SIGNED' },
  });
  await prisma.seasonResident.update({
    where: { userId_seasonId: { userId: lease.userId, seasonId: lease.seasonId } },
    data: { status: 'LEASE_SIGNED' },
  });

  res.json({ lease: updated });
}

export async function getLease(req: AuthRequest, res: Response) {
  const lease = await prisma.lease.findUnique({
    where: { id: req.params.id },
    include: { season: true, user: { include: { profile: true } } },
  });
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  if (lease.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ lease });
}
