import { Response } from 'express';
import { LeaseWorkflowStatus, PaymentStatus, MaintenanceStatus, ResidentStatus, SupplyRequestStatus, ReviewStatus, SosAlertStatus } from '@prisma/client';
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
    houseCapacity,
    houseOccupancyCount,
    openMaintenance,
    rentDue,
    overduePayments,
    arrivalsThisWeek,
    departuresThisWeek,
    openSupplyRequests,
    pendingReviews,
    activeSosAlerts,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { in: ['RESIDENT', 'ALUMNI'] } } }),
    prisma.seasonResident.count({ where: { status: ResidentStatus.ACTIVE_RESIDENT } }),
    prisma.application.count({ where: { status: 'PENDING' } }),
    prisma.houseAssignment.aggregate({ where: { status: 'ACTIVE' }, _sum: { capacity: true } }),
    prisma.residentHouseAssignment.count({ where: { vacatedAt: null, houseAssignment: { status: 'ACTIVE' } } }),
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
    prisma.sosAlert.count({ where: { status: { in: [SosAlertStatus.ACTIVE, SosAlertStatus.ACKNOWLEDGED, SosAlertStatus.NEEDS_HELP] } } }),
  ]);

  const beds = houseCapacity._sum.capacity || 0;
  const vacantBeds = Math.max(0, beds - houseOccupancyCount);
  const houseOccupancy = `${houseOccupancyCount}/${beds}`;
  const weatherAlerts = 0;

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    stats: {
      totalResidents,
      activeResidents,
      newApplications,
      vacantBeds,
      occupiedBeds: houseOccupancyCount,
      openMaintenance,
      rentDue,
      overduePayments,
      arrivalsThisWeek,
      departuresThisWeek,
      openSupplyRequests,
      houseOccupancy,
      pendingReviews,
      weatherAlerts,
      activeSosAlerts,
    },
  });
}

export async function residentDashboard(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const userId = req.user.userId;

    const [profile, activeSeason, unreadNotices, payments, maintenance, checkIn, currentHouseAssignment, currentLease, openSupplyRequests] = await Promise.all([
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
      prisma.residentHouseAssignment.findFirst({
        where: { userId, vacatedAt: null },
        include: { houseAssignment: true },
        orderBy: { assignedAt: 'desc' },
      }),
      prisma.lease.findFirst({
        where: { userId, status: { notIn: [LeaseWorkflowStatus.DRAFT, LeaseWorkflowStatus.ARCHIVED] } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplyRequest.count({
        where: { userId, status: SupplyRequestStatus.OPEN },
      }),
    ]);

    const status = activeSeason?.status || profile?.currentStatus || ResidentStatus.APPLICANT;
    const journey = getJourneySteps(status);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      profile: profile ?? null,
      activeSeason: activeSeason ?? null,
      journey: journey ?? [],
      unreadNotices: unreadNotices ?? 0,
      recentPayments: payments ?? [],
      recentMaintenance: maintenance ?? [],
      checkIn: checkIn ?? null,
      currentAssignment: currentHouseAssignment?.houseAssignment?.houseName ?? null,
      currentLease: currentLease ?? null,
      openSupplyRequests: openSupplyRequests ?? 0,
    });
  } catch (err) {
    console.error('[dashboard] resident failed', { userId: req.user?.userId, err });
    res.status(500).json({ success: false, error: 'Unable to load resident dashboard.' });
  }
}
