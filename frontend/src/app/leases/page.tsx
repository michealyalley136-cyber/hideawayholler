'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, PenLine } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SignaturePad } from '@/components/leases/SignaturePad';
import { api, apiUrl } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

interface Lease {
  id: string;
  title: string;
  status: string;
  sentAt?: string;
  signedAt?: string;
  filePath?: string;
  signedFilePath?: string;
  season?: { name: string };
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not recorded';
}

function statusClass(status: string) {
  if (status === 'COMPLETED' || status === 'APPROVED_BY_ADMIN') return 'bg-emerald-100 text-emerald-800';
  if (status === 'SIGNED_BY_RESIDENT') return 'bg-blue-100 text-blue-800';
  if (status === 'PENDING_SIGNATURE' || status === 'ASSIGNED') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

async function downloadLease(id: string, type: 'original' | 'signed') {
  const token = getStoredToken();
  const res = await fetch(`${apiUrl}/leases/${id}/download?type=${type}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [signingLease, setSigningLease] = useState<Lease | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const [message, setMessage] = useState('');

  const load = () => api<{ leases: Lease[] }>('/leases').then((d) => setLeases(d.leases));

  useEffect(() => {
    load().catch(() => setMessage('Unable to load leases.'));
  }, []);

  const submitSignature = async () => {
    if (!signingLease || !signatureData) {
      setMessage('Please sign before submitting.');
      return;
    }
    const res = await api<{ lease: Lease }>(`/leases/${signingLease.id}/sign`, { method: 'POST', body: { signatureData } });
    setLeases((current) => current.map((lease) => (lease.id === res.lease.id ? res.lease : lease)));
    setSigningLease(null);
    setSignatureData('');
    setMessage('Lease signed and submitted.');
  };

  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT', 'ALUMNI']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leases</h1>
            <p className="mt-1 text-slate-600">View, sign, and download your lease documents.</p>
          </div>
          {message && <p className="text-sm font-medium text-brand-700">{message}</p>}
          <div className="space-y-4">
            {leases.map((lease) => (
              <Card key={lease.id}>
                <CardBody>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{lease.title}</h3>
                      {lease.season && <p className="text-sm text-slate-500">{lease.season.name}</p>}
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>Date Assigned: {formatDate(lease.sentAt)}</p>
                        <p>Date Signed: {formatDate(lease.signedAt)}</p>
                      </div>
                    </div>
                    <Badge className={statusClass(lease.status)}>{lease.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lease.filePath && (
                      <Button variant="secondary" size="sm" onClick={() => downloadLease(lease.id, 'original')}>
                        <Eye className="h-4 w-4" />
                        View Lease
                      </Button>
                    )}
                    {lease.status === 'PENDING_SIGNATURE' && (
                      <Button size="sm" onClick={() => setSigningLease(lease)}>
                        <PenLine className="h-4 w-4" />
                        Sign Lease
                      </Button>
                    )}
                    {lease.signedFilePath && (
                      <Button variant="outline" size="sm" onClick={() => downloadLease(lease.id, 'signed')}>
                        <Download className="h-4 w-4" />
                        Download Signed Copy
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
            {!leases.length && <p className="text-slate-500">No leases assigned yet.</p>}
          </div>

          {signingLease && (
            <Card>
              <CardBody className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Sign {signingLease.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">Use your finger, stylus, or mouse. Your signature will be timestamped and added to the final signed PDF.</p>
                </div>
                <SignaturePad onChange={setSignatureData} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={submitSignature}>Submit Signature</Button>
                  <Button variant="secondary" onClick={() => setSigningLease(null)}>Cancel</Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
