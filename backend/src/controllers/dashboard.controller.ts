import { Response } from 'express';
import { PaymentStatus, MaintenanceStatus, ResidentStatus, SupplyRequestStatus, ReviewStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getJourneySteps } from '../utils/residentJourney';

const ANIMAL_HOUSES = ['Bear House', 'Deer House', 'Elk House', 'Fox House'];

export async function adminDashboard(req: AuthRequest, res: Response) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [
    totalResidents,
    activeResidents,
    newApplications,
    beds,
    occupiedAssignments,
    openMaintenance,
    rentDue,
    overduePayments,
    arrivalsThisWeek,
    departuresThisWeek,
    openSupplyRequests,
    pendingReviews,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { in: ['RESIDENT', 'ALUMNI'] } } }),
    prisma.seasonResident.count({ where: { status: ResidentStatus.ACTIVE_RESIDENT } }),
    prisma.application.count({ where: { status: 'PENDING' } }),
    prisma.bed.count({ where: { isActive: true, room: { building: { name: { in: ANIMAL_HOUSES } } } } }),
    prisma.roomAssignment.count({ where: { vacatedAt: null, room: { building: { name: { in: ANIMAL_HOUSES } } } } }),
    prisma.maintenanceRequest.count({ where: { status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS] } } }),
    prisma.payment.count({ where: { status: PaymentStatus.DUE } }),
    prisma.payment.count({ where: { status: PaymentStatus.OVERDUE } }),
    prisma.residentProfile.count({
      where: { arrivalDate: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.residentProfile.count({
      where: { departureDate: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.supplyRequest.count({ where: { status: SupplyRequestStatus.OPEN } }),
    prisma.residentReview.count({ where: { status: ReviewStatus.PENDING } }),
  ]);

  const vacantBeds = Math.max(0, beds - occupiedAssignments);
  const houseOccupancy = `${occupiedAssignments}/${beds}`;
  const weatherAlerts = 0;

  res.json({
    stats: {
      totalResidents,
      activeResidents,
      newApplications,
      vacantBeds,
      occupiedBeds: occupiedAssignments,
      openMaintenance,
      rentDue,
      overduePayments,
      arrivalsThisWeek,
      departuresThisWeek,
      openSupplyRequests,
      houseOccupancy,
      pendingReviews,
      weatherAlerts,
    },
  });
}

export async function residentDashboard(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;

  const [profile, activeSeason, unreadNotices, payments, maintenance, checkIn] = await Promise.all([
    prisma.residentProfile.findUnique({ where: { userId }, include: { documents: true } }),
    prisma.seasonResident.findFirst({
      where: { userId },
      include: { season: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notice.count({
      where: {
        isPublished: true,
        NOT: { reads: { some: { userId } } },
      },
    }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { season: true },
    }),
    prisma.maintenanceRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.checkIn.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const status = activeSeason?.status || profile?.currentStatus || ResidentStatus.APPLICANT;
  const journey = getJourneySteps(status);

  res.json({
    profile,
    activeSeason,
    journey,
    unreadNotices,
    recentPayments: payments,
    recentMaintenance: maintenance,
    checkIn,
  });
}
