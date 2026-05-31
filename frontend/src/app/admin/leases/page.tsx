'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export default function AdminLeasesPage() {
  const [leases, setLeases] = useState<{ id: string; title: string; acknowledged: boolean; user?: { profile?: { fullName: string } }; season?: { name: string } }[]>([]);

  useEffect(() => {
    api<{ leases: typeof leases }>('/leases').then((d) => setLeases(d.leases));
  }, []);

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Leases</h1>
        <div className="space-y-3">
          {leases.map((l) => (
            <Card key={l.id}>
              <CardBody className="flex justify-between">
                <div>
                  <p className="font-medium">{l.title}</p>
                  <p className="text-sm text-slate-500">{l.user?.profile?.fullName} · {l.season?.name}</p>
                </div>
                <Badge className={l.acknowledged ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                  {l.acknowledged ? 'Signed' : 'Pending'}
                </Badge>
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
