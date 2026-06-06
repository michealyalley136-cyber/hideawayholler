'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getStoredUser, setAuth, setStoredUser, clearAuth, getDashboardPath } from '@/lib/auth';
import { User } from '@/lib/types';

export function useAuth(required = false) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
      setStoredUser(data.user);
    } catch (err) {
      clearAuth();
      setUser(null);
      // If required, only redirect to login for non-network errors.
      // Network errors (status 0) should not immediately kick the user back to login
      // to avoid redirect loops when the backend is temporarily unreachable.
      const status = err && typeof err === 'object' && 'status' in (err as any) ? (err as any).status : undefined;
      if (required && status !== 0) router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [required, router]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      setLoading(false);
      if (required) router.push('/login');
      return;
    }
    setUser(stored);
    refresh();
  }, [required, refresh, router]);

  const login = async (email: string, password: string, rememberMe = true) => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug('[auth] login submit started', { email });
    }

    const data = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug('[auth] login API response received', { userId: data.user?.id, role: data.user?.role });
    }

    // Save auth before navigating.
    setAuth(data.token, data.user, rememberMe);

    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug('[auth] login success; token saved', { userId: data.user?.id });
      console.debug('[auth] redirecting to', getDashboardPath(data.user.role));
    }

    setUser(data.user);
    router.push(getDashboardPath(data.user.role));
  };

  const register = async (
    payload: { email: string; password: string; fullName: string; phone?: string; country?: string },
    redirectTo?: string,
    rememberMe = true
  ) => {
    const data = await api<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: payload,
    });
    setAuth(data.token, data.user, rememberMe);
    setUser(data.user);
    router.push(redirectTo || getDashboardPath(data.user.role));
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    router.push('/login');
  };

  return { user, loading, login, register, logout, refresh };
}
