'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { WeatherCard } from '@/components/WeatherCard';

export default function WeatherPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Weather Center</h1>
            <p className="mt-1 text-slate-600">Sevierville conditions for work, travel, and outdoor planning.</p>
          </div>
          <WeatherCard />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
