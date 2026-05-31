'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/auth';

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'CLEANING', 'OTHER'];

export default function MaintenancePage() {
  const [requests, setRequests] = useState<{ id: string; category: string; description: string; status: string; createdAt: string }[]>([]);
  const [category, setCategory] = useState('PLUMBING');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api<{ requests: typeof requests }>('/maintenance').then((d) => setRequests(d.requests));

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await api('/maintenance', { method: 'POST', body: { category, description } });
    setDescription('');
    await load();
    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Maintenance</h1>
        <Card className="mb-6">
          <CardBody>
            <h2 className="font-semibold mb-4">Submit a request</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Category</label>
                <select className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <Button type="submit" loading={loading}>Submit request</Button>
            </form>
          </CardBody>
        </Card>
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{r.category}</p>
                  <p className="text-sm text-slate-600 mt-1">{r.description}</p>
                  <p className="text-xs text-slate-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge className="bg-slate-100 text-slate-700">{STATUS_LABELS[r.status] || r.status}</Badge>
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
