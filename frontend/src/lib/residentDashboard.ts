import { api, ApiError } from './api';
import { JourneyStep, Payment } from './types';

export interface ResidentDashboardJourneyStep {
  label: string;
  status: 'complete' | 'pending' | 'current';
}

export interface ResidentDashboardData {
  resident: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  summary: {
    unreadNotices: number;
    recentPayments: number;
    openMaintenance: number;
    openSupplyRequests: number;
  };
  housing: {
    assigned: boolean;
    propertyName: string | null;
    roomName: string | null;
    bedName: string | null;
    display: string;
  };
  lease: {
    hasLease: boolean;
    status: string;
    leaseId: string | null;
    canSign: boolean;
    title: string | null;
  };
  wifi: {
    networkName: string;
    available: boolean;
  };
  alerts: {
    countyAlertName: string;
    countyAlertUrl: string;
  };
  journey: ResidentDashboardJourneyStep[];
  recentPaymentsList: Payment[];
  notices: { id: string; title: string; category: string; publishedAt: string }[];
  maintenance: { id: string; description: string; status: string }[];
  activeSeason?: { season: { name: string } } | null;
}

export const EMPTY_RESIDENT_DASHBOARD: ResidentDashboardData = {
  resident: { id: '', name: '', email: '', status: 'Resident' },
  summary: {
    unreadNotices: 0,
    recentPayments: 0,
    openMaintenance: 0,
    openSupplyRequests: 0,
  },
  housing: {
    assigned: false,
    propertyName: null,
    roomName: null,
    bedName: null,
    display: 'Not assigned',
  },
  lease: {
    hasLease: false,
    status: 'No lease',
    leaseId: null,
    canSign: false,
    title: null,
  },
  wifi: {
    networkName: 'Hideaway Guest',
    available: true,
  },
  alerts: {
    countyAlertName: 'CodeRED',
    countyAlertUrl: 'https://public.coderedweb.com/CNE/en-US/7BCABB4C654F',
  },
  journey: [],
  recentPaymentsList: [],
  notices: [],
  maintenance: [],
  activeSeason: null,
};

// /profiles/resident-dashboard uses the working Vercel /api/profiles/* catch-all.
const DASHBOARD_PATHS = ['/profiles/resident-dashboard', '/dashboard/resident', '/resident-dashboard'] as const;

function normalizeResidentDashboard(payload: Partial<ResidentDashboardData> | null | undefined): ResidentDashboardData {
  return {
    resident: {
      id: payload?.resident?.id ?? '',
      name: payload?.resident?.name ?? '',
      email: payload?.resident?.email ?? '',
      status: payload?.resident?.status ?? 'Resident',
    },
    summary: {
      unreadNotices: payload?.summary?.unreadNotices ?? 0,
      recentPayments: payload?.summary?.recentPayments ?? payload?.recentPaymentsList?.length ?? 0,
      openMaintenance: payload?.summary?.openMaintenance ?? payload?.maintenance?.length ?? 0,
      openSupplyRequests: payload?.summary?.openSupplyRequests ?? 0,
    },
    housing: {
      assigned: payload?.housing?.assigned ?? false,
      propertyName: payload?.housing?.propertyName ?? null,
      roomName: payload?.housing?.roomName ?? null,
      bedName: payload?.housing?.bedName ?? null,
      display: payload?.housing?.display ?? 'Not assigned',
    },
    lease: {
      hasLease: payload?.lease?.hasLease ?? false,
      status: payload?.lease?.status ?? 'No lease',
      leaseId: payload?.lease?.leaseId ?? null,
      canSign: payload?.lease?.canSign ?? false,
      title: payload?.lease?.title ?? null,
    },
    wifi: {
      networkName: payload?.wifi?.networkName ?? 'Hideaway Guest',
      available: payload?.wifi?.available ?? true,
    },
    alerts: {
      countyAlertName: payload?.alerts?.countyAlertName ?? 'CodeRED',
      countyAlertUrl: payload?.alerts?.countyAlertUrl ?? EMPTY_RESIDENT_DASHBOARD.alerts.countyAlertUrl,
    },
    journey: payload?.journey ?? [],
    recentPaymentsList: payload?.recentPaymentsList ?? [],
    notices: payload?.notices ?? [],
    maintenance: payload?.maintenance ?? [],
    activeSeason: payload?.activeSeason ?? null,
  };
}

const JOURNEY_STATUS_ORDER: JourneyStep['status'][] = [
  'APPLICANT',
  'APPROVED',
  'LEASE_SENT',
  'LEASE_SIGNED',
  'DEPOSIT_RECEIVED',
  'ROOM_ASSIGNED',
  'CHECKED_IN',
  'ACTIVE_RESIDENT',
  'CHECKED_OUT',
  'ALUMNI',
];

export function journeyStepsForTracker(steps: ResidentDashboardJourneyStep[]): JourneyStep[] {
  return steps.map((step, index) => ({
    status: JOURNEY_STATUS_ORDER[index] ?? 'APPLICANT',
    label: step.label,
    completed: step.status === 'complete',
    current: step.status === 'current',
  }));
}

export async function fetchResidentDashboard(): Promise<ResidentDashboardData> {
  let lastError: ApiError | null = null;

  for (const path of DASHBOARD_PATHS) {
    try {
      const response = await api<Partial<ResidentDashboardData>>(path, { suppressErrorLog: true });
      return normalizeResidentDashboard(response);
    } catch (err) {
      if (err instanceof ApiError) {
        lastError = err;
        if (process.env.NODE_ENV !== 'production') {
          console.error('[residentDashboard] endpoint failed', { path, status: err.status, message: err.message });
        }
        if (err.status === 401 || err.status === 403) throw err;
        if (err.status === 404) continue;
        throw err;
      }
      throw err;
    }
  }

  if (process.env.NODE_ENV !== 'production' && lastError) {
    console.error('[residentDashboard] all endpoints failed', { status: lastError.status, message: lastError.message });
  }

  throw lastError || new ApiError(404, 'Resident dashboard endpoint not found.');
}
