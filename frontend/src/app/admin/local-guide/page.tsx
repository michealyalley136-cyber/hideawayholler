'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';

export default function AdminLocalGuidePage() {
  const [places, setPlaces] = useState<{ id: string; name: string; category: string }[]>([]);

  useEffect(() => {
    api<{ places: typeof places }>('/local-guide').then((d) => setPlaces(d.places));
  }, []);

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Local guide</h1>
        <p className="text-slate-600 mb-4">{places.length} places listed. Manage via API or expand this UI.</p>
        <div className="space-y-2">
          {places.map((p) => (
            <Card key={p.id}><CardBody className="flex justify-between"><span>{p.name}</span><span className="text-sm text-slate-500">{p.category}</span></CardBody></Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
