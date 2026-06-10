import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/audit.service';

export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('fullName').trim().notEmpty(),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export async function register(req: AuthRequest, res: Response) {
  const { email, password, fullName, phone, country } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: UserRole.APPLICANT,
      profile: {
        create: {
          fullName,
          phone,
          country,
        },
      },
    },
    include: { profile: true },
  });

  await logAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user.id,
    metadata: { email: user.email },
  }).catch(() => undefined);

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    },
  });
}

export async function login(req: AuthRequest, res: Response) {
  const { email, password } = req.body;

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await logAuditEvent({
        actorId: null,
        actorRole: null,
        action: 'USER_LOGIN_FAILED',
        entityType: 'User',
        metadata: { email: normalizedEmail },
      }).catch(() => undefined);
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
      },
    }).catch((err) => {
      console.error('[auth] Failed to log login audit event', { userId: user.id, message: err instanceof Error ? err.message : 'Unknown error' });
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[auth] Login failed unexpectedly', {
      email,
      errorName: err instanceof Error ? err.name : 'UnknownError',
      errorMessage: message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err instanceof Error ? err.stack : undefined,
    });

    return res.status(500).json({
      error: 'Unable to sign in right now. Please try again or contact support.',
      code: 'AUTH_LOGIN_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : message,
    });
  }
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      profile: { include: { documents: true } },
      seasonMemberships: { include: { season: true } },
      applications: { include: { season: true } },
    },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}

export async function logout(_req: AuthRequest, res: Response) {
  res.json({ message: 'Logged out successfully' });
}
