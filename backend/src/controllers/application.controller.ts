import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/audit.service';
import { sanitizeText } from '../utils/sanitize';

export async function apply(req: AuthRequest, res: Response) {
  const { seasonId, notes } = req.body;
  const userId = req.user!.userId;

  const existing = await prisma.application.findUnique({
    where: { userId_seasonId: { userId, seasonId } },
  });
  if (existing) return res.status(409).json({ error: 'Already applied for this season' });

  const application = await prisma.application.create({
    data: { userId, seasonId, notes },
    include: { season: true },
  });

  await prisma.seasonResident.upsert({
    where: { userId_seasonId: { userId, seasonId } },
    create: { userId, seasonId, status: 'APPLICANT' },
    update: {},
  });

  res.status(201).json({ application });
}

export async function listApplications(req: AuthRequest, res: Response) {
  const { seasonId, status } = req.query;
  const where: Record<string, unknown> = {};
  if (req.user!.role !== 'ADMIN') where.userId = req.user!.userId;
  if (seasonId) where.seasonId = seasonId;
  if (status) where.status = status;

  const applications = await prisma.application.findMany({
    where,
    include: { user: { include: { profile: true } }, season: true },
    orderBy: { appliedAt: 'desc' },
  });
  res.json({ applications });
}

export async function reviewApplication(req: AuthRequest, res: Response) {
  const { status, notes } = req.body;
  const application = await prisma.application.update({
    where: { id: req.params.id },
    data: {
      status,
      notes: notes !== undefined ? sanitizeText(notes, 2000) : undefined,
      reviewedAt: new Date(),
      reviewedBy: req.user!.userId,
    },
    include: { user: true, season: true },
  });

  if (status === 'APPROVED') {
    await prisma.residentProfile.update({
      where: { userId: application.userId },
      data: { currentStatus: 'APPROVED' },
    });
    await prisma.seasonResident.update({
      where: { userId_seasonId: { userId: application.userId, seasonId: application.seasonId } },
      data: { status: 'APPROVED' },
    });
    await prisma.user.update({
      where: { id: application.userId },
      data: { role: UserRole.RESIDENT },
    });
  }

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: status === 'APPROVED' ? 'APPLICATION_APPROVED' : 'APPLICATION_REVIEWED',
    entityType: 'Application',
    entityId: application.id,
    metadata: { status, userId: application.userId },
  }).catch(() => undefined);

  res.json({ application });
}
