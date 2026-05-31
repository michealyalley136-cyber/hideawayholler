import { Response } from 'express';
import { ResidentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getJourneySteps } from '../utils/residentJourney';
import fs from 'fs';
import { saveFile } from '../utils/storage';

export async function getProfile(req: AuthRequest, res: Response) {
  const userId = req.params.userId || req.user!.userId;
  if (userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: { include: { documents: true } },
      seasonMemberships: { include: { season: true } },
      roomAssignments: {
        where: { vacatedAt: null },
        include: { room: { include: { building: { include: { property: true } } } }, bed: true },
      },
    },
  });

  if (!user?.profile) return res.status(404).json({ error: 'Profile not found' });

  const journey = getJourneySteps(user.profile.currentStatus);
  res.json({ user, journey });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const userId = req.params.userId || req.user!.userId;
  if (userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const data = req.body;
  const profile = await prisma.residentProfile.update({
    where: { userId },
    data: {
      ...(data.fullName && { fullName: data.fullName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.passportNumber !== undefined && { passportNumber: data.passportNumber }),
      ...(data.sponsor !== undefined && { sponsor: data.sponsor }),
      ...(data.employer !== undefined && { employer: data.employer }),
      ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName }),
      ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone }),
      ...(data.arrivalDate && { arrivalDate: new Date(data.arrivalDate) }),
      ...(data.departureDate && { departureDate: new Date(data.departureDate) }),
      ...(data.currentStatus && req.user!.role === 'ADMIN' && { currentStatus: data.currentStatus as ResidentStatus }),
    },
  });

  if (data.currentStatus && req.user!.role === 'ADMIN') {
    await prisma.seasonResident.updateMany({
      where: { userId },
      data: { status: data.currentStatus },
    });
  }

  res.json({ profile });
}

export async function uploadDocument(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const profile = await prisma.residentProfile.findUnique({ where: { userId } });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const { filePath, fileName } = saveFile(
    fs.readFileSync(file.path),
    file.originalname,
    'documents'
  );

  const doc = await prisma.document.create({
    data: {
      profileId: profile.id,
      userId,
      type: req.body.type || 'OTHER',
      fileName,
      filePath,
      mimeType: file.mimetype,
      fileSize: file.size,
    },
  });

  res.status(201).json({ document: doc });
}

export async function listResidents(req: AuthRequest, res: Response) {
  const { seasonId, status, search } = req.query;
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['RESIDENT', 'APPLICANT', 'ALUMNI'] },
      ...(seasonId && { seasonMemberships: { some: { seasonId: seasonId as string } } }),
      ...(status && { profile: { currentStatus: status as ResidentStatus } }),
      ...(search && {
        OR: [
          { email: { contains: search as string, mode: 'insensitive' } },
          { profile: { fullName: { contains: search as string, mode: 'insensitive' } } },
        ],
      }),
    },
    include: {
      profile: true,
      seasonMemberships: { include: { season: true } },
    },
    orderBy: { profile: { fullName: 'asc' } },
  });
  res.json({ residents: users });
}
