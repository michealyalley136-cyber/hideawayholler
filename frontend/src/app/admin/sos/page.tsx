'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { SosAlert, SosAlertStatus } from '@/lib/types';

const ACTIVE_STATUSES: SosAlertStatus[] = ['ACTIVE', 'ACKNOWLEDGED', 'NEEDS_HELP'];

const statusClass: Record<SosAlertStatus, string> = {
  ACTIVE: 'bg-red-100 text-red-800',
  ACKNOWLEDGED: 'bg-orange-100 text-orange-800',
  NEEDS_HELP: 'bg-red-700 text-white',
  SAFE: 'bg-emerald-100 text-emerald-800',
  RESOLVED: 'bg-slate-100 text-slate-700',
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
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
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

function trackingLabel(alert: SosAlert) {
  return alert.trackingActive || (alert.locationHistory?.length ?? 0) > 0 ? 'Active' : 'Off';
}

export default function AdminSosCenter() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoadError('');
      const data = await api<{ alerts: SosAlert[]; count: number }>('/admin/sos/active', { suppressErrorLog: true });
      setAlerts(data.alerts);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[sos-admin] Failed to load SOS alerts', err);
      setLoadError('Unable to reach SOS service. Please refresh or contact support.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 3000);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  const activeAlerts = useMemo(() => alerts.filter((alert) => ACTIVE_STATUSES.includes(alert.status)), [alerts]);

  useEffect(() => {
    if (activeAlerts.length > 0) {
      document.title = `SOS ACTIVE (${activeAlerts.length}) - HollerHub`;
      return;
    }
    document.title = 'Emergency / SOS Center - HollerHub';
  }, [activeAlerts.length]);

  const latestActiveAlert = activeAlerts[0] || null;

  const adminAction = async (alert: SosAlert, action: 'ACKNOWLEDGE' | 'RESOLVE') => {
    setActionId(`${alert.id}:${action}`);
    setActionStatus(action === 'ACKNOWLEDGE' ? 'Acknowledging SOS...' : 'Resolving SOS...');
    try {
      const data = await api<{ alert?: SosAlert; sosAlert?: SosAlert; sos?: SosAlert; success?: boolean }>(
        action === 'ACKNOWLEDGE' ? `/admin/sos/${alert.id}/acknowledge` : `/admin/sos/${alert.id}/resolve`,
        {
          method: 'POST',
        }
      );
      const nextAlert = data.alert || data.sosAlert || data.sos;
      if (!nextAlert?.id) throw new Error('Backend did not return the updated SOS alert.');

      setAlerts((current) => (action === 'RESOLVE' ? current.filter((item) => item.id !== nextAlert.id) : current.map((item) => (item.id === nextAlert.id ? nextAlert : item))));
      setActionStatus(action === 'ACKNOWLEDGE' ? 'SOS acknowledged.' : 'SOS resolved.');
      await loadAlerts();
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      const base =
        reason.includes('Insufficient permissions')
          ? 'You do not have permission to manage this SOS alert.'
          : action === 'ACKNOWLEDGE'
            ? 'Failed to acknowledge SOS.'
            : 'Failed to resolve SOS.';
      setActionStatus(reason && !base.includes(reason) ? `${base} (${reason})` : base);
    } finally {
      setActionId(null);
    }
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Emergency / SOS Center</h1>
            <p className="mt-1 text-slate-600">Active resident SOS alerts and location updates.</p>
          </div>
          <a href="/admin/sos/history" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
            SOS History
          </a>

          {activeAlerts.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border-2 border-red-700 bg-red-700 p-4 text-white shadow-lg">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="text-lg font-bold">{activeAlerts.length} active SOS alert{activeAlerts.length === 1 ? '' : 's'}</p>
                <p className="text-sm text-red-50">A resident may need immediate help. Review, acknowledge, and call as needed.</p>
              </div>
            </div>
          )}

          {actionStatus && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 shadow-sm">
              {actionStatus}
            </div>
          )}

          {process.env.NODE_ENV !== 'production' && latestActiveAlert && (
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">Show SOS diagnostics</summary>
              <p className="mt-2 text-xs text-slate-600">Use these controls only to verify API actions outside the notification modal.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" loading={actionId === `${latestActiveAlert.id}:ACKNOWLEDGE`} disabled={!!latestActiveAlert.adminAcknowledgedAt} onClick={() => adminAction(latestActiveAlert, 'ACKNOWLEDGE')}>
                  Test acknowledge latest active SOS
                </Button>
                <Button variant="outline" loading={actionId === `${latestActiveAlert.id}:RESOLVE`} onClick={() => adminAction(latestActiveAlert, 'RESOLVE')}>
                  Test resolve latest active SOS
                </Button>
              </div>
            </details>
          )}

          {loadError ? (
            <Card>
              <CardBody className="space-y-3">
                <p className="text-sm font-semibold text-red-700">{loadError}</p>
                <Button variant="outline" onClick={loadAlerts}>Retry SOS check</Button>
              </CardBody>
            </Card>
          ) : loading ? (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-500">Loading SOS alerts...</p>
              </CardBody>
            </Card>
          ) : alerts.length === 0 ? (
            <Card>
              <CardBody className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <p className="font-semibold text-slate-900">No SOS alerts</p>
                  <p className="text-sm text-slate-600">New alerts will appear here automatically.</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const isActive = ACTIVE_STATUSES.includes(alert.status);
                const coords = locationLabel(alert);
                const alertMapUrl = mapUrl(alert);
                const actionLoading = (action: string) => actionId === `${alert.id}:${action}`;

                return (
                  <Card key={alert.id} className={isActive ? 'border-red-400 shadow-md' : undefined}>
                    <CardHeader className={isActive ? 'border-red-100 bg-red-50' : undefined}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-950">{alert.residentName}</h2>
                            <Badge className={statusClass[alert.status]}>{alert.status.replace('_', ' ')}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">House Assignment: {houseAssignmentLabel(alert)}</p>
                        </div>
                        <p className="text-sm font-medium text-slate-700">{formatDate(alert.createdAt)}</p>
                      </div>
                    </CardHeader>

                    <CardBody className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p>
                          <p className="mt-1 font-medium text-slate-900">{alert.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">GPS coordinates</p>
                          <p className="mt-1 font-mono text-sm text-slate-900">{coords}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Street address</p>
                          <p className="mt-1 font-medium text-slate-900">{alert.streetAddress || 'Not available'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nearby landmark</p>
                          <p className="mt-1 font-medium text-slate-900">{alert.landmark || 'Not available'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">City / State</p>
                          <p className="mt-1 font-medium text-slate-900">{cityStateLabel(alert)}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
                          <p><span className="font-semibold">Acknowledged:</span> {formatDate(alert.adminAcknowledgedAt)}</p>
                          <p><span className="font-semibold">Tracking:</span> {trackingLabel(alert)}</p>
                          <p><span className="font-semibold">Location updates:</span> {alert.locationHistory?.length ?? 0}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        <Button
                          variant="danger"
                          disabled={!isActive || !!alert.adminAcknowledgedAt}
                          loading={actionLoading('ACKNOWLEDGE')}
                          onClick={() => adminAction(alert, 'ACKNOWLEDGE')}
                        >
                          {alert.adminAcknowledgedAt ? 'Acknowledged' : 'Acknowledge SOS'}
                        </Button>
                        <a
                          href={alert.phone ? `tel:${alert.phone}` : undefined}
                          aria-disabled={!alert.phone}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                        >
                          <Phone className="h-4 w-4" />
                          Call Resident
                        </a>
                        <a href="tel:911" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
                          <Phone className="h-4 w-4" />
                          Call 911 Manually
                        </a>
                        <a href={alertMapUrl || undefined} aria-disabled={!alertMapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50">
                          <MapPin className="h-4 w-4" />
                          Map Pin
                        </a>
                        <Button
                          variant="secondary"
                          disabled={!isActive}
                          loading={actionLoading('RESOLVE')}
                          onClick={() => adminAction(alert, 'RESOLVE')}
                        >
                          Mark Resolved
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
