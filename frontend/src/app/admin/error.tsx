'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') console.error('[admin error boundary]', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-950">Something went wrong loading this page.</h1>
        <p className="mt-2 text-sm text-slate-600">Please refresh or sign in again.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={reset}>Refresh page</Button>
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Go to login
          </Link>
        </div>
      </section>
    </main>
  );
}
