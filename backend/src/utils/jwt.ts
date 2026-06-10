import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (!secret || secret === 'dev-secret' || secret.includes('change-in-production')) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be set to a strong unique value in production.');
    }
    return secret || 'dev-secret';
  }

  return secret;
}

const secret = resolveJwtSecret();

function normalizeExpiresIn(value: string | undefined): jwt.SignOptions['expiresIn'] {
  const normalized = (value || '24h').trim().replace(/^['"]|['"]$/g, '');
  return (normalized || '24h') as jwt.SignOptions['expiresIn'];
}

const expiresIn = normalizeExpiresIn(process.env.JWT_EXPIRES_IN);

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret as jwt.Secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
