import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

const ANIMAL_HOUSES = ['Bear House', 'Deer House', 'Elk House', 'Fox House'];

export async function listProperties(_req: AuthRequest, res: Response) {
  const properties = await prisma.property.findMany({
    include: {
      buildings: {
        where: { name: { in: ANIMAL_HOUSES } },
        include: {
          rooms: {
            include: {
              beds: true,
              assignments: { where: { vacatedAt: null }, include: { user: { include: { profile: true } } } },
            },
          },
        },
      },
    },
  });

  const enriched = properties.map((p) => ({
    ...p,
    stats: computePropertyStats(p),
  }));

  res.json({ properties: enriched });
}

function computePropertyStats(property: {
  buildings: { rooms: { capacity: number; beds: { id: string }[]; assignments: unknown[] }[] }[];
}) {
  let capacity = 0;
  let occupied = 0;
  for (const b of property.buildings) {
    for (const r of b.rooms) {
      capacity += r.beds.length || r.capacity;
      occupied += r.assignments.length;
    }
  }
  return { capacity, occupied, vacant: capacity - occupied };
}

export async function createProperty(req: AuthRequest, res: Response) {
  const property = await prisma.property.create({ data: req.body });
  res.status(201).json({ property });
}

export async function createBuilding(req: AuthRequest, res: Response) {
  const building = await prisma.building.create({
    data: { propertyId: req.params.propertyId, ...req.body },
  });
  res.status(201).json({ building });
}

export async function createRoom(req: AuthRequest, res: Response) {
  const { roomNumber, capacity, floor, notes, beds } = req.body;
  const room = await prisma.room.create({
    data: {
      buildingId: req.params.buildingId,
      roomNumber,
      capacity: capacity || 2,
      floor,
      notes,
      beds: beds
        ? { create: beds.map((label: string) => ({ bedLabel: label })) }
        : { create: Array.from({ length: capacity || 2 }, (_, i) => ({ bedLabel: String.fromCharCode(65 + i) })) },
    },
    include: { beds: true },
  });
  res.status(201).json({ room });
}

export async function assignRoom(req: AuthRequest, res: Response) {
  const { userId, roomId, bedId, seasonId, notes } = req.body;

  await prisma.roomAssignment.updateMany({
    where: { userId, vacatedAt: null },
    data: { vacatedAt: new Date() },
  });

  const assignment = await prisma.roomAssignment.create({
    data: { userId, roomId, bedId, seasonId, notes },
    include: { room: true, bed: true, user: { include: { profile: true } } },
  });

  await prisma.residentProfile.update({
    where: { userId },
    data: { currentStatus: 'ROOM_ASSIGNED' },
  });
  if (seasonId) {
    await prisma.seasonResident.update({
      where: { userId_seasonId: { userId, seasonId } },
      data: { status: 'ROOM_ASSIGNED' },
    });
  }

  res.status(201).json({ assignment });
}

export async function getOccupancy(_req: AuthRequest, res: Response) {
  const [capacity, occupied] = await Promise.all([
    prisma.houseAssignment.aggregate({ where: { status: 'ACTIVE' }, _sum: { capacity: true } }),
    prisma.residentHouseAssignment.count({ where: { vacatedAt: null, houseAssignment: { status: 'ACTIVE' } } }),
  ]);
  const totalBeds = capacity._sum.capacity || 0;
  res.json({ totalBeds, occupied, vacant: totalBeds - occupied });
}
