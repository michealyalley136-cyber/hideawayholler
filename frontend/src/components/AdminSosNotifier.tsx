'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, MapPin, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api, apiUrl } from '@/lib/api';
import { SosAlert } from '@/lib/types';

interface AdminSosNotifierProps {
  onCountChange?: (count: number) => void;
}

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function locationLabel(alert: SosAlert) {
  if (alert.streetAddress) return alert.streetAddress;
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function mapUrl(alert: SosAlert) {
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function AdminSosNotifier({ onCountChange }: AdminSosNotifierProps) {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [featuredAlert, setFeaturedAlert] = useState<SosAlert | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [mutedAlertIds, setMutedAlertIds] = useState<Set<string>>(new Set());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const lastBannerCountRef = useRef(0);
  const sirenAudioRef = useRef<HTMLAudioElement | null>(null);
  const sirenPlayingRef = useRef(false);
  const fallbackAudioRef = useRef<{
    context: AudioContext;
    oscillator: OscillatorNode;
    gain: GainNode;
    timer: ReturnType<typeof setInterval>;
  } | null>(null);

  const stopFallbackSiren = useCallback(() => {
    const fallback = fallbackAudioRef.current;
    if (!fallback) return;
    clearInterval(fallback.timer);
    fallback.oscillator.stop();
    fallback.context.close().catch(() => undefined);
    fallbackAudioRef.current = null;
  }, []);

  const stopSiren = useCallback(() => {
    const audio = sirenAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    stopFallbackSiren();
    sirenPlayingRef.current = false;
  }, [stopFallbackSiren]);

  const startFallbackSiren = useCallback(() => {
    if (fallbackAudioRef.current) return;
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    gain.gain.value = 0.38;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const sweep = (1 + Math.sin(elapsed * Math.PI * 1.4)) / 2;
      oscillator.frequency.setTargetAtTime(560 + sweep * 760, context.currentTime, 0.03);
    }, 60);

    fallbackAudioRef.current = { context, oscillator, gain, timer };
    sirenPlayingRef.current = true;
  }, []);

  const startSiren = useCallback(async () => {
    if (!soundEnabled || sirenPlayingRef.current) return;
    const audio = sirenAudioRef.current;
    if (!audio) return;

    try {
      audio.loop = true;
      audio.volume = 1.0;
      await audio.play();
      sirenPlayingRef.current = true;
      setSoundBlocked(false);
    } catch (err) {
      console.warn('[sos admin] SOS siren audio blocked or unavailable', err);
      setSoundBlocked(true);
      try {
        startFallbackSiren();
      } catch (fallbackErr) {
        console.warn('[sos admin] SOS siren fallback blocked or unavailable', fallbackErr);
      }
    }
  }, [soundEnabled, startFallbackSiren]);

  useEffect(() => {
    const audio = new Audio('/sounds/sos-siren.mp3');
    audio.loop = true;
    audio.volume = 1.0;
    audio.preload = 'auto';
    audio.load();
    sirenAudioRef.current = audio;
    setSoundEnabled(localStorage.getItem('sosSoundEnabled') === 'true');

    const storedMuted = localStorage.getItem('mutedSosAlertIds');
    if (storedMuted) {
      try {
        const ids = JSON.parse(storedMuted);
        if (Array.isArray(ids)) setMutedAlertIds(new Set(ids.filter((id) => typeof id === 'string')));
      } catch {
        localStorage.removeItem('mutedSosAlertIds');
      }
    }

    return stopSiren;
  }, [stopSiren]);

  const pollActiveAlerts = useCallback(async () => {
    console.info('[sos admin] Polling active SOS alerts');
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const res = await fetch(`${apiUrl}/admin/sos/active`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('[sos admin] Active SOS poll returned non-ok status', { status: res.status });
      return;
    }

    const data = (await res.json()) as { alerts: SosAlert[]; count: number };
    const nextAlerts = data.alerts;
    const pendingAlerts = nextAlerts.filter((alert) => !alert.adminAcknowledged && alert.status === 'ACTIVE' && !mutedAlertIds.has(alert.id));
    const currentIds = new Set(pendingAlerts.map((alert) => alert.id));
    const newAlerts = pendingAlerts.filter((alert) => !seenIdsRef.current.has(alert.id));

    setAlerts(nextAlerts);
    onCountChange?.(nextAlerts.length);

    if (nextAlerts.length > 0) {
      console.info('[sos admin] Active SOS alerts found', { count: nextAlerts.length, alertIds: nextAlerts.map((alert) => alert.id) });
    }

    if (pendingAlerts.length > 0 && lastBannerCountRef.current !== pendingAlerts.length) {
      console.info('[sos admin] Emergency banner shown', { count: pendingAlerts.length });
      lastBannerCountRef.current = pendingAlerts.length;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (pendingAlerts.length > 0) setFeaturedAlert(pendingAlerts[0]);
    } else if (newAlerts.length > 0) {
      setFeaturedAlert(newAlerts[0]);
    }

    seenIdsRef.current = currentIds;
    if (featuredAlert && !pendingAlerts.some((alert) => alert.id === featuredAlert.id)) {
      setFeaturedAlert(null);
    }
  }, [featuredAlert, mutedAlertIds, onCountChange]);

  useEffect(() => {
    console.info('[sos admin] Admin dashboard loaded');
    pollActiveAlerts().catch((err) => console.warn('[sos admin] Failed to poll active SOS alerts', err));
    const timer = setInterval(() => {
      pollActiveAlerts().catch((err) => console.warn('[sos admin] Failed to poll active SOS alerts', err));
    }, 5000);

    return () => clearInterval(timer);
  }, [pollActiveAlerts]);

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

      if (action === 'ACKNOWLEDGE') {
        console.info('[sos admin] Alert acknowledged', { sosAlertId: data.alert.id });
        setAlerts((current) => current.map((item) => (item.id === data.alert.id ? data.alert : item)));
        if (featuredAlert?.id === data.alert.id) setFeaturedAlert(null);
      } else {
        setAlerts((current) => current.filter((item) => item.id !== data.alert.id));
        if (featuredAlert?.id === data.alert.id) setFeaturedAlert(null);
      }

      pollActiveAlerts().catch((err) => console.warn('[sos admin] Failed to refresh after SOS action', err));
    } finally {
      setActionId(null);
    }
  };

  const enableSoundAlerts = async () => {
    setSoundEnabled(true);
    localStorage.setItem('sosSoundEnabled', 'true');
    const audio = sirenAudioRef.current;
    if (audio) {
      try {
        audio.volume = 1.0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        setSoundBlocked(false);
      } catch (err) {
        console.warn('[sos admin] SOS sound unlock was blocked', err);
        setSoundBlocked(true);
      }
    }
    if (audiblePendingAlerts.length > 0) startSiren();
  };

  const muteAlert = async (alert: SosAlert) => {
    const nextMuted = new Set(mutedAlertIds);
    nextMuted.add(alert.id);
    setMutedAlertIds(nextMuted);
    localStorage.setItem('mutedSosAlertIds', JSON.stringify(Array.from(nextMuted)));
    if (featuredAlert?.id === alert.id) setFeaturedAlert(null);

    try {
      await api<{ alert: SosAlert }>(`/admin/sos/${alert.id}/mute`, { method: 'POST', suppressErrorLog: true });
    } catch (err) {
      console.warn('[sos admin] Failed to log SOS mute event', err);
    }
  };

  const pendingAlerts = alerts.filter((alert) => !alert.adminAcknowledged && alert.status === 'ACTIVE');
  const audiblePendingAlerts = pendingAlerts.filter((alert) => !mutedAlertIds.has(alert.id));

  useEffect(() => {
    if (audiblePendingAlerts.length > 0) {
      startSiren();
      return;
    }
    stopSiren();
  }, [audiblePendingAlerts.length, startSiren, stopSiren]);

  if (pendingAlerts.length === 0) {
    if (!soundEnabled) {
      return (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-amber-900">SOS sound alerts are off.</p>
            <Button variant="outline" size="sm" onClick={enableSoundAlerts}>
              Enable SOS Sound Alerts
            </Button>
          </div>
        </div>
      );
    }
    return null;
  }

  const primary = audiblePendingAlerts[0] || pendingAlerts[0];
  const actionLoading = (alert: SosAlert, action: string) => actionId === `${alert.id}:${action}`;
  const soundNeedsEnable = audiblePendingAlerts.length > 0 && (!soundEnabled || soundBlocked);

  return (
    <>
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
              <Button variant="secondary" size="sm" onClick={enableSoundAlerts}>
                Enable SOS Sound Alerts
              </Button>
            )}
            <Button variant="secondary" size="sm" loading={actionLoading(primary, 'ACKNOWLEDGE')} disabled={!!primary.adminAcknowledgedAt} onClick={() => adminAction(primary, 'ACKNOWLEDGE')}>
              Acknowledge SOS
            </Button>
            <Button variant="outline" size="sm" onClick={() => muteAlert(primary)}>
              Mute Alert
            </Button>
            <a href={mapUrl(primary)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">
              <MapPin className="h-4 w-4" />
              View Location
            </a>
            <Link href="/admin/sos" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/50 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800">
              View All
            </Link>
          </div>
        </div>
        {soundNeedsEnable && (
          <div className="mx-auto mt-2 max-w-6xl rounded-lg border border-white/40 bg-red-900/40 px-3 py-2 text-sm font-semibold text-white">
            Sound blocked — click Enable SOS Sound Alerts
          </div>
        )}
      </div>

      {featuredAlert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-lg border-2 border-red-700 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-red-100 bg-red-700 px-5 py-4 text-white">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
                <div>
                  <p className="text-lg font-black uppercase">Emergency SOS Alert</p>
                  <p className="text-sm text-red-50">Pending SOS Alerts: {pendingAlerts.length}</p>
                </div>
              </div>
              <button className="rounded-lg p-1 hover:bg-red-800" onClick={() => setFeaturedAlert(null)} aria-label="Close SOS notification">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 text-sm">
                <p><span className="font-bold text-slate-900">Resident:</span> {featuredAlert.residentName}</p>
                <p><span className="font-bold text-slate-900">Assignment:</span> {featuredAlert.assignment || 'Not recorded'}</p>
                <p><span className="font-bold text-slate-900">Location:</span> {locationLabel(featuredAlert)}</p>
                <p><span className="font-bold text-slate-900">Time:</span> {formatDate(featuredAlert.createdAt)}</p>
                <p><span className="font-bold text-slate-900">Status:</span> {featuredAlert.status.replace('_', ' ')}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {soundNeedsEnable && (
                  <Button variant="secondary" onClick={enableSoundAlerts}>
                    Enable SOS Sound Alerts
                  </Button>
                )}
                <Button variant="danger" loading={actionLoading(featuredAlert, 'ACKNOWLEDGE')} disabled={!!featuredAlert.adminAcknowledgedAt} onClick={() => adminAction(featuredAlert, 'ACKNOWLEDGE')}>
                  Acknowledge SOS
                </Button>
                <Button variant="outline" onClick={() => muteAlert(featuredAlert)}>
                  Mute Alert
                </Button>
                <a href={mapUrl(featuredAlert)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  <MapPin className="h-4 w-4" />
                  View Location
                </a>
                <a
                  href={featuredAlert.phone ? `tel:${featuredAlert.phone}` : undefined}
                  aria-disabled={!featuredAlert.phone}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  <Phone className="h-4 w-4" />
                  Call Resident
                </a>
                <Button variant="secondary" loading={actionLoading(featuredAlert, 'RESOLVE')} onClick={() => adminAction(featuredAlert, 'RESOLVE')}>
                  Mark Resolved
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
