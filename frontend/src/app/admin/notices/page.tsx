'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<{ id: string; title: string; category: string }[]>([]);
  const [form, setForm] = useState({ title: '', content: '', category: 'COMMUNITY' });

  useEffect(() => {
    api<{ notices: typeof notices }>('/notices').then((d) => setNotices(d.notices));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/notices', { method: 'POST', body: form });
    setForm({ title: '', content: '', category: 'COMMUNITY' });
    const { notices: updated } = await api<{ notices: typeof notices }>('/notices');
    setNotices(updated);
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Notices</h1>
        <Card className="mb-6">
          <CardBody>
            <h2 className="font-semibold mb-4">Post notice</h2>
            <form onSubmit={create} className="space-y-3">
              <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <div>
                <label className="text-sm font-medium">Content</label>
                <textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
              </div>
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['RULES', 'COMMUNITY', 'RENT_REMINDER', 'WEATHER', 'EMERGENCY', 'EVENT'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button type="submit">Publish</Button>
            </form>
          </CardBody>
        </Card>
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id}><CardBody><p className="font-medium">{n.title}</p><p className="text-sm text-slate-500">{n.category}</p></CardBody></Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
