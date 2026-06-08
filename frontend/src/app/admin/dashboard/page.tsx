'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  Bed,
  BedDouble,
  ClipboardList,
  CreditCard,
  Home,
  History,
  PackageOpen,
  PlaneLanding,
  PlaneTakeoff,
  RefreshCw,
  Star,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { fetchAdminDashboardStats } from '@/lib/adminDashboard';
import { DashboardStats } from '@/lib/types';

const linkedCards: Array<{
  title: string;
  key: keyof DashboardStats | null;
  href?: string;
  icon: typeof AlertTriangle;
  accent?: string;
  staticValue?: string;
}> = [
  { title: 'Active SOS alerts', key: 'activeSosAlerts', href: '/admin/sos', icon: AlertTriangle, accent: 'text-white bg-red-700' },
  { title: 'SOS History', key: null, href: '/admin/sos/history', icon: History, accent: 'text-slate-700 bg-slate-100', staticValue: 'Records' },
  { title: 'New applications', key: 'newApplications', href: '/admin/applications', icon: ClipboardList, accent: 'text-blue-600 bg-blue-50' },
  { title: 'Active residents', key: 'activeResidents', href: '/admin/residents', icon: UserCheck, accent: 'text-emerald-600 bg-emerald-50' },
  { title: 'Open maintenance', key: 'openMaintenance', href: '/admin/maintenance', icon: Wrench, accent: 'text-amber-600 bg-amber-50' },
  { title: 'Open supply requests', key: 'openSupplyRequests', href: '/admin/supply-requests', icon: PackageOpen, accent: 'text-amber-600 bg-amber-50' },
  { title: 'Pending reviews', key: 'pendingReviews', href: '/admin/reviews', icon: Star, accent: 'text-purple-600 bg-purple-50' },
  { title: 'House occupancy', key: 'houseOccupancy', href: '/admin/housing', icon: Home },
  { title: 'Total residents', key: 'totalResidents', href: '/admin/residents', icon: Users },
  { title: 'Vacant beds', key: 'vacantBeds', href: '/admin/housing', icon: Bed },
  { title: 'Occupied beds', key: 'occupiedBeds', href: '/admin/housing', icon: BedDouble },
  { title: 'Rent due', key: 'rentDue', href: '/admin/payments', icon: CreditCard },
  { title: 'Overdue payments', key: 'overduePayments', href: '/admin/payments', icon: AlertCircle, accent: 'text-red-600 bg-red-50' },
  { title: 'Arrivals this week', key: 'arrivalsThisWeek', href: '/admin/check-ins', icon: PlaneLanding },
  { title: 'Departures this week', key: 'departuresThisWeek', href: '/admin/residents', icon: PlaneTakeoff },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const nextStats = await fetchAdminDashboardStats();
      setStats(nextStats);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load dashboard metrics. Please refresh or sign in again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>
              <p className="mt-1 text-slate-600">Hideaway Holler operations overview</p>
            </div>
            <Button variant="outline" onClick={() => loadStats()} loading={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {loadError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              {loadError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {linkedCards.map((card) => {
              const value = card.staticValue ?? (card.key ? stats?.[card.key] ?? (loading ? '...' : 0) : '...');
              const content = (
                <StatCard title={card.title} value={value} icon={card.icon} accent={card.accent} />
              );
              if (!card.href) return <div key={card.title}>{content}</div>;
              return (
                <Link key={card.title} href={card.href} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
