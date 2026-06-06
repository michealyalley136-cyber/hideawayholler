'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPath } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ApiError, api, apiHealth } from '@/lib/api';

function checkBackendHealth() {
  return apiHealth();
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', country: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, router]);

  useEffect(() => {
    checkBackendHealth()
      .then(() => {
        setApiStatus('online');
        setApiError(null);
      })
      .catch((err) => {
        console.warn('[register] /api/health failed', err);
        setApiStatus('offline');
        setApiError('Health check failed; registration will still proceed.');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      // Attempt a health check but do not block registration on failure —
      // show a warning and proceed to create the account.
      checkBackendHealth().then(() => {
        setApiStatus('online');
        setApiError(null);
      }).catch((err) => {
        console.warn('[register] backend health check failed, proceeding with registration', err);
        setApiStatus('offline');
        setApiError('Health check failed; registration will still proceed.');
      });
      const redirectTo = new URLSearchParams(window.location.search).get('next') || undefined;
      await register(form, redirectTo, rememberMe);
    } catch (err) {
      console.error('[register] Account creation failed', err);
      if (err instanceof ApiError) {
        setError(err.status === 0 ? err.message : `Registration failed: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-3 sm:p-4">
      <Card className="w-full max-w-md">
        <CardBody>
          <h1 className="text-2xl font-bold text-slate-900">Apply for housing</h1>
          <p className="text-sm text-slate-500 mt-1">Create your HollerHub applicant account</p>
          <p className={apiStatus === 'offline' ? 'mt-3 text-sm text-amber-700' : 'mt-3 text-xs text-slate-400'}>
            {apiStatus === 'checking' && 'Checking backend health...'}
            {apiStatus === 'online' && 'Backend health is OK.'}
            {apiStatus === 'offline' && (apiError || 'Health check failed. Registration will proceed.')}
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Stay signed in
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
