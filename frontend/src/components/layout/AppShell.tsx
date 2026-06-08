'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, CloudSun, Bell, Wifi, AlertTriangle, Wrench } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AdminSosAlertManager } from '../AdminSosNotifier';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../ui/Button';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSosCount, setActiveSosCount] = useState(0);
  const pathname = usePathname();

  if (!user) return null;
  const isResidentPortalRole = user.role === 'RESIDENT' || user.role === 'APPLICANT' || user.role === 'ALUMNI';

  return (
    <div className="min-h-screen min-w-0 bg-slate-50 lg:grid lg:h-dvh lg:grid-cols-[260px_1fr] lg:overflow-hidden">
      <aside className="hidden h-dvh min-h-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <Sidebar role={user.role} activeSosCount={activeSosCount} />
        <div className="shrink-0 border-t border-slate-100 p-4">
          <p className="text-sm font-medium text-slate-900 truncate">{user.profile?.fullName || user.email}</p>
          <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-dvh min-h-0 w-80 max-w-[88vw] flex-col overflow-hidden bg-white shadow-xl">
            <button className="absolute top-4 right-4 rounded-lg p-2 hover:bg-slate-100" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              <X className="w-5 h-5" />
            </button>
            <Sidebar role={user.role} onNavigate={() => setMobileOpen(false)} activeSosCount={activeSosCount} />
            <div className="shrink-0 border-t p-4">
              <Button variant="outline" size="sm" className="w-full" onClick={logout}>
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}

      <main className="min-h-screen min-w-0 lg:min-h-0 lg:overflow-y-auto">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-3 py-3 flex items-center gap-3 lg:px-8">
          <button className="lg:hidden min-h-11 min-w-11 rounded-lg p-2 hover:bg-slate-100" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="w-5 h-5" />
          </button>
          <span className="truncate text-sm font-semibold text-slate-900 lg:hidden">HollerHub</span>
          <div className="flex-1" />
          {user.role === 'ADMIN' && activeSosCount > 0 && (
            <Link href="/admin/sos" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Emergency Alerts</span>
              <span>({activeSosCount})</span>
            </Link>
          )}
          <span className="text-sm text-slate-600 hidden sm:block">{user.profile?.fullName}</span>
          <Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
          <button
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 sm:hidden"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>
        {user.role === 'ADMIN' && <AdminSosAlertManager role={user.role} onCountChange={setActiveSosCount} />}
        <div className="mx-auto w-full max-w-6xl min-w-0 p-3 pb-24 sm:p-4 sm:pb-24 lg:p-8">{children}</div>
        {isResidentPortalRole && (
          <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
            {[
              { href: '/weather', label: 'Weather', icon: CloudSun },
              { href: '/notices', label: 'Notices', icon: Bell },
              { href: '/internet', label: 'Wi-Fi', icon: Wifi },
              { href: '/dashboard/emergency-sos', label: 'SOS', icon: AlertTriangle },
              { href: '/maintenance', label: 'Fix', icon: Wrench },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium ${active ? 'text-brand-700' : 'text-slate-500'}`}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </main>
    </div>
  );
}
