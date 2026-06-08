'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, MapPin, Phone, ShieldAlert, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api, apiOrigin } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { DEFAULT_SOS_SETTINGS, SosSettings } from '@/lib/sosSettings';
import { getSosAudio, playSosSound, setSosSoundSource, stopSosSound, unlockSosSound } from '@/lib/sosSound';
import { SosAlert, UserRole } from '@/lib/types';

interface AdminSosAlertManagerProps {
  role?: UserRole;
  onCountChange?: (count: number) => void;
}

const POLL_INTERVAL_MS = 3_000;
const SOS_SOUND_ENABLED_KEY = 'sosDesktopSoundEnabled';
const ACTIVE_SOS_ENDPOINT = '/admin/sos/active';
const SHOW_SOS_DIAGNOSTICS = process.env.NODE_ENV !== 'production';

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(userAgent);
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  return mobileUa || (smallScreen && coarsePointer);
}

function locationLabel(alert: SosAlert) {
  if (alert.streetAddress) return alert.streetAddress;
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  if (latitude == null || longitude == null) return 'Location unavailable';
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function houseAssignmentLabel(alert: SosAlert) {
  const assignment = alert.assignment || '';
  if (!assignment || /room|bed|building/i.test(assignment)) return 'House assignment pending';
  return assignment;
}

function cityStateLabel(alert: SosAlert) {
  return [alert.city, alert.state].filter(Boolean).join(', ') || 'Not available';
}

function landmarkLabel(alert: SosAlert) {
  return alert.landmark || 'Not available';
}

function trackingLabel(alert: SosAlert) {
  return alert.trackingActive || (alert.locationHistory?.length ?? 0) > 0 ? 'Active' : 'Off';
}

function mapUrl(alert: SosAlert) {
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function isResponderAlert(alert: SosAlert) {
  return !alert.resolvedAt && (alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED' || alert.status === 'NEEDS_HELP');
}

function shouldPlaySirenForAlert(alert: SosAlert) {
  return !alert.adminAcknowledgedAt && (alert.status === 'ACTIVE' || alert.status === 'NEEDS_HELP');
}

function displayFetchError(message: string) {
  if (message.includes('NOT_FOUND') || message.includes('The page could not be found')) {
    return 'Unable to reach SOS service. Please refresh or contact support.';
  }
  return message || 'Unable to reach SOS service. Please refresh or contact support.';
}

export function AdminSosAlertManager({ role, onCountChange }: AdminSosAlertManagerProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [featuredAlert, setFeaturedAlert] = useState<SosAlert | null>(null);
  const [settings, setSettings] = useState<SosSettings>(DEFAULT_SOS_SETTINGS);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [mobileDevice, setMobileDevice] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [lastFetchStatus, setLastFetchStatus] = useState('Pending');
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [lastActionStatus, setLastActionStatus] = useState('idle');
  const [acknowledgeRequestStatus, setAcknowledgeRequestStatus] = useState('Idle');
  const [resolveRequestStatus, setResolveRequestStatus] = useState('Idle');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [lastActionClicked, setLastActionClicked] = useState('None');
  const [lastActionEndpoint, setLastActionEndpoint] = useState('None');
  const seenIdsRef = useRef<Set<string>>(new Set());
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  const sirenPlayingRef = useRef(false);

  const canRun = role === 'ADMIN';
  const canPlaySound = canRun && !mobileDevice;
  const canShowEmergencyModal = canRun && !mobileDevice;

  const stopSiren = useCallback(() => {
    stopSosSound();
    sirenPlayingRef.current = false;
  }, []);

  const startSiren = useCallback(async () => {
    if (!canPlaySound || sirenPlayingRef.current) return;

    const played = await playSosSound({ loop: settings.continuousAlarmEnabled });
    setSoundBlocked(!played);
    sirenPlayingRef.current = played;
  }, [canPlaySound, settings.continuousAlarmEnabled]);

  const pollActiveAlerts = useCallback(async () => {
    if (!canRun) return;

    try {
      const data = await api<{ alerts: SosAlert[]; count: number; businessId?: string }>(ACTIVE_SOS_ENDPOINT, { suppressErrorLog: true });
      const responderAlerts = data.alerts.filter(isResponderAlert);
      const sirenAlerts = responderAlerts.filter(shouldPlaySirenForAlert);
      const nextIds = new Set(sirenAlerts.map((alert) => alert.id));
      const newAlerts = sirenAlerts.filter((alert) => !seenIdsRef.current.has(alert.id));

      // Drop dismissed ids that are no longer active so a future re-trigger can surface again.
      const activeIds = new Set(responderAlerts.map((alert) => alert.id));
      dismissedIdsRef.current.forEach((id) => {
        if (!activeIds.has(id)) dismissedIdsRef.current.delete(id);
      });

      setAlerts(data.alerts);
      setLastCheckTime(new Date().toLocaleTimeString());
      setLastFetchStatus('OK');
      setLastFetchError(null);
      setDisplayError(null);
      setBusinessId(data.businessId || null);
      onCountChange?.(responderAlerts.length);

      // A genuinely new SOS always reopens the modal, even if a different one was minimized.
      if (canShowEmergencyModal && newAlerts.length > 0) {
        const nextNew = newAlerts.find((alert) => !dismissedIdsRef.current.has(alert.id)) || newAlerts[0];
        setFeaturedAlert(nextNew);
      } else if (canShowEmergencyModal && responderAlerts.length > 0 && !featuredAlert) {
        // Respect a manual minimize: only auto-open alerts the admin hasn't dismissed.
        const nextAlert = responderAlerts.find((alert) => !dismissedIdsRef.current.has(alert.id));
        if (nextAlert) setFeaturedAlert(nextAlert);
      }

      if (sirenAlerts.length > 0 && canPlaySound && soundEnabled) {
        void startSiren();
      }
      if (sirenAlerts.length === 0) {
        stopSiren();
      }

      seenIdsRef.current = nextIds;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch active SOS alerts.';
      setLastFetchStatus('Error');
      setLastFetchError(message);
      setDisplayError(displayFetchError(message));
      console.warn('[sos admin] Active SOS polling failed', err);
    }
  }, [canPlaySound, canRun, canShowEmergencyModal, featuredAlert, onCountChange, soundEnabled, startSiren, stopSiren]);

  useEffect(() => {
    if (!canRun) return;

    const mobile = isMobileDevice();
    setMobileDevice(mobile);
    if (!mobile) {
      getSosAudio();
      try {
        setSoundEnabled(localStorage.getItem(SOS_SOUND_ENABLED_KEY) === 'true');
      } catch {
        setSoundEnabled(false);
      }
    }

    api<{ settings: SosSettings }>('/sos-settings', { suppressErrorLog: true })
      .then((data) => {
        setSettings(data.settings);
        setSosSoundSource(data.settings.sound.url);
      })
      .catch((err) => console.warn('[sos admin] Failed to load SOS settings', err));

    return stopSiren;
  }, [canRun, stopSiren]);

  useEffect(() => {
    if (!canRun) return;

    void pollActiveAlerts();
    const timer = window.setInterval(() => void pollActiveAlerts(), POLL_INTERVAL_MS);
    const refreshNow = () => void pollActiveAlerts();
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshNow);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshNow);
    };
  }, [canRun, pollActiveAlerts]);

  useEffect(() => {
    const sirenAlerts = alerts.filter(isResponderAlert).filter(shouldPlaySirenForAlert);
    if (sirenAlerts.length > 0 && canPlaySound && soundEnabled) {
      void startSiren();
      return;
    }
    if (sirenAlerts.length === 0) stopSiren();
  }, [alerts, canPlaySound, soundEnabled, startSiren, stopSiren]);

  const enableDesktopSound = async () => {
    if (!canPlaySound) return;

    const unlocked = await unlockSosSound();
    setSoundEnabled(unlocked);
    setSoundBlocked(!unlocked);
    if (unlocked) {
      try {
        localStorage.setItem(SOS_SOUND_ENABLED_KEY, 'true');
      } catch {
        // Storage can fail on some mobile/private browser modes.
      }
      if (alerts.some(isResponderAlert)) void startSiren();
    } else {
      try {
        localStorage.removeItem(SOS_SOUND_ENABLED_KEY);
      } catch {
        // Ignore storage cleanup failure.
      }
    }
  };

  const adminAction = async (alert: SosAlert, action: 'ACKNOWLEDGE' | 'RESOLVE') => {
    if (process.env.NODE_ENV !== 'production') console.info(`[sos admin] ${action === 'ACKNOWLEDGE' ? 'Acknowledge' : 'Resolve'} clicked`, { alertId: alert.id });
    if (!alert.id) {
      setLastActionClicked(action === 'ACKNOWLEDGE' ? 'acknowledge' : 'resolve');
      setLastActionStatus('failed');
      setActionStatus('Unable to update SOS alert. Please refresh and try again.');
      setLastFetchError('Missing SOS alert ID.');
      return;
    }
    if (action === 'ACKNOWLEDGE' && alert.adminAcknowledgedAt) {
      setLastActionClicked('acknowledge');
      setLastActionEndpoint('local already acknowledged');
      setLastActionStatus('success');
      setActionStatus('SOS is already acknowledged.');
      return;
    }
    setActionId(`${alert.id}:${action}`);
    setLastFetchError(null);
    setActionStatus(action === 'ACKNOWLEDGE' ? 'Acknowledging SOS...' : 'Resolving SOS...');
    setLastActionClicked(action === 'ACKNOWLEDGE' ? 'acknowledge' : 'resolve');
    setLastActionStatus('loading');
    if (action === 'ACKNOWLEDGE') setAcknowledgeRequestStatus('Sending');
    if (action === 'RESOLVE') setResolveRequestStatus('Sending');
    try {
      const endpoint = action === 'ACKNOWLEDGE' ? '/admin/sos/acknowledge' : '/admin/sos/resolve';
      setLastActionEndpoint(endpoint);
      if (process.env.NODE_ENV !== 'production') console.debug('[sos admin] modal button clicked', { action, endpoint, alertId: alert.id });
      const data = await api<{ alert?: SosAlert; sosAlert?: SosAlert; sos?: SosAlert; success?: boolean }>(endpoint, { method: 'POST', body: { sosAlertId: alert.id } });
      const nextAlert = data.alert || data.sosAlert || data.sos;
      if (process.env.NODE_ENV !== 'production') console.debug('[sos admin] action response received', { action, endpoint, response: data });
      if (!nextAlert?.id) throw new Error('Backend did not return the updated SOS alert.');

      setAlerts((current) =>
        action === 'RESOLVE' ? current.filter((item) => item.id !== nextAlert.id) : current.map((item) => (item.id === nextAlert.id ? nextAlert : item))
      );
      if (action === 'ACKNOWLEDGE') {
        setFeaturedAlert(nextAlert);
        setActionStatus('SOS acknowledged.');
        setLastActionStatus('success');
        setAcknowledgeRequestStatus('Success');
        stopSiren();
      }
      if (action === 'RESOLVE') {
        dismissedIdsRef.current.add(nextAlert.id);
        setFeaturedAlert(null);
        setActionStatus('SOS resolved.');
        setLastActionStatus('success');
        setResolveRequestStatus('Success');
        stopSiren();
      }
      await pollActiveAlerts();
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      const base =
        reason.includes('Insufficient permissions')
          ? 'You do not have permission to manage this SOS alert.'
          : action === 'ACKNOWLEDGE'
            ? 'Failed to acknowledge SOS.'
            : 'Failed to resolve SOS.';
      // Surface the real backend reason in production so the action is debuggable instead of a blind "Failed".
      const detailed = reason && !base.includes(reason) ? `${base} (${displayFetchError(reason)})` : base;
      if (process.env.NODE_ENV !== 'production') console.error('[sos admin] action failed', { action, endpoint: action === 'ACKNOWLEDGE' ? '/admin/sos/acknowledge' : '/admin/sos/resolve', alertId: alert.id, reason, err });
      setLastFetchError(reason);
      setActionStatus(detailed);
      setLastActionStatus('failed');
      if (action === 'ACKNOWLEDGE') setAcknowledgeRequestStatus('Failed');
      if (action === 'RESOLVE') setResolveRequestStatus('Failed');
    } finally {
      setActionId(null);
    }
  };

  const openSosCenter = () => {
    if (process.env.NODE_ENV !== 'production') console.info('[sos admin] Open SOS Center clicked');
    setLastActionClicked('open center');
    setLastActionStatus('success');
    setLastActionEndpoint('/admin/sos');
    // Close the modal locally so it does not immediately reappear from polling on the SOS center page.
    if (featuredAlert) dismissedIdsRef.current.add(featuredAlert.id);
    setFeaturedAlert(null);
    if (typeof window !== 'undefined') {
      window.location.assign('/admin/sos');
      return;
    }
    router.push('/admin/sos');
  };

  const callResident = (phone?: string | null) => {
    if (process.env.NODE_ENV !== 'production') console.info('[sos admin] Call Resident clicked', { hasPhone: Boolean(phone) });
    setLastActionClicked('call resident');
    setLastActionEndpoint(phone ? `tel:${phone}` : 'No phone');
    if (!phone) {
      setActionStatus('No resident phone number available.');
      setLastActionStatus('failed');
      return;
    }
    setLastActionStatus('success');
    if (typeof window !== 'undefined') window.location.href = `tel:${phone}`;
  };

  const openLocation = (url: string | null) => {
    if (process.env.NODE_ENV !== 'production') console.info('[sos admin] View Location clicked', { hasLocation: Boolean(url) });
    setLastActionClicked('location');
    setLastActionEndpoint(url || 'No location');
    if (!url) {
      setActionStatus('Location unavailable.');
      setLastActionStatus('failed');
      return;
    }
    setActionStatus('Opening location...');
    setLastActionStatus('success');
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  };

  const minimizeModal = () => {
    if (process.env.NODE_ENV !== 'production') console.info('[sos admin] Minimize clicked', { alertId: featuredAlert?.id });
    setLastActionClicked('minimize');
    setLastActionEndpoint('local modal minimize');
    setLastActionStatus('success');
    setActionStatus('SOS modal minimized. The alert stays in the banner until resolved.');
    // Remember the minimize so the 3s polling does not immediately reopen the same alert.
    if (featuredAlert) dismissedIdsRef.current.add(featuredAlert.id);
    setFeaturedAlert(null);
  };

  if (!canRun) return null;

  const responderAlerts = alerts.filter(isResponderAlert);
  const bannerAlert = responderAlerts[0] || null;
  const modalAlert = featuredAlert && responderAlerts.some((alert) => alert.id === featuredAlert.id) ? featuredAlert : null;
  const bannerMapUrl = bannerAlert ? mapUrl(bannerAlert) : null;
  const modalMapUrl = modalAlert ? mapUrl(modalAlert) : null;
  const actionLoading = (alert: SosAlert, action: string) => actionId === `${alert.id}:${action}`;

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="text-sm text-slate-800">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-red-100 p-2 text-red-700">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-slate-950">Emergency SOS Monitoring</p>
                <p className="text-xs text-slate-500">Dashboard polling is active every 3 seconds.</p>
              </div>
            </div>
            {mobileDevice ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                Mobile SOS notifications are planned for a future upgrade. Use the admin computer dashboard for SOS sound alerts.
              </p>
            ) : (
              <p className="mt-2 text-xs font-medium text-slate-600">Keep this computer dashboard open during coverage hours to receive SOS modal and siren alerts.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">Fallback: Active</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">Last Check: {lastCheckTime || 'Pending'}</span>
              <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-800">Active Alerts: {responderAlerts.length}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">Sound: {mobileDevice ? 'Desktop Only' : soundEnabled ? 'Enabled' : 'Not enabled'}</span>
            </div>
            {displayError && <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">Connection issue detected. Open diagnostics.</p>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex">
            {!mobileDevice && (
              <Button variant="outline" size="sm" onClick={enableDesktopSound}>
                <Volume2 className="h-4 w-4" />
                Enable Desktop Sound
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={openSosCenter}>
              Open SOS Center
            </Button>
            {SHOW_SOS_DIAGNOSTICS && (
              <Button variant="outline" size="sm" onClick={() => setShowDiagnostics((value) => !value)}>
                {showDiagnostics ? 'Hide SOS Diagnostics' : 'Show SOS Diagnostics'}
              </Button>
            )}
          </div>
        </div>
        {SHOW_SOS_DIAGNOSTICS && showDiagnostics && (
          <div className="mx-auto mt-3 grid max-w-6xl gap-1 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
            <span>Current Role: <strong>{role || 'Unknown'}</strong></span>
            <span>Current User ID: <strong>{getStoredUser()?.id || 'Unknown'}</strong></span>
            <span>Business ID: <strong>{businessId || 'Unknown'}</strong></span>
            <span>API URL: <strong>{apiOrigin || 'browser proxy'}</strong></span>
            <span>Last Active SOS Fetch URL: <strong>{apiOrigin ? `${apiOrigin}/api${ACTIVE_SOS_ENDPOINT}` : `/api/backend${ACTIVE_SOS_ENDPOINT}`}</strong></span>
            <span>Last Active SOS Fetch: <strong>{lastCheckTime || 'Pending'}</strong></span>
            <span>Last Fetch Status: <strong>{lastFetchStatus}</strong></span>
            <span>Active SOS Count: <strong>{responderAlerts.length}</strong></span>
            <span>Last SOS Alert ID: <strong>{alerts[0]?.id || 'None'}</strong></span>
            <span>Last SOS Created: <strong>{alerts[0]?.createdAt ? formatDate(alerts[0].createdAt) : 'None'}</strong></span>
            <span>Selected SOS ID: <strong>{modalAlert?.id || bannerAlert?.id || 'None'}</strong></span>
            <span>Last Action Clicked: <strong>{lastActionClicked}</strong></span>
            <span>Last Action Endpoint: <strong>{lastActionEndpoint}</strong></span>
            <span>Last Action Status: <strong>{lastActionStatus}</strong></span>
            <span>Acknowledge Request: <strong>{acknowledgeRequestStatus}</strong></span>
            <span>Resolve Request: <strong>{resolveRequestStatus}</strong></span>
            <span className="sm:col-span-2 lg:col-span-3">Last Error: <strong>{lastFetchError || 'None'}</strong></span>
          </div>
        )}
      </div>

      {responderAlerts.length > 0 && bannerAlert && (
        <div className="border-b border-red-200 bg-red-50 px-3 py-3 text-red-950 shadow-sm sm:px-6 lg:px-8" role="alert">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="text-sm font-black uppercase tracking-wide">Emergency SOS Alert</p>
                <p className="text-sm text-red-900">
                  Pending SOS Alerts: {responderAlerts.length}. Resident: {bannerAlert.residentName}. House: {houseAssignmentLabel(bannerAlert)}. Location: {locationLabel(bannerAlert)}.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
              {!mobileDevice && (!soundEnabled || soundBlocked) && (
                <Button variant="secondary" size="sm" onClick={enableDesktopSound}>
                  <Volume2 className="h-4 w-4" />
                  Enable Sound
                </Button>
              )}
              <Button variant="secondary" size="sm" loading={actionLoading(bannerAlert, 'ACKNOWLEDGE')} onClick={() => adminAction(bannerAlert, 'ACKNOWLEDGE')}>
                {bannerAlert.adminAcknowledgedAt ? 'Acknowledged' : 'Acknowledge SOS'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => openLocation(bannerMapUrl)}>
                <MapPin className="h-4 w-4" />
                View Location
              </Button>
              <Button variant="danger" size="sm" className="border border-white/50 bg-red-800 text-white hover:bg-red-900" onClick={openSosCenter}>
                View All
              </Button>
            </div>
          </div>
        </div>
      )}

      {canShowEmergencyModal && modalAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" onClick={minimizeModal}>
          <div className="relative z-[10000] pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-red-100 bg-red-700 px-5 py-4 text-white">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-8 w-8 shrink-0 animate-pulse" />
                <div>
                  <p className="text-xl font-black uppercase tracking-wide">Emergency SOS Alert</p>
                  <p className="text-sm text-red-50">This alert will stay visible until acknowledged or resolved.</p>
                </div>
              </div>
              <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold hover:bg-red-800" onClick={minimizeModal} aria-label="Minimize SOS modal">
                <X className="h-5 w-5" />
                Minimize
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold uppercase text-red-800">{modalAlert.status.replace('_', ' ')}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{modalAlert.emergencyType || 'SOS'}</span>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p><span className="font-bold text-slate-900">Resident:</span> {modalAlert.residentName}</p>
                <p><span className="font-bold text-slate-900">Message:</span> {modalAlert.message || 'Emergency SOS triggered from portal.'}</p>
                <p><span className="font-bold text-slate-900">House Assignment:</span> {houseAssignmentLabel(modalAlert)}</p>
                <p><span className="font-bold text-slate-900">Street Address:</span> {locationLabel(modalAlert)}</p>
                <p><span className="font-bold text-slate-900">Nearby Landmark:</span> {landmarkLabel(modalAlert)}</p>
                <p><span className="font-bold text-slate-900">City / State:</span> {cityStateLabel(modalAlert)}</p>
                <p><span className="font-bold text-slate-900">Time:</span> {formatDate(modalAlert.createdAt)}</p>
                <p><span className="font-bold text-slate-900">Tracking:</span> {trackingLabel(modalAlert)}</p>
                <p><span className="font-bold text-slate-900">Sound:</span> {mobileDevice ? 'Desktop only' : soundBlocked ? 'Blocked until enabled' : soundEnabled ? 'Enabled' : 'Not enabled'}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Button variant="danger" loading={actionLoading(modalAlert, 'ACKNOWLEDGE')} onClick={() => adminAction(modalAlert, 'ACKNOWLEDGE')}>
                  {modalAlert.adminAcknowledgedAt ? 'Acknowledged' : 'Acknowledge SOS'}
                </Button>
                <Button variant="secondary" loading={actionLoading(modalAlert, 'RESOLVE')} onClick={() => adminAction(modalAlert, 'RESOLVE')}>
                  Mark Resolved
                </Button>
                {!mobileDevice && (
                  <Button variant="outline" onClick={enableDesktopSound}>
                    <Volume2 className="h-4 w-4" />
                    Enable Sound
                  </Button>
                )}
                <Button variant="outline" onClick={() => openLocation(modalMapUrl)}>
                  <MapPin className="h-4 w-4" />
                  View Location
                </Button>
                <Button variant="outline" onClick={() => callResident(modalAlert.phone)}>
                  <Phone className="h-4 w-4" />
                  Call Resident
                </Button>
                <Button variant="outline" onClick={openSosCenter}>
                  Open SOS Center
                </Button>
              </div>
              {SHOW_SOS_DIAGNOSTICS && (
                <div className="grid gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700 sm:grid-cols-3">
                  <span>Last action clicked: {lastActionClicked}</span>
                  <span>Last action status: {lastActionStatus}</span>
                  <span>Last error: {lastFetchError ? displayFetchError(lastFetchError) : 'None'}</span>
                </div>
              )}
              {actionStatus && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">{actionStatus}</p>}
              {!mobileDevice && (!soundEnabled || soundBlocked) && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Tap Enable Sound on this computer, keep volume on, and keep the admin dashboard open during coverage hours.
                </p>
              )}
              {mobileDevice && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Mobile SOS notifications are planned for a future upgrade. Use the admin computer dashboard for SOS sound alerts.
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
