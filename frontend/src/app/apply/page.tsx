'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { Season } from '@/lib/types';

export default function ApplyPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [applications, setApplications] = useState<{ seasonId: string; status: string; season: Season }[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getStoredUser()) {
      router.replace('/register?next=/apply');
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      api<{ seasons: Season[] }>('/seasons'),
      api<{ applications: typeof applications }>('/applications'),
    ]).then(([s, a]) => {
      setSeasons(s.seasons);
      setApplications(a.applications);
    });
  }, [ready]);

  const apply = async (seasonId: string) => {
    setLoading(seasonId);
    try {
      await api('/applications', { method: 'POST', body: { seasonId } });
      const { applications: updated } = await api<{ applications: typeof applications }>('/applications');
      setApplications(updated);
    } finally {
      setLoading(null);
    }
  };

  const applied = (id: string) => applications.find((a) => a.seasonId === id);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          Preparing your application...
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT', 'ALUMNI']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Apply for a season</h1>
        <p className="text-slate-600 mb-6">Select a cohort to begin or continue your housing application.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.map((s) => {
            const app = applied(s.id);
            return (
              <Card key={s.id}>
                <CardBody>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                  </p>
                  {s.isActive && <Badge className="mt-2 bg-brand-100 text-brand-700">Active season</Badge>}
                  <div className="mt-4">
                    {app ? (
                      <Badge className="bg-slate-100 text-slate-700">Status: {app.status}</Badge>
                    ) : (
                      <Button size="sm" loading={loading === s.id} onClick={() => apply(s.id)}>Apply</Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
