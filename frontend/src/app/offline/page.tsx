'use client';

import { Button } from '@/components/ui/Button';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">You're offline.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Some Hideaway Holler portal features require an internet connection.
        </p>
        <Button className="mt-5 min-h-11 w-full" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </section>
    </main>
  );
}
