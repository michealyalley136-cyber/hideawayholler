'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, MapPin, Phone, ShieldAlert, Volume2, Wifi, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import { DEFAULT_SOS_SETTINGS, SosSettings } from '@/lib/sosSettings';
import { getSosAudio, playSosSound, setSosSoundSource, stopSosSound, unlockSosSound } from '@/lib/sosSound';
import { SosAlert, UserRole } from '@/lib/types';

interface AdminSosAlertManagerProps {
  role?: UserRole;
  onCountChange?: (count: number) => void;
}

type AdminDevice = {
  id: string;
  enabled: boolean;
  endpoint: string;
  deviceLabel?: string;
};

type EnableStatus = {
  notifications: NotificationPermission | 'unsupported';
  push: 'enabled' | 'disabled' | 'unsupported' | 'not_configured' | 'failed';
  audio: 'unlocked' | 'locked';
  realtime: 'connected' | 'polling';
  message: string;
};

const POLL_INTERVAL_MS = 12_000;
const SOS_SOUND_ENABLED_KEY = 'sosSoundEnabled';
const MOBILE_PUSH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOBILE_SOS_PUSH === 'true';

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function locationLabel(alert: SosAlert) {
  if (alert.streetAddress) return alert.streetAddress;
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  if (latitude == null || longitude == null) return 'Location unavailable';
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function mapUrl(alert: SosAlert) {
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function isUnacknowledgedAlert(alert: SosAlert) {
  return !alert.adminAcknowledged && !alert.adminAcknowledgedAt && (alert.status === 'ACTIVE' || alert.status === 'NEEDS_HELP');
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function deviceLabel() {
  if (typeof navigator === 'undefined') return 'Admin browser device';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Admin iOS browser/PWA';
  if (/Android/i.test(ua)) return 'Admin Android browser/PWA';
  return 'Admin desktop browser';
}

function notificationPermission(): EnableStatus['notifications'] {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function notificationLabel(value: EnableStatus['notifications']) {
  if (value === 'granted') return 'Enabled';
  if (value === 'denied') return 'Blocked';
  if (value === 'unsupported') return 'Unsupported';
  return 'Not enabled';
}

function pushLabel(value: EnableStatus['push']) {
  if (value === 'enabled') return 'Registered';
  if (value === 'unsupported') return 'Unsupported';
  if (value === 'not_configured') return 'Not configured';
  if (value === 'failed') return 'Registration failed';
  return 'Not registered';
}

function audioLabel(value: EnableStatus['audio']) {
  return value === 'unlocked' ? 'Unlocked' : 'Locked';
}

function pushConfigLabel(value: EnableStatus['push']) {
  return value === 'not_configured' ? 'Missing VAPID keys' : 'Ready';
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(userAgent);
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  return mobileUa || (smallScreen && coarsePointer);
}

export function AdminSosAlertManager({ role, onCountChange }: AdminSosAlertManagerProps) {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [featuredAlert, setFeaturedAlert] = useState<SosAlert | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SosSettings>(DEFAULT_SOS_SETTINGS);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastFetchStatus, setLastFetchStatus] = useState('Pending');
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);
  const [mobileDevice, setMobileDevice] = useState(false);
  const [enableStatus, setEnableStatus] = useState<EnableStatus>({
    notifications: 'unsupported',
    push: 'disabled',
    audio: 'locked',
    realtime: 'polling',
    message: 'SOS alerts need to be enabled on this device.',
  });
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const sirenPlayingRef = useRef(false);

  const canRun = role === 'ADMIN';
  const canPlaySound = canRun && !mobileDevice;

  const stopSiren = useCallback(() => {
    stopSosSound();
    sirenPlayingRef.current = false;
  }, []);

  const startSiren = useCallback(async () => {
    if (!canPlaySound) return;
    if (!soundEnabled || (settings.continuousAlarmEnabled && sirenPlayingRef.current)) return;
    const played = await playSosSound({ loop: settings.continuousAlarmEnabled });
    setSoundBlocked(!played);
    sirenPlayingRef.current = played;
  }, [canPlaySound, settings.continuousAlarmEnabled, soundEnabled]);

  const showBrowserNotification = useCallback(async (alert: SosAlert) => {
    if (!MOBILE_PUSH_ENABLED) return;
    if (!settings.browserNotificationsEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

    const url = `/admin/sos?alertId=${encodeURIComponent(alert.id)}`;
    const body = `${alert.residentName} needs help. ${locationLabel(alert)}.`;
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Emergency SOS Alert', {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `sos-${alert.id}`,
          renotify: true,
          requireInteraction: true,
          silent: false,
          vibrate: [900, 250, 900, 250, 900],
          data: { url },
        } as NotificationOptions & { renotify?: boolean; vibrate?: number[] });
        return;
      }

      const notification = new Notification('Emergency SOS Alert', { body, tag: `sos-${alert.id}`, requireInteraction: true, data: { url } });
      notification.onclick = () => {
        window.focus();
        window.location.assign(url);
      };
    } catch (err) {
      console.warn('[sos admin] Browser notification failed', err);
    }
  }, [settings.browserNotificationsEnabled]);

  const refreshDeviceStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const permission = notificationPermission();
    setEnableStatus((current) => ({ ...current, notifications: permission }));
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEnableStatus((current) => ({ ...current, push: 'unsupported' }));
      return;
    }
    if (permission !== 'granted') {
      setEnableStatus((current) => ({ ...current, push: 'disabled' }));
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setEnableStatus((current) => ({ ...current, push: subscription ? 'enabled' : 'disabled' }));
    } catch {
      setEnableStatus((current) => ({ ...current, push: 'failed' }));
    }
  }, []);

  const registerPushDevice = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported' as const;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return 'not_configured' as const;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
        }));

      const response = await api<{ success?: boolean; registered?: boolean; device: AdminDevice }>('/admin/sos/enable-device', {
        method: 'POST',
        body: {
          subscription: subscription.toJSON(),
          deviceLabel: deviceLabel(),
          userAgent: navigator.userAgent,
          deviceType: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          enabled: true,
        },
        suppressErrorLog: true,
      });
      if (response.success === false || response.registered === false) return 'failed' as const;
      return 'enabled' as const;
    } catch (err) {
      console.warn('[sos admin] Push registration failed', err);
      return 'failed' as const;
    }
  }, []);

  const enableAlerts = useCallback(async () => {
    setSetupError(null);
    setSetupMessage(null);
    setIsRegistering(true);

    try {
      const audioUnlocked = await unlockSosSound();
      setSoundEnabled(audioUnlocked);
      setSoundBlocked(!audioUnlocked);
      if (audioUnlocked) localStorage.setItem(SOS_SOUND_ENABLED_KEY, 'true');
      else localStorage.removeItem(SOS_SOUND_ENABLED_KEY);

      if (!MOBILE_PUSH_ENABLED) {
        setLastCheckTime(new Date().toLocaleTimeString());
        setEnableStatus((current) => ({
          ...current,
          audio: audioUnlocked ? 'unlocked' : 'locked',
          message: audioUnlocked ? 'Desktop SOS sound enabled.' : 'Desktop sound could not be unlocked.',
        }));
        setSetupMessage(audioUnlocked ? 'Desktop SOS sound enabled on this computer.' : 'Sound could not be unlocked on this computer.');
        return;
      }

      if (typeof window === 'undefined' || !('Notification' in window)) throw new Error('Notifications are not supported in this browser.');
      if (!('serviceWorker' in navigator)) throw new Error('Service workers are not supported in this browser.');
      if (!('PushManager' in window)) throw new Error('Push notifications are not supported in this browser.');

      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();

      if (permission === 'denied') {
        setEnableStatus((current) => ({ ...current, notifications: 'denied', push: 'disabled', audio: audioUnlocked ? 'unlocked' : 'locked' }));
        throw new Error('Notifications are blocked for this browser. Please open your browser/site settings and change Notifications to Allow, then refresh and enable desktop sound again.');
      }
      if (permission !== 'granted') {
        setEnableStatus((current) => ({ ...current, notifications: permission, push: 'disabled', audio: audioUnlocked ? 'unlocked' : 'locked' }));
        throw new Error('Notification permission was not granted.');
      }

      const push = await registerPushDevice();
      if (push !== 'enabled') {
        setEnableStatus((current) => ({ ...current, notifications: 'granted', push, audio: audioUnlocked ? 'unlocked' : 'locked' }));
        throw new Error(push === 'not_configured' ? 'Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.' : 'Device registration failed. Please retry or contact support.');
      }

      setLastCheckTime(new Date().toLocaleTimeString());
      setEnableStatus((current) => ({
        ...current,
        notifications: 'granted',
        push: 'enabled',
        audio: audioUnlocked ? 'unlocked' : 'locked',
        message: 'Alerts Enabled',
      }));
      setSetupMessage('SOS alerts enabled on this device.');
      await refreshDeviceStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to enable SOS alerts.';
      setSetupError(message);
      setEnableStatus((current) => ({ ...current, message: 'SOS alerts need attention on this device.' }));
    } finally {
      setIsRegistering(false);
    }
  }, [refreshDeviceStatus, registerPushDevice]);

  const pollActiveAlerts = useCallback(async () => {
    if (!canRun) return;
    try {
      const data = await api<{ alerts: SosAlert[]; count: number }>('/admin/sos/active', { suppressErrorLog: true });
      const pendingAlerts = data.alerts.filter(isUnacknowledgedAlert);
      const nextIds = new Set(pendingAlerts.map((alert) => alert.id));
      const newAlerts = pendingAlerts.filter((alert) => !seenIdsRef.current.has(alert.id));

      setAlerts(data.alerts);
      onCountChange?.(pendingAlerts.length);
      setLastCheckTime(new Date().toLocaleTimeString());
      setLastFetchStatus('OK');
      setLastFetchError(null);

      if (!initializedRef.current) {
        initializedRef.current = true;
        if (pendingAlerts.length > 0) setFeaturedAlert(pendingAlerts[0]);
      } else if (newAlerts.length > 0) {
        setFeaturedAlert(newAlerts[0]);
        newAlerts.forEach((alert) => void showBrowserNotification(alert));
        void startSiren();
      }

      seenIdsRef.current = nextIds;
      setEnableStatus((current) => ({ ...current, realtime: 'polling' }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch active SOS alerts.';
      setLastFetchStatus('Error');
      setLastFetchError(message);
      console.warn('[sos admin] Active SOS fetch failed', err);
    }
  }, [canRun, onCountChange, showBrowserNotification, startSiren]);

  useEffect(() => {
    if (!canRun) return;
    setMobileDevice(isMobileDevice());
    setSoundEnabled(localStorage.getItem(SOS_SOUND_ENABLED_KEY) === 'true');
    setEnableStatus((current) => ({ ...current, notifications: MOBILE_PUSH_ENABLED ? notificationPermission() : 'unsupported' }));
    getSosAudio();
    if (MOBILE_PUSH_ENABLED) void refreshDeviceStatus();

    api<{ settings: SosSettings }>('/sos-settings', { suppressErrorLog: true })
      .then((data) => {
        setSettings(data.settings);
        setSosSoundSource(data.settings.sound.url);
      })
      .catch((err) => console.warn('[sos admin] Failed to load SOS settings', err));

    if (MOBILE_PUSH_ENABLED) {
      api<{ push: { configured: boolean }; warning: string | null }>('/admin/sos/config', { suppressErrorLog: true })
        .then((data) => {
          if (data.warning) setPushWarning(data.warning);
          if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
            setPushWarning('Push notifications are not fully configured in production. SOS dashboard fallback is active, but background mobile notifications may not work.');
          }
          if (!data.push.configured) setEnableStatus((current) => ({ ...current, push: 'not_configured' }));
        })
        .catch(() => {
          if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
            setPushWarning('Push notifications are not fully configured in production. SOS dashboard fallback is active, but background mobile notifications may not work.');
          }
        });
    }

    return stopSiren;
  }, [canRun, refreshDeviceStatus, stopSiren]);

  useEffect(() => {
    if (!canRun) return;
    pollActiveAlerts().catch((err) => console.warn('[sos admin] Failed to poll active SOS alerts', err));
    const timer = window.setInterval(() => {
      pollActiveAlerts().catch((err) => console.warn('[sos admin] Failed to poll active SOS alerts', err));
    }, POLL_INTERVAL_MS);
    const refreshNow = () => pollActiveAlerts().catch((err) => console.warn('[sos admin] Failed to refresh SOS alerts', err));
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshNow);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshNow);
    };
  }, [canRun, pollActiveAlerts]);

  useEffect(() => {
    if (!canRun || typeof window === 'undefined') return;
    const token = getStoredToken();
    if (!token) return;
    // Placeholder for future Socket.IO/SSE; polling remains the reliable fallback on Vercel/serverless.
    setEnableStatus((current) => ({ ...current, realtime: 'polling' }));
  }, [canRun]);

  useEffect(() => {
    const pending = alerts.filter(isUnacknowledgedAlert);
    if (pending.length > 0) {
      void startSiren();
      return;
    }
    stopSiren();
  }, [alerts, startSiren, stopSiren]);

  const adminAction = async (alert: SosAlert, action: 'ACKNOWLEDGE' | 'RESOLVE') => {
    setActionId(`${alert.id}:${action}`);
    try {
      const endpoint = action === 'ACKNOWLEDGE' ? `/admin/sos/${alert.id}/acknowledge` : `/admin/sos/${alert.id}/resolve`;
      const data = await api<{ alert: SosAlert }>(endpoint, { method: 'POST' });
      setAlerts((current) =>
        action === 'RESOLVE' ? current.filter((item) => item.id !== data.alert.id) : current.map((item) => (item.id === data.alert.id ? data.alert : item))
      );
      if (featuredAlert?.id === data.alert.id) setFeaturedAlert(null);
      await pollActiveAlerts();
    } finally {
      setActionId(null);
    }
  };

  if (!canRun) return null;

  const pendingAlerts = alerts.filter(isUnacknowledgedAlert);
  const primary = featuredAlert || pendingAlerts[0] || null;
  const soundNeedsEnable = canPlaySound && pendingAlerts.length > 0 && (!soundEnabled || soundBlocked);
  const actionLoading = (alert: SosAlert, action: string) => actionId === `${alert.id}:${action}`;
  const primaryMapUrl = primary ? mapUrl(primary) : null;

  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50 px-3 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="text-sm text-amber-950">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <p className="font-bold">Emergency SOS Alerts</p>
            </div>
            <p className="mt-1 text-xs">
              Active SOS alerts are checked every 12 seconds while an admin is logged in. Desktop computers can play the emergency siren after sound is enabled.
            </p>
            {mobileDevice ? (
              <p className="mt-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold">
                Mobile SOS notifications are planned for a future upgrade. For now, keep the admin dashboard open on a computer to receive SOS sound alerts.
              </p>
            ) : (
              <p className="mt-1 text-xs font-semibold">Keep this computer dashboard open during coverage hours to receive SOS modal and sound alerts.</p>
            )}
            <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {MOBILE_PUSH_ENABLED && <span>Notifications: <strong>{notificationLabel(enableStatus.notifications)}</strong></span>}
              {MOBILE_PUSH_ENABLED && <span>Push Device: <strong>{pushLabel(enableStatus.push)}</strong></span>}
              {MOBILE_PUSH_ENABLED && <span>Push Config: <strong>{pushConfigLabel(enableStatus.push)}</strong></span>}
              <span>Sound: <strong>{audioLabel(enableStatus.audio)}</strong></span>
              <span>Fallback Check: <strong>Active</strong></span>
              <span>Last Check Time: <strong>{lastCheckTime || 'Pending'}</strong></span>
              <span>Current Active SOS Count: <strong>{pendingAlerts.length}</strong></span>
            </div>
            {pushWarning && <p className="mt-2 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-900">{pushWarning}</p>}
            {lastFetchError && <p className="mt-2 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-900">Active SOS fetch error: {lastFetchError}</p>}
            {setupMessage && <p className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">{setupMessage}</p>}
            {setupError && (
              <div className="mt-2 rounded-md border border-red-300 bg-white px-2 py-2 text-xs text-red-900">
                <p className="font-semibold">{setupError}</p>
                {enableStatus.notifications === 'denied' && (
                  <div className="mt-2 space-y-1">
                    <p><strong>Desktop Chrome/Edge:</strong> Click the lock/settings icon beside the website address, open Site settings, set Notifications to Allow, refresh, then enable desktop sound again.</p>
                    <p><strong>Android/iPhone:</strong> Mobile push notifications are planned for a future upgrade. Use the computer dashboard for SOS sound alerts.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex">
            {!mobileDevice && (
              <Button variant="outline" size="sm" onClick={enableAlerts} loading={isRegistering}>
                <Volume2 className="h-4 w-4" />
                Enable Desktop Sound
              </Button>
            )}
            {MOBILE_PUSH_ENABLED && (
              <Button variant="outline" size="sm" onClick={enableAlerts} loading={isRegistering}>
                Retry Device Registration
              </Button>
            )}
            <Link href="/admin/sos" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Open SOS Center
            </Link>
          </div>
        </div>
      </div>

      {pendingAlerts.length > 0 && primary && (
        <div className="border-b-2 border-red-900 bg-red-700 px-3 py-3 text-white shadow-lg sm:px-6 lg:px-8" role="alert">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="text-sm font-black uppercase tracking-wide">Emergency SOS Alert</p>
                <p className="text-sm text-red-50">
                  Pending SOS Alerts: {pendingAlerts.length}. Resident: {primary.residentName}. Location: {locationLabel(primary)}. Time: {formatDate(primary.createdAt)}.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
              {soundNeedsEnable && (
                <Button variant="secondary" size="sm" onClick={enableAlerts}>
                  <Volume2 className="h-4 w-4" />
                  Enable Sound
                </Button>
              )}
              <Button variant="secondary" size="sm" loading={actionLoading(primary, 'ACKNOWLEDGE')} disabled={!!primary.adminAcknowledgedAt} onClick={() => adminAction(primary, 'ACKNOWLEDGE')}>
                Acknowledge SOS
              </Button>
              <a href={primaryMapUrl || undefined} aria-disabled={!primaryMapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 aria-disabled:pointer-events-none aria-disabled:opacity-50">
                <MapPin className="h-4 w-4" />
                View Location
              </a>
              <Link href="/admin/sos" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/50 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800">
                View All
              </Link>
            </div>
          </div>
        </div>
      )}

      {primary && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-red-950/80 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl border-4 border-red-600 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 bg-red-700 px-5 py-4 text-white">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-8 w-8 shrink-0 animate-pulse" />
                <div>
                  <p className="text-2xl font-black uppercase">Emergency SOS Alert</p>
                  <p className="text-sm text-red-50">This alert will stay visible until acknowledged or resolved.</p>
                </div>
              </div>
              <button className="rounded-lg p-1 hover:bg-red-800" onClick={() => setFeaturedAlert(null)} aria-label="Minimize SOS modal">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p><span className="font-bold text-slate-900">Resident:</span> {primary.residentName}</p>
                <p><span className="font-bold text-slate-900">Status:</span> {primary.status.replace('_', ' ')}</p>
                <p><span className="font-bold text-slate-900">Location:</span> {locationLabel(primary)}</p>
                <p><span className="font-bold text-slate-900">Time:</span> {formatDate(primary.createdAt)}</p>
                <p><span className="font-bold text-slate-900">Assignment:</span> {primary.assignment || 'Not recorded'}</p>
                <p><span className="font-bold text-slate-900">Sound:</span> {mobileDevice ? 'Desktop only' : soundBlocked ? 'Blocked until enabled' : soundEnabled ? 'Playing/armed' : 'Not enabled'}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Button variant="danger" loading={actionLoading(primary, 'ACKNOWLEDGE')} disabled={!!primary.adminAcknowledgedAt} onClick={() => adminAction(primary, 'ACKNOWLEDGE')}>
                  Acknowledge SOS
                </Button>
                <Button variant="secondary" loading={actionLoading(primary, 'RESOLVE')} onClick={() => adminAction(primary, 'RESOLVE')}>
                  Mark Resolved
                </Button>
                {!mobileDevice && (
                  <Button variant="outline" onClick={enableAlerts}>
                    <Volume2 className="h-4 w-4" />
                    Enable Sound
                  </Button>
                )}
                <a href={primaryMapUrl || undefined} aria-disabled={!primaryMapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50">
                  <MapPin className="h-4 w-4" />
                  Map
                </a>
                <a href={primary.phone ? `tel:${primary.phone}` : undefined} aria-disabled={!primary.phone} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50">
                  <Phone className="h-4 w-4" />
                  Call Resident
                </a>
                <Link href="/admin/sos" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  {enableStatus.realtime === 'connected' ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  Open SOS Center
                </Link>
              </div>
              {soundNeedsEnable && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Tap Enable Sound on this computer, keep volume on, and keep the admin dashboard open during coverage hours.
                </p>
              )}
              {mobileDevice && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Mobile SOS notifications are planned for a future upgrade. Use the computer dashboard for SOS sound alerts.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const AdminSosNotifier = AdminSosAlertManager;
