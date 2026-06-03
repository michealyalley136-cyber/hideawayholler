'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { supplyTypes } from '@/lib/hideawayInfo';

type AdminSupplyRequest = {
  id: string;
  house: string;
  supplyType: string;
  quantity: number;
  notes?: string;
  status: string;
  createdAt: string;
  user?: { profile?: { fullName: string } };
};

export default function AdminSupplyRequestsPage() {
  const [requests, setRequests] = useState<AdminSupplyRequest[]>([]);
  const load = () => api<{ requests: AdminSupplyRequest[] }>('/supply-requests').then((d) => setRequests(d.requests));
  useEffect(() => { load(); }, []);

  const fulfill = async (id: string) => {
    await api(`/supply-requests/${id}`, { method: 'PATCH', body: { status: 'FULFILLED' } });
    await load();
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Supply Requests</h1>
            <p className="mt-1 text-slate-600">Fulfill and review house-based supply request history.</p>
          </div>
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-medium text-slate-900">{request.user?.profile?.fullName || 'Resident'} · {request.house}</p>
                      <p className="text-sm text-slate-600">{supplyTypes.find((s) => s.value === request.supplyType)?.label || request.supplyType} · Quantity {request.quantity}</p>
                      {request.notes && <p className="mt-1 text-sm text-slate-600">{request.notes}</p>}
                    </div>
                    <Badge className={request.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{request.status}</Badge>
                  </div>
                  {request.status !== 'FULFILLED' && <Button size="sm" onClick={() => fulfill(request.id)}>Mark fulfilled</Button>}
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
