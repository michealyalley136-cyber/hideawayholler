'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, CloudSun, Bell, Wifi, AlertTriangle, Wrench } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../ui/Button';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  if (!user) return null;

  return (
    <div className="min-h-screen min-w-0 flex">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <Sidebar role={user.role} />
        <div className="mt-auto p-4 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-900 truncate">{user.profile?.fullName || user.email}</p>
          <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-80 max-w-[88vw] flex-col overflow-y-auto bg-white shadow-xl">
            <button className="absolute top-4 right-4 rounded-lg p-2 hover:bg-slate-100" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              <X className="w-5 h-5" />
            </button>
            <Sidebar role={user.role} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto p-4 border-t">
              <Button variant="outline" size="sm" className="w-full" onClick={logout}>
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1 lg:pl-64">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-3 py-3 flex items-center gap-3 lg:px-8">
          <button className="lg:hidden min-h-11 min-w-11 rounded-lg p-2 hover:bg-slate-100" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="w-5 h-5" />
          </button>
          <span className="truncate text-sm font-semibold text-slate-900 lg:hidden">HollerHub</span>
          <div className="flex-1" />
          <span className="text-sm text-slate-600 hidden sm:block">{user.profile?.fullName}</span>
        </header>
        <main className="mx-auto w-full max-w-6xl min-w-0 p-3 pb-24 sm:p-4 sm:pb-24 lg:p-8">{children}</main>
        {user.role !== 'ADMIN' && (
          <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
            {[
              { href: '/weather', label: 'Weather', icon: CloudSun },
              { href: '/notices', label: 'Notices', icon: Bell },
              { href: '/internet', label: 'Wi-Fi', icon: Wifi },
              { href: '/emergency-alerts', label: 'Alerts', icon: AlertTriangle },
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
      </div>
    </div>
  );
}
