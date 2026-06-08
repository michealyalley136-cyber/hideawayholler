import { SosAlert, SosAlertStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { getSosSettings } from './sosSettings.service';

type WebPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (subscription: WebPushSubscription, payload: string) => Promise<unknown>;
};

const SOS_PUSH_TITLE = 'Emergency SOS Alert';
const SOS_PUSH_BODY = 'A resident emergency alert has been triggered. Open the SOS console.';

let webPush: WebPushModule | null | undefined;
const scheduledFallbacks = new Set<string>();

function getWebPush() {
  if (webPush !== undefined) return webPush;

  try {
    // Optional at runtime so the API can still start if VAPID/web-push setup is incomplete.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    webPush = require('web-push') as WebPushModule;
  } catch {
    webPush = null;
  }

  return webPush;
}

function configureWebPush() {
  const push = getWebPush();
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || `mailto:${process.env.SOS_NOTIFICATION_EMAIL || 'admin@hideawayholler.com'}`;

  if (!push || !publicKey || !privateKey) {
    return null;
  }

  push.setVapidDetails(subject, publicKey, privateKey);
  return push;
}

export function getPushConfigurationStatus() {
  return {
    webPushAvailable: Boolean(getWebPush()),
    vapidPublicKeyConfigured: Boolean(process.env.VAPID_PUBLIC_KEY),
    vapidPrivateKeyConfigured: Boolean(process.env.VAPID_PRIVATE_KEY),
    configured: Boolean(getWebPush() && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  };
}

async function getOrCreateEmergencyAlert(sosAlertId: string) {
  return prisma.emergencyAlert.upsert({
    where: { sosAlertId },
    create: { sosAlertId, status: 'ACTIVE' },
    update: { status: 'ACTIVE', resolvedAt: null },
  });
}

async function logNotification(data: {
  emergencyAlertId?: string;
  sosAlertId?: string;
  adminDeviceId?: string;
  channel: string;
  status: string;
  message?: string;
}) {
  return prisma.emergencyNotificationLog.create({
    data: {
      emergencyAlertId: data.emergencyAlertId,
      sosAlertId: data.sosAlertId,
      adminDeviceId: data.adminDeviceId,
      channel: data.channel,
      status: data.status,
      message: data.message,
    },
  });
}

export async function sendSosPushNotifications(alert: Pick<SosAlert, 'id'>) {
  const settings = await getSosSettings();
  if (!settings.browserNotificationsEnabled) {
    await logNotification({
      sosAlertId: alert.id,
      channel: 'PUSH',
      status: 'SKIPPED',
      message: 'Browser notifications are disabled in SOS settings.',
    });
    return;
  }

  const emergencyAlert = await getOrCreateEmergencyAlert(alert.id);
  const fullAlert = await prisma.sosAlert.findUnique({ where: { id: alert.id } });
  const devices = await prisma.adminPushSubscription.findMany({
    where: {
      isActive: true,
      ...(fullAlert?.businessId ? { businessId: fullAlert.businessId } : {}),
    },
    orderBy: { lastSeenAt: 'desc' },
  });

  if (devices.length === 0) {
    await logNotification({
      emergencyAlertId: emergencyAlert.id,
      sosAlertId: alert.id,
      channel: 'PUSH',
      status: 'SKIPPED',
      message: 'No active admin devices are registered for SOS push notifications.',
    });
    console.warn('[sos push] No active admin devices registered', { sosAlertId: alert.id });
    return;
  }

  const push = configureWebPush();
  if (!push) {
    await logNotification({
      emergencyAlertId: emergencyAlert.id,
      sosAlertId: alert.id,
      channel: 'PUSH',
      status: 'SKIPPED',
      message: 'VAPID keys or web-push package are not configured.',
    });
    console.warn('[sos push] Push skipped because VAPID/web-push is not configured', { sosAlertId: alert.id });
    return;
  }

  const location = fullAlert?.streetAddress || fullAlert?.landmark || fullAlert?.assignment || 'Location unavailable';
  const emergencyType = fullAlert?.emergencyType || 'SOS';
  const body = fullAlert ? `${fullAlert.residentName} needs help. ${location}.` : SOS_PUSH_BODY;
  const payload = JSON.stringify({
    title: SOS_PUSH_TITLE,
    body,
    url: `/admin/sos?alertId=${alert.id}`,
    alertId: alert.id,
    residentName: fullAlert?.residentName,
    emergencyType,
    location,
    businessId: fullAlert?.businessId,
    createdAt: fullAlert?.createdAt,
    isTest: fullAlert?.isTest || false,
  });

  await Promise.all(
    devices.map(async (device) => {
      try {
        const adminDevice = await prisma.adminDevice.findUnique({ where: { endpoint: device.endpoint } });
        await push.sendNotification(
          {
            endpoint: device.endpoint,
            keys: { p256dh: device.p256dh, auth: device.auth },
          },
          payload
        );
        await logNotification({
          emergencyAlertId: emergencyAlert.id,
          sosAlertId: alert.id,
          adminDeviceId: adminDevice?.id,
          channel: 'PUSH',
          status: 'SENT',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown push send error';
        await logNotification({
          emergencyAlertId: emergencyAlert.id,
          sosAlertId: alert.id,
          adminDeviceId: (await prisma.adminDevice.findUnique({ where: { endpoint: device.endpoint } }))?.id,
          channel: 'PUSH',
          status: 'FAILED',
          message,
        });
        console.warn('[sos push] Failed to send SOS push notification', { sosAlertId: alert.id, adminDeviceId: device.id, message });
      }
    })
  );
}

function parsePhoneList(value?: string) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function sendSmsFallback(sosAlertId: string, phones: string[], stage: 'PRIMARY' | 'BACKUP') {
  const alert = await prisma.sosAlert.findUnique({ where: { id: sosAlertId } });
  if (!alert || alert.status === SosAlertStatus.RESOLVED || alert.status === SosAlertStatus.SAFE || alert.adminAcknowledged) {
    return;
  }

  if (phones.length === 0) {
    await logNotification({
      sosAlertId,
      channel: 'SMS',
      status: 'SKIPPED',
      message: `${stage} SMS fallback skipped because no phone numbers are configured.`,
    });
    return;
  }

  const smsUrl = process.env.SMS_API_URL;
  const smsApiKey = process.env.SMS_API_KEY;
  const smsFrom = process.env.SMS_FROM;

  if (!smsUrl || !smsApiKey) {
    await logNotification({
      sosAlertId,
      channel: 'SMS',
      status: 'SKIPPED',
      message: `${stage} SMS fallback configured with numbers but SMS_API_URL/SMS_API_KEY is missing.`,
    });
    console.warn('[sos sms] SMS fallback skipped; provider credentials missing', { sosAlertId, stage });
    return;
  }

  await Promise.all(
    phones.map(async (to) => {
      try {
        await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${smsApiKey}`,
          },
          body: JSON.stringify({
            to,
            from: smsFrom,
            body: 'Emergency SOS Alert: Open the Hideaway Holler SOS console immediately.',
          }),
        });
        await logNotification({ sosAlertId, channel: 'SMS', status: 'SENT', message: `${stage} fallback sent to ${to}` });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown SMS send error';
        await logNotification({ sosAlertId, channel: 'SMS', status: 'FAILED', message: `${stage} fallback to ${to}: ${message}` });
      }
    })
  );
}

export async function scheduleSosFallbacks(sosAlertId: string) {
  if (scheduledFallbacks.has(sosAlertId)) return;
  scheduledFallbacks.add(sosAlertId);
  const settings = await getSosSettings();
  const primaryDelay = Math.max(0, settings.escalation.smsFallbackAfterSeconds) * 1000;
  const backupDelay = Math.max(primaryDelay, settings.escalation.backupAdminAfterSeconds * 1000);

  setTimeout(() => {
    void sendSmsFallback(sosAlertId, parsePhoneList(process.env.SOS_SMS_ADMIN_PHONES), 'PRIMARY');
  }, primaryDelay);

  setTimeout(() => {
    void sendSmsFallback(sosAlertId, parsePhoneList(process.env.SOS_SMS_BACKUP_PHONES), 'BACKUP').finally(() => {
      scheduledFallbacks.delete(sosAlertId);
    });
  }, backupDelay);
}

export async function markEmergencyAlertAcknowledged(sosAlertId: string) {
  await prisma.emergencyAlert.updateMany({
    where: { sosAlertId },
    data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
  });
}

export async function markEmergencyAlertResolved(sosAlertId: string) {
  await prisma.emergencyAlert.updateMany({
    where: { sosAlertId },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
}
