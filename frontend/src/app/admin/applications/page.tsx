'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<{ id: string; status: string; user: { profile?: { fullName: string }; email: string }; season: { name: string } }[]>([]);

  useEffect(() => {
    api<{ applications: typeof applications }>('/applications?status=PENDING').then((d) => setApplications(d.applications));
  }, []);

  const review = async (id: string, status: string) => {
    await api(`/applications/${id}/review`, { method: 'PATCH', body: { status } });
    const { applications: updated } = await api<{ applications: typeof applications }>('/applications');
    setApplications(updated.filter((a) => a.status === 'PENDING'));
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Applications</h1>
        <div className="space-y-4">
          {applications.map((a) => (
            <Card key={a.id}>
              <CardBody className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium">{a.user.profile?.fullName || a.user.email}</p>
                  <p className="text-sm text-slate-500">{a.season.name}</p>
                  <Badge className="mt-2 bg-amber-100 text-amber-800">{a.status}</Badge>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                  <Button size="sm" onClick={() => review(a.id, 'APPROVED')}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => review(a.id, 'REJECTED')}>Reject</Button>
                </div>
              </CardBody>
            </Card>
          ))}
          {!applications.length && <p className="text-slate-500">No pending applications.</p>}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
