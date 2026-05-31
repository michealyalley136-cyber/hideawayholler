import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export async function listPlaces(req: AuthRequest, res: Response) {
  const { category, search } = req.query;
  const places = await prisma.localGuide.findMany({
    where: {
      ...(category && { category: category as never }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { address: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
  });
  res.json({ places });
}

export async function createPlace(req: AuthRequest, res: Response) {
  const place = await prisma.localGuide.create({ data: req.body });
  res.status(201).json({ place });
}

export async function updatePlace(req: AuthRequest, res: Response) {
  const place = await prisma.localGuide.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ place });
}

export async function deletePlace(req: AuthRequest, res: Response) {
  await prisma.localGuide.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}
