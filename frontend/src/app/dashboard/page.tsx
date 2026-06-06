'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-xl w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Welcome to HollerHub</h1>
        <p className="mt-3 text-slate-600">
          {user ? `You are signed in as ${user.fullName || user.email}.` : 'Your dashboard is ready. Sign in to continue.'}
        </p>
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-500">This is a temporary dashboard page to confirm login routing works.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={logout} className="w-full sm:w-auto">
              Sign out
            </Button>
            <Button type="button" onClick={() => router.push('/login')} variant="secondary" className="w-full sm:w-auto">
              Back to login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
