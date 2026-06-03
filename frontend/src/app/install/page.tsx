'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isMobileDevice } from '@/components/InstallAppPrompt';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function InstallPage() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobileDevice());

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setInstallEvent(null);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-3">
          <img src="/hideaway-logo.png" alt="Hideaway Holler" className="h-12 w-12 rounded-full object-cover" />
          <span>
            <span className="block text-sm font-semibold text-slate-950">Hideaway Holler</span>
            <span className="block text-xs text-slate-500">Resident phone app</span>
          </span>
        </Link>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="rounded-lg bg-brand-50 p-3 text-brand-700">
              <Smartphone className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Install HollerHub on your phone</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                HollerHub install prompts are for mobile residents and tenants. Admin users should continue using the normal website and admin dashboard.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button className="gap-2" onClick={install} disabled={!mobile || !installEvent || installed}>
                  <Download className="h-4 w-4" />
                  {installed ? 'Installed' : 'Install App'}
                </Button>
                <Link href="/portal" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  Open Portal
                </Link>
              </div>
              {!mobile && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                  Desktop computers should use HollerHub as a normal website. Mobile residents can install it from their phone browser.
                </p>
              )}
              {mobile && !installEvent && !installed && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  If the install button is unavailable, use your phone browser menu and choose Add to Home Screen or Install App.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Resident phone install steps</h2>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>1. Open HollerHub on a phone.</li>
            <li>2. Sign in or open the resident portal.</li>
            <li>3. Tap Install App when prompted, or use the browser menu.</li>
            <li>4. Open HollerHub from the phone home screen.</li>
          </ol>
          <div className="mt-5 grid gap-3">
            {['Mobile resident access only', 'No desktop install prompts', 'No admin install prompts', 'No caching of private API or resident data'].map((item) => (
              <div key={item} className="flex gap-3 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
