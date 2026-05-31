'use client';

import { useEffect, useState } from 'react';
import { Phone, AlertTriangle } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';

interface Contact {
  id: string;
  label: string;
  phone: string;
  description?: string;
}

export default function EmergencyPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    api<{ contacts: Contact[] }>('/emergency').then((d) => setContacts(d.contacts));
  }, []);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Emergency center</h1>
            <p className="text-slate-600">Quick access to important contacts</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {contacts.map((c) => (
            <a key={c.id} href={c.phone.startsWith('+') || /^\d/.test(c.phone) ? `tel:${c.phone.replace(/\D/g, '')}` : '#'}>
              <Card className="hover:border-red-200 transition-colors h-full">
                <CardBody>
                  <h3 className="font-semibold text-lg">{c.label}</h3>
                  {c.description && <p className="text-sm text-slate-500 mt-1">{c.description}</p>}
                  <p className="flex items-center gap-2 mt-3 text-brand-600 font-medium">
                    <Phone className="w-4 h-4" />{c.phone}
                  </p>
                </CardBody>
              </Card>
            </a>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
