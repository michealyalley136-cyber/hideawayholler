'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Season } from '@/lib/types';

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);

  useEffect(() => {
    api<{ seasons: Season[] }>('/seasons').then((d) => setSeasons(d.seasons));
  }, []);

  const endSeason = async (id: string) => {
    if (!confirm('End this season? Residents will become alumni.')) return;
    await api(`/seasons/${id}/end`, { method: 'POST' });
    const { seasons: updated } = await api<{ seasons: Season[] }>('/seasons');
    setSeasons(updated);
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Seasons</h1>
        <div className="space-y-4">
          {seasons.map((s) => (
            <Card key={s.id}>
              <CardBody className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-slate-500">{new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}</p>
                  {s.isActive && <Badge className="mt-2 bg-brand-100 text-brand-700">Active</Badge>}
                </div>
                {s.isActive && (
                  <Button variant="outline" size="sm" onClick={() => endSeason(s.id)}>End season</Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
