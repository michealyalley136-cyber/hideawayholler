'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global {
  interface Window {
    __hollerHubInstallPrompt?: BeforeInstallPromptEvent;
  }
}

const dismissedKey = 'hollerhub-install-dismissed';

const residentRoutePrefixes = [
  '/dashboard',
  '/profile',
  '/leases',
  '/payments',
  '/notices',
  '/maintenance',
  '/local-guide',
  '/check-in',
  '/check-out',
  '/emergency',
  '/community-gallery',
  '/alumni',
  '/weather',
  '/transportation',
  '/before-arrival',
  '/internet',
  '/emergency-alerts',
  '/supply-requests',
  '/reviews',
  '/portal',
  '/login',
  '/register',
  '/apply',
];

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return window.innerWidth <= 768 || mobileUserAgent;
}

export function isResidentRoute(pathname: string) {
  if (pathname === '/' || pathname === '/gallery') return false;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return false;
  return residentRoutePrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function InstallAppPrompt() {
  const pathname = usePathname();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      const installEvent = event as BeforeInstallPromptEvent;
      window.__hollerHubInstallPrompt = installEvent;
      setPromptEvent(installEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const isDismissed = localStorage.getItem(dismissedKey) === 'true';
    const allowed = isMobileDevice() && isResidentRoute(pathname) && !(pathname === '/admin' || pathname.startsWith('/admin/'));
    setVisible(Boolean(promptEvent && allowed && !isDismissed));
  }, [pathname, promptEvent]);

  const dismiss = () => {
    localStorage.setItem(dismissedKey, 'true');
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-3 bottom-[5.5rem] z-30 mx-auto max-w-md rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:hidden">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">HH</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Install HollerHub for quick access to your resident portal.</p>
          <div className="mt-3 flex gap-2">
            <Button className="gap-2" size="sm" onClick={install}>
              <Download className="h-4 w-4" />
              Install App
            </Button>
            <Button size="sm" variant="outline" onClick={dismiss}>Not Now</Button>
          </div>
        </div>
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={dismiss} aria-label="Dismiss install prompt">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
