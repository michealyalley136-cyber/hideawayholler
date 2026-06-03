'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export default function CheckInPage() {
  const [checkIn, setCheckIn] = useState<{ adminApproved: boolean; arrivalConfirmed: boolean; rulesAccepted: boolean; roomCondition?: string } | null>(null);
  const [form, setForm] = useState({ arrivalConfirmed: false, rulesAccepted: false, roomCondition: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ checkIn: typeof checkIn }>('/check-in').then((d) => {
      setCheckIn(d.checkIn);
      if (d.checkIn) setForm({
        arrivalConfirmed: d.checkIn.arrivalConfirmed,
        rulesAccepted: d.checkIn.rulesAccepted,
        roomCondition: d.checkIn.roomCondition || '',
      });
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.append('arrivalConfirmed', String(form.arrivalConfirmed));
    fd.append('rulesAccepted', String(form.rulesAccepted));
    fd.append('roomCondition', form.roomCondition);
    await api('/check-in', { method: 'POST', body: fd });
    const { checkIn: updated } = await api<{ checkIn: typeof checkIn }>('/check-in');
    setCheckIn(updated);
    setLoading(false);
  };

  return (
    <ProtectedRoute roles={['RESIDENT', 'APPLICANT']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Check-in</h1>
        {checkIn?.adminApproved ? (
          <Card><CardBody><Badge className="bg-emerald-100 text-emerald-800">Check-in approved by admin</Badge></CardBody></Card>
        ) : (
          <Card>
            <CardBody>
              <form onSubmit={submit} className="space-y-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.arrivalConfirmed} onChange={(e) => setForm({ ...form, arrivalConfirmed: e.target.checked })} />
                  <span className="text-sm">I confirm my arrival</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.rulesAccepted} onChange={(e) => setForm({ ...form, rulesAccepted: e.target.checked })} />
                  <span className="text-sm">I accept community rules</span>
                </label>
                <div>
                  <label className="text-sm font-medium text-slate-700">Room condition notes</label>
                  <textarea className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[80px]" value={form.roomCondition} onChange={(e) => setForm({ ...form, roomCondition: e.target.value })} />
                </div>
                <Button type="submit" loading={loading}>Submit check-in</Button>
              </form>
            </CardBody>
          </Card>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
