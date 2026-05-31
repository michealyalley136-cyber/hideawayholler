'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CreditCard, Wrench } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { JourneyTracker } from '@/components/JourneyTracker';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { JourneyStep, Payment } from '@/lib/types';
import { PAYMENT_STATUS_COLORS, STATUS_LABELS } from '@/lib/auth';

export default function ResidentDashboard() {
  const [data, setData] = useState<{
    profile: { fullName: string; currentStatus: string };
    activeSeason?: { season: { name: string } };
    journey: JourneyStep[];
    unreadNotices: number;
    recentPayments: Payment[];
    recentMaintenance: { id: string; description: string; status: string }[];
  } | null>(null);

  useEffect(() => {
    api<typeof data>('/dashboard/resident').then(setData).catch(console.error);
  }, []);

  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome{data?.profile ? `, ${data.profile.fullName.split(' ')[0]}` : ''}
            </h1>
            {data?.activeSeason && (
              <p className="text-slate-600 mt-1">{data.activeSeason.season.name} cohort</p>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Link href="/notices" className="block">
              <Card className="hover:border-brand-300 transition-colors">
                <CardBody className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Unread notices</p>
                    <p className="text-xl font-semibold">{data?.unreadNotices ?? '—'}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/payments" className="block">
              <Card className="hover:border-brand-300 transition-colors">
                <CardBody className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Recent payments</p>
                    <p className="text-xl font-semibold">{data?.recentPayments?.length ?? '—'}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/maintenance" className="block">
              <Card className="hover:border-brand-300 transition-colors">
                <CardBody className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-brand-600" />
                  <div>
                    <p className="text-sm text-slate-500">Maintenance</p>
                    <p className="text-xl font-semibold">{data?.recentMaintenance?.length ?? '—'}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-900">Your journey</h2>
              </CardHeader>
              <CardBody>
                {data?.journey ? <JourneyTracker steps={data.journey} /> : <p className="text-slate-500 text-sm">Loading...</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-900">Recent payments</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {data?.recentPayments?.length ? (
                  data.recentPayments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <span>{p.description || p.type}</span>
                      <Badge className={PAYMENT_STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No payments yet</p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
