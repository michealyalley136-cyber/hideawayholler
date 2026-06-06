'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPath } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (roles && !roles.includes(user.role)) {
      router.replace(getDashboardPath(user.role));
      return;
    }

    if (!roles && user.role === 'ADMIN' && !pathname.startsWith('/admin')) {
      router.replace('/admin/dashboard');
    }
  }, [loading, pathname, roles, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  if (!roles && user.role === 'ADMIN' && !pathname.startsWith('/admin')) return null;

  return <>{children}</>;
}
