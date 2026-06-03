import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hideaway Holler | Cultural Exchange Community',
  description: 'Resort-style cultural exchange housing for J1 students, interns, and seasonal workers in the Smoky Mountain area.',
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
