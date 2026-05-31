'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';

export default function AlumniHistoryPage() {
  const [memberships, setMemberships] = useState<{ season: { name: string }; status: string; leftAt?: string }[]>([]);
  const [leases, setLeases] = useState<{ title: string; season?: { name: string }; signedAt?: string }[]>([]);

  useEffect(() => {
    api<{ user: { seasonMemberships: typeof memberships } }>('/auth/me').then((d) => setMemberships(d.user.seasonMemberships || []));
    api<{ leases: typeof leases }>('/leases').then((d) => setLeases(d.leases));
  }, []);

  return (
    <ProtectedRoute roles={['ALUMNI']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Your history</h1>
        <h2 className="font-semibold text-slate-800 mb-3">Past seasons</h2>
        <div className="space-y-3 mb-8">
          {memberships.map((m, i) => (
            <Card key={i}>
              <CardBody className="flex justify-between">
                <span className="font-medium">{m.season.name}</span>
                <span className="text-sm text-slate-500 capitalize">{m.status.replace(/_/g, ' ').toLowerCase()}</span>
              </CardBody>
            </Card>
          ))}
        </div>
        <h2 className="font-semibold text-slate-800 mb-3">Leases</h2>
        <div className="space-y-3">
          {leases.map((l, i) => (
            <Card key={i}>
              <CardBody>
                <p className="font-medium">{l.title}</p>
                {l.season && <p className="text-sm text-slate-500">{l.season.name}</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
