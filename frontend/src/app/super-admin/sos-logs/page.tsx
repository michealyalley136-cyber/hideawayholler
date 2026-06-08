'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, ShieldAlert } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, ApiError } from '@/lib/api';
import { SosAlert, SosAlertStatus } from '@/lib/types';

const ACTIVE_STATUSES: SosAlertStatus[] = ['ACTIVE', 'NEEDS_HELP'];

type SuperAdminSosAlert = SosAlert & {
  business?: { name?: string | null } | null;
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

function locationLabel(alert: SosAlert) {
  if (alert.streetAddress) return alert.streetAddress;
  const latitude = alert.currentLatitude ?? alert.initialLatitude;
  const longitude = alert.currentLongitude ?? alert.initialLongitude;
  if (latitude == null || longitude == null) return 'Location unavailable';
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function cityStateLabel(alert: SosAlert) {
  return [alert.city, alert.state].filter(Boolean).join(', ') || 'Not available';
}

function secondsBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const seconds = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function responseLabel(alert: SosAlert) {
  const seconds = secondsBetween(alert.createdAt, alert.adminAcknowledgedAt || alert.resolvedAt);
  if (seconds == null) return 'Not recorded';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function statusStyle(status: SosAlertStatus) {
  if (status === 'RESOLVED' || status === 'SAFE') return 'bg-emerald-100 text-emerald-800';
  if (status === 'ACKNOWLEDGED') return 'bg-amber-100 text-amber-800';
  if (status === 'ACTIVE' || status === 'NEEDS_HELP') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: typeof ShieldAlert }) {
  return (
    <Card>
      <CardBody className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <span className="rounded-full bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </span>
      </CardBody>
    </Card>
  );
}

export default function SuperAdminSosLogsPage() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const paths = ['/admin/sos/super-admin-logs', '/super-admin/sos-logs'] as const;

    (async () => {
      for (const path of paths) {
        try {
          const data = await api<{ alerts: SuperAdminSosAlert[] }>(path, { suppressErrorLog: true });
          setAlerts(data.alerts);
          return;
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) break;
        }
      }
      setLoadError('Unable to load SOS records. Please refresh or contact support.');
    })().finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    return {
      total: alerts.length,
      active: alerts.filter((alert) => ACTIVE_STATUSES.includes(alert.status)).length,
      acknowledged: alerts.filter((alert) => alert.status === 'ACKNOWLEDGED' || alert.adminAcknowledgedAt).length,
      resolved: alerts.filter((alert) => alert.status === 'RESOLVED' || alert.status === 'SAFE' || alert.resolvedAt).length,
      test: alerts.filter((alert) => alert.isTest).length,
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      const matchesDate = !dateFilter || alert.createdAt.startsWith(dateFilter);
      return matchesStatus && matchesDate;
    });
  }, [alerts, dateFilter, statusFilter]);

  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Super Admin / Oversight</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">SOS Records & Emergency Logs</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Read-only emergency records for account management. Super Admins do not receive active SOS modals, sirens, push registration, or responder controls.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Total SOS alerts" value={summary.total} icon={ClipboardList} />
            <StatCard title="Active SOS alerts" value={summary.active} icon={AlertTriangle} />
            <StatCard title="Acknowledged" value={summary.acknowledged} icon={Activity} />
            <StatCard title="Resolved" value={summary.resolved} icon={CheckCircle2} />
            <StatCard title="Test alerts" value={summary.test} icon={ShieldAlert} />
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
              <p className="text-sm text-slate-500">Filter emergency records by status or created date.</p>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="all">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="NEEDS_HELP">Needs help</option>
                    <option value="ACKNOWLEDGED">Acknowledged</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="SAFE">Safe</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Created date
                  <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Recent SOS Log</h2>
              <p className="text-sm text-slate-500">Showing {filteredAlerts.length} record{filteredAlerts.length === 1 ? '' : 's'}.</p>
            </CardHeader>
            <CardBody>
              {loadError ? (
                <p className="text-sm font-semibold text-red-700">{loadError}</p>
              ) : loading ? (
                <p className="text-sm text-slate-500">Loading SOS records...</p>
              ) : filteredAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">No SOS records match the current filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Resident</th>
                        <th className="px-3 py-2">Business</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Message</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Created</th>
                        <th className="px-3 py-2">Acknowledged by</th>
                        <th className="px-3 py-2">Acknowledged time</th>
                        <th className="px-3 py-2">Resolved by</th>
                        <th className="px-3 py-2">Resolved time</th>
                        <th className="px-3 py-2">Response time</th>
                        <th className="px-3 py-2">Location</th>
                        <th className="px-3 py-2">City / State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAlerts.map((alert) => (
                        <tr key={alert.id} className="align-top">
                          <td className="px-3 py-3 font-medium text-slate-900">{alert.residentName}</td>
                          <td className="px-3 py-3 text-slate-600">{(alert as SuperAdminSosAlert).business?.name || 'Hideaway Holler'}</td>
                          <td className="px-3 py-3 text-slate-600">{alert.isTest ? 'TEST ' : ''}{alert.emergencyType || 'SOS'}</td>
                          <td className="px-3 py-3 text-slate-600">{alert.message || 'Not recorded'}</td>
                          <td className="px-3 py-3"><Badge className={statusStyle(alert.status)}>{alert.status.replace('_', ' ')}</Badge></td>
                          <td className="px-3 py-3 text-slate-600">{formatDate(alert.createdAt)}</td>
                          <td className="px-3 py-3 text-slate-600">{alert.adminAcknowledgedBy || 'Not recorded'}</td>
                          <td className="px-3 py-3 text-slate-600">{formatDate(alert.adminAcknowledgedAt)}</td>
                          <td className="px-3 py-3 text-slate-600">{alert.resolvedBy || 'Not recorded'}</td>
                          <td className="px-3 py-3 text-slate-600">{formatDate(alert.resolvedAt)}</td>
                          <td className="px-3 py-3 text-slate-600">{responseLabel(alert)}</td>
                          <td className="px-3 py-3 text-slate-600">{locationLabel(alert)}</td>
                          <td className="px-3 py-3 text-slate-600">{cityStateLabel(alert)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
