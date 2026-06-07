import { Prisma, SosSoundKey } from '@prisma/client';
import { prisma } from '../utils/prisma';

export const SOS_SETTINGS_KEY = 'sos_settings';

export const SOS_SOUND_LIBRARY: Record<SosSoundKey, { label: string; url: string }> = {
  EMERGENCY_SIREN: { label: 'Emergency Siren', url: '/sounds/sos-siren.mp3' },
  AIR_HORN: { label: 'Air Horn', url: '/sounds/11900601.mp3' },
  ALERT_BELL: { label: 'Alert Bell', url: '/sounds/49_20siren.mp3' },
  CRITICAL_ALERT: { label: 'Critical Alert', url: '/sounds/danger-siren-alarm_BfknMds.mp3' },
  WARNING_TONE: { label: 'Warning Tone', url: '/sounds/police-sirens-10000006.mp3' },
};

export type SosEscalationSettings = {
  smsFallbackAfterSeconds: number;
  backupAdminAfterSeconds: number;
};

export type SosSettings = {
  soundKey: SosSoundKey;
  browserNotificationsEnabled: boolean;
  continuousAlarmEnabled: boolean;
  escalation: SosEscalationSettings;
};

export const DEFAULT_SOS_SETTINGS: SosSettings = {
  soundKey: SosSoundKey.EMERGENCY_SIREN,
  browserNotificationsEnabled: true,
  continuousAlarmEnabled: true,
  escalation: {
    smsFallbackAfterSeconds: 30,
    backupAdminAfterSeconds: 90,
  },
};

function validSoundKey(value: unknown): value is SosSoundKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SOS_SOUND_LIBRARY, value);
}

export function normalizeSosSettings(value: unknown): SosSettings {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<SosSettings>;
  const rawEscalation = raw.escalation && typeof raw.escalation === 'object' ? raw.escalation : {};
  const smsFallbackAfterSeconds = Number((rawEscalation as Partial<SosEscalationSettings>).smsFallbackAfterSeconds);
  const backupAdminAfterSeconds = Number((rawEscalation as Partial<SosEscalationSettings>).backupAdminAfterSeconds);

  return {
    soundKey: validSoundKey(raw.soundKey) ? raw.soundKey : DEFAULT_SOS_SETTINGS.soundKey,
    browserNotificationsEnabled:
      typeof raw.browserNotificationsEnabled === 'boolean'
        ? raw.browserNotificationsEnabled
        : DEFAULT_SOS_SETTINGS.browserNotificationsEnabled,
    continuousAlarmEnabled:
      typeof raw.continuousAlarmEnabled === 'boolean'
        ? raw.continuousAlarmEnabled
        : DEFAULT_SOS_SETTINGS.continuousAlarmEnabled,
    escalation: {
      smsFallbackAfterSeconds: Number.isFinite(smsFallbackAfterSeconds)
        ? Math.max(0, Math.min(3600, smsFallbackAfterSeconds))
        : DEFAULT_SOS_SETTINGS.escalation.smsFallbackAfterSeconds,
      backupAdminAfterSeconds: Number.isFinite(backupAdminAfterSeconds)
        ? Math.max(0, Math.min(7200, backupAdminAfterSeconds))
        : DEFAULT_SOS_SETTINGS.escalation.backupAdminAfterSeconds,
    },
  };
}

export async function getSosSettings() {
  const setting = await prisma.appSetting.findUnique({ where: { key: SOS_SETTINGS_KEY } });
  return normalizeSosSettings(setting?.value);
}

export async function saveSosSettings(settings: SosSettings) {
  return prisma.appSetting.upsert({
    where: { key: SOS_SETTINGS_KEY },
    create: { key: SOS_SETTINGS_KEY, value: settings as unknown as Prisma.InputJsonValue },
    update: { value: settings as unknown as Prisma.InputJsonValue },
  });
}

export function publicSosSettings(settings: SosSettings) {
  return {
    ...settings,
    sound: SOS_SOUND_LIBRARY[settings.soundKey],
    soundLibrary: Object.entries(SOS_SOUND_LIBRARY).map(([key, sound]) => ({ key, ...sound })),
  };
}
