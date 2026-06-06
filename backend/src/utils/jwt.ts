import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

const secret = process.env.JWT_SECRET || 'dev-secret';

function normalizeExpiresIn(value: string | undefined): jwt.SignOptions['expiresIn'] {
  const normalized = (value || '7d').trim().replace(/^['"]|['"]$/g, '');
  return (normalized || '7d') as jwt.SignOptions['expiresIn'];
}

const expiresIn = normalizeExpiresIn(process.env.JWT_EXPIRES_IN);

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret as jwt.Secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
