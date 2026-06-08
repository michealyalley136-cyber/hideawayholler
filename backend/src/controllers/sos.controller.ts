import { Response } from 'express';
import { SosAlertStatus, SosEventType, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getDefaultBusinessAccount } from '../services/businessBilling.service';
import {
  getPushConfigurationStatus,
  markEmergencyAlertAcknowledged,
  markEmergencyAlertResolved,
  scheduleSosFallbacks,
} from '../services/emergencyNotification.service';

const ACTIVE_STATUSES = [
  SosAlertStatus.ACTIVE,
  SosAlertStatus.ACKNOWLEDGED,
  SosAlertStatus.NEEDS_HELP,
];
const RESIDENT_SOS_ROLES: UserRole[] = [UserRole.RESIDENT, UserRole.APPLICANT, UserRole.ALUMNI];

function parseLocation(body: Record<string, unknown>) {
  const hasLatitude = body.latitude !== undefined && body.latitude !== null && body.latitude !== '';
  const hasLongitude = body.longitude !== undefined && body.longitude !== null && body.longitude !== '';
  const latitude = hasLatitude ? Number(body.latitude) : null;
  const longitude = hasLongitude ? Number(body.longitude) : null;
  const accuracy = body.accuracy === undefined || body.accuracy === null ? undefined : Number(body.accuracy);
  const speed = body.speed === undefined || body.speed === null ? undefined : Number(body.speed);
  const heading = body.heading === undefined || body.heading === null ? undefined : Number(body.heading);

  if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
    return { latitude: null, longitude: null, accuracy: undefined, speed: undefined, heading: undefined, streetAddress: 'Location unavailable', landmark: undefined, city: undefined, state: undefined };
  }

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    speed: Number.isFinite(speed) ? speed : undefined,
    heading: Number.isFinite(heading) ? heading : undefined,
    streetAddress: typeof body.streetAddress === 'string' ? body.streetAddress : undefined,
    landmark: typeof body.landmark === 'string' ? body.landmark : undefined,
    city: typeof body.city === 'string' ? body.city : undefined,
    state: typeof body.state === 'string' ? body.state : undefined,
  };
}

type ParsedLocation = ReturnType<typeof parseLocation>;

async function reverseGeocode(location: ParsedLocation): Promise<ParsedLocation> {
  if (!hasCoordinates(location) || (location.streetAddress && location.city && location.state)) return location;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(location.latitude));
    url.searchParams.set('lon', String(location.longitude));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'HollerHub SOS geocoder (admin@hideawayholler.com)' },
    });
    if (!response.ok) return location;
    const data = (await response.json()) as {
      display_name?: string;
      name?: string;
      address?: {
        house_number?: string;
        road?: string;
        neighbourhood?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
      };
    };
    const address = data.address || {};
    const street = [address.house_number, address.road].filter(Boolean).join(' ');
    return {
      ...location,
      streetAddress: location.streetAddress || street || data.display_name || 'Location available',
      landmark: location.landmark || data.name || address.neighbourhood || address.suburb || address.county,
      city: location.city || address.city || address.town || address.village,
      state: location.state || address.state,
    };
  } catch (err) {
    console.warn('[sos geocode] Reverse geocoding failed', {
      message: err instanceof Error ? err.message : 'Unknown geocoding error',
    });
    return location;
  } finally {
    clearTimeout(timeout);
  }
}

function hasCoordinates(location: { latitude: number | null; longitude: number | null }) {
  return location.latitude !== null && location.longitude !== null;
}

