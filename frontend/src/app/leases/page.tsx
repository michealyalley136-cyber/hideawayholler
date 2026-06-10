'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Eye, PenLine, X } from 'lucide-react';
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

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState('');
  const [busyLeaseId, setBusyLeaseId] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    try {
      const data = await api<{ leases: Lease[] }>('/leases');
      setLeases(data.leases);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Unable to load leases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (viewingUrl) URL.revokeObjectURL(viewingUrl);
    };
  }, [viewingUrl]);

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const viewLease = async (lease: Lease, type: 'original' | 'signed' = 'original') => {
    clearMessages();
    setBusyLeaseId(lease.id);
    try {
      const blob = await fetchLeaseDocument(lease.id, type);
      if (viewingUrl) URL.revokeObjectURL(viewingUrl);
      const url = URL.createObjectURL(blob);
      setViewingUrl(url);
      setViewingTitle(lease.title);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : LEASE_UNAVAILABLE_MESSAGE);
    } finally {
      setBusyLeaseId(null);
    }
  };

  const downloadLease = async (lease: Lease, type: 'original' | 'signed') => {
    clearMessages();
    setBusyLeaseId(lease.id);
    try {
      const blob = await fetchLeaseDocument(lease.id, type);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${lease.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
      anchor.rel = 'noopener';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : LEASE_UNAVAILABLE_MESSAGE);
    } finally {
      setBusyLeaseId(null);
    }
  };

  const closeViewer = () => {
    if (viewingUrl) URL.revokeObjectURL(viewingUrl);
    setViewingUrl(null);
    setViewingTitle('');
  };

  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT', 'ALUMNI']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leases</h1>
            <p className="mt-1 text-slate-600">View, sign, and download your lease documents.</p>
          </div>

          {successMessage && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{successMessage}</p>}
          {errorMessage && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{errorMessage}</p>}

          {loading && <p className="text-sm text-slate-500">Loading leases...</p>}

          <div className="space-y-4">
            {leases.map((lease) => {
              const busy = busyLeaseId === lease.id;
              return (
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
                        <Button variant="secondary" size="sm" disabled={busy} onClick={() => viewLease(lease, 'original')}>
                          <Eye className="h-4 w-4" />
                          {busy ? 'Opening...' : 'View Lease'}
                        </Button>
                      )}
                      {lease.status === 'PENDING_SIGNATURE' && (
                        <Link
                          href={`/leases/${lease.id}/sign`}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                          aria-disabled={busy}
                        >
                          <PenLine className="h-4 w-4" />
                          Sign Lease
                        </Link>
                      )}
                      {lease.signedFilePath && (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => downloadLease(lease, 'signed')}>
                          <Download className="h-4 w-4" />
                          {busy ? 'Downloading...' : 'Download Signed Copy'}
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
            {!loading && !leases.length && <p className="text-slate-500">No leases assigned yet.</p>}
          </div>

          {viewingUrl && (
            <div className="fixed inset-0 z-[60] flex items-end bg-black/50 p-3 sm:items-center sm:justify-center sm:p-6">
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <h2 className="truncate font-semibold text-slate-900">{viewingTitle}</h2>
                  <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={closeViewer} aria-label="Close lease viewer">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <iframe title={viewingTitle} src={viewingUrl} className="h-[75vh] w-full bg-slate-100" />
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
