import { Response } from 'express';
import fs from 'fs';
import { MaintenanceCategory } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { saveSensitiveFile } from '../utils/storage';
import { sanitizeText } from '../utils/sanitize';
import { logAuditEvent } from '../services/audit.service';

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

const MAINTENANCE_CATEGORIES = new Set<string>(['PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'CLEANING', 'OTHER']);

export async function createMaintenance(req: AuthRequest, res: Response) {
  const { category, description } = req.body;
  if (!MAINTENANCE_CATEGORIES.has(String(category))) {
    return res.status(400).json({ error: 'Invalid maintenance category' });
  }
  const mediaPaths: string[] = [];

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const saved = saveSensitiveFile(fs.readFileSync(file.path), file.originalname, 'maintenance');
      mediaPaths.push(saved.filePath);
    }
  }

  const request = await prisma.maintenanceRequest.create({
    data: {
      userId: req.user!.userId,
      category: category as MaintenanceCategory, // validated above
      description: sanitizeText(description, 2000) || 'Maintenance request',
      mediaPaths,
    },
  });
  res.status(201).json({ request });
}

export async function updateMaintenance(req: AuthRequest, res: Response) {
  const { status, adminNotes } = req.body;
  const request = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: {
      ...(status && { status }),
      ...(adminNotes !== undefined && { adminNotes: sanitizeText(adminNotes, 2000) }),
    },
    include: { user: { include: { profile: true } } },
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'MAINTENANCE_STATUS_UPDATED',
    entityType: 'MaintenanceRequest',
    entityId: request.id,
    metadata: { status: request.status, userId: request.userId },
  }).catch(() => undefined);

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
