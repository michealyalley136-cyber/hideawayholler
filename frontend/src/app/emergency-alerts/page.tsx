'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';

export default function EmergencyAlertsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Emergency Alerts</h1>
            <p className="mt-1 text-slate-600">CodeRED emergency notification information for Sevier County.</p>
          </div>
          <Card>
            <CardBody className="space-y-4">
              <AlertTriangle className="h-7 w-7 text-red-600" />
              <h2 className="font-semibold text-slate-900">Register for CodeRED Alerts</h2>
              <p className="text-sm leading-6 text-slate-600">Residents should register for local emergency notifications including severe weather, emergency events, and public safety alerts.</p>
              <a href="https://sevierema.org/code-red" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Register for CodeRED Alerts
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
