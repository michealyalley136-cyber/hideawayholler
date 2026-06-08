'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CheckCircle2, Phone, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { api, ApiError } from '@/lib/api';
import { SosAlert } from '@/lib/types';

const HOLD_MS = 3000;
const ACK_TRACKING_DELAY_MS = 45000;
const ACTIVE_TRACKING_DELAY_MS = 60000;
const LOCATION_UPDATE_MS = 12000;
const LOCATION_TIMEOUT_MS = 5000;

type SosUiState = 'idle' | 'holding' | 'sending' | 'active' | 'failed' | 'cancelled' | 'resolved';

function isActiveSos(alert?: SosAlert | null): alert is SosAlert {
  return !!alert && ['ACTIVE', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(alert.status);
}

function getCurrentLocation() {
  return new Promise<GeolocationPosition | null>((resolve) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    const timeout = window.setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeout);
        resolve(position);
      },
      () => {
        window.clearTimeout(timeout);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT_MS,
        maximumAge: 0,
      }
    );
  });
}

export function ResidentSosPanel() {
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [sosState, setSosState] = useState<SosUiState>('idle');
  const [holdProgress, setHoldProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSosId, setLastSosId] = useState<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertRef = useRef<SosAlert | null>(null);
  const triggeredRef = useRef(false);
  const hadActiveSosRef = useRef(false);

  const isHolding = sosState === 'holding';
  const isSending = sosState === 'sending';

  useEffect(() => {
    alertRef.current = alert;
    const status = alert?.status;
    if (isActiveSos(alert)) {
      hadActiveSosRef.current = true;
      setSosState('active');
    } else if (status === 'SAFE' || status === 'RESOLVED') {
      setSosState('resolved');
    }
  }, [alert]);

  const clearHoldTimers = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    holdTimerRef.current = null;
    progressTimerRef.current = null;
  }, []);

  const stopHold = useCallback(() => {
    clearHoldTimers();
    if (isHolding && !triggeredRef.current) {
      if (process.env.NODE_ENV !== 'production') console.info('[sos resident] SOS hold canceled');
      setSosState('cancelled');
      setMessage('SOS cancelled.');
    }
    setHoldProgress(0);
  }, [clearHoldTimers, isHolding]);

  const refreshActiveAlert = useCallback(async () => {
    try {
      const data = await api<{ alert: SosAlert | null }>('/sos/active', { suppressErrorLog: true });
      setAlert(data.alert);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[sos] Failed to refresh active alert', err);
    }
  }, []);

  useEffect(() => {
    refreshActiveAlert();
  }, [refreshActiveAlert]);

  useEffect(() => {
    if (!isActiveSos(alert)) return;
    const timer = setInterval(refreshActiveAlert, 10000);
    return () => clearInterval(timer);
  }, [alert, refreshActiveAlert]);

  const shouldTrack = useMemo(() => {
    if (!isActiveSos(alert)) return false;
    if (alert.trackingActive || alert.status === 'NEEDS_HELP') return true;

    const now = Date.now();
    const acknowledgedLongEnough = alert.adminAcknowledgedAt
      ? now - new Date(alert.adminAcknowledgedAt).getTime() >= ACK_TRACKING_DELAY_MS && !alert.residentRespondedAt
      : false;
    const activeLongEnough = now - new Date(alert.createdAt).getTime() >= ACTIVE_TRACKING_DELAY_MS && !alert.residentRespondedAt;

    return acknowledgedLongEnough || activeLongEnough;
  }, [alert]);

  const sendLocationUpdate = useCallback(async () => {
    const currentAlert = alertRef.current;
    if (!currentAlert || !isActiveSos(currentAlert)) return;
    try {
      const position = await getCurrentLocation();
      if (!position) return;
      const data = await api<{ alert: SosAlert }>(`/sos/${currentAlert.id}/location`, {
        method: 'POST',
        suppressErrorLog: true,
        body: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
        },
      });
      setAlert(data.alert);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        if (hadActiveSosRef.current && sosState === 'active') {
          setAlert(null);
          setSosState('resolved');
          setMessage('GPS tracking has stopped because this alert is no longer active.');
        }
        return;
      }
      if (process.env.NODE_ENV !== 'production') console.warn('[sos] Failed to share location update', err);
    }
  }, [sosState]);

  useEffect(() => {
    if (trackingTimerRef.current) {
      clearInterval(trackingTimerRef.current);
      trackingTimerRef.current = null;
    }

    if (!shouldTrack) return;

    sendLocationUpdate();
    trackingTimerRef.current = setInterval(sendLocationUpdate, LOCATION_UPDATE_MS);

    return () => {
      if (trackingTimerRef.current) clearInterval(trackingTimerRef.current);
      trackingTimerRef.current = null;
    };
  }, [sendLocationUpdate, shouldTrack]);

  const triggerSos = useCallback(async () => {
    if (process.env.NODE_ENV !== 'production') console.info('[sos resident] SOS hold completed');
    triggeredRef.current = true;
    clearHoldTimers();
    setHoldProgress(100);
    setSosState('sending');
    setMessage('Sending SOS alert...');

    try {
      const position = await getCurrentLocation();
      const payload = {
        latitude: position?.coords.latitude ?? null,
        longitude: position?.coords.longitude ?? null,
        accuracy: position?.coords.accuracy ?? null,
        speed: position?.coords.speed ?? null,
        heading: position?.coords.heading ?? null,
        emergencyType: 'SOS',
        message: position ? 'Resident triggered SOS from portal.' : 'Resident triggered SOS from portal. Location unavailable.',
        streetAddress: position ? undefined : 'Location unavailable',
      };
      if (process.env.NODE_ENV !== 'production') console.info('[sos resident] SOS API request sent', payload);
      const data = await api<{ success?: boolean; alert?: SosAlert; sosAlert?: SosAlert; message?: string }>('/sos/trigger', {
        method: 'POST',
        body: payload,
      });
      const nextAlert = data.alert || data.sosAlert || null;
      if (nextAlert?.id) setLastSosId(nextAlert.id);
      if (nextAlert && 'residentId' in nextAlert) setAlert(nextAlert);
      if (process.env.NODE_ENV !== 'production') console.info('[sos resident] SOS backend response', data);
      hadActiveSosRef.current = true;
      setSosState('active');
      setMessage(data.message || 'SOS sent successfully. Admin has been alerted.');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('[sos] Failed to trigger SOS', err);
      setSosState('failed');
      setMessage('SOS failed to send. Please try again or call 911 immediately.');
    } finally {
      triggeredRef.current = false;
    }
  }, [clearHoldTimers]);

  const startHold = useCallback((event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    if (isSending || isHolding || holdTimerRef.current || isActiveSos(alert)) return;
    if (process.env.NODE_ENV !== 'production') console.info('[sos resident] SOS hold started');
    triggeredRef.current = false;
    clearHoldTimers();
    setHoldProgress(0);
    setSosState('holding');
    setMessage('Keep holding to send SOS.');
    const startedAt = Date.now();

    progressTimerRef.current = setInterval(() => {
      setHoldProgress(Math.min(100, ((Date.now() - startedAt) / HOLD_MS) * 100));
    }, 50);

    holdTimerRef.current = setTimeout(triggerSos, HOLD_MS);
  }, [alert, clearHoldTimers, isHolding, isSending, triggerSos]);

  const cancelHold = useCallback((event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    stopHold();
  }, [stopHold]);

  const residentAction = async (action: 'SAFE' | 'NEEDS_HELP' | 'KEEP_ACTIVE') => {
    if (!alert) return;
    try {
      const data = await api<{ alert: SosAlert }>(`/sos/${alert.id}/resident`, {
        method: 'PATCH',
        body: { action },
      });
      setAlert(data.alert);
      if (action === 'SAFE') setMessage("You're marked safe. Location sharing has stopped.");
      if (action === 'NEEDS_HELP') setMessage('Admin has been notified that you still need help. Location sharing is active.');
      if (action === 'KEEP_ACTIVE') setMessage('SOS remains active. Admin will continue to see your alert.');
    } catch {
      setMessage('Unable to update your SOS status. Please try again or call 911 if this is an emergency.');
    }
  };

  if (alert?.status === 'SAFE' || alert?.status === 'RESOLVED') {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-semibold text-emerald-950">SOS closed</p>
              <p className="text-sm text-emerald-800">Location sharing is off.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setAlert(null)}>Dismiss closed alert</Button>
        </CardBody>
      </Card>
    );
  }

  if (isActiveSos(alert)) {
    const acknowledged = !!alert?.adminAcknowledgedAt || alert?.status === 'ACKNOWLEDGED';
    const locationSharing = shouldTrack || alert?.trackingActive;

    return (
      <Card className="border-red-300 bg-red-50 shadow-md">
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-700" />
            <div>
              <p className="text-lg font-bold text-red-950">SOS active</p>
              <p className="text-sm font-medium text-red-900">
                {acknowledged
                  ? 'Admin has acknowledged your SOS alert. Are you safe?'
                  : 'SOS alert sent. Admin has been notified. Your current location has been shared.'}
              </p>
              {locationSharing && (
                <p className="mt-2 inline-flex rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-white">
                  Live location sharing is active
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <a href="tel:911" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
              <Phone className="h-4 w-4" />
              Call 911
            </a>
            <Button variant="secondary" onClick={() => residentAction('SAFE')}>I'm Safe</Button>
            {acknowledged ? (
              <Button variant="danger" onClick={() => residentAction('NEEDS_HELP')}>No, I Need Help</Button>
            ) : (
              <Button variant="outline" onClick={() => residentAction('KEEP_ACTIVE')}>Keep SOS Active</Button>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="rounded-full p-2 shadow-lg shadow-red-950/15 transition-all"
        style={{
          background: `conic-gradient(#7f1d1d ${holdProgress * 3.6}deg, #fecaca ${holdProgress * 3.6}deg)`,
        }}
      >
        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerCancel={cancelHold}
          onPointerLeave={cancelHold}
          onContextMenu={(event) => event.preventDefault()}
          disabled={isSending}
          style={{
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          } as CSSProperties}
          className={clsx(
            'relative flex h-56 w-56 touch-none select-none flex-col items-center justify-center overflow-hidden rounded-full border-4 border-red-950/30 bg-red-700 px-8 text-center text-white shadow-xl shadow-red-950/25 transition-colors focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-offset-4 disabled:opacity-60 sm:h-72 sm:w-72',
            isHolding ? 'bg-red-900' : 'hover:bg-red-800'
          )}
        >
          <span className="absolute inset-5 rounded-full border border-white/20" />
          <ShieldAlert className="relative z-10 mb-3 h-10 w-10 sm:h-12 sm:w-12" />
          <span className="relative z-10 text-xl font-bold leading-tight sm:text-2xl">
            {isSending ? 'Sending SOS...' : 'Hold to Send SOS'}
          </span>
          <span className="relative z-10 mt-2 text-sm font-semibold text-red-50 sm:text-base">Emergency use only</span>
          {isHolding && <span className="relative z-10 mt-2 text-xs font-bold text-white">{Math.ceil((HOLD_MS * (1 - holdProgress / 100)) / 1000)}s</span>}
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800">
          {sosState === 'holding'
            ? 'Keep holding to send SOS.'
            : sosState === 'cancelled'
              ? 'SOS cancelled.'
              : sosState === 'failed'
                ? 'SOS failed. Try again or call 911 immediately.'
                : 'Keep holding to send SOS.'}
        </p>
        {message && <p className="mt-2 max-w-md text-sm font-medium text-slate-600">{message}</p>}
        {process.env.NODE_ENV !== 'production' && lastSosId && <p className="mt-1 text-xs font-medium text-slate-500">Last SOS ID: {lastSosId}</p>}
      </div>
    </div>
  );
}
