'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPath } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

function HideawayHollerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Hideaway Holler">
      <defs>
        <linearGradient id="hh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d8a6f" />
          <stop offset="100%" stopColor="#1c3c33" />
        </linearGradient>
        <clipPath id="hh-clip">
          <rect width="64" height="64" rx="16" />
        </clipPath>
      </defs>
      <g clipPath="url(#hh-clip)">
        <rect width="64" height="64" fill="url(#hh-sky)" />
        <circle cx="45" cy="19" r="5.5" fill="#dceee6" opacity="0.85" />
        <path d="M-4 56 L18 28 L31 43 L41 31 L68 56 Z" fill="#b8ddd0" />
        <path d="M-4 58 L13 39 L26 51 L39 38 L68 58 Z" fill="#dceee6" opacity="0.6" />
      </g>
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="none" stroke="#1c3c33" strokeOpacity="0.15" strokeWidth="1.5" />
    </svg>
  );
}

function AppCreativesLogo({ className }: { className?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 48 48" className={className} role="img" aria-label="AppCreatives LLC">
        <defs>
          <linearGradient id="ac-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect x="11" y="4" width="26" height="40" rx="7" fill="none" stroke="url(#ac-grad)" strokeWidth="3" />
        <text x="24" y="31" textAnchor="middle" fontSize="17" fontWeight="800" fill="url(#ac-grad)" fontFamily="Arial, sans-serif">
          AC
        </text>
      </svg>
      <span className="text-sm font-bold leading-none">
        <span className="text-slate-800">App</span>
        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Creatives</span>
        <span className="ml-1 align-top text-[10px] font-semibold uppercase tracking-wide text-slate-400">LLC</span>
      </span>
    </span>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 via-slate-50 to-white">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center">
            <HideawayHollerMark className="h-16 w-16 drop-shadow-sm sm:h-20 sm:w-20" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Hideaway Holler Portal</h1>
            <p className="mt-1 text-sm font-semibold text-brand-700">Resident &amp; Staff Access</p>
          </div>

          <Card className="mt-6 w-full">
            <CardBody>
              <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in to your HollerHub account</p>
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
              <p className="mt-4 text-center text-sm text-slate-600">
                New here?{' '}
                <Link href="/register" className="font-medium text-brand-600 hover:underline">
                  Create an account
                </Link>
              </p>
            </CardBody>
          </Card>

          <div className="mt-6 flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Powered by</span>
            <AppCreativesLogo className="h-6 w-6" />
          </div>
        </div>
      </main>
    </div>
  );
}
