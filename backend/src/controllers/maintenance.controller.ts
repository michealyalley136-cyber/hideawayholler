import { Response } from 'express';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { saveFile } from '../utils/storage';

export async function listMaintenance(req: AuthRequest, res: Response) {
  const where: Record<string, unknown> = {};
  if (req.user!.role !== 'ADMIN') where.userId = req.user!.userId;
  if (req.query.status) where.status = req.query.status;

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ requests });
}

export async function createMaintenance(req: AuthRequest, res: Response) {
  const { category, description } = req.body;
  const mediaPaths: string[] = [];

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const saved = saveFile(fs.readFileSync(file.path), file.originalname, 'maintenance');
      mediaPaths.push(saved.filePath);
    }
  }

  const request = await prisma.maintenanceRequest.create({
    data: {
      userId: req.user!.userId,
      category,
      description,
      mediaPaths,
    },
  });
  res.status(201).json({ request });
}

export async function updateMaintenance(req: AuthRequest, res: Response) {
  const { status, adminNotes } = req.body;
  const request = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: { ...(status && { status }), ...(adminNotes !== undefined && { adminNotes }) },
    include: { user: { include: { profile: true } } },
  });
  res.json({ request });
}

export async function getMaintenance(req: AuthRequest, res: Response) {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: { user: { include: { profile: true } } },
  });
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ request });
}
