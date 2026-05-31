'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && roles && !roles.includes(user.role)) {
      router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  }, [user, loading, roles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;

  return <>{children}</>;
}
