'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api, fileUrl } from '@/lib/api';

interface Lease {
  id: string;
  title: string;
  acknowledged: boolean;
  signedAt?: string;
  sentAt?: string;
  expiresAt?: string;
  filePath?: string;
  season?: { name: string };
}

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);

  useEffect(() => {
    api<{ leases: Lease[] }>('/leases').then((d) => setLeases(d.leases));
  }, []);

  const sign = async (id: string) => {
    await api(`/leases/${id}/sign`, { method: 'POST', body: { signatureData: 'digital-acknowledgment' } });
    const { leases: updated } = await api<{ leases: Lease[] }>('/leases');
    setLeases(updated);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Leases</h1>
        <div className="space-y-4">
          {leases.map((l) => (
            <Card key={l.id}>
              <CardBody>
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{l.title}</h3>
                    {l.season && <p className="text-sm text-slate-500">{l.season.name}</p>}
                  </div>
                  <Badge className={l.acknowledged ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                    {l.acknowledged ? 'Signed' : 'Pending signature'}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {l.filePath && (
                    <a href={fileUrl(l.filePath)!} target="_blank" rel="noopener" className="text-sm text-brand-600 hover:underline">
                      Download lease PDF
                    </a>
                  )}
                  {!l.acknowledged && (
                    <Button size="sm" onClick={() => sign(l.id)}>Acknowledge & sign digitally</Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
          {!leases.length && <p className="text-slate-500">No leases assigned yet.</p>}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
