import { Response } from 'express';
import {
  LeaseWorkflowStatus,
  MaintenanceStatus,
  PaymentStatus,
  ResidentStatus,
  ReviewStatus,
  SosAlertStatus,
  SupplyRequestStatus,
  UserRole,
} from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getJourneySteps } from '../utils/residentJourney';

const COUNTY_ALERT_URL = 'https://public.coderedweb.com/CNE/en-US/7BCABB4C654F';

function journeyForResponse(status: ResidentStatus) {
  return getJourneySteps(status).map((step) => ({
    label: step.label,
    status: step.current ? 'current' : step.completed ? 'complete' : 'pending',
  }));
}

function formatRoleLabel(role: UserRole) {
  if (role === UserRole.RESIDENT) return 'Resident';
  if (role === UserRole.APPLICANT) return 'Applicant';
  if (role === UserRole.ALUMNI) return 'Alumni';
  return role.replace(/_/g, ' ');
}

function buildHousingDisplay(
  houseAssignment: { houseAssignment: { houseName: string } } | null,
  roomAssignment: { room: { roomNumber: string; building?: { name: string } | null }; bed?: { bedLabel: string } | null } | null
) {
  if (houseAssignment?.houseAssignment) {
    const houseName = houseAssignment.houseAssignment.houseName;
    return {
      assigned: true,
      propertyName: houseName,
      roomName: null as string | null,
      bedName: null as string | null,
      display: houseName,
    };
  }

  if (roomAssignment?.room) {
    const roomName = `Room ${roomAssignment.room.roomNumber}`;
    const propertyName = roomAssignment.room.building?.name ?? null;
    const bedName = roomAssignment.bed?.bedLabel ?? null;
    const display = [roomName, propertyName, bedName ? `Bed ${bedName}` : null].filter(Boolean).join(' · ');
    return {
      assigned: true,
      propertyName,
      roomName,
      bedName,
      display,
    };
  }

  return {
    assigned: false,
    propertyName: null as string | null,
    roomName: null as string | null,
    bedName: null as string | null,
    display: 'Not assigned',
  };
}

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

    if (process.env.NODE_ENV !== 'production') {
      console.info('[dashboard] resident request', { userId, role: req.user.role });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const allowedRoles: UserRole[] = [UserRole.RESIDENT, UserRole.APPLICANT, UserRole.ALUMNI, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const [
      activeSeason,
      unreadNotices,
      payments,
      maintenance,
      openMaintenance,
      openSupplyRequests,
      currentHouseAssignment,
      roomAssignment,
      currentLease,
      unreadNoticeList,
    ] = await Promise.all([
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
        orderBy: { dueDate: 'desc' },
        take: 5,
        include: { season: true },
      }),
      prisma.maintenanceRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.maintenanceRequest.count({
        where: {
          userId,
          status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS] },
        },
      }),
      prisma.supplyRequest.count({
        where: { userId, status: SupplyRequestStatus.OPEN },
      }),
      prisma.residentHouseAssignment.findFirst({
        where: { userId, vacatedAt: null },
        include: { houseAssignment: true },
        orderBy: { assignedAt: 'desc' },
      }),
      prisma.roomAssignment.findFirst({
        where: { userId, vacatedAt: null },
        include: { room: { include: { building: true } }, bed: true },
        orderBy: { assignedAt: 'desc' },
      }),
      prisma.lease.findFirst({
        where: { userId, status: { notIn: [LeaseWorkflowStatus.DRAFT, LeaseWorkflowStatus.ARCHIVED] } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notice.findMany({
        where: {
          isPublished: true,
          NOT: { reads: { some: { userId } } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, category: true, publishedAt: true },
      }),
    ]);

    const residentStatus = activeSeason?.status || user.profile?.currentStatus || ResidentStatus.APPLICANT;
    const housing = buildHousingDisplay(currentHouseAssignment, roomAssignment);
    const leaseStatusLabel = currentLease ? currentLease.status.replace(/_/g, ' ') : 'No lease';

    const payload = {
      resident: {
        id: user.id,
        name: user.profile?.fullName || user.email,
        email: user.email,
        status: formatRoleLabel(user.role),
      },
      summary: {
        unreadNotices: unreadNotices ?? 0,
        recentPayments: payments.length,
        openMaintenance: openMaintenance ?? 0,
        openSupplyRequests: openSupplyRequests ?? 0,
      },
      housing,
      lease: {
        hasLease: Boolean(currentLease),
        status: leaseStatusLabel,
        leaseId: currentLease?.id ?? null,
        canSign: currentLease?.status === LeaseWorkflowStatus.PENDING_SIGNATURE,
        title: currentLease?.title ?? null,
      },
      wifi: {
        networkName: 'Hideaway Guest',
        available: true,
      },
      alerts: {
        countyAlertName: 'CodeRED',
        countyAlertUrl: COUNTY_ALERT_URL,
      },
      journey: journeyForResponse(residentStatus),
      recentPaymentsList: payments,
      notices: unreadNoticeList,
      maintenance,
      activeSeason: activeSeason ?? null,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.info('[dashboard] resident response', {
        userId,
        unreadNotices: payload.summary.unreadNotices,
        payments: payload.summary.recentPayments,
        housing: payload.housing.display,
        lease: payload.lease.status,
      });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[dashboard] resident failed', { userId: req.user?.userId, message });
    res.status(500).json({ success: false, error: 'Unable to load resident dashboard.' });
  }
}
