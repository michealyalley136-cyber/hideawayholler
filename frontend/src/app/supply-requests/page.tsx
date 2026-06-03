'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { houses, supplyTypes } from '@/lib/hideawayInfo';

type SupplyRequest = {
  id: string;
  house: string;
  supplyType: string;
  quantity: number;
  notes?: string;
  status: string;
  createdAt: string;
};

export default function SupplyRequestsPage() {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [house, setHouse] = useState(houses[0]);
  const [supplyType, setSupplyType] = useState(supplyTypes[0].value);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api<{ requests: SupplyRequest[] }>('/supply-requests').then((d) => setRequests(d.requests));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await api('/supply-requests', { method: 'POST', body: { house, supplyType, quantity, notes } });
    setQuantity(1);
    setNotes('');
    await load();
    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Supply Requests</h1>
            <p className="mt-1 text-slate-600">Request household supplies by house assignment.</p>
          </div>
          <Card>
            <CardBody>
              <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">House</label>
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={house} onChange={(e) => setHouse(e.target.value)}>
                    {houses.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Supply type</label>
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={supplyType} onChange={(e) => setSupplyType(e.target.value)}>
                    {supplyTypes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <Input label="Quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" />
                <div className="md:col-span-2">
                  <Button type="submit" loading={loading}>Submit request</Button>
                </div>
              </form>
            </CardBody>
          </Card>
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardBody className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-medium text-slate-900">{supplyTypes.find((s) => s.value === request.supplyType)?.label || request.supplyType}</p>
                    <p className="text-sm text-slate-600">{request.house} · Quantity {request.quantity}</p>
                    {request.notes && <p className="mt-1 text-sm text-slate-600">{request.notes}</p>}
                    <p className="mt-2 text-xs text-slate-400">{new Date(request.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge className={request.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{request.status}</Badge>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
