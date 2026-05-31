import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Hideaway Holler | J1 Cultural Exchange Housing',
  description: 'Hideaway Holler resident portal and cultural exchange housing community for J1 students, interns, and seasonal workers in Pigeon Forge and Sevierville.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
