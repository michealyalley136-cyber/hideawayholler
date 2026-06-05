'use client';

import { ShieldAlert } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ResidentSosPanel } from '@/components/ResidentSosPanel';

export default function EmergencySosPage() {
  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT']}>
      <AppShell>
        <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-3xl flex-col items-center justify-center gap-8 py-6 text-center sm:py-10">
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-700 text-white shadow-lg shadow-red-950/20">
              <ShieldAlert className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-950">Emergency SOS</h1>
              <p className="mx-auto max-w-xl text-base font-medium text-slate-700">
                Press and hold for 3 seconds to alert admin and share your current GPS location.
              </p>
            </div>
          </div>

          <ResidentSosPanel />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
