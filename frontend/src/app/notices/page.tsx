'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Notice } from '@/lib/types';

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    api<{ notices: Notice[] }>('/notices').then((d) => setNotices(d.notices));
  }, []);

  const markRead = async (id: string) => {
    await api(`/notices/${id}/read`, { method: 'POST' });
    setNotices((n) => n.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Notices & announcements</h1>
        <div className="space-y-4">
          {notices.map((n) => (
            <Card key={n.id} className={!n.isRead ? 'border-brand-200' : ''}>
              <CardBody>
                <div className="flex flex-wrap gap-2 items-start justify-between">
                  <div>
                    <div className="flex gap-2 items-center">
                      {n.isPinned && <Badge className="bg-amber-100 text-amber-800">Pinned</Badge>}
                      <Badge className="bg-slate-100 text-slate-700">{n.category.replace(/_/g, ' ')}</Badge>
                      {!n.isRead && <Badge className="bg-brand-100 text-brand-700">New</Badge>}
                    </div>
                    <h3 className="font-semibold mt-2">{n.title}</h3>
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(n.publishedAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && (
                    <Button variant="outline" size="sm" onClick={() => markRead(n.id)}>Mark read</Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
