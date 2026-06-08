import { Response } from 'express';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { saveFile } from '../utils/storage';

export async function getCheckIn(req: AuthRequest, res: Response) {
  const userId = (req.query.userId as string) || req.user!.userId;
  if (userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const checkIn = await prisma.checkIn.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ checkIn });
}

export async function submitCheckIn(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { seasonId, arrivalConfirmed, rulesAccepted, roomCondition } = req.body;
  const roomPhotoPaths: string[] = [];

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const saved = saveFile(fs.readFileSync(file.path), file.originalname, 'checkin');
      roomPhotoPaths.push(saved.filePath);
    }
  }

  const existing = await prisma.checkIn.findFirst({ where: { userId, seasonId } });
  const data = {
    arrivalConfirmed: arrivalConfirmed === true || arrivalConfirmed === 'true',
    rulesAccepted: rulesAccepted === true || rulesAccepted === 'true',
    roomCondition,
    roomPhotoPaths,
    completedAt: new Date(),
  };

  const checkIn = existing
    ? await prisma.checkIn.update({ where: { id: existing.id }, data })
    : await prisma.checkIn.create({ data: { userId, seasonId, ...data } });

  res.json({ checkIn });
}

export async function listPendingCheckIns(_req: AuthRequest, res: Response) {
  const checkIns = await prisma.checkIn.findMany({
    where: { adminApproved: false, completedAt: { not: null } },
    include: {
      user: { include: { profile: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ checkIns });
}

function resolveCheckInId(req: AuthRequest) {
  return (req.body?.checkInId as string) || req.params.id;
}

export async function approveCheckIn(req: AuthRequest, res: Response) {
  const checkInId = resolveCheckInId(req);
  if (!checkInId) return res.status(400).json({ error: 'Check-in id is required' });

  const { adminNotes } = req.body;
  const checkIn = await prisma.checkIn.update({
    where: { id: checkInId },
    data: {
      adminApproved: true,
      adminApprovedAt: new Date(),
      adminNotes,
    },
  });

  await prisma.residentProfile.update({
    where: { userId: checkIn.userId },
    data: { currentStatus: 'CHECKED_IN' },
  });
  if (checkIn.seasonId) {
    await prisma.seasonResident.update({
      where: { userId_seasonId: { userId: checkIn.userId, seasonId: checkIn.seasonId } },
      data: { status: 'CHECKED_IN' },
    });
  }

  res.json({ checkIn });
}

export async function rejectCheckIn(req: AuthRequest, res: Response) {
  const checkInId = resolveCheckInId(req);
  if (!checkInId) return res.status(400).json({ error: 'Check-in id is required' });

  const { adminNotes } = req.body;
  const checkIn = await prisma.checkIn.update({
    where: { id: checkInId },
    data: {
      adminApproved: false,
      adminNotes: typeof adminNotes === 'string' ? adminNotes : 'Rejected by admin',
    },
  });

  res.json({ checkIn });
}
