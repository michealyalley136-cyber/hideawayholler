'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  ClipboardList,
  Bed,
  BedDouble,
  Wrench,
  CreditCard,
  AlertCircle,
  PlaneLanding,
  PlaneTakeoff,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { api } from '@/lib/api';
import { DashboardStats } from '@/lib/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api<{ stats: DashboardStats }>('/dashboard/admin').then((d) => setStats(d.stats)).catch(console.error);
  }, []);

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>
            <p className="text-slate-600 mt-1">Hideaway Holler operations overview</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard title="Total residents" value={stats?.totalResidents ?? '—'} icon={Users} />
            <StatCard title="Active residents" value={stats?.activeResidents ?? '—'} icon={UserCheck} accent="text-emerald-600 bg-emerald-50" />
            <StatCard title="New applications" value={stats?.newApplications ?? '—'} icon={ClipboardList} accent="text-blue-600 bg-blue-50" />
            <StatCard title="Vacant beds" value={stats?.vacantBeds ?? '—'} icon={Bed} />
            <StatCard title="Occupied beds" value={stats?.occupiedBeds ?? '—'} icon={BedDouble} />
            <StatCard title="Open maintenance" value={stats?.openMaintenance ?? '—'} icon={Wrench} accent="text-amber-600 bg-amber-50" />
            <StatCard title="Rent due" value={stats?.rentDue ?? '—'} icon={CreditCard} />
            <StatCard title="Overdue payments" value={stats?.overduePayments ?? '—'} icon={AlertCircle} accent="text-red-600 bg-red-50" />
            <StatCard title="Arrivals this week" value={stats?.arrivalsThisWeek ?? '—'} icon={PlaneLanding} />
            <StatCard title="Departures this week" value={stats?.departuresThisWeek ?? '—'} icon={PlaneTakeoff} />
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
