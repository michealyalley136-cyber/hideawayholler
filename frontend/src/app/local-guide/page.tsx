'use client';

import { useEffect, useState } from 'react';
import { Search, ExternalLink, Phone } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

const CATEGORIES = ['FOOD', 'SHOPPING', 'TRANSPORTATION', 'HEALTHCARE', 'BANKS', 'ATTRACTIONS', 'EMERGENCY'];

interface Place {
  id: string;
  name: string;
  category: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  mapLink?: string;
  isFeatured: boolean;
}

export default function LocalGuidePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    api<{ places: Place[] }>(`/local-guide?${params}`).then((d) => setPlaces(d.places));
  }, [search, category]);

  return (
    <ProtectedRoute>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Local guide</h1>
        <p className="text-slate-600 mb-4">Essential places around Sevierville & the Smokies</p>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Search places..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {places.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex flex-wrap gap-2 items-start justify-between">
                  <div>
                    <div className="flex gap-2 items-center">
                      <h3 className="font-semibold">{p.name}</h3>
                      {p.isFeatured && <Badge className="bg-brand-100 text-brand-700">Featured</Badge>}
                    </div>
                    <Badge className="mt-1 bg-slate-100 text-slate-600">{p.category}</Badge>
                    {p.description && <p className="text-sm text-slate-600 mt-2">{p.description}</p>}
                    {p.address && <p className="text-sm text-slate-500 mt-1">{p.address}</p>}
                  </div>
                  <div className="flex gap-3 text-sm">
                    {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-brand-600"><Phone className="w-4 h-4" />{p.phone}</a>}
                    {p.website && <a href={p.website} target="_blank" rel="noopener" className="text-brand-600 flex items-center gap-1"><ExternalLink className="w-4 h-4" />Website</a>}
                    {p.mapLink && <a href={p.mapLink} target="_blank" rel="noopener" className="text-brand-600">Map</a>}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
