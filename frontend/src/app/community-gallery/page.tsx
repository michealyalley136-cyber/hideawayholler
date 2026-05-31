'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { api, fileUrl } from '@/lib/api';

interface Album {
  id: string;
  title: string;
  description?: string;
  coverPath?: string;
  images: { id: string; filePath: string; caption?: string }[];
}

export default function CommunityGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selected, setSelected] = useState<Album | null>(null);

  useEffect(() => {
    api<{ albums: Album[] }>('/gallery').then((d) => setAlbums(d.albums));
  }, []);

  useEffect(() => {
    if (selected) {
      api<{ album: Album }>(`/gallery/${selected.id}`).then((d) => setSelected(d.album));
    }
  }, [selected?.id]);

  return (
    <ProtectedRoute>
      <AppShell>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Community gallery</h1>
        {!selected ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <button key={album.id} onClick={() => setSelected(album)} className="text-left">
                <Card className="overflow-hidden transition-colors hover:border-brand-300">
                  <div className="relative aspect-video bg-slate-100">
                    {album.coverPath && (
                      <img src={fileUrl(album.coverPath)!} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <CardBody>
                    <h3 className="font-semibold">{album.title}</h3>
                    {album.description && <p className="mt-1 text-sm text-slate-500">{album.description}</p>}
                  </CardBody>
                </Card>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setSelected(null)} className="mb-4 text-sm text-brand-600">
              Back to albums
            </button>
            <h2 className="text-xl font-semibold">{selected.title}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {selected.images?.map((image) => (
                <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                  <img src={fileUrl(image.filePath)!} alt={image.caption || ''} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
