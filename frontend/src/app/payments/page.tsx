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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    api<{ payments: Payment[] }>('/payments').then((d) => setPayments(d.payments));
  }, []);

  const uploadReceipt = async (paymentId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    await api(`/payments/${paymentId}/receipt`, { method: 'POST', body: form });
    const { payments: updated } = await api<{ payments: Payment[] }>('/payments');
    setPayments(updated);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Payments</h1>
        <div className="space-y-4">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.description || p.type}</p>
                    <p className="text-sm text-slate-500">Due {new Date(p.dueDate).toLocaleDateString()}</p>
                  </div>
                  <Badge className={PAYMENT_STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-500">Due</span><p className="font-medium">${Number(p.amountDue).toFixed(2)}</p></div>
                  <div><span className="text-slate-500">Paid</span><p className="font-medium">${Number(p.amountPaid).toFixed(2)}</p></div>
                  <div><span className="text-slate-500">Balance</span><p className="font-medium">${Number(p.balance).toFixed(2)}</p></div>
                </div>
                {p.status !== 'PAID' && (
                  <label className="mt-3 inline-flex cursor-pointer">
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && uploadReceipt(p.id, e.target.files[0])} />
                    <span className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Upload receipt</span>
                  </label>
                )}
                {p.receiptVerified && <p className="text-xs text-emerald-600 mt-2">Receipt verified by admin</p>}
              </CardBody>
            </Card>
          ))}
          {!payments.length && <p className="text-slate-500">No payment records yet.</p>}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
