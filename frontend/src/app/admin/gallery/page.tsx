'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<{ id: string; title: string; description?: string; images: unknown[] }[]>([]);

  useEffect(() => {
    api<{ albums: typeof albums }>('/gallery').then((d) => setAlbums(d.albums));
  }, []);

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Gallery</h1>
        <div className="grid sm:grid-cols-2 gap-4">
          {albums.map((a) => (
            <Card key={a.id}>
              <CardBody>
                <h3 className="font-semibold">{a.title}</h3>
                {a.description && <p className="text-sm text-slate-500">{a.description}</p>}
                <p className="text-xs text-slate-400 mt-2">{a.images?.length || 0} images</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
