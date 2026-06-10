'use client';

import { useEffect, useState } from 'react';
import { Archive, CheckCircle2, Download, FileUp, Send } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api, apiPath } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

interface Lease {
  id: string;
  title: string;
  status: string;
  sentAt?: string;
  signedAt?: string;
  filePath?: string;
  signedFilePath?: string;
  user?: { id: string; email: string; profile?: { fullName: string } };
  season?: { name: string };
}

interface ResidentOption {
  id: string;
  email: string;
  profile?: { fullName: string };
  seasonMemberships?: { seasonId: string; season?: { name: string } }[];
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not recorded';
}

function statusClass(status: string) {
  if (status === 'COMPLETED' || status === 'APPROVED_BY_ADMIN') return 'bg-emerald-100 text-emerald-800';
  if (status === 'SIGNED_BY_RESIDENT') return 'bg-blue-100 text-blue-800';
  if (status === 'PENDING_SIGNATURE' || status === 'ASSIGNED') return 'bg-amber-100 text-amber-800';
  if (status === 'ARCHIVED') return 'bg-slate-100 text-slate-500';
  return 'bg-slate-100 text-slate-700';
}

async function downloadLease(id: string, type: 'original' | 'signed') {
  const token = getStoredToken();
  const res = await fetch(apiPath(`/leases/${id}/download?type=${type}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function AdminLeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [title, setTitle] = useState('');
  const [userId, setUserId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [leaseRes, residentRes] = await Promise.all([
      api<{ leases: Lease[] }>('/leases'),
      api<{ residents: ResidentOption[] }>('/profiles/residents'),
    ]);
    setLeases(leaseRes.leases);
    setResidents(residentRes.residents);
  };

  useEffect(() => {
    load().catch(() => setMessage('Unable to load lease data.'));
  }, []);

  const createLease = async () => {
    if (!title || !userId || !file) {
      setMessage('Lease title, resident, and PDF are required.');
      return;
    }
    const resident = residents.find((item) => item.id === userId);
    const seasonId = resident?.seasonMemberships?.[0]?.seasonId;
    const form = new FormData();
    form.append('title', title);
    form.append('userId', userId);
    if (seasonId) form.append('seasonId', seasonId);
    form.append('file', file);
    await api('/leases', { method: 'POST', body: form });
    setTitle('');
    setUserId('');
    setFile(null);
    setMessage('Lease assigned.');
    await load();
  };

  const action = async (lease: Lease, leaseAction: string) => {
    await api(`/leases/${lease.id}/action`, { method: 'POST', body: { action: leaseAction } });
    setMessage(`Lease ${leaseAction.toLowerCase().replace(/_/g, ' ')} complete.`);
    await load();
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lease Management</h1>
            <p className="mt-1 text-slate-600">Upload, assign, approve, download, and archive resident leases.</p>
          </div>

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <FileUp className="h-5 w-5 text-brand-700" />
                Assign lease
              </h2>
            </CardHeader>
            <CardBody className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Lease name</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Resident</span>
                <select value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Choose resident</option>
                  {residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>{resident.profile?.fullName || resident.email}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Lease PDF</span>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-slate-700" />
              </label>
              <Button onClick={createLease}>
                <Send className="h-4 w-4" />
                Assign
              </Button>
            </CardBody>
          </Card>

          {message && <p className="text-sm font-medium text-brand-700">{message}</p>}

          <div className="space-y-3">
            {leases.map((lease) => (
              <Card key={lease.id}>
                <CardBody>
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_1.5fr] xl:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{lease.user?.profile?.fullName || lease.user?.email || 'Draft'}</p>
                      <p className="text-sm text-slate-500">{lease.title}</p>
                    </div>
                    <Badge className={statusClass(lease.status)}>{lease.status.replace(/_/g, ' ')}</Badge>
                    <div className="text-sm text-slate-600">
                      <p>Assigned: {formatDate(lease.sentAt)}</p>
                      <p>Signed: {formatDate(lease.signedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lease.filePath && <Button variant="secondary" size="sm" onClick={() => downloadLease(lease.id, 'original')}>View</Button>}
                      {lease.status === 'PENDING_SIGNATURE' && <Button variant="outline" size="sm" onClick={() => action(lease, 'RESEND')}>Resend</Button>}
                      {lease.status === 'SIGNED_BY_RESIDENT' && (
                        <Button size="sm" onClick={() => action(lease, 'APPROVE')}>
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {lease.status === 'APPROVED_BY_ADMIN' && <Button size="sm" onClick={() => action(lease, 'COMPLETE')}>Complete</Button>}
                      {lease.signedFilePath && (
                        <Button variant="outline" size="sm" onClick={() => downloadLease(lease.id, 'signed')}>
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      )}
                      {lease.status !== 'ARCHIVED' && (
                        <Button variant="secondary" size="sm" onClick={() => action(lease, 'ARCHIVE')}>
                          <Archive className="h-4 w-4" />
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
