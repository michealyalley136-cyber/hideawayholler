import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR || (process.env.VERCEL === '1' ? '/tmp/uploads' : './uploads');
const PRIVATE_UPLOAD_DIR = process.env.PRIVATE_UPLOAD_DIR || (process.env.VERCEL === '1' ? '/tmp/private_uploads' : './private_uploads');

const PROTECTED_PREFIXES = ['documents/', 'receipts/', 'maintenance/', 'checkin/', 'checkout/'] as const;

function isSafeRelativePath(filePath: string) {
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  return normalized && !normalized.includes('..') && !path.isAbsolute(normalized);
}

function resolveStoredFile(filePath: string) {
  const privateCandidate = path.join(PRIVATE_UPLOAD_DIR, filePath);
  if (fs.existsSync(privateCandidate)) return privateCandidate;
  const publicCandidate = path.join(UPLOAD_DIR, filePath);
  if (fs.existsSync(publicCandidate)) return publicCandidate;
  return null;
}

async function userCanAccessFile(req: AuthRequest, filePath: string) {
  const user = req.user!;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;

  if (filePath.startsWith('documents/')) {
    const doc = await prisma.document.findFirst({ where: { filePath } });
    return doc?.userId === user.userId;
  }

  if (filePath.startsWith('receipts/')) {
    const payment = await prisma.payment.findFirst({ where: { receiptPath: filePath } });
    return payment?.userId === user.userId;
  }

  if (filePath.startsWith('maintenance/')) {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { mediaPaths: { has: filePath } },
      select: { userId: true },
      take: 1,
    });
    return requests[0]?.userId === user.userId;
  }

  if (filePath.startsWith('checkin/')) {
    const record = await prisma.checkIn.findFirst({
      where: { roomPhotoPaths: { has: filePath } },
      select: { userId: true },
    });
    return record?.userId === user.userId;
  }

  if (filePath.startsWith('checkout/')) {
    const record = await prisma.checkOut.findFirst({
      where: { roomPhotoPaths: { has: filePath } },
      select: { userId: true },
    });
    return record?.userId === user.userId;
  }

  return false;
}

export async function serveProtectedFile(req: AuthRequest, res: Response) {
  const filePath = decodeURIComponent(String(req.query.path || '')).replace(/\\/g, '/');
  if (!isSafeRelativePath(filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const allowed = PROTECTED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
  if (!allowed) {
    return res.status(400).json({ error: 'Unsupported file path' });
  }

  if (!(await userCanAccessFile(req, filePath))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const fullPath = resolveStoredFile(filePath);
  if (!fullPath) {
    return res.status(404).json({ error: 'File not found' });
  }

  return res.sendFile(path.resolve(fullPath));
}
