'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { arrivalChecklist } from '@/lib/hideawayInfo';

const links = [
  { href: '/internet', label: 'Wi-Fi information' },
  { href: '/transportation', label: 'Transportation resources' },
  { href: '/weather', label: 'Weather information' },
  { href: '/profile', label: 'House assignment' },
  { href: '/notices', label: 'Community rules' },
  { href: '/emergency', label: 'Emergency contacts' },
  { href: '/emergency-alerts', label: 'CodeRED registration' },
];

export default function BeforeArrivalPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Before You Arrive</h1>
            <p className="mt-1 text-slate-600">Start here before traveling to Hideaway Holler.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {links.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="h-full hover:border-brand-300">
                  <CardBody className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium text-slate-900">{item.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
          <p className="text-sm text-slate-500">Checklist: {arrivalChecklist.join(', ')}</p>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
