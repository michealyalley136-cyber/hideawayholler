'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, CreditCard, ClipboardList } from 'lucide-react';

export default function AlumniDashboard() {
  return (
    <ProtectedRoute roles={['ALUMNI']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Alumni portal</h1>
        <p className="text-slate-600 mb-6">Welcome back! Access your history or apply for a new season.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/alumni/history">
            <Card className="hover:border-brand-300 h-full">
              <CardBody className="text-center py-8">
                <FileText className="w-8 h-8 text-brand-600 mx-auto" />
                <p className="font-semibold mt-3">Season history</p>
                <p className="text-sm text-slate-500 mt-1">Past leases & seasons</p>
              </CardBody>
            </Card>
          </Link>
          <Link href="/payments">
            <Card className="hover:border-brand-300 h-full">
              <CardBody className="text-center py-8">
                <CreditCard className="w-8 h-8 text-brand-600 mx-auto" />
                <p className="font-semibold mt-3">Payment history</p>
              </CardBody>
            </Card>
          </Link>
          <Link href="/apply">
            <Card className="hover:border-brand-300 h-full">
              <CardBody className="text-center py-8">
                <ClipboardList className="w-8 h-8 text-brand-600 mx-auto" />
                <p className="font-semibold mt-3">Reapply</p>
                <p className="text-sm text-slate-500 mt-1">Join a new cohort</p>
              </CardBody>
            </Card>
          </Link>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
