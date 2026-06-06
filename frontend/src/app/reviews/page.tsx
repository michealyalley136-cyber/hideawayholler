'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

type Review = { id: string; rating: number; title: string; review: string; status: string; createdAt: string };

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [review, setReview] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => api<{ reviews: Review[] }>('/reviews?scope=mine').then((d) => setReviews(d.reviews));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData();
    form.set('rating', String(rating));
    form.set('title', title);
    form.set('review', review);
    if (photo) form.set('photo', photo);
    await api('/reviews', { method: 'POST', body: form });
    setTitle('');
    setReview('');
    setPhoto(null);
    await load();
    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Community Reviews</h1>
            <p className="mt-1 text-slate-600">Share your experience at Hideaway Holler.</p>
          </div>
          <Card>
            <CardBody>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Rating</label>
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                  </select>
                </div>
                <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <div>
                  <label className="text-sm font-medium text-slate-700">Review</label>
                  <textarea className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={review} onChange={(e) => setReview(e.target.value)} required />
                </div>
                <Input label="Optional photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                <Button type="submit" loading={loading}>Submit review</Button>
              </form>
            </CardBody>
          </Card>
          <div className="space-y-3">
            {reviews.map((item) => (
              <Card key={item.id}>
                <CardBody>
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="flex gap-1 text-amber-500">{Array.from({ length: item.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                      <p className="mt-2 font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.review}</p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700">{item.status}</Badge>
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
