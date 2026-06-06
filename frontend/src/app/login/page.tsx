'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPath } from '@/lib/auth';
import { apiHealth, apiUrl } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

const demoAccounts = [
  { label: 'Admin', email: 'admin@hideawayholler.com', password: 'password123' },
  { label: 'Resident', email: 'maria@example.com', password: 'password123' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [healthStatusCode, setHealthStatusCode] = useState<number | null>(null);
  const [healthMessage, setHealthMessage] = useState('Checking backend health...');
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [loginResponseStatus, setLoginResponseStatus] = useState<number | null>(null);
  const [debugLines, setDebugLines] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, router]);

  useEffect(() => {
    const healthUrl = apiUrl ? `${apiUrl}/health` : '(not configured)';
    if (!apiUrl) {
      setHealthStatus('offline');
      setHealthStatusCode(0);
      setHealthMessage('NEXT_PUBLIC_API_URL is not configured. Login still allowed.');
      appendDebugLine('NEXT_PUBLIC_API_URL configured: no');
      appendDebugLine(`Health URL being checked: ${healthUrl}`);
      appendDebugLine('Health status code: 0');
      return;
    }

    appendDebugLine('NEXT_PUBLIC_API_URL configured: yes');
    appendDebugLine(`Health URL being checked: ${healthUrl}`);

    apiHealth()
      .then(() => {
        setHealthStatus('online');
        setHealthStatusCode(200);
        setHealthMessage('Backend health OK.');
        appendDebugLine('Health status code: 200');
      })
      .catch((err) => {
        const status = err && typeof err === 'object' && 'status' in err ? (err as any).status || 0 : 0;
        setHealthStatus('offline');
        setHealthStatusCode(status);
        setHealthMessage('Backend health check failed, login still allowed.');
        appendDebugLine(`Health status code: ${status}`);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLoginAttempted(true);
    setLoginResponseStatus(null);
    setDebugLines([]);

    appendDebugLine('Login request attempted: yes');
    appendDebugLine('Login request sent');

    try {
      const result = await login(email, password, rememberMe);

      setLoginResponseStatus(result.status);
      appendDebugLine(`Login response status: ${result.status}`);
      appendDebugLine(`Token received: ${result.hasToken ? 'yes' : 'no'}`);
      appendDebugLine(`User role received: ${result.role}`);
      appendDebugLine(`Redirect path selected: ${result.redirectPath}`);
      appendDebugLine('Redirect attempted');

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[login] submit complete', {
          role: result.role,
          redirectPath: result.redirectPath,
          hasToken: result.hasToken,
          hasUser: result.hasUser,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      appendDebugLine(`Login failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-3 sm:p-4">
      <Card className="w-full max-w-md">
        <CardBody>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your HollerHub account</p>
          <div className="mt-5 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo logins</p>
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemoAccount(account)}
                className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span>
                  <span className="block font-semibold text-slate-800">{account.label}</span>
                  <span className="block text-xs text-slate-500">{account.email}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-brand-700">Use</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
              Sign in
            </Button>
          </form>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Login debug</p>
            <p className="text-xs text-slate-500">NEXT_PUBLIC_API_URL configured: {apiUrl ? 'yes' : 'no'}</p>
            <p className="text-xs text-slate-500">Health URL being checked: {apiUrl ? `${apiUrl}/health` : '(not configured)'}</p>
            <p className="text-xs text-slate-500">Health status: {healthStatus}</p>
            <p className="text-xs text-slate-500">Health status code: {healthStatusCode ?? 'n/a'}</p>
            <p className="text-xs text-slate-500">Health message: {healthMessage}</p>
            <p className="text-xs text-slate-500">Login request attempted: {loginAttempted ? 'yes' : 'no'}</p>
            <p className="text-xs text-slate-500">Login response status: {loginResponseStatus ?? 'n/a'}</p>
          </div>
          {debugLines.length > 0 && (
            <div className="mt-4 space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {debugLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          )}
          <p className="mt-4 text-sm text-center text-slate-600">
            New here?{' '}
            <Link href="/register" className="text-brand-600 font-medium hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-2 text-xs text-center text-slate-400">
            Admin: admin@hideawayholler.com / password123
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
