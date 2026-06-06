'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';

type AdminReview = {
  id: string;
  rating: number;
  title: string;
  review: string;
  status: string;
  isFeatured: boolean;
  residentName: string;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const load = () => api<{ reviews: AdminReview[] }>('/reviews?scope=admin').then((d) => setReviews(d.reviews));
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string, isFeatured = false) => {
    await api('/reviews', { method: 'PATCH', body: { id, status, isFeatured } });
    await load();
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Resident Reviews</h1>
            <p className="mt-1 text-slate-600">Approve, reject, and feature community testimonials.</p>
          </div>
          <div className="space-y-3">
            {reviews.map((item) => (
              <Card key={item.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.residentName}</p>
                      <div className="mt-2 flex gap-1 text-amber-500">{Array.from({ length: item.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                      <p className="mt-2 text-sm text-slate-600">{item.review}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <Badge className="bg-slate-100 text-slate-700">{item.status}</Badge>
                      {item.isFeatured && <Badge className="bg-brand-50 text-brand-700">FEATURED</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => update(item.id, 'APPROVED', item.isFeatured)}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => update(item.id, 'APPROVED', true)}>Feature</Button>
                    <Button size="sm" variant="danger" onClick={() => update(item.id, 'REJECTED', false)}>Reject</Button>
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
