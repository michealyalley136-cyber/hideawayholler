'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    const mobilePushEnabled = process.env.NEXT_PUBLIC_ENABLE_MOBILE_SOS_PUSH === 'true';
    if (!mobilePushEnabled || typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('[pwa] service worker registration failed', error);
      });
    };

    window.addEventListener('load', registerServiceWorker);
    return () => window.removeEventListener('load', registerServiceWorker);
  }, []);

  return null;
}
