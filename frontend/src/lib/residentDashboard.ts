import { api, ApiError } from './api';
import { JourneyStep, Payment } from './types';

export interface ResidentDashboardData {
  profile: { fullName: string; currentStatus: string } | null;
  activeSeason?: { season: { name: string } } | null;
  journey: JourneyStep[];
  unreadNotices: number;
  recentPayments: Payment[];
  recentMaintenance: { id: string; description: string; status: string }[];
  currentAssignment: string | null;
  openSupplyRequests: number;
  currentLease: {
    id: string;
    title: string;
    status: string;
    sentAt?: string;
    signedAt?: string;
    signedFilePath?: string;
  } | null;
}

export const EMPTY_RESIDENT_DASHBOARD: ResidentDashboardData = {
  profile: null,
  activeSeason: null,
  journey: [],
  unreadNotices: 0,
  recentPayments: [],
  recentMaintenance: [],
  currentAssignment: null,
  openSupplyRequests: 0,
  currentLease: null,
};

const DASHBOARD_PATHS = ['/dashboard/resident', '/resident-dashboard'] as const;

function normalizeResidentDashboard(payload: Partial<ResidentDashboardData> | null | undefined): ResidentDashboardData {
  return {
    profile: payload?.profile ?? null,
    activeSeason: payload?.activeSeason ?? null,
    journey: payload?.journey ?? [],
    unreadNotices: payload?.unreadNotices ?? 0,
    recentPayments: payload?.recentPayments ?? [],
    recentMaintenance: payload?.recentMaintenance ?? [],
    currentAssignment: payload?.currentAssignment ?? null,
    openSupplyRequests: payload?.openSupplyRequests ?? 0,
    currentLease: payload?.currentLease ?? null,
  };
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
