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
  Home,
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

const residentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/apply', label: 'Apply', icon: ClipboardList },
  { href: '/leases', label: 'Leases', icon: FileText },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/notices', label: 'Notices', icon: Bell },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/community-gallery', label: 'Gallery', icon: Image },
  { href: '/local-guide', label: 'Local Guide', icon: MapPin },
  { href: '/check-in', label: 'Check-In', icon: LogIn },
  { href: '/check-out', label: 'Check-Out', icon: LogOut as typeof LogIn },
  { href: '/emergency', label: 'Emergency', icon: AlertTriangle },
];

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/residents', label: 'Residents', icon: Users },
  { href: '/admin/seasons', label: 'Seasons', icon: Calendar },
  { href: '/admin/housing', label: 'Housing', icon: Building2 },
  { href: '/admin/applications', label: 'Applications', icon: ClipboardList },
  { href: '/admin/leases', label: 'Leases', icon: FileText },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/notices', label: 'Notices', icon: Bell },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/admin/gallery', label: 'Gallery', icon: Image },
  { href: '/admin/local-guide', label: 'Local Guide', icon: MapPin },
  { href: '/admin/check-ins', label: 'Check-Ins', icon: LogIn },
];

const alumniNav = [
  { href: '/alumni', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alumni/history', label: 'History', icon: FileText },
  { href: '/apply', label: 'Reapply', icon: ClipboardList },
  { href: '/emergency', label: 'Emergency', icon: AlertTriangle },
];

export function Sidebar({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const nav = role === 'ADMIN' ? adminNav : role === 'ALUMNI' ? alumniNav : residentNav;

  return (
    <nav className="flex flex-col gap-1 p-3">
      <Link href="/" className="flex items-center gap-2 px-3 py-3 mb-2" onClick={onNavigate}>
        <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
          <Home className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm">HollerHub</p>
          <p className="text-xs text-slate-500">Hideaway Holler</p>
        </div>
      </Link>
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
