'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api, ApiError } from '@/lib/api';
import { fetchLeaseDocument, LEASE_UNAVAILABLE_MESSAGE } from '@/lib/leaseDocument';

interface Lease {
  id: string;
  title: string;
  status: string;
  sentAt?: string;
  signedAt?: string;
  filePath?: string;
}

export default function LeaseDetailPage() {
  const params = useParams<{ leaseId: string }>();
  const router = useRouter();
  const leaseId = params.leaseId;
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!leaseId) return;
    setLoading(true);
    api<{ lease: Lease }>(`/lease-detail?leaseId=${encodeURIComponent(leaseId)}`)
      .then((data) => setLease(data.lease))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Unable to load lease.'))
      .finally(() => setLoading(false));
  }, [leaseId]);

  useEffect(() => () => {
    if (viewingUrl) URL.revokeObjectURL(viewingUrl);
  }, [viewingUrl]);

  const viewDocument = async () => {
    if (!lease) return;
    setOpening(true);
    setErrorMessage('');
    try {
      const blob = await fetchLeaseDocument(lease.id, 'original');
      if (viewingUrl) URL.revokeObjectURL(viewingUrl);
      setViewingUrl(URL.createObjectURL(blob));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : LEASE_UNAVAILABLE_MESSAGE);
    } finally {
      setOpening(false);
    }
  };

  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT', 'ALUMNI']}>
      <AppShell>
        <div className="space-y-6">
          <Button variant="secondary" size="sm" onClick={() => router.push('/leases')}>Back to leases</Button>

          {loading && <p className="text-sm text-slate-500">Loading lease...</p>}
          {errorMessage && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{errorMessage}</p>}

          {lease && (
            <Card>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{lease.title}</h1>
                    <p className="mt-1 text-sm text-slate-600">Assigned: {lease.sentAt ? new Date(lease.sentAt).toLocaleDateString() : 'Not recorded'}</p>
                  </div>
                  <Badge>{lease.status.replace(/_/g, ' ')}</Badge>
                </div>
                {lease.filePath && (
                  <Button onClick={viewDocument} disabled={opening}>
                    <Eye className="h-4 w-4" />
                    {opening ? 'Opening...' : 'View Lease Document'}
                  </Button>
                )}
              </CardBody>
            </Card>
          )}

          {viewingUrl && (
            <div className="fixed inset-0 z-[60] flex items-end bg-black/50 p-3 sm:items-center sm:justify-center sm:p-6">
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <h2 className="truncate font-semibold text-slate-900">{lease?.title}</h2>
                  <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setViewingUrl(null)} aria-label="Close lease viewer">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <iframe title={lease?.title || 'Lease document'} src={viewingUrl} className="h-[75vh] w-full bg-slate-100" />
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