function sortActiveAlerts<T extends { status: SosAlertStatus; trackingActive: boolean; adminAcknowledgedAt: Date | null; createdAt: Date }>(alerts: T[]) {
  const rank = (alert: T) => {
    if (alert.status === SosAlertStatus.ACTIVE && !alert.adminAcknowledgedAt) return 0;
    if (alert.trackingActive || alert.status === SosAlertStatus.NEEDS_HELP) return 1;
    if (alert.status === SosAlertStatus.ACKNOWLEDGED) return 2;
    return 3;
  };

  return alerts.sort((a, b) => {
    const urgency = rank(a) - rank(b);
    if (urgency !== 0) return urgency;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

async function enrichAlertLocationIfNeeded<T extends {
  id: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
  initialLatitude: number | null;
  initialLongitude: number | null;
  accuracy: number | null;
  streetAddress: string | null;
  landmark: string | null;
  city?: string | null;
  state?: string | null;
}>(alert: T): Promise<T> {
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  if (latitude == null || longitude == null || (alert.streetAddress && alert.city && alert.state)) return alert;

  const enriched = await reverseGeocode({
    latitude,
    longitude,
    accuracy: alert.accuracy ?? undefined,
    speed: undefined,
    heading: undefined,
    streetAddress: alert.streetAddress ?? undefined,
    landmark: alert.landmark ?? undefined,
    city: alert.city ?? undefined,
    state: alert.state ?? undefined,
  });

  if (!enriched.streetAddress && !enriched.landmark && !enriched.city && !enriched.state) return alert;

  const updated = await prisma.sosAlert.update({
    where: { id: alert.id },
    data: {
      streetAddress: enriched.streetAddress || alert.streetAddress,
      landmark: enriched.landmark || alert.landmark,
      city: enriched.city || alert.city,
      state: enriched.state || alert.state,
    },
    include: {
      resident: { include: { profile: true } },
      locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  return { ...alert, ...updated };
}

function logSosEvent(data: {
  sosAlertId: string;
  residentId?: string | null;
  adminId?: string | null;
  eventType: SosEventType;
  eventMessage: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  return prisma.sosEventLog.create({
    data: {
      sosAlertId: data.sosAlertId,
      residentId: data.residentId || undefined,
      adminId: data.adminId || undefined,
      eventType: data.eventType,
      eventMessage: data.eventMessage,
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
    },
  });
}

async function canAccessSosAlert(alert: { businessId: string | null }, user: AuthRequest['user']) {
  if (!user) return false;
  if (user.role === UserRole.SUPER_ADMIN) return true;
  const business = await getDefaultBusinessAccount();
  return !alert.businessId || alert.businessId === business.id;
}

async function updateSosAcknowledgement(sosAlertId: string, adminId: string, user: AuthRequest['user']) {
  const alert = await prisma.sosAlert.findUnique({ where: { id: sosAlertId } });

  if (!alert) {
    return null;
  }
  if (!(await canAccessSosAlert(alert, user))) return 'FORBIDDEN' as const;

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const acknowledged = await tx.sosAlert.update({
      where: { id: alert.id },
      data: {
        status: SosAlertStatus.ACKNOWLEDGED,
        adminAcknowledged: true,
        adminAcknowledgedAt: alert.adminAcknowledgedAt || now,
        adminAcknowledgedBy: alert.adminAcknowledgedBy || adminId,
      },
      include: {
        resident: { include: { profile: true } },
        locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
        eventLogs: { orderBy: { createdAt: 'desc' }, take: 25 },
      },
    });

    await tx.sosEventLog.create({
      data: {
        sosAlertId: alert.id,
        residentId: alert.residentId,
        adminId,
        eventType: SosEventType.ADMIN_ACKNOWLEDGED,
        eventMessage: 'Admin acknowledged the SOS alert.',
        latitude: alert.currentLatitude ?? alert.initialLatitude,
        longitude: alert.currentLongitude ?? alert.initialLongitude,
      },
    });

    return acknowledged;
  });

  console.info('[sos admin] Alert acknowledged', { sosAlertId: updated.id, adminId });
  void markEmergencyAlertAcknowledged(updated.id).catch((err) => {
    console.warn('[sos admin] Emergency alert acknowledge mirror failed', {
      sosAlertId: updated.id,
      message: err instanceof Error ? err.message : 'Unknown mirror update error',
    });
  });
  return updated;
}

async function residentContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      residentHouseAssignments: {
        where: { vacatedAt: null },
        include: { houseAssignment: true },
        orderBy: { assignedAt: 'desc' },
        take: 1,
      },
      roomAssignments: {
        where: { vacatedAt: null },
        include: {
          bed: true,
          room: {
            include: {
              building: { include: { property: true } },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) return null;

  const houseAssignment = user.residentHouseAssignments[0]?.houseAssignment.houseName;
  return {
    residentName: user.profile?.fullName || user.email,
    phone: user.profile?.phone,
    assignment: houseAssignment || 'House assignment pending',
  };
}

export async function createSosAlert(req: AuthRequest, res: Response) {
  console.info('[sos resident] SOS API request received', { residentId: req.user!.userId, role: req.user!.role });

  if (!RESIDENT_SOS_ROLES.includes(req.user!.role)) {
    return res.status(403).json({ error: 'Only resident portal users can create resident SOS alerts' });
  }

  const location = await reverseGeocode(parseLocation(req.body));

  const existing = await prisma.sosAlert.findFirst({
    where: { residentId: req.user!.userId, status: { in: ACTIVE_STATUSES } },
    include: { locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 } },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const updated = await prisma.$transaction(async (tx) => {
      if (hasCoordinates(location)) {
        await tx.sosLocationHistory.create({
          data: {
            sosAlertId: existing.id,
            residentId: req.user!.userId,
            latitude: location.latitude!,
            longitude: location.longitude!,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading,
            streetAddress: location.streetAddress,
            landmark: location.landmark,
            city: location.city,
            state: location.state,
          },
        });
      }

      await tx.sosEventLog.create({
        data: {
          sosAlertId: existing.id,
          residentId: req.user!.userId,
          eventType: SosEventType.LOCATION_UPDATED,
          eventMessage: 'Resident pressed SOS again while an alert was already active. Current location was updated.',
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });

      return tx.sosAlert.update({
        where: { id: existing.id },
        data: {
          currentLatitude: location.latitude ?? existing.currentLatitude,
          currentLongitude: location.longitude ?? existing.currentLongitude,
          accuracy: location.accuracy,
          streetAddress: location.streetAddress || existing.streetAddress,
          landmark: location.landmark || existing.landmark,
          city: location.city || existing.city,
          state: location.state || existing.state,
          trackingActive: hasCoordinates(location) ? true : existing.trackingActive,
          trackingStartedAt: hasCoordinates(location) ? existing.trackingStartedAt || new Date() : existing.trackingStartedAt,
        },
        include: { locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 } },
      });
    });

    console.info('[sos resident] Existing active SOS updated', { sosAlertId: updated.id, residentId: req.user!.userId });
    return res.json({
      success: true,
      alert: updated,
      sosAlert: { id: updated.id, businessId: updated.businessId, status: updated.status, createdAt: updated.createdAt },
      message: 'Your SOS is already active. Admin has been notified.',
    });
  }

  const context = await residentContext(req.user!.userId);
  if (!context) {
    return res.status(404).json({ error: 'Resident not found' });
  }
  const business = await getDefaultBusinessAccount();
  console.info('[sos resident] Creating SOS record', { residentId: req.user!.userId, role: req.user!.role, businessId: business.id });

  const alert = await prisma.$transaction(async (tx) => {
    const created = await tx.sosAlert.create({
      data: {
        residentId: req.user!.userId,
        businessId: business.id,
        emergencyType: typeof req.body.emergencyType === 'string' ? req.body.emergencyType : 'SOS',
        message: typeof req.body.message === 'string' ? req.body.message : null,
        residentName: context.residentName,
        assignment: context.assignment,
        phone: context.phone,
        initialLatitude: location.latitude,
        initialLongitude: location.longitude,
        currentLatitude: location.latitude,
        currentLongitude: location.longitude,
        accuracy: location.accuracy,
        streetAddress: location.streetAddress,
        landmark: location.landmark,
        city: location.city,
        state: location.state,
        trackingActive: hasCoordinates(location),
        trackingStartedAt: hasCoordinates(location) ? new Date() : undefined,
        ...(hasCoordinates(location)
          ? {
              locationHistory: {
                create: {
                  residentId: req.user!.userId,
                  latitude: location.latitude!,
                  longitude: location.longitude!,
                  accuracy: location.accuracy,
                  speed: location.speed,
                  heading: location.heading,
                  streetAddress: location.streetAddress,
                  landmark: location.landmark,
                  city: location.city,
                  state: location.state,
                },
              },
            }
          : {}),
      },
      include: { locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    await tx.sosEventLog.createMany({
      data: [
        {
          sosAlertId: created.id,
          residentId: req.user!.userId,
          eventType: SosEventType.SOS_TRIGGERED,
          eventMessage: 'Resident triggered an SOS alert.',
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          sosAlertId: created.id,
          residentId: req.user!.userId,
          eventType: SosEventType.ADMIN_NOTIFIED,
          eventMessage: 'Admin notification was created for the SOS alert.',
          latitude: location.latitude,
          longitude: location.longitude,
        },
      ],
    });

    return created;
  });

  console.info('[sos resident] SOS record created successfully', { sosAlertId: alert.id, residentId: req.user!.userId, businessId: business.id });
  // Mobile push is disabled for the stable production path; admin dashboards receive SOS through polling.
  void scheduleSosFallbacks(alert.id).catch((err) => {
    console.warn('[sos resident] SOS fallback scheduling failed', {
      sosAlertId: alert.id,
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  });
  res.status(201).json({
    success: true,
    alert,
    sosAlert: { id: alert.id, businessId: alert.businessId, status: alert.status, createdAt: alert.createdAt },
  });
}

export async function createTestSosAlert(req: AuthRequest, res: Response) {
  const business = await getDefaultBusinessAccount();
  const location = await reverseGeocode(parseLocation({
    latitude: req.body?.latitude ?? 35.5175,
    longitude: req.body?.longitude ?? -86.5804,
    accuracy: req.body?.accuracy ?? 25,
    streetAddress: req.body?.streetAddress ?? 'Test SOS location',
    landmark: req.body?.landmark ?? 'Super Admin test alert',
  }));

  if (!location) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  const adminUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!adminUser) return res.status(404).json({ error: 'Admin user not found' });

  const alert = await prisma.$transaction(async (tx) => {
    const created = await tx.sosAlert.create({
      data: {
        residentId: adminUser.id,
        businessId: business.id,
        emergencyType: 'TEST_SOS',
        message: 'Super admin generated a production device test alert.',
        isTest: true,
        residentName: 'TEST SOS ALERT',
        assignment: 'Super Admin generated test',
        phone: null,
        initialLatitude: location.latitude,
        initialLongitude: location.longitude,
        currentLatitude: location.latitude,
        currentLongitude: location.longitude,
        accuracy: location.accuracy,
        streetAddress: location.streetAddress,
        landmark: location.landmark,
        city: location.city,
        state: location.state,
        trackingActive: true,
        trackingStartedAt: new Date(),
      },
    });

    await tx.sosEventLog.create({
      data: {
        sosAlertId: created.id,
        residentId: adminUser.id,
        adminId: adminUser.id,
        eventType: SosEventType.SOS_TRIGGERED,
        eventMessage: 'Super admin generated a test SOS alert.',
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });

    return created;
  });

  res.status(201).json({ alert });
}

export async function getActiveSosAlert(req: AuthRequest, res: Response) {
  const alert = await prisma.sosAlert.findFirst({
    where: { residentId: req.user!.userId, status: { in: ACTIVE_STATUSES } },
    include: { locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ alert });
}

export async function residentSosAction(req: AuthRequest, res: Response) {
  const { action } = req.body as { action?: string };
  const alert = await prisma.sosAlert.findFirst({
    where: { id: req.params.id, residentId: req.user!.userId },
  });

  if (!alert) {
    return res.status(404).json({ error: 'SOS alert not found' });
  }

  if (alert.status === SosAlertStatus.RESOLVED || alert.status === SosAlertStatus.SAFE) {
    return res.json({ alert });
  }

  const now = new Date();
  const data =
    action === 'SAFE'
      ? {
          status: SosAlertStatus.SAFE,
          residentLastResponse: 'SAFE',
          residentRespondedAt: now,
          trackingActive: false,
          resolvedAt: now,
          resolvedBy: req.user!.userId,
        }
      : action === 'NEEDS_HELP'
        ? {
            status: SosAlertStatus.NEEDS_HELP,
            residentLastResponse: 'NEEDS_HELP',
            residentRespondedAt: now,
            trackingActive: true,
            trackingStartedAt: alert.trackingStartedAt || now,
          }
        : action === 'KEEP_ACTIVE'
          ? {
              residentLastResponse: 'KEEP_ACTIVE',
              residentRespondedAt: now,
            }
          : null;

  if (!data) {
    return res.status(400).json({ error: 'Unsupported resident SOS action' });
  }

  const updated = await prisma.sosAlert.update({
    where: { id: alert.id },
    data,
    include: { locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });

  if (action === 'SAFE') {
    await logSosEvent({
      sosAlertId: alert.id,
      residentId: req.user!.userId,
      eventType: SosEventType.RESIDENT_CONFIRMED_SAFE,
      eventMessage: 'Resident marked themselves safe.',
      latitude: alert.currentLatitude ?? alert.initialLatitude,
      longitude: alert.currentLongitude ?? alert.initialLongitude,
    });
    await logSosEvent({
      sosAlertId: alert.id,
      residentId: req.user!.userId,
      eventType: SosEventType.SOS_RESOLVED,
      eventMessage: 'SOS alert was resolved after resident confirmed safe.',
      latitude: alert.currentLatitude ?? alert.initialLatitude,
      longitude: alert.currentLongitude ?? alert.initialLongitude,
    });
  }

  if (action === 'NEEDS_HELP' && !alert.trackingStartedAt) {
    await logSosEvent({
      sosAlertId: alert.id,
      residentId: req.user!.userId,
      eventType: SosEventType.TRACKING_STARTED,
      eventMessage: 'Location tracking started after resident indicated they need help.',
      latitude: alert.currentLatitude ?? alert.initialLatitude,
      longitude: alert.currentLongitude ?? alert.initialLongitude,
    });
  }

  if (action === 'SAFE') {
    await markEmergencyAlertResolved(updated.id);
  }
  res.json({ success: true, sosAlert: updated, alert: updated });
}

export async function addSosLocation(req: AuthRequest, res: Response) {
  const location = await reverseGeocode(parseLocation(req.body));
  if (!hasCoordinates(location)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }
  const latitude = location.latitude!;
  const longitude = location.longitude!;

  const alert = await prisma.sosAlert.findFirst({
    where: { id: req.params.id, residentId: req.user!.userId, status: { in: ACTIVE_STATUSES } },
  });

  if (!alert) {
    return res.status(404).json({ error: 'Active SOS alert not found' });
  }

  const now = new Date();
  const [history, updated] = await prisma.$transaction([
    prisma.sosLocationHistory.create({
      data: {
        sosAlertId: alert.id,
        residentId: req.user!.userId,
        latitude,
        longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        streetAddress: location.streetAddress,
        landmark: location.landmark,
        city: location.city,
        state: location.state,
      },
    }),
    prisma.sosAlert.update({
      where: { id: alert.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        accuracy: location.accuracy,
        streetAddress: location.streetAddress || alert.streetAddress,
        landmark: location.landmark || alert.landmark,
        city: location.city || alert.city,
        state: location.state || alert.state,
        trackingActive: true,
        trackingStartedAt: alert.trackingStartedAt || now,
      },
      include: { locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 } },
    }),
    prisma.sosEventLog.create({
      data: {
        sosAlertId: alert.id,
        residentId: req.user!.userId,
        eventType: SosEventType.LOCATION_UPDATED,
        eventMessage: 'Resident location update recorded.',
        latitude,
        longitude,
      },
    }),
  ]);

  if (!alert.trackingStartedAt) {
    await logSosEvent({
      sosAlertId: alert.id,
      residentId: req.user!.userId,
      eventType: SosEventType.TRACKING_STARTED,
      eventMessage: 'Continuous SOS location tracking started.',
      latitude,
      longitude,
    });
  }

  res.status(201).json({ history, alert: updated });
}

export async function listSosAlerts(req: AuthRequest, res: Response) {
  const business = await getDefaultBusinessAccount();
  const alerts = await prisma.sosAlert.findMany({
    where: req.user!.role === UserRole.SUPER_ADMIN ? undefined : { OR: [{ businessId: business.id }, { businessId: null }] },
    include: {
      resident: { include: { profile: true } },
      locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  res.json({ alerts });
}

export async function listActiveAdminSosAlerts(req: AuthRequest, res: Response) {
  console.info('[sos admin] Polling active SOS alerts', { adminId: req.user!.userId });
  const business = await getDefaultBusinessAccount();

  const alerts = await prisma.sosAlert.findMany({
    where: {
      OR: [{ businessId: business.id }, { businessId: null }],
      status: { not: SosAlertStatus.RESOLVED },
      resolvedAt: null,
    },
    include: {
      resident: { include: { profile: true } },
      locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const enrichedAlerts = await Promise.all(alerts.map((alert) => enrichAlertLocationIfNeeded(alert)));
  const sorted = sortActiveAlerts(enrichedAlerts);
  console.info('[sos admin] Active SOS query complete', {
    adminId: req.user!.userId,
    role: req.user!.role,
    businessId: business.id,
    count: sorted.length,
    alertIds: sorted.map((alert) => alert.id),
  });

  res.json({ alerts: sorted, count: sorted.length, businessId: business.id, role: req.user!.role });
}

export async function getSosPushConfig(req: AuthRequest, res: Response) {
  res.json({
    push: getPushConfigurationStatus(),
    warning: getPushConfigurationStatus().configured
      ? null
      : 'Push notifications are not fully configured in production. SOS dashboard fallback is active, but background mobile notifications may not work.',
  });
}

export async function listSosHistory(req: AuthRequest, res: Response) {
  const business = await getDefaultBusinessAccount();
  const alerts = await prisma.sosAlert.findMany({
    where:
      req.user!.role === UserRole.SUPER_ADMIN
        ? undefined
        : {
            AND: [
              { OR: [{ businessId: business.id }, { businessId: null }] },
              {
                OR: [
                  { status: { in: [SosAlertStatus.RESOLVED, SosAlertStatus.SAFE] } },
                  { resolvedAt: { not: null } },
                ],
              },
            ],
          },
    include: {
      resident: { include: { profile: true } },
      locationHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      eventLogs: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  res.json({ alerts });
}

export async function listSuperAdminSosLogs(req: AuthRequest, res: Response) {
  const alerts = await prisma.sosAlert.findMany({
    include: {
      resident: { include: { profile: true } },
      locationHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      eventLogs: { orderBy: { createdAt: 'asc' } },
      business: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  res.json({ alerts });
}

export async function getSosAlert(req: AuthRequest, res: Response) {
  const alert = await prisma.sosAlert.findUnique({
    where: { id: req.params.id },
    include: {
      resident: { include: { profile: true } },
      locationHistory: { orderBy: { createdAt: 'desc' } },
      eventLogs: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!alert) {
    return res.status(404).json({ error: 'SOS alert not found' });
  }
  if (!(await canAccessSosAlert(alert, req.user))) return res.status(403).json({ error: 'Insufficient permissions for this SOS alert' });

  res.json({ alert });
}

export async function acknowledgeSosAlert(req: AuthRequest, res: Response) {
  const sosAlertId = req.params.sosAlertId;
  if (!sosAlertId) {
    return res.status(400).json({ success: false, error: 'Missing SOS alert ID.' });
  }

  try {
    const updated = await updateSosAcknowledgement(sosAlertId, req.user!.userId, req.user);

    if (updated === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Insufficient permissions for this SOS alert' });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'SOS alert not found' });
    }

    return res.json({ success: true, sos: updated, sosAlert: updated, alert: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error acknowledging SOS alert.';
    console.error('[sos admin] Acknowledge failed', { sosAlertId, message });
    return res.status(500).json({ success: false, error: `Unable to acknowledge SOS alert: ${message}` });
  }
}

export async function resolveSosAlert(req: AuthRequest, res: Response) {
  req.params.id = req.params.sosAlertId;
  req.body = { ...(req.body || {}), action: 'RESOLVE' };
  return adminSosAction(req, res);
}

export async function muteSosAlert(req: AuthRequest, res: Response) {
  const alert = await prisma.sosAlert.findUnique({ where: { id: req.params.sosAlertId } });

  if (!alert) {
    return res.status(404).json({ error: 'SOS alert not found' });
  }
  if (!(await canAccessSosAlert(alert, req.user))) return res.status(403).json({ error: 'Insufficient permissions for this SOS alert' });

  await logSosEvent({
    sosAlertId: alert.id,
    residentId: alert.residentId,
    adminId: req.user!.userId,
    eventType: SosEventType.SOS_MUTED,
    eventMessage: 'Admin muted the SOS siren for this alert.',
    latitude: alert.currentLatitude ?? alert.initialLatitude,
    longitude: alert.currentLongitude ?? alert.initialLongitude,
  });

  res.json({ alert });
}

export async function adminSosAction(req: AuthRequest, res: Response) {
  const { action } = req.body as { action?: string };
  if (!req.params.id) {
    return res.status(400).json({ success: false, error: 'Missing SOS alert ID.' });
  }

  try {
  const alert = await prisma.sosAlert.findUnique({ where: { id: req.params.id } });

  if (!alert) {
    return res.status(404).json({ success: false, error: 'SOS alert not found' });
  }
  if (!(await canAccessSosAlert(alert, req.user))) return res.status(403).json({ success: false, error: 'Insufficient permissions for this SOS alert' });

  const now = new Date();
  const data =
    action === 'ACKNOWLEDGE'
      ? null
      : action === 'RESOLVE'
        ? {
            status: SosAlertStatus.RESOLVED,
            trackingActive: false,
            resolvedAt: now,
            resolvedBy: req.user!.userId,
          }
        : null;

  if (action === 'ACKNOWLEDGE') {
    const updated = await updateSosAcknowledgement(alert.id, req.user!.userId, req.user);
    if (updated === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Insufficient permissions for this SOS alert' });
    return res.json({ success: true, sos: updated, sosAlert: updated, alert: updated });
  }

  if (!data) {
    return res.status(400).json({ success: false, error: 'Unsupported admin SOS action' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const resolved = await tx.sosAlert.update({
      where: { id: alert.id },
      data,
      include: {
        resident: { include: { profile: true } },
        locationHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
        eventLogs: { orderBy: { createdAt: 'desc' }, take: 25 },
      },
    });

    await tx.sosEventLog.createMany({
      data: [
        {
          sosAlertId: alert.id,
          residentId: alert.residentId,
          adminId: req.user!.userId,
          eventType: SosEventType.ADMIN_MARKED_RESOLVED,
          eventMessage: 'Admin marked the SOS alert resolved.',
          latitude: alert.currentLatitude ?? alert.initialLatitude,
          longitude: alert.currentLongitude ?? alert.initialLongitude,
        },
        {
          sosAlertId: alert.id,
          residentId: alert.residentId,
          adminId: req.user!.userId,
          eventType: SosEventType.SOS_RESOLVED,
          eventMessage: 'SOS alert was resolved by admin.',
          latitude: alert.currentLatitude ?? alert.initialLatitude,
          longitude: alert.currentLongitude ?? alert.initialLongitude,
        },
      ],
    });

    return resolved;
  });

  void markEmergencyAlertResolved(updated.id).catch((err) => {
    console.warn('[sos admin] Emergency alert resolve mirror failed', {
      sosAlertId: updated.id,
      message: err instanceof Error ? err.message : 'Unknown mirror update error',
    });
  });
  return res.json({ success: true, sos: updated, sosAlert: updated, alert: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error updating SOS alert.';
    console.error('[sos admin] Admin SOS action failed', { sosAlertId: req.params.id, action, message });
    return res.status(500).json({ success: false, error: `Unable to ${action === 'RESOLVE' ? 'resolve' : 'update'} SOS alert: ${message}` });
  }
}
