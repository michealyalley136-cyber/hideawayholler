'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';

interface PendingCheckIn {
  id: string;
  userId: string;
  seasonId?: string | null;
  roomCondition?: string | null;
  completedAt?: string | null;
  adminApproved: boolean;
  user?: { email: string; profile?: { fullName?: string | null } | null };
}

export default function AdminCheckInsPage() {
  const [checkIns, setCheckIns] = useState<PendingCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCheckIns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ checkIns: PendingCheckIn[] }>('/check-in/pending');
      setCheckIns(data.checkIns);
    } catch {
      setError('Unable to load pending check-ins.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCheckIns();
  }, [loadCheckIns]);

  const runAction = async (checkInId: string, action: 'approve' | 'reject') => {
    setActionId(checkInId);
    setMessage('');
    setError('');
    try {
      await api(`/check-in/${action}`, { method: 'POST', body: { checkInId } });
      setMessage(action === 'approve' ? 'Check-in approved.' : 'Check-in rejected.');
      await loadCheckIns();
    } catch {
      setError(`Unable to ${action} this check-in.`);
    } finally {
      setActionId(null);
    }
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Check-ins</h1>
            <p className="mt-1 text-slate-600">Review resident arrival check-ins and approve move-in completion.</p>
          </div>

          {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {error && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}

          {loading && <p className="text-sm text-slate-500">Loading pending check-ins...</p>}
          {!loading && !checkIns.length && (
            <Card>
              <CardBody>
                <p className="text-slate-600">No pending check-ins right now. Residents will appear here after submitting their arrival form.</p>
              </CardBody>
            </Card>
          )}

          <div className="space-y-3">
            {checkIns.map((checkIn) => (
              <Card key={checkIn.id}>
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{checkIn.user?.profile?.fullName || checkIn.user?.email || 'Resident'}</p>
                    <p className="mt-1 text-sm text-slate-600">{checkIn.roomCondition || 'No room condition notes provided.'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted {checkIn.completedAt ? new Date(checkIn.completedAt).toLocaleString() : 'recently'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => runAction(checkIn.id, 'approve')} loading={actionId === checkIn.id}>
                      Approve
                    </Button>
                    <Button variant="outline" onClick={() => runAction(checkIn.id, 'reject')} loading={actionId === checkIn.id}>
                      Reject
                    </Button>
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
