'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CreditCard, FileText, Home, MapPin, PackageOpen, ShieldAlert, Wifi, Wrench } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { JourneyTracker } from '@/components/JourneyTracker';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { WeatherCard } from '@/components/WeatherCard';
import { ApiError } from '@/lib/api';
import { PAYMENT_STATUS_COLORS, STATUS_LABELS } from '@/lib/auth';
import {
  EMPTY_RESIDENT_DASHBOARD,
  fetchResidentDashboard,
  journeyStepsForTracker,
  ResidentDashboardData,
} from '@/lib/residentDashboard';

export default function ResidentDashboard() {
  const [data, setData] = useState<ResidentDashboardData>(EMPTY_RESIDENT_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    fetchResidentDashboard()
      .then((response) => {
        if (!active) return;
        setData(response);
        setLoadError('');
      })
      .catch((err) => {
        if (!active) return;
        setData(EMPTY_RESIDENT_DASHBOARD);
        if (err instanceof ApiError) {
          if (err.status === 401 || err.status === 403) {
            setLoadError('Session expired. Please sign in again.');
            return;
          }
          setLoadError(err.message || 'Unable to load dashboard details. Please refresh or sign in again.');
          return;
        }
        setLoadError('Unable to load dashboard details. Please refresh or sign in again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const journeySteps = journeyStepsForTracker(data.journey);

  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT', 'ALUMNI']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome{data.resident.name ? `, ${data.resident.name.split(' ')[0]}` : ''}
            </h1>
            {data.activeSeason?.season?.name && (
              <p className="mt-1 text-slate-600">{data.activeSeason.season.name} cohort</p>
            )}
          </div>

          <WeatherCard compact />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { href: '/weather', label: 'View Weather' },
              { href: '/maintenance', label: 'Submit Maintenance' },
              { href: '/community-memories', label: 'Community Memories' },
              { href: '/internet', label: 'View Wi-Fi' },
              { href: '/dashboard/emergency-sos', label: 'Emergency SOS' },
              { href: '/transportation', label: 'Transportation' },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 shadow-sm hover:border-brand-300">
                {action.label}
              </Link>
            ))}
          </div>

          {loadError && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{loadError}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/notices" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Unread notices</p>
                    <p className="text-xl font-semibold">{data.summary.unreadNotices}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/payments" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Recent payments</p>
                    <p className="text-xl font-semibold">{data.summary.recentPayments}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/maintenance" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Maintenance</p>
                    <p className="text-xl font-semibold">{data.summary.openMaintenance}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/supply-requests" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <PackageOpen className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Supply requests</p>
                    <p className="text-xl font-semibold">{data.summary.openSupplyRequests} open</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/profile" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">House Assignment</p>
                    <p className="text-xl font-semibold">{data.housing.display}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/leases" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Lease Status</p>
                    <p className="text-xl font-semibold">{data.lease.status}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/internet" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <Wifi className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Wi-Fi Info</p>
                    <p className="text-xl font-semibold">{data.wifi.networkName}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/emergency-alerts" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-slate-500">County Alerts</p>
                    <p className="text-xl font-semibold">{data.alerts.countyAlertName}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/local-guide" className="block">
              <Card className="transition-colors hover:border-brand-300">
                <CardBody className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Local Guide</p>
                    <p className="text-xl font-semibold">Resources</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-900">Your journey</h2>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <p className="text-sm text-slate-500">Loading journey...</p>
                ) : journeySteps.length ? (
                  <JourneyTracker steps={journeySteps} />
                ) : (
                  <p className="text-sm text-slate-500">No journey steps yet</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-900">Recent payments</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading payments...</p>
                ) : data.recentPaymentsList.length ? (
                  data.recentPaymentsList.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <span>{payment.description || payment.type}</span>
                      <Badge className={PAYMENT_STATUS_COLORS[payment.status]}>{STATUS_LABELS[payment.status]}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No recent payments yet</p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
