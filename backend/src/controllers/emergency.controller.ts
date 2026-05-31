import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export async function listEmergencyContacts(_req: AuthRequest, res: Response) {
  const contacts = await prisma.emergencyContact.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ contacts });
}

export async function createEmergencyContact(req: AuthRequest, res: Response) {
  const contact = await prisma.emergencyContact.create({ data: req.body });
  res.status(201).json({ contact });
}

export async function updateEmergencyContact(req: AuthRequest, res: Response) {
  const contact = await prisma.emergencyContact.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ contact });
}
