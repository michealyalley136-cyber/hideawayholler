import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Hideaway Holler SOS',
  description: 'Emergency-only admin SOS console for Hideaway Holler.',
  applicationName: 'Hideaway Holler SOS',
  manifest: '/admin-sos.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Holler SOS',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#7f1117',
};

export default function AdminSosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
