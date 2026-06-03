import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

const secret = process.env.JWT_SECRET || 'dev-secret';
const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret as jwt.Secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
