import { Response } from 'express';
import { ResidentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getJourneySteps } from '../utils/residentJourney';
import fs from 'fs';
import { deleteFile, getPublicUrl, saveFile, saveSensitiveFile } from '../utils/storage';
import { sanitizeText } from '../utils/sanitize';
import { logAuditEvent } from '../services/audit.service';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getTargetUserId(req: AuthRequest) {
  return req.params.userId || req.user!.userId;
}

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
      residentHouseAssignments: {
        where: { vacatedAt: null },
        include: { houseAssignment: true, season: true },
        orderBy: { assignedAt: 'desc' },
        take: 1,
      },
      roomAssignments: {
        where: { vacatedAt: null },
        include: { room: { include: { building: { include: { property: true } } } }, bed: true },
        orderBy: { assignedAt: 'desc' },
        take: 1,
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
      ...(data.fullName && { fullName: sanitizeText(data.fullName, 120) }),
      ...(data.phone !== undefined && { phone: sanitizeText(data.phone, 40) }),
      ...(data.country !== undefined && { country: sanitizeText(data.country, 80) }),
      ...(data.passportNumber !== undefined && { passportNumber: sanitizeText(data.passportNumber, 80) }),
      ...(data.sponsor !== undefined && { sponsor: sanitizeText(data.sponsor, 120) }),
      ...(data.employer !== undefined && { employer: sanitizeText(data.employer, 120) }),
      ...(data.emergencyContactName !== undefined && { emergencyContactName: sanitizeText(data.emergencyContactName, 120) }),
      ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: sanitizeText(data.emergencyContactPhone, 40) }),
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

  if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype) && file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'Only JPG, PNG, WEBP, or PDF files are allowed' });
  }

  const { filePath, fileName } = saveSensitiveFile(
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

export async function uploadAvatar(req: AuthRequest, res: Response) {
  const targetUserId = getTargetUserId(req);
  if (targetUserId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype) || file.size > MAX_AVATAR_SIZE) {
    return res.status(400).json({ error: 'Only JPG, PNG, or WEBP files under 5MB are allowed' });
  }

  const profile = await prisma.residentProfile.findUnique({ where: { userId: targetUserId } });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (profile.avatarUrl) {
    const previous = profile.avatarUrl.replace(/^\/uploads\//, '');
    deleteFile(previous);
  }

  const { filePath } = saveFile(fs.readFileSync(file.path), file.originalname, 'avatars');
  const avatarUrl = getPublicUrl(filePath);

  const updatedProfile = await prisma.residentProfile.update({
    where: { userId: targetUserId },
    data: { avatarUrl },
  });

  res.status(200).json({ profile: updatedProfile });
}

export async function deleteAvatar(req: AuthRequest, res: Response) {
  const targetUserId = getTargetUserId(req);
  if (targetUserId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const profile = await prisma.residentProfile.findUnique({ where: { userId: targetUserId } });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (profile.avatarUrl) {
    const previous = profile.avatarUrl.replace(/^\/uploads\//, '');
    deleteFile(previous);
  }

  const updatedProfile = await prisma.residentProfile.update({
    where: { userId: targetUserId },
    data: { avatarUrl: null },
  });

  res.json({ profile: updatedProfile });
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
      residentHouseAssignments: {
        where: { vacatedAt: null },
        include: { houseAssignment: true, season: true },
        orderBy: { assignedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { profile: { fullName: 'asc' } },
  });
  res.json({ residents: users });
}
