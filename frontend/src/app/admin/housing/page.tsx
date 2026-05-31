'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';

export default function AdminHousingPage() {
  const [properties, setProperties] = useState<{ name: string; address: string; stats?: { capacity: number; occupied: number; vacant: number }; buildings: { name: string; rooms: { roomNumber: string; assignments: { user?: { profile?: { fullName: string } } }[] }[] }[] }[]>([]);
  const [occupancy, setOccupancy] = useState<{ totalBeds: number; occupied: number; vacant: number } | null>(null);

  useEffect(() => {
    api<{ properties: typeof properties }>('/housing/properties').then((d) => setProperties(d.properties));
    api<{ totalBeds: number; occupied: number; vacant: number }>('/housing/occupancy').then(setOccupancy);
  }, []);

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Housing</h1>
        {occupancy && (
          <p className="text-slate-600 mb-6">
            {occupancy.occupied} occupied · {occupancy.vacant} vacant · {occupancy.totalBeds} total beds
          </p>
        )}
        {properties.map((p) => (
          <Card key={p.name} className="mb-6">
            <CardBody>
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <p className="text-sm text-slate-500">{p.address}</p>
              {p.stats && <p className="text-sm mt-2">Capacity: {p.stats.capacity} · Occupied: {p.stats.occupied} · Vacant: {p.stats.vacant}</p>}
              {p.buildings.map((b) => (
                <div key={b.name} className="mt-4">
                  <h4 className="font-medium text-slate-800">{b.name}</h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {b.rooms.map((r) => (
                      <div key={r.roomNumber} className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium">Room {r.roomNumber}</p>
                        {r.assignments.length ? (
                          r.assignments.map((a, i) => (
                            <p key={i} className="text-slate-600">{a.user?.profile?.fullName || 'Assigned'}</p>
                          ))
                        ) : (
                          <p className="text-emerald-600">Vacant</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ))}
      </AppShell>
    </ProtectedRoute>
  );
}
