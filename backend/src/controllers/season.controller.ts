import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export async function listSeasons(_req: AuthRequest, res: Response) {
  const seasons = await prisma.season.findMany({ orderBy: [{ year: 'desc' }, { term: 'asc' }] });
  res.json({ seasons });
}

export async function getSeason(req: AuthRequest, res: Response) {
  const season = await prisma.season.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: {
          applications: true,
          residents: true,
          leases: true,
          payments: true,
          notices: true,
          galleryAlbums: true,
        },
      },
    },
  });
  if (!season) return res.status(404).json({ error: 'Season not found' });
  res.json({ season });
}

export async function createSeason(req: AuthRequest, res: Response) {
  const { name, slug, year, term, startDate, endDate, isActive, description } = req.body;
  const season = await prisma.season.create({
    data: { name, slug, year: parseInt(year), term, startDate: new Date(startDate), endDate: new Date(endDate), isActive: !!isActive, description },
  });
  res.status(201).json({ season });
}

export async function updateSeason(req: AuthRequest, res: Response) {
  const { name, year, term, startDate, endDate, isActive, description } = req.body;
  const season = await prisma.season.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(year && { year: parseInt(year) }),
      ...(term && { term }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(isActive !== undefined && { isActive: !!isActive }),
      ...(description !== undefined && { description }),
    },
  });
  res.json({ season });
}

export async function endSeason(req: AuthRequest, res: Response) {
  const seasonId = req.params.id;
  await prisma.season.update({
    where: { id: seasonId },
    data: { isActive: false },
  });
  await prisma.seasonResident.updateMany({
    where: { seasonId, status: { notIn: ['ALUMNI', 'CHECKED_OUT'] } },
    data: { status: 'ALUMNI', leftAt: new Date() },
  });
  await prisma.user.updateMany({
    where: {
      seasonMemberships: { some: { seasonId } },
      role: 'RESIDENT',
    },
    data: { role: 'ALUMNI' },
  });
  res.json({ message: 'Season ended. Residents moved to alumni.' });
}
