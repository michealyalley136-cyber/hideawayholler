import { Response } from 'express';
import fs from 'fs';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { computePaymentStatus, computeBalance } from '../utils/payment';
import { saveFile } from '../utils/storage';

export async function listPayments(req: AuthRequest, res: Response) {
  const where: Record<string, unknown> = {};
  if (req.user!.role !== 'ADMIN') where.userId = req.user!.userId;
  if (req.query.seasonId) where.seasonId = req.query.seasonId;
  if (req.query.userId && req.user!.role === 'ADMIN') where.userId = req.query.userId;
  if (req.query.status) where.status = req.query.status;

  const payments = await prisma.payment.findMany({
    where,
    include: { season: true, user: { include: { profile: true } } },
    orderBy: { dueDate: 'asc' },
  });
  res.json({ payments });
}

export async function createPayment(req: AuthRequest, res: Response) {
  const { userId, seasonId, type, description, amountDue, dueDate, notes } = req.body;
  const due = parseFloat(amountDue);
  const balance = computeBalance(due, 0);
  const status = computePaymentStatus(due, 0, new Date(dueDate));

  const payment = await prisma.payment.create({
    data: {
      userId,
      seasonId,
      type: type || 'RENT',
      description,
      amountDue: due,
      amountPaid: 0,
      balance,
      dueDate: new Date(dueDate),
      status,
      notes,
    },
    include: { user: { include: { profile: true } }, season: true },
  });
  res.status(201).json({ payment });
}

export async function updatePayment(req: AuthRequest, res: Response) {
  const { amountPaid, amountDue, dueDate, status, notes, receiptVerified } = req.body;
  const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Payment not found' });

  const due = amountDue !== undefined ? parseFloat(amountDue) : Number(existing.amountDue);
  const paid = amountPaid !== undefined ? parseFloat(amountPaid) : Number(existing.amountPaid);
  const dueDateVal = dueDate ? new Date(dueDate) : existing.dueDate;
  const balance = computeBalance(due, paid);
  const computedStatus = status || computePaymentStatus(due, paid, dueDateVal);

  const payment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      ...(amountDue !== undefined && { amountDue: due }),
      ...(amountPaid !== undefined && { amountPaid: paid }),
      balance,
      ...(dueDate && { dueDate: dueDateVal }),
      status: computedStatus as PaymentStatus,
      ...(notes !== undefined && { notes }),
      ...(receiptVerified !== undefined && {
        receiptVerified: !!receiptVerified,
        verifiedAt: receiptVerified ? new Date() : null,
        verifiedBy: receiptVerified ? req.user!.userId : null,
      }),
    },
    include: { user: { include: { profile: true } }, season: true },
  });

  if (computedStatus === 'PAID' && existing.type === 'DEPOSIT') {
    await prisma.residentProfile.update({
      where: { userId: existing.userId },
      data: { currentStatus: 'DEPOSIT_RECEIVED' },
    });
  }

  res.json({ payment });
}

export async function uploadReceipt(req: AuthRequest, res: Response) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const saved = saveFile(fs.readFileSync(file.path), file.originalname, 'receipts');
  const payment = await prisma.payment.update({
    where: { id: req.params.id },
    data: { receiptPath: saved.filePath, receiptFileName: saved.fileName },
  });
  res.json({ payment });
}
