import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';

export function logAuditEvent(data: {
  actorId?: string | null;
  actorRole?: UserRole | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: data.actorId || undefined,
      actorRole: data.actorRole || undefined,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || undefined,
      metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}
