import type { Metadata, Viewport } from 'next';
import { InstallAppPrompt } from '@/components/InstallAppPrompt';
import { PWARegister } from '@/components/PWARegister';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'HollerHub',
  title: {
    default: 'Hideaway Holler Resident Portal',
    template: '%s | HollerHub',
  },
  description: 'Resident portal for Hideaway Holler cultural exchange housing.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'HollerHub',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'HollerHub',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f1f1c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
        <InstallAppPrompt />
      </body>
    </html>
  );
}
