'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';

interface PhotoEntry {
  file: File;
  caption: string;
  preview: string;
}

export function AdminCommunityAlbumForm({ onComplete }: { onComplete?: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handlePhotoFiles = (files: FileList | null) => {
    if (!files) return;
    const selections = Array.from(files).slice(0, 10).map((file) => ({
      file,
      caption: '',
      preview: URL.createObjectURL(file),
    }));
    setPhotos((current) => [...current, ...selections].slice(0, 10));
  };

  const updateCaption = (index: number, caption: string) => {
    setPhotos((current) => current.map((entry, idx) => (idx === index ? { ...entry, caption } : entry)));
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, idx) => idx !== index));
  };

  const submit = async () => {
    if (!title.trim()) {
      setMessage('Album title is required.');
      return;
    }
    if (!coverFile) {
      setMessage('Please choose a cover image for the album.');
      return;
    }
    if (photos.length === 0) {
      setMessage('Please add at least one album image.');
      return;
    }

    setSaving(true);
    setMessage('');
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('cover', coverFile);
    photos.forEach((photo) => formData.append('photos', photo.file));
    formData.append('photoCaptions', JSON.stringify(photos.map((photo) => photo.caption || '')));

    try {
      await api('/admin/community/albums', { method: 'POST', body: formData });
      setMessage('Album created successfully.');
      setTitle('');
      setDescription('');
      setCoverFile(null);
      setPhotos([]);
      if (onComplete) onComplete();
    } catch (err) {
      setMessage('Unable to save album. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-lg font-semibold">Create Event Album</h2>
          <p className="text-sm text-slate-500">Add a cover image, album photos, and optional captions for each image.</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4">
          <label className="block text-sm font-medium text-slate-700">Album title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Resident Cookout, Holiday Event Memories, etc."
          />
        </div>
        <div className="grid gap-4">
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Share the story behind the event..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Cover image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Album images</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => handlePhotoFiles(event.target.files)}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-500 mt-1">Up to 10 photos, 5MB each.</p>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="space-y-3">
            {photos.map((photo, index) => (
              <div key={photo.preview} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <img src={photo.preview} alt={`Photo ${index + 1}`} className="h-20 w-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700">Caption (optional)</label>
                    <input
                      value={photo.caption}
                      onChange={(event) => updateCaption(index, event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Add a caption for this photo"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removePhoto(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Optional captions help tell the story behind your photos.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={submit} loading={saving}>Save Album</Button>
            <Button variant="outline" onClick={() => { setTitle(''); setDescription(''); setCoverFile(null); setPhotos([]); setMessage(''); }}>
              Reset
            </Button>
          </div>
        </div>

        {message && <p className="text-sm text-slate-600">{message}</p>}
      </CardBody>
    </Card>
  );
}
