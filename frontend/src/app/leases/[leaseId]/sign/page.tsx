'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SignaturePad } from '@/components/leases/SignaturePad';
import { api, ApiError } from '@/lib/api';

interface Lease {
  id: string;
  title: string;
  status: string;
}

export default function LeaseSignPage() {
  const params = useParams<{ leaseId: string }>();
  const router = useRouter();
  const leaseId = params.leaseId;
  const [lease, setLease] = useState<Lease | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!leaseId) return;
    setLoading(true);
    api<{ lease: Lease }>(`/lease-detail?leaseId=${encodeURIComponent(leaseId)}`)
      .then((data) => {
        if (data.lease.status !== 'PENDING_SIGNATURE') {
          setErrorMessage('This lease is not awaiting your signature.');
        }
        setLease(data.lease);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Unable to load lease.'))
      .finally(() => setLoading(false));
  }, [leaseId]);

  const submitSignature = async () => {
    if (!lease) return;
    if (!signatureData) {
      setErrorMessage('Please sign before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api('/lease-sign', {
        method: 'POST',
        body: { leaseId: lease.id, signatureData },
      });
      setSuccessMessage('Lease signed and submitted.');
      window.setTimeout(() => router.push('/leases'), 1200);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Unable to sign lease.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT', 'ALUMNI']}>
      <AppShell>
        <div className="space-y-6">
          <Button variant="secondary" size="sm" onClick={() => router.push('/leases')}>Back to leases</Button>

          {loading && <p className="text-sm text-slate-500">Loading lease...</p>}
          {successMessage && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{successMessage}</p>}
          {errorMessage && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{errorMessage}</p>}

          {lease && lease.status === 'PENDING_SIGNATURE' && (
            <Card>
              <CardBody className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Sign {lease.title}</h1>
                  <p className="mt-1 text-sm text-slate-600">Use your finger, stylus, or mouse. Your signature will be timestamped and added to the final signed PDF.</p>
                </div>
                <SignaturePad onChange={setSignatureData} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={submitSignature} disabled={submitting || !signatureData}>
                    {submitting ? 'Submitting...' : 'Submit Signature'}
                  </Button>
                  <Button variant="secondary" onClick={() => router.push('/leases')} disabled={submitting}>Cancel</Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
