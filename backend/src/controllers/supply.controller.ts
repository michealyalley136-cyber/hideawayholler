import { Response } from 'express';
import { SupplyRequestStatus, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sanitizeText } from '../utils/sanitize';

export async function listSupplyRequests(req: AuthRequest, res: Response) {
  const isAdmin = req.user!.role === UserRole.ADMIN;
  const requests = await prisma.supplyRequest.findMany({
    where: isAdmin ? {} : { userId: req.user!.userId },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ requests });
}

export async function createSupplyRequest(req: AuthRequest, res: Response) {
  const { house, supplyType, quantity, notes } = req.body;
  const request = await prisma.supplyRequest.create({
    data: {
      userId: req.user!.userId,
      house: sanitizeText(house, 120),
      supplyType: supplyType as never,
      quantity: Math.max(1, Number(quantity) || 1),
      notes: sanitizeText(notes, 1000),
    },
  });

  res.status(201).json({ request });
}

export async function updateSupplyRequest(req: AuthRequest, res: Response) {
  const { status } = req.body;
  const fulfilled = status === SupplyRequestStatus.FULFILLED;
  const request = await prisma.supplyRequest.update({
    where: { id: req.params.id },
    data: {
      status,
      fulfilledAt: fulfilled ? new Date() : null,
      fulfilledBy: fulfilled ? req.user!.userId : null,
    },
    include: { user: { include: { profile: true } } },
  });

  res.json({ request });
}
