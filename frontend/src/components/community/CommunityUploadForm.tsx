'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { CommunityPostType } from '@/lib/types';

const postTypeOptions: { value: CommunityPostType; label: string }[] = [
  { value: 'RESIDENT_MEMORY', label: 'Resident Memory' },
  { value: 'ADMIN_EVENT', label: 'Event Photo' },
  { value: 'ANNOUNCEMENT_PHOTO', label: 'Announcement' },
  { value: 'ANIMAL_MOMENT', label: 'Animal Moment' },
  { value: 'COMMUNITY_ACTIVITY', label: 'Community Activity' },
];

export function CommunityUploadForm({ onComplete }: { onComplete?: () => void }) {
  const [caption, setCaption] = useState('');
  const [postType, setPostType] = useState<CommunityPostType>('RESIDENT_MEMORY');
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (!files || files.length === 0) {
      setMessage('Please choose at least one image.');
      return;
    }
    if (files.length > 10) {
      setMessage('Please upload at most 10 images.');
      return;
    }

    setSaving(true);
    setMessage('');
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append('photos', file);
    }
    formData.append('caption', caption);
    formData.append('postType', postType);

    try {
      await api('/community', { method: 'POST', body: formData });
      setMessage('Your memory was submitted and is waiting for admin approval.');
      setCaption('');
      setFiles(null);
      if (onComplete) onComplete();
    } catch (err) {
      setMessage('Failed to submit the memory. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-lg font-semibold">Share a Memory</h2>
          <p className="text-sm text-slate-500">Upload photos and add a caption. Resident submissions require admin approval.</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Upload photos</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => setFiles(event.target.files)}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={postType}
              onChange={(event) => setPostType(event.target.value as CommunityPostType)}
              className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {postTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Caption</label>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Share what this moment means..."
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Up to 10 images, JPG/PNG/WEBP only, max 5MB each.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={submit} loading={saving}>Submit for Approval</Button>
            <Button variant="outline" onClick={() => { setCaption(''); setFiles(null); setMessage(''); }}>Reset</Button>
          </div>
        </div>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </CardBody>
    </Card>
  );
}
