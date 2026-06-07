'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  User,
  FileText,
  CreditCard,
  Bell,
  Wrench,
  Image,
  MapPin,
  LogIn,
  LogOut,
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  ClipboardList,
  CloudSun,
  Bus,
  PackageOpen,
  Star,
  Wifi,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

const residentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/apply', label: 'Apply', icon: ClipboardList },
  { href: '/leases', label: 'Leases', icon: FileText },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/notices', label: 'Notices', icon: Bell },
  { href: '/weather', label: 'Weather', icon: CloudSun },
  { href: '/transportation', label: 'Transportation', icon: Bus },
  { href: '/before-arrival', label: 'Before Arrival', icon: ClipboardList },
  { href: '/internet', label: 'Internet', icon: Wifi },
  { href: '/supply-requests', label: 'Supply Requests', icon: PackageOpen },
  { href: '/dashboard/emergency-sos', label: 'Emergency SOS', icon: ShieldAlert },
  { href: '/reviews', label: 'Reviews', icon: Star },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/community-gallery', label: 'Gallery', icon: Image },
  { href: '/local-guide', label: 'Local Guide', icon: MapPin },
  { href: '/check-in', label: 'Check-In', icon: LogIn },
  { href: '/check-out', label: 'Check-Out', icon: LogOut as typeof LogIn },
  { href: '/emergency', label: 'Emergency', icon: AlertTriangle },
  { href: '/emergency-alerts', label: 'Emergency Alerts', icon: AlertTriangle },
];

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/sos', label: 'SOS Center', icon: AlertTriangle },
  { href: '/admin/settings/sos', label: 'SOS Settings', icon: Settings },
  { href: '/admin/residents', label: 'Residents', icon: Users },
  { href: '/admin/seasons', label: 'Seasons', icon: Calendar },
  { href: '/admin/housing', label: 'Housing', icon: Building2 },
  { href: '/admin/applications', label: 'Applications', icon: ClipboardList },
  { href: '/admin/leases', label: 'Leases', icon: FileText },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/billing/subscription', label: 'Billing', icon: CreditCard },
  { href: '/admin/notices', label: 'Notices', icon: Bell },
  { href: '/admin/supply-requests', label: 'Supply Requests', icon: PackageOpen },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/admin/gallery', label: 'Gallery', icon: Image },
  { href: '/admin/local-guide', label: 'Local Guide', icon: MapPin },
  { href: '/admin/check-ins', label: 'Check-Ins', icon: LogIn },
];

const superAdminNav = [
  { href: '/super-admin/clients/hideaway-holler', label: 'Hideaway Holler', icon: Building2, exact: true },
];

const alumniNav = [
  { href: '/alumni', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/alumni/history', label: 'History', icon: FileText },
  { href: '/apply', label: 'Reapply', icon: ClipboardList },
  { href: '/emergency', label: 'Emergency', icon: AlertTriangle },
];

export function Sidebar({ role, onNavigate, activeSosCount = 0 }: { role: UserRole; onNavigate?: () => void; activeSosCount?: number }) {
  const pathname = usePathname();
  const nav = role === 'SUPER_ADMIN' ? superAdminNav : role === 'ADMIN' ? adminNav : role === 'ALUMNI' ? alumniNav : residentNav;
  const homeHref = role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';

  return (
    <>
      <div className="shrink-0 p-3">
        <Link href={homeHref} className="flex items-center gap-2 px-3 py-3" onClick={onNavigate}>
          <img src="/hideaway-logo.png" alt="Hideaway Holler" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">{role === 'SUPER_ADMIN' ? 'AppCreatives' : 'HollerHub'}</p>
            <p className="text-xs text-slate-500">{role === 'SUPER_ADMIN' ? 'Office Dashboard' : 'Hideaway Holler'}</p>
          </div>
        </Link>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-24">
        <div className="flex min-w-0 flex-col gap-1">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={clsx(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {item.href === '/admin/sos' && activeSosCount > 0 ? `Emergency Alerts (${activeSosCount})` : item.label}
                </span>
                {item.href === '/admin/sos' && activeSosCount > 0 && (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-700 px-1.5 py-0.5 text-xs font-bold text-white">
                    {activeSosCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
