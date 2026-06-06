import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

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

  const body = req.body as { deviceLabel?: unknown; enabled?: unknown };
  const device = await prisma.adminDevice.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      adminId: req.user!.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: userAgent(req),
      deviceLabel: typeof body.deviceLabel === 'string' ? body.deviceLabel : 'Admin SOS device',
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      lastSeenAt: new Date(),
    },
    update: {
      adminId: req.user!.userId,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: userAgent(req),
      deviceLabel: typeof body.deviceLabel === 'string' ? body.deviceLabel : undefined,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      lastSeenAt: new Date(),
    },
  });

  res.status(201).json({ device });
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
