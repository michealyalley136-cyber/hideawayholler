'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export default function AdminResidentsPage() {
  const [residents, setResidents] = useState<{ id: string; email: string; role: string; profile?: { fullName: string; currentStatus: string; country?: string } }[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api<{ residents: typeof residents }>(`/profiles/residents${params}`).then((d) => setResidents(d.residents));
  }, [search]);

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Residents</h1>
        <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md mb-6" />
        <div className="space-y-3">
          {residents.map((r) => (
            <Link key={r.id} href={`/admin/residents/${r.id}`}>
              <Card className="hover:border-brand-300">
                <CardBody className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <p className="font-medium">{r.profile?.fullName || r.email}</p>
                    <p className="text-sm text-slate-500">{r.email} · {r.profile?.country}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-slate-100 text-slate-700 capitalize">{r.role.toLowerCase()}</Badge>
                    <Badge className="bg-brand-50 text-brand-700">{r.profile?.currentStatus?.replace(/_/g, ' ')}</Badge>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
