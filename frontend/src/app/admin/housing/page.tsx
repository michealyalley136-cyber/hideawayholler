'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, Edit3, Home, Plus, UserPlus } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';

type HouseStatus = 'ACTIVE' | 'ARCHIVED';

interface HouseAssignment {
  id: string;
  houseName: string;
  capacity: number;
  occupancy: number;
  status: HouseStatus;
  residentAssignments?: {
    id: string;
    userId: string;
    user?: { email: string; profile?: { fullName: string } };
  }[];
}

interface ResidentOption {
  id: string;
  email: string;
  profile?: { fullName: string };
  seasonMemberships?: { seasonId: string; season?: { name: string } }[];
}

export default function AdminHousingPage() {
  const [houses, setHouses] = useState<HouseAssignment[]>([]);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [houseName, setHouseName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignHouseId, setAssignHouseId] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [houseRes, residentRes] = await Promise.all([
      api<{ houses: HouseAssignment[] }>('/house-assignments'),
      api<{ residents: ResidentOption[] }>('/profiles/residents'),
    ]);
    setHouses(houseRes.houses);
    setResidents(residentRes.residents);
  };

  useEffect(() => {
    load().catch(() => setMessage('Unable to load housing data.'));
  }, []);

  const activeHouses = useMemo(() => houses.filter((house) => house.status === 'ACTIVE'), [houses]);

  const saveHouse = async () => {
    setMessage('');
    if (!houseName.trim()) {
      setMessage('House name is required.');
      return;
    }

    if (editingId) {
      await api('/house-assignments', { method: 'PATCH', body: { id: editingId, houseName, capacity } });
    } else {
      await api('/house-assignments', { method: 'POST', body: { houseName, capacity } });
    }

    setHouseName('');
    setCapacity(4);
    setEditingId(null);
    setMessage('House saved.');
    await load();
  };

  const editHouse = (house: HouseAssignment) => {
    setEditingId(house.id);
    setHouseName(house.houseName);
    setCapacity(house.capacity);
  };

  const archiveHouse = async (house: HouseAssignment) => {
    await api('/house-assignments', { method: 'PATCH', body: { id: house.id, status: 'ARCHIVED' } });
    setMessage(`${house.houseName} archived.`);
    await load();
  };

  const assignResident = async () => {
    if (!assignUserId || !assignHouseId) {
      setMessage('Choose a resident and a house.');
      return;
    }
    const resident = residents.find((item) => item.id === assignUserId);
    const seasonId = resident?.seasonMemberships?.[0]?.seasonId;
    await api('/house-assignments', {
      method: 'POST',
      body: { action: 'ASSIGN', userId: assignUserId, houseAssignmentId: assignHouseId, seasonId },
    });
    setMessage('Resident assigned.');
    await load();
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Housing Name Management</h1>
            <p className="mt-1 text-slate-600">Manage animal-themed house names and resident assignments.</p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <Home className="h-5 w-5 text-brand-700" />
                  {editingId ? 'Edit house name' : 'Add house name'}
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">House name</span>
                  <input value={houseName} onChange={(event) => setHouseName(event.target.value)} placeholder="Bear" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Capacity</span>
                  <input type="number" min={0} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveHouse}>
                    {editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingId ? 'Save Changes' : 'Add House'}
                  </Button>
                  {editingId && <Button variant="secondary" onClick={() => { setEditingId(null); setHouseName(''); setCapacity(4); }}>Cancel</Button>}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <UserPlus className="h-5 w-5 text-brand-700" />
                  Assign resident
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Resident</span>
                  <select value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Choose resident</option>
                    {residents.map((resident) => (
                      <option key={resident.id} value={resident.id}>{resident.profile?.fullName || resident.email}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">House</span>
                  <select value={assignHouseId} onChange={(event) => setAssignHouseId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Choose house</option>
                    {activeHouses.map((house) => (
                      <option key={house.id} value={house.id}>{house.houseName}</option>
                    ))}
                  </select>
                </label>
                <Button onClick={assignResident}>Assign House</Button>
              </CardBody>
            </Card>
          </div>

          {message && <p className="text-sm font-medium text-brand-700">{message}</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            {houses.map((house) => (
              <Card key={house.id} className={house.status === 'ARCHIVED' ? 'opacity-70' : undefined}>
                <CardBody>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{house.houseName}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {house.occupancy} occupied / {house.capacity} capacity · {house.status.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => editHouse(house)}>
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                      {house.status !== 'ARCHIVED' && (
                        <Button variant="outline" size="sm" onClick={() => archiveHouse(house)}>
                          <Archive className="h-4 w-4" />
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current residents</p>
                    {house.residentAssignments?.length ? (
                      <div className="mt-2 space-y-1 text-sm text-slate-700">
                        {house.residentAssignments.map((assignment) => (
                          <p key={assignment.id}>{assignment.user?.profile?.fullName || assignment.user?.email || 'Resident'}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-emerald-700">No residents assigned</p>
                    )}
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
