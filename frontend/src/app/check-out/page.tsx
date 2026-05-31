'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export default function CheckOutPage() {
  const [checkOut, setCheckOut] = useState<{ adminApproved: boolean } | null>(null);
  const [form, setForm] = useState({ moveOutNotes: '', damageReport: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ checkOut: typeof checkOut }>('/check-out').then((d) => setCheckOut(d.checkOut));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await api('/check-out', { method: 'POST', body: form });
    const { checkOut: updated } = await api<{ checkOut: typeof checkOut }>('/check-out');
    setCheckOut(updated);
    setLoading(false);
  };

  return (
    <ProtectedRoute roles={['RESIDENT']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Check-out</h1>
        {checkOut?.adminApproved ? (
          <Card><CardBody><Badge className="bg-emerald-100 text-emerald-800">Check-out complete</Badge></CardBody></Card>
        ) : (
          <Card>
            <CardBody>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Move-out notes</label>
                  <textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]" value={form.moveOutNotes} onChange={(e) => setForm({ ...form, moveOutNotes: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Damage report (if any)</label>
                  <textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]" value={form.damageReport} onChange={(e) => setForm({ ...form, damageReport: e.target.value })} />
                </div>
                <Button type="submit" loading={loading}>Submit check-out</Button>
              </form>
            </CardBody>
          </Card>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
