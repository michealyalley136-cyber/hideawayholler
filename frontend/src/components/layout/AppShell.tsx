'use client';

import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../ui/Button';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
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
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-xl">
            <button className="absolute top-4 right-4 p-2" onClick={() => setMobileOpen(false)}>
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

      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-4 lg:px-8">
          <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-slate-600 hidden sm:block">{user.profile?.fullName}</span>
        </header>
        <main className="p-4 lg:p-8 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
