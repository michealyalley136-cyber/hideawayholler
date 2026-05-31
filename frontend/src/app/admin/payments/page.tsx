'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Payment } from '@/lib/types';
import { PAYMENT_STATUS_COLORS, STATUS_LABELS } from '@/lib/auth';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<(Payment & { user?: { profile?: { fullName: string } } })[]>([]);

  useEffect(() => {
    api<{ payments: typeof payments }>('/payments').then((d) => setPayments(d.payments));
  }, []);

  const update = async (id: string, data: { amountPaid?: number; status?: string; receiptVerified?: boolean }) => {
    await api(`/payments/${id}`, { method: 'PATCH', body: data });
    const { payments: updated } = await api<{ payments: typeof payments }>('/payments');
    setPayments(updated);
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Payments</h1>
        <div className="space-y-4">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.user?.profile?.fullName} — {p.description || p.type}</p>
                    <p className="text-sm text-slate-500">Due {new Date(p.dueDate).toLocaleDateString()}</p>
                  </div>
                  <Badge className={PAYMENT_STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span>Due: ${Number(p.amountDue).toFixed(2)}</span>
                  <span>Paid: ${Number(p.amountPaid).toFixed(2)}</span>
                  <span>Balance: ${Number(p.balance).toFixed(2)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => update(p.id, { amountPaid: Number(p.amountDue), status: 'PAID', receiptVerified: true })}>Mark paid</Button>
                  {p.receiptPath && !p.receiptVerified && (
                    <Button size="sm" onClick={() => update(p.id, { receiptVerified: true })}>Verify receipt</Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
