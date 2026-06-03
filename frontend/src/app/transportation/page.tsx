'use client';

import { Car, ExternalLink, Bus } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { transitResources } from '@/lib/hideawayInfo';

export default function TransportationPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transportation</h1>
            <p className="mt-1 text-slate-600">Sevierville transit information and local ride resources.</p>
          </div>
          <Card>
            <CardBody className="space-y-5">
              <div className="flex items-start gap-3">
                <Bus className="mt-1 h-6 w-6 text-brand-600" />
                <div>
                  <h2 className="font-semibold text-slate-900">Sevierville Transit Information</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{transitResources[0]}</p>
                </div>
              </div>
              <a href="https://seviervilletransit.org" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Visit Sevierville Transit
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardBody>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardBody>
                <Car className="h-5 w-5 text-brand-600" />
                <h2 className="mt-3 font-semibold text-slate-900">Uber and Lyft</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{transitResources[1]}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h2 className="font-semibold text-slate-900">Nearby Transportation Options</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{transitResources[2]}</p>
              </CardBody>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
