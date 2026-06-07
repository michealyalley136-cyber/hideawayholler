'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, BellOff, CheckCircle2, Clock, MapPin, Phone, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { DEFAULT_SOS_SETTINGS, SosSettings } from '@/lib/sosSettings';
import { getSosAudio, playSosSound, setSosSoundSource, stopSosSound, unlockSosSound } from '@/lib/sosSound';
import { SosAlert, SosAlertStatus } from '@/lib/types';

const ACTIVE_STATUSES: SosAlertStatus[] = ['ACTIVE', 'ACKNOWLEDGED', 'NEEDS_HELP'];
const UNACKNOWLEDGED_STATUSES: SosAlertStatus[] = ['ACTIVE', 'NEEDS_HELP'];
const SOS_SOUND_ENABLED_KEY = 'sosSoundEnabled';

type AdminDevice = {
  id: string;
  enabled: boolean;
  endpoint: string;
  deviceLabel?: string;
  updatedAt: string;
};

type DeviceResponse = {
  device: AdminDevice;
};

type DevicesResponse = {
  devices: AdminDevice[];
};

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function mapUrl(alert: SosAlert) {
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function coords(alert: SosAlert) {
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function statusClass(status: SosAlertStatus) {
  if (status === 'ACTIVE' || status === 'NEEDS_HELP') return 'bg-red-100 text-red-800';
  if (status === 'ACKNOWLEDGED') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

function deviceLabel() {
  if (typeof navigator === 'undefined') return 'Admin SOS phone';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Admin iOS SOS device';
  if (/Android/i.test(ua)) return 'Admin Android SOS device';
  return 'Admin SOS browser device';
}

function AdminSosConsole() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [history, setHistory] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [soundStatus, setSoundStatus] = useState('Emergency sound is not armed on this device.');
  const [settings, setSettings] = useState<SosSettings>(DEFAULT_SOS_SETTINGS);
  const [device, setDevice] = useState<AdminDevice | null>(null);
  const [pushStatus, setPushStatus] = useState('Push notifications are not enabled on this device.');
  const seenUnacknowledgedIdsRef = useRef<Set<string>>(new Set());
  const deepLinkedAlertIdRef = useRef<string | null>(null);

  const activeAlerts = useMemo(() => alerts.filter((alert) => ACTIVE_STATUSES.includes(alert.status)), [alerts]);
  const sirenAlerts = useMemo(
    () => alerts.filter((alert) => UNACKNOWLEDGED_STATUSES.includes(alert.status) && !alert.adminAcknowledgedAt),
    [alerts]
  );

  const loadAlerts = useCallback(async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        api<{ alerts: SosAlert[]; count: number }>('/admin/sos/active', { suppressErrorLog: true }),
        api<{ alerts: SosAlert[] }>('/admin/sos/history', { suppressErrorLog: true }),
      ]);
      setAlerts(activeRes.alerts);
      setHistory(historyRes.alerts.slice(0, 8));
    } catch (err) {
      console.warn('[admin-sos-pwa] Failed to load SOS alerts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const res = await api<DevicesResponse>('/admin-devices', { suppressErrorLog: true });
      setDevice(res.devices[0] || null);
      if (res.devices[0]?.enabled) {
        setPushStatus('SOS push notifications are enabled for this device.');
      }
    } catch (err) {
      console.warn('[admin-sos-pwa] Failed to load admin devices', err);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api<{ settings: SosSettings }>('/sos-settings', { suppressErrorLog: true });
      setSettings(res.settings);
      setSosSoundSource(res.settings.sound.url);
    } catch (err) {
      console.warn('[admin-sos-pwa] Failed to load SOS settings', err);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    loadDevices();
    loadSettings();
    const timer = setInterval(loadAlerts, 5000);
    return () => clearInterval(timer);
  }, [loadAlerts, loadDevices, loadSettings]);

  useEffect(() => {
    document.title = activeAlerts.length > 0 ? `SOS ACTIVE (${activeAlerts.length})` : 'Hideaway Holler SOS';
  }, [activeAlerts.length]);

  useEffect(() => {
    getSosAudio();
  }, []);

  useEffect(() => {
    const currentIds = new Set(sirenAlerts.map((alert) => alert.id));
    const hasNewAlert = sirenAlerts.some((alert) => !seenUnacknowledgedIdsRef.current.has(alert.id));
    seenUnacknowledgedIdsRef.current = currentIds;

    if (soundEnabled && sirenAlerts.length > 0) {
      void playSosSound({ loop: settings.continuousAlarmEnabled }).then((played) => {
        if (!played) {
          setSoundBlocked(true);
          setSoundStatus('Sound blocked - click Enable Emergency Sound after interacting with this page.');
        } else if (hasNewAlert) {
          setSoundBlocked(false);
          setSoundStatus('Sound armed on this device');
        }
      });
      return;
    }

    if (sirenAlerts.length === 0) {
      stopSosSound();
    }
  }, [settings.continuousAlarmEnabled, sirenAlerts, soundEnabled]);

  const enableSound = async () => {
    const unlocked = await unlockSosSound();
    if (unlocked) {
      setSoundBlocked(false);
      setSoundEnabled(true);
      setSoundStatus('Sound armed on this device');
      localStorage.setItem(SOS_SOUND_ENABLED_KEY, 'true');
      return;
    }

    setSoundBlocked(true);
    setSoundStatus('Sound cannot be enabled. Check browser permissions and interact with the page, then try again.');
  };

  const disableSound = () => {
    stopSosSound();
    setSoundEnabled(false);
    setSoundBlocked(false);
    setSoundStatus('Emergency sound is muted on this device.');
    localStorage.removeItem(SOS_SOUND_ENABLED_KEY);
  };

  const testSiren = async () => {
    setSosSoundSource(settings.sound.url);
    const played = await playSosSound({ loop: false });
    if (!played) {
      setSoundBlocked(true);
      setSoundStatus('Sound cannot be played. Click Enable Emergency Sound and make sure device volume is up.');
      return;
    }

    setSoundBlocked(false);
    setSoundStatus('Testing siren for 3 seconds.');
    window.setTimeout(() => {
      if (soundEnabled && sirenAlerts.length > 0) {
        void playSosSound({ loop: settings.continuousAlarmEnabled });
        setSoundStatus('Sound armed on this device');
        return;
      }

      stopSosSound();
      setSoundStatus(soundEnabled ? 'Sound armed on this device' : 'Emergency sound test complete.');
    }, 3000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(SOS_SOUND_ENABLED_KEY) === 'true') {
      setSoundEnabled(true);
      setSoundStatus('Sound armed on this device');
    }
  }, []);

  useEffect(() => {
    return () => stopSosSound();
  }, []);

  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushStatus('This browser does not support installable push notifications.');
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setPushStatus('Push notifications are not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setPushStatus('Notification permission was not granted on this device.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
      }));

    const res = await api<DeviceResponse>('/admin-devices', {
      method: 'POST',
      body: {
        subscription: subscription.toJSON(),
        deviceLabel: deviceLabel(),
        enabled: true,
      },
    });

    setDevice(res.device);
    setPushStatus('SOS push notifications are enabled for this device.');
  };

  const setDeviceEnabled = async (enabled: boolean) => {
    if (!device) return;
    const res = await api<DeviceResponse>('/admin-devices', {
      method: 'PATCH',
      body: { id: device.id, enabled },
    });
    setDevice(res.device);
    setPushStatus(enabled ? 'SOS push notifications are enabled for this device.' : 'SOS push notifications are disabled for this device.');
  };

  const selectAlert = useCallback(async (alert: SosAlert) => {
    setSelectedAlertId(alert.id);
    const shouldPlay = UNACKNOWLEDGED_STATUSES.includes(alert.status) && !alert.adminAcknowledgedAt;
    if (!shouldPlay) return;

    const played = await playSosSound({ loop: settings.continuousAlarmEnabled });
    if (!played) {
      setSoundBlocked(true);
      setSoundStatus('Sound blocked - click Enable Emergency Sound after interacting with this page.');
    } else {
      setSoundBlocked(false);
      if (!soundEnabled) {
        setSoundStatus('Siren is playing for the selected alert. Click Enable Emergency Sound to arm automatic playback.');
      }
    }
  }, [settings.continuousAlarmEnabled, soundEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (deepLinkedAlertIdRef.current === null) {
      deepLinkedAlertIdRef.current = new URLSearchParams(window.location.search).get('alertId') || '';
    }

    const alertId = deepLinkedAlertIdRef.current;
    if (!alertId || selectedAlertId === alertId) return;

    const alert = alerts.find((item) => item.id === alertId);
    if (!alert) return;

    deepLinkedAlertIdRef.current = '';
    void selectAlert(alert);
  }, [alerts, selectedAlertId, selectAlert]);

  const adminAction = async (alert: SosAlert, action: 'ACKNOWLEDGE' | 'RESOLVE') => {
    setActionId(`${alert.id}:${action}`);
    try {
      const data = await api<{ alert: SosAlert }>(
        action === 'ACKNOWLEDGE' ? `/admin/sos/${alert.id}/acknowledge` : `/sos/${alert.id}/admin`,
        {
          method: action === 'ACKNOWLEDGE' ? 'POST' : 'PATCH',
          body: action === 'ACKNOWLEDGE' ? undefined : { action },
        }
      );
      setAlerts((current) =>
        action === 'RESOLVE' ? current.filter((item) => item.id !== alert.id) : current.map((item) => (item.id === alert.id ? data.alert : item))
      );
      stopSosSound();
      void loadAlerts();
    } finally {
      setActionId(null);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6">
        <header className="rounded-lg border border-red-900/70 bg-red-950/50 p-4 shadow-2xl shadow-red-950/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-700 text-white shadow-lg shadow-red-950">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-200">Hideaway Holler emergency console</p>
                <h1 className="mt-1 text-2xl font-black text-white">Admin SOS Companion</h1>
                <p className="mt-1 text-sm text-red-100">Call 911 if immediate danger. Use this page only for emergency alert response.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={soundEnabled ? 'secondary' : 'danger'} onClick={soundEnabled ? disableSound : enableSound}>
                {soundEnabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {soundEnabled ? 'Mute Sound' : 'Enable Emergency Sound'}
              </Button>
              <Button variant="secondary" onClick={testSiren}>
                <Volume2 className="h-4 w-4" />
                Test Siren
              </Button>
              <Button variant={device?.enabled ? 'secondary' : 'danger'} onClick={device?.enabled ? () => setDeviceEnabled(false) : enablePush}>
                {device?.enabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {device?.enabled ? 'Disable Push' : 'Enable Push'}
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-red-100 md:grid-cols-2">
            <p>{pushStatus}</p>
            <p>{soundBlocked ? soundStatus : soundEnabled ? `Sound armed on this device: ${settings.sound.label}` : soundStatus}</p>
          </div>
          <div className="mt-4 rounded-md border border-red-400/40 bg-red-900/40 p-3 text-sm font-semibold text-red-50">
            For emergency sound to work, keep this SOS app installed/opened recently, enable notifications, turn device volume up, and disable silent/focus mode during coverage hours.
          </div>
        </header>

        {activeAlerts.length > 0 && (
          <section className="animate-pulse rounded-lg border-2 border-red-500 bg-red-700 p-4 text-white shadow-xl shadow-red-950/50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-7 w-7" />
              <div>
                <p className="text-xl font-black">EMERGENCY SOS ALERT</p>
                <p className="text-sm text-red-50">{activeAlerts.length} active resident SOS alert{activeAlerts.length === 1 ? '' : 's'} needs admin attention.</p>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-300">Loading emergency alerts...</section>
        ) : alerts.length === 0 ? (
          <section className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="font-bold text-white">No active SOS alerts</p>
                <p className="text-sm text-emerald-100">This console polls every 5 seconds while you are signed in.</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {alerts.map((alert) => {
              const isActive = ACTIVE_STATUSES.includes(alert.status);
              const actionLoading = (action: string) => actionId === `${alert.id}:${action}`;

              return (
                <article
                  key={alert.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedAlertId === alert.id}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest('a,button')) return;
                    void selectAlert(alert);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    void selectAlert(alert);
                  }}
                  className={`rounded-lg border bg-white p-4 text-slate-950 shadow-xl outline-none transition focus:ring-4 focus:ring-red-300 ${
                    selectedAlertId === alert.id ? 'border-red-600 ring-4 ring-red-200' : 'border-red-800'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black">{alert.residentName}</h2>
                        <Badge className={statusClass(alert.status)}>{alert.status.replace('_', ' ')}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600">{alert.assignment || 'No assignment recorded'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Clock className="h-4 w-4" />
                      {formatDate(alert.createdAt)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="font-bold uppercase text-slate-500">GPS</p>
                      <p className="mt-1 font-mono">{coords(alert)}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase text-slate-500">Phone</p>
                      <p className="mt-1">{alert.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase text-slate-500">Address</p>
                      <p className="mt-1">{alert.streetAddress || 'Not available'}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase text-slate-500">Nearby landmark</p>
                      <p className="mt-1">{alert.landmark || 'Not available'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <Button
                      variant="danger"
                      disabled={!isActive || !!alert.adminAcknowledgedAt}
                      loading={actionLoading('ACKNOWLEDGE')}
                      onClick={() => adminAction(alert, 'ACKNOWLEDGE')}
                    >
                      {alert.adminAcknowledgedAt ? 'Acknowledged' : 'Acknowledge'}
                    </Button>
                    <a href={alert.phone ? `tel:${alert.phone}` : undefined} aria-disabled={!alert.phone} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50">
                      <Phone className="h-4 w-4" />
                      Call Resident
                    </a>
                    <a href="tel:911" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
                      <Phone className="h-4 w-4" />
                      Call 911
                    </a>
                    <a href={mapUrl(alert)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                      <MapPin className="h-4 w-4" />
                      Map
                    </a>
                    <Button variant="secondary" disabled={!isActive} loading={actionLoading('RESOLVE')} onClick={() => adminAction(alert, 'RESOLVE')}>
                      Resolve
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-lg font-black text-white">Emergency History</h2>
          <div className="mt-3 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-zinc-400">No resolved SOS alerts are recorded yet.</p>
            ) : (
              history.map((alert) => (
                <div key={alert.id} className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-white">{alert.residentName}</p>
                    <p className="text-zinc-400">{alert.streetAddress || coords(alert)}</p>
                  </div>
                  <p className="text-zinc-300">{formatDate(alert.resolvedAt || alert.updatedAt)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminSosPage() {
  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AdminSosConsole />
    </ProtectedRoute>
  );
}
