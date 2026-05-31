import { Response } from 'express';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { saveFile } from '../utils/storage';

export async function listAlbums(req: AuthRequest, res: Response) {
  const { seasonId } = req.query;
  const albums = await prisma.galleryAlbum.findMany({
    where: seasonId ? { OR: [{ seasonId: seasonId as string }, { seasonId: null }] } : {},
    include: { images: { orderBy: { sortOrder: 'asc' } }, season: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ albums });
}

export async function getAlbum(req: AuthRequest, res: Response) {
  const album = await prisma.galleryAlbum.findUnique({
    where: { id: req.params.id },
    include: { images: { orderBy: { sortOrder: 'asc' } }, season: true },
  });
  if (!album) return res.status(404).json({ error: 'Album not found' });
  res.json({ album });
}

export async function createAlbum(req: AuthRequest, res: Response) {
  const album = await prisma.galleryAlbum.create({ data: req.body });
  res.status(201).json({ album });
}

export async function uploadImage(req: AuthRequest, res: Response) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const saved = saveFile(fs.readFileSync(file.path), file.originalname, 'gallery');
  const count = await prisma.galleryImage.count({ where: { albumId: req.params.albumId } });

  const image = await prisma.galleryImage.create({
    data: {
      albumId: req.params.albumId,
      filePath: saved.filePath,
      fileName: saved.fileName,
      caption: req.body.caption,
      sortOrder: count,
    },
  });

  if (count === 0) {
    await prisma.galleryAlbum.update({
      where: { id: req.params.albumId },
      data: { coverPath: saved.filePath },
    });
  }

  res.status(201).json({ image });
}

export async function deleteAlbum(req: AuthRequest, res: Response) {
  await prisma.galleryAlbum.delete({ where: { id: req.params.id } });
  res.json({ message: 'Album deleted' });
}
