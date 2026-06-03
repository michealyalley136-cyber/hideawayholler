'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { ResidentProfile } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ResidentProfile | null>(null);
  const [form, setForm] = useState<Partial<ResidentProfile>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api<{ user: { profile: ResidentProfile } }>('/profiles').then((d) => {
      setProfile(d.user.profile);
      setForm(d.user.profile);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { profile: updated } = await api<{ profile: ResidentProfile }>('/profiles', {
        method: 'PATCH',
        body: form,
      });
      setProfile(updated);
      setMessage('Profile saved');
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My profile</h1>
        <Card>
          <CardHeader><h2 className="font-semibold">Personal information</h2></CardHeader>
          <CardBody className="grid sm:grid-cols-2 gap-4">
            <Input label="Full name" value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Country" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <Input label="Passport number" value={form.passportNumber || ''} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} />
            <Input label="Sponsor" value={form.sponsor || ''} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} />
            <Input label="Employer" value={form.employer || ''} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
            <Input label="Emergency contact" value={form.emergencyContactName || ''} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
            <Input label="Emergency phone" value={form.emergencyContactPhone || ''} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
          </CardBody>
        </Card>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button className="w-full sm:w-auto" onClick={save} loading={saving}>Save changes</Button>
          {message && <span className="text-sm text-brand-600">{message}</span>}
        </div>
        {profile && (
          <p className="mt-4 text-sm text-slate-500">Status: <span className="font-medium capitalize">{profile.currentStatus.replace(/_/g, ' ').toLowerCase()}</span></p>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
