export type SosSoundKey = 'EMERGENCY_SIREN' | 'AIR_HORN' | 'ALERT_BELL' | 'CRITICAL_ALERT' | 'WARNING_TONE';

export interface SosSoundOption {
  key: SosSoundKey;
  label: string;
  url: string;
}

export interface SosSettings {
  soundKey: SosSoundKey;
  browserNotificationsEnabled: boolean;
  continuousAlarmEnabled: boolean;
  escalation: {
    smsFallbackAfterSeconds: number;
    backupAdminAfterSeconds: number;
  };
  sound: SosSoundOption;
  soundLibrary: SosSoundOption[];
}

export const DEFAULT_SOS_SETTINGS: SosSettings = {
  soundKey: 'EMERGENCY_SIREN',
  browserNotificationsEnabled: true,
  continuousAlarmEnabled: true,
  escalation: {
    smsFallbackAfterSeconds: 30,
    backupAdminAfterSeconds: 90,
  },
  sound: { key: 'EMERGENCY_SIREN', label: 'Emergency Siren', url: '/sounds/sos-siren.mp3' },
  soundLibrary: [
    { key: 'EMERGENCY_SIREN', label: 'Emergency Siren', url: '/sounds/sos-siren.mp3' },
    { key: 'AIR_HORN', label: 'Air Horn', url: '/sounds/11900601.mp3' },
    { key: 'ALERT_BELL', label: 'Alert Bell', url: '/sounds/49_20siren.mp3' },
    { key: 'CRITICAL_ALERT', label: 'Critical Alert', url: '/sounds/danger-siren-alarm_BfknMds.mp3' },
    { key: 'WARNING_TONE', label: 'Warning Tone', url: '/sounds/police-sirens-10000006.mp3' },
  ],
};
