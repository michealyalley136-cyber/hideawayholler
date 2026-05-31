'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';

export default function AdminCheckInsPage() {
  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Check-ins</h1>
        <Card>
          <CardBody>
            <p className="text-slate-600">Review pending check-ins from resident profiles. Approve via API: POST /api/check-in/:id/approve</p>
          </CardBody>
        </Card>
      </AppShell>
    </ProtectedRoute>
  );
}
