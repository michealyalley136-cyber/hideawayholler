'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  clearAuth,
  getActiveAuthStorage,
  getDashboardPath,
  getSessionLastActivity,
  getStoredToken,
  getStoredUser,
  setAuth,
  setStoredUser,
  touchSessionActivity,
} from '@/lib/auth';
import { User } from '@/lib/types';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function useAuth(required = false) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const devLog = useCallback((message: string, details?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug(`[auth] ${message}`, details || {});
    }
  }, []);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (getActiveAuthStorage() !== 'session') return;

    touchSessionActivity();

    const handleActivity = () => touchSessionActivity();
    const checkInactivity = () => {
      if (getActiveAuthStorage() !== 'session') return;
      const lastActivity = getSessionLastActivity();
      if (!lastActivity) {
        touchSessionActivity();
        return;
      }

      if (Date.now() - lastActivity >= SESSION_TIMEOUT_MS) {
        devLog('session inactivity timeout; logging out');
        clearAuth();
        setUser(null);
        router.replace('/login');
      }
    };

    const events = ['click', 'keydown', 'scroll', 'pointerdown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    const intervalId = window.setInterval(checkInactivity, 30_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      window.clearInterval(intervalId);
    };
  }, [devLog, pathname, router, user]);

  const login = async (email: string, password: string, rememberMe = true) => {
    devLog('login request started', { email });

    const data = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    devLog('login success', { userId: data.user?.id, role: data.user?.role });

    setAuth(data.token, data.user, rememberMe);
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    const redirectTarget = getDashboardPath(data.user.role);

    devLog('token saved', { hasToken: Boolean(storedToken), storage: rememberMe ? 'localStorage' : 'sessionStorage' });
    devLog('role detected', { role: data.user.role });
    devLog('redirect target', { redirectTarget });

    setUser(data.user);
    router.replace(redirectTarget);

    return {
      status: 200,
      role: data.user.role,
      hasToken: Boolean(storedToken),
      hasUser: Boolean(storedUser),
      redirectTarget,
    };
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
    router.replace(redirectTo || getDashboardPath(data.user.role));
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    router.replace('/login');
  };

  return { user, loading, login, register, logout, refresh };
}
