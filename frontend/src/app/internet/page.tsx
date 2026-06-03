'use client';

import { useState } from 'react';
import { Copy, Wifi } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { wifiInfo } from '@/lib/hideawayInfo';

export default function InternetPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Internet & Connectivity</h1>
            <p className="mt-1 text-slate-600">Wi-Fi details for Hideaway Holler residents.</p>
          </div>
          <Card>
            <CardBody className="space-y-5">
              <Wifi className="h-7 w-7 text-brand-600" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Wi-Fi Network</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{wifiInfo.network}</p>
                  <Button className="mt-3 gap-2" size="sm" variant="outline" onClick={() => copy('network', wifiInfo.network)}>
                    <Copy className="h-4 w-4" /> {copied === 'network' ? 'Copied' : 'Copy network'}
                  </Button>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Password</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950 whitespace-pre">{wifiInfo.password}</p>
                  <Button className="mt-3 gap-2" size="sm" variant="outline" onClick={() => copy('password', wifiInfo.password)}>
                    <Copy className="h-4 w-4" /> {copied === 'password' ? 'Copied' : 'Copy password'}
                  </Button>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-600">Connect to the network, enter the password exactly as shown, and contact Hideaway Holler support if you cannot connect after restarting your device.</p>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
