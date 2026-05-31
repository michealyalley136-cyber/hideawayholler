'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/auth';

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];

export default function AdminMaintenancePage() {
  const [requests, setRequests] = useState<{ id: string; category: string; description: string; status: string; user?: { profile?: { fullName: string } } }[]>([]);

  useEffect(() => {
    api<{ requests: typeof requests }>('/maintenance').then((d) => setRequests(d.requests));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await api(`/maintenance/${id}`, { method: 'PATCH', body: { status } });
    const { requests: updated } = await api<{ requests: typeof requests }>('/maintenance');
    setRequests(updated);
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Maintenance</h1>
        <div className="space-y-4">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardBody>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{r.user?.profile?.fullName} — {r.category}</p>
                    <p className="text-sm text-slate-600 mt-1">{r.description}</p>
                  </div>
                  <Badge className="bg-slate-100">{STATUS_LABELS[r.status] || r.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {STATUSES.map((s) => (
                    <Button key={s} size="sm" variant={r.status === s ? 'primary' : 'outline'} onClick={() => updateStatus(r.id, s)}>{s}</Button>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
