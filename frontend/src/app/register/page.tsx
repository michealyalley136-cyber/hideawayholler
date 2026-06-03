'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ApiError, api } from '@/lib/api';

function checkBackendHealth() {
  return api<{ status: string; service: string }>('/health', { cache: 'no-store' });
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', country: '' });
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBackendHealth()
      .then(() => setApiStatus('online'))
      .catch((err) => {
        console.error('[register] /api/health failed', err);
        setApiStatus('offline');
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
      await checkBackendHealth();
      const redirectTo = new URLSearchParams(window.location.search).get('next') || undefined;
      await register(form, redirectTo);
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardBody>
          <h1 className="text-2xl font-bold text-slate-900">Apply for housing</h1>
          <p className="text-sm text-slate-500 mt-1">Create your HollerHub applicant account</p>
          <p className={apiStatus === 'offline' ? 'mt-3 text-sm text-red-600' : 'mt-3 text-xs text-slate-400'}>
            {apiStatus === 'checking' && 'Checking backend connection...'}
            {apiStatus === 'online' && 'Backend connection ready.'}
            {apiStatus === 'offline' && 'Backend is not reachable. Start the API on http://localhost:5000, then try again.'}
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
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
