import { Response } from 'express';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { saveSensitiveFile } from '../utils/storage';

export async function getCheckOut(req: AuthRequest, res: Response) {
  const userId = (req.query.userId as string) || req.user!.userId;
  if (userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const checkOut = await prisma.checkOut.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ checkOut });
}

export async function submitCheckOut(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { seasonId, moveOutNotes, damageReport } = req.body;
  const roomPhotoPaths: string[] = [];

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const saved = saveSensitiveFile(fs.readFileSync(file.path), file.originalname, 'checkout');
      roomPhotoPaths.push(saved.filePath);
    }
  }

  const existing = await prisma.checkOut.findFirst({ where: { userId, seasonId } });
  const data = { moveOutNotes, damageReport, roomPhotoPaths, completedAt: new Date() };

  const checkOut = existing
    ? await prisma.checkOut.update({ where: { id: existing.id }, data })
    : await prisma.checkOut.create({ data: { userId, seasonId, ...data } });

  res.json({ checkOut });
}

export async function approveCheckOut(req: AuthRequest, res: Response) {
  const { inspectionNotes, depositReview } = req.body;
  const checkOut = await prisma.checkOut.update({
    where: { id: req.params.id },
    data: {
      inspectionNotes,
      depositReview,
      adminApproved: true,
      adminApprovedAt: new Date(),
    },
  });

  await prisma.residentProfile.update({
    where: { userId: checkOut.userId },
    data: { currentStatus: 'CHECKED_OUT' },
  });
  if (checkOut.seasonId) {
    await prisma.seasonResident.update({
      where: { userId_seasonId: { userId: checkOut.userId, seasonId: checkOut.seasonId } },
      data: { status: 'CHECKED_OUT' },
    });
  }

  res.json({ checkOut });
}
