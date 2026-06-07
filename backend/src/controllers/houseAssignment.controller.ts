import { Response } from 'express';
import { HouseAssignmentStatus, ResidentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/audit.service';

const DEFAULT_HOUSES = ['Bear', 'Elk', 'Deer', 'Fox'];

function normalizeHouseName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function ensureDefaultHouses() {
  const count = await prisma.houseAssignment.count();
  if (count > 0) return;
  await prisma.houseAssignment.createMany({
    data: DEFAULT_HOUSES.map((houseName) => ({ houseName, capacity: 0 })),
    skipDuplicates: true,
  });
}

async function recalculateOccupancy(houseAssignmentId: string) {
  const occupancy = await prisma.residentHouseAssignment.count({
    where: { houseAssignmentId, vacatedAt: null },
  });
  return prisma.houseAssignment.update({
    where: { id: houseAssignmentId },
    data: { occupancy },
  });
}

export async function listHouseAssignments(_req: AuthRequest, res: Response) {
  await ensureDefaultHouses();
  const houses = await prisma.houseAssignment.findMany({
    include: {
      residentAssignments: {
        where: { vacatedAt: null },
        include: { user: { include: { profile: true } }, season: true },
        orderBy: { assignedAt: 'desc' },
      },
    },
    orderBy: [{ status: 'asc' }, { houseName: 'asc' }],
  });

  res.json({ houses });
}

export async function createOrAssignHouse(req: AuthRequest, res: Response) {
  const body = req.body as Record<string, unknown>;

  if (body.action === 'ASSIGN') {
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const houseAssignmentId = typeof body.houseAssignmentId === 'string' ? body.houseAssignmentId : '';
    const seasonId = typeof body.seasonId === 'string' && body.seasonId ? body.seasonId : undefined;
    const notes = typeof body.notes === 'string' ? body.notes : undefined;

    if (!userId || !houseAssignmentId) {
      return res.status(400).json({ error: 'Resident and house assignment are required' });
    }

    const house = await prisma.houseAssignment.findUnique({ where: { id: houseAssignmentId } });
    if (!house || house.status === HouseAssignmentStatus.ARCHIVED) {
      return res.status(400).json({ error: 'Active house assignment not found' });
    }

    const previousAssignments = await prisma.residentHouseAssignment.findMany({
      where: { userId, vacatedAt: null },
      select: { houseAssignmentId: true },
    });

    const assignment = await prisma.$transaction(async (tx) => {
      await tx.residentHouseAssignment.updateMany({
        where: { userId, vacatedAt: null },
        data: { vacatedAt: new Date() },
      });
      await tx.roomAssignment.updateMany({
        where: { userId, vacatedAt: null },
        data: { vacatedAt: new Date() },
      });

      const created = await tx.residentHouseAssignment.create({
        data: { userId, houseAssignmentId, seasonId, notes },
        include: { houseAssignment: true, user: { include: { profile: true } }, season: true },
      });

      await tx.residentProfile.update({
        where: { userId },
        data: { currentStatus: ResidentStatus.ROOM_ASSIGNED },
      });

      if (seasonId) {
        await tx.seasonResident.update({
          where: { userId_seasonId: { userId, seasonId } },
          data: { status: ResidentStatus.ROOM_ASSIGNED },
        });
      }

      return created;
    });

    await Promise.all([
      recalculateOccupancy(houseAssignmentId),
      ...previousAssignments.map((item) => recalculateOccupancy(item.houseAssignmentId)),
    ]);

    await logAuditEvent({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: 'HOUSE_ASSIGNED',
      entityType: 'ResidentHouseAssignment',
      entityId: assignment.id,
      metadata: { userId, houseAssignmentId, seasonId },
    });

    return res.status(201).json({ assignment });
  }

  const houseName = normalizeHouseName(body.houseName);
  const capacity = Number(body.capacity);
  if (!houseName) return res.status(400).json({ error: 'House name is required' });

  const house = await prisma.houseAssignment.create({
    data: {
      houseName,
      capacity: Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity)) : 0,
      status: HouseAssignmentStatus.ACTIVE,
    },
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'HOUSE_CREATED',
    entityType: 'HouseAssignment',
    entityId: house.id,
    metadata: { houseName: house.houseName, capacity: house.capacity },
  });

  res.status(201).json({ house });
}

export async function updateHouseAssignment(req: AuthRequest, res: Response) {
  const { id, houseName, capacity, status } = req.body as {
    id?: string;
    houseName?: string;
    capacity?: number;
    status?: HouseAssignmentStatus;
  };

  if (!id) return res.status(400).json({ error: 'House id is required' });
  const data: { houseName?: string; capacity?: number; status?: HouseAssignmentStatus } = {};
  const normalizedName = normalizeHouseName(houseName);
  if (normalizedName) data.houseName = normalizedName;
  if (capacity !== undefined && Number.isFinite(Number(capacity))) data.capacity = Math.max(0, Math.floor(Number(capacity)));
  if (status === HouseAssignmentStatus.ACTIVE || status === HouseAssignmentStatus.ARCHIVED) data.status = status;

  const house = await prisma.houseAssignment.update({ where: { id }, data });
  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: house.status === HouseAssignmentStatus.ARCHIVED ? 'HOUSE_ARCHIVED' : 'HOUSE_UPDATED',
    entityType: 'HouseAssignment',
    entityId: house.id,
    metadata: data,
  });

  res.json({ house });
}
