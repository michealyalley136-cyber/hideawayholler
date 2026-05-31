'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { JourneyTracker } from '@/components/JourneyTracker';
import { api } from '@/lib/api';
import { JourneyStep } from '@/lib/types';

type ResidentDetail = {
  user: { email: string; profile?: { fullName: string; phone?: string; country?: string; currentStatus: string } };
  journey: JourneyStep[];
};

export default function AdminResidentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<ResidentDetail | null>(null);

  useEffect(() => {
    if (id) api<ResidentDetail>(`/profiles/${id}`).then(setData);
  }, [id]);

  if (!data) return <ProtectedRoute roles={['ADMIN']}><AppShell><p>Loading...</p></AppShell></ProtectedRoute>;

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900">{data.user.profile?.fullName}</h1>
        <p className="text-slate-600">{data.user.email}</p>
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader><h2 className="font-semibold">Profile</h2></CardHeader>
            <CardBody className="space-y-2 text-sm">
              <p><span className="text-slate-500">Phone:</span> {data.user.profile?.phone || '—'}</p>
              <p><span className="text-slate-500">Country:</span> {data.user.profile?.country || '—'}</p>
              <p><span className="text-slate-500">Status:</span> {data.user.profile?.currentStatus}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><h2 className="font-semibold">Journey</h2></CardHeader>
            <CardBody><JourneyTracker steps={data.journey} /></CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
