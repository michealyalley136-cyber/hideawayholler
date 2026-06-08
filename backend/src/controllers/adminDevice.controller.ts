import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getDefaultBusinessAccount } from '../services/businessBilling.service';

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function parseSubscription(body: Record<string, unknown>) {
  const subscription = (body.subscription || body) as PushSubscriptionBody;
  const endpoint = typeof subscription.endpoint === 'string' ? subscription.endpoint : '';
  const p256dh = typeof subscription.keys?.p256dh === 'string' ? subscription.keys.p256dh : '';
  const auth = typeof subscription.keys?.auth === 'string' ? subscription.keys.auth : '';

  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

function userAgent(req: AuthRequest) {
  const value = req.headers['user-agent'];
  return typeof value === 'string' ? value : undefined;
}

function deviceTypeFromUserAgent(value?: string) {
  if (!value) return 'unknown';
  if (/iPhone|iPad|iPod/i.test(value)) return 'ios';
  if (/Android/i.test(value)) return 'android';
  if (/Mobile/i.test(value)) return 'mobile';
  return 'desktop';
}

export async function listAdminDevices(req: AuthRequest, res: Response) {
  const devices = await prisma.adminDevice.findMany({
    where: { adminId: req.user!.userId },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ devices });
}

export async function registerAdminDevice(req: AuthRequest, res: Response) {
  const subscription = parseSubscription(req.body as Record<string, unknown>);
  if (!subscription) {
    return res.status(400).json({ error: 'Valid push subscription endpoint and keys are required' });
  }

  const body = req.body as { deviceLabel?: unknown; enabled?: unknown; deviceType?: unknown; userAgent?: unknown };
  const now = new Date();
  const agent = typeof body.userAgent === 'string' ? body.userAgent : userAgent(req);
  const business = await getDefaultBusinessAccount();
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : true;
  const deviceLabel = typeof body.deviceLabel === 'string' ? body.deviceLabel : 'Admin SOS device';
  const deviceType = typeof body.deviceType === 'string' ? body.deviceType : deviceTypeFromUserAgent(agent);

  const [device, pushSubscription] = await prisma.$transaction([
    prisma.adminDevice.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        adminId: req.user!.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: agent,
        deviceLabel,
        enabled,
        lastSeenAt: now,
      },
      update: {
        adminId: req.user!.userId,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: agent,
        deviceLabel,
        enabled,
        lastSeenAt: now,
      },
    }),
    prisma.adminPushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        adminId: req.user!.userId,
        businessId: business.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: agent,
        deviceType,
        isActive: enabled,
        lastSeenAt: now,
      },
      update: {
        adminId: req.user!.userId,
        businessId: business.id,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: agent,
        deviceType,
        isActive: enabled,
        lastSeenAt: now,
      },
    }),
  ]);

  res.status(201).json({
    success: true,
    registered: true,
    device,
    pushSubscription: {
      id: pushSubscription.id,
      endpoint: pushSubscription.endpoint,
      isActive: pushSubscription.isActive,
      deviceType: pushSubscription.deviceType,
      lastSeenAt: pushSubscription.lastSeenAt,
    },
  });
}

export async function updateAdminDevice(req: AuthRequest, res: Response) {
  const { id, enabled } = req.body as { id?: string; enabled?: boolean };
  if (!id || typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Device id and enabled flag are required' });
  }

  const device = await prisma.adminDevice.findFirst({ where: { id, adminId: req.user!.userId } });
  if (!device) {
    return res.status(404).json({ error: 'Admin device not found' });
  }

  const updated = await prisma.adminDevice.update({
    where: { id },
    data: { enabled, lastSeenAt: new Date() },
  });

  res.json({ device: updated });
}
