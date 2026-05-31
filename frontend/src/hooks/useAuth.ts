'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getStoredUser, setAuth, clearAuth, getDashboardPath } from '@/lib/auth';
import { User } from '@/lib/types';

export function useAuth(required = false) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch {
      clearAuth();
      setUser(null);
      if (required) router.push('/login');
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

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setAuth(data.token, data.user);
    setUser(data.user);
    router.push(getDashboardPath(data.user.role));
  };

  const register = async (
    payload: { email: string; password: string; fullName: string; phone?: string; country?: string },
    redirectTo?: string
  ) => {
    const data = await api<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: payload,
    });
    setAuth(data.token, data.user);
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
