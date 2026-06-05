'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  Bed,
  BedDouble,
  ClipboardList,
  CloudSun,
  CreditCard,
  Home,
  History,
  PackageOpen,
  PlaneLanding,
  PlaneTakeoff,
  Star,
  UserCheck,
  Users,
  Wrench,
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
            <p className="mt-1 text-slate-600">Hideaway Holler operations overview</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Link href="/admin/sos" className="block rounded-xl ring-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2">
              <StatCard title="Active SOS alerts" value={stats?.activeSosAlerts ?? '...'} icon={AlertTriangle} accent="text-white bg-red-700" />
            </Link>
            <Link href="/admin/sos/history" className="block rounded-xl ring-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2">
              <StatCard title="SOS History" value="Records" icon={History} accent="text-slate-700 bg-slate-100" />
            </Link>
            <StatCard title="New applications" value={stats?.newApplications ?? '...'} icon={ClipboardList} accent="text-blue-600 bg-blue-50" />
            <StatCard title="Active residents" value={stats?.activeResidents ?? '...'} icon={UserCheck} accent="text-emerald-600 bg-emerald-50" />
            <StatCard title="Open maintenance" value={stats?.openMaintenance ?? '...'} icon={Wrench} accent="text-amber-600 bg-amber-50" />
            <StatCard title="Open supply requests" value={stats?.openSupplyRequests ?? '...'} icon={PackageOpen} accent="text-amber-600 bg-amber-50" />
            <StatCard title="Pending reviews" value={stats?.pendingReviews ?? '...'} icon={Star} accent="text-purple-600 bg-purple-50" />
            <StatCard title="House occupancy" value={stats?.houseOccupancy ?? '...'} icon={Home} />
            <StatCard title="Total residents" value={stats?.totalResidents ?? '...'} icon={Users} />
            <StatCard title="Vacant beds" value={stats?.vacantBeds ?? '...'} icon={Bed} />
            <StatCard title="Occupied beds" value={stats?.occupiedBeds ?? '...'} icon={BedDouble} />
            <StatCard title="Weather alerts" value={stats?.weatherAlerts ?? '...'} icon={CloudSun} />
            <StatCard title="Rent due" value={stats?.rentDue ?? '...'} icon={CreditCard} />
            <StatCard title="Overdue payments" value={stats?.overduePayments ?? '...'} icon={AlertCircle} accent="text-red-600 bg-red-50" />
            <StatCard title="Arrivals this week" value={stats?.arrivalsThisWeek ?? '...'} icon={PlaneLanding} />
            <StatCard title="Departures this week" value={stats?.departuresThisWeek ?? '...'} icon={PlaneTakeoff} />
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
