'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { SosAlert } from '@/lib/types';

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

export default function SosHistoryPage() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ alerts: SosAlert[] }>('/admin/sos/history')
      .then((data) => setAlerts(data.alerts))
      .catch((err) => console.error('[sos-history] Failed to load SOS history', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">SOS History</h1>
              <p className="mt-1 text-slate-600">Resolved and past emergency SOS records.</p>
            </div>
            <Link href="/admin/sos" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
              Active SOS Center
            </Link>
          </div>

          {loading ? (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-500">Loading SOS history...</p>
              </CardBody>
            </Card>
          ) : alerts.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-500">No resolved SOS records yet.</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-slate-950">{alert.residentName}</h2>
                          <Badge className="bg-slate-100 text-slate-700">{alert.status.replace('_', ' ')}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{alert.assignment || 'No assignment recorded'}</p>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{formatDate(alert.createdAt)}</p>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acknowledged by</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{alert.adminAcknowledgedBy || 'Not recorded'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acknowledged at</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(alert.adminAcknowledgedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolved at</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(alert.resolvedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{locationLabel(alert)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/sos?alert=${alert.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                        View Details
                      </Link>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${alert.currentLatitude ?? alert.initialLatitude},${alert.currentLongitude ?? alert.initialLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <MapPin className="h-4 w-4" />
                        View Location
                      </a>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
