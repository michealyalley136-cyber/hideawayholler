import { api, ApiError } from './api';
import { DashboardStats } from './types';

// Single-segment paths are required for reliable Vercel routing.
const DASHBOARD_PATHS = [
  '/admin-dashboard',
  '/admin-dashboard-stats',
  '/admin/dashboard',
  '/admin/sos/dashboard-stats',
] as const;

export async function fetchAdminDashboardStats(): Promise<DashboardStats> {
  let lastError: Error | null = null;

  for (const path of DASHBOARD_PATHS) {
    try {
      const response = await api<{ stats: DashboardStats }>(path, { suppressErrorLog: true });
      return response.stats;
    } catch (err) {
      if (err instanceof ApiError) {
        lastError = new Error(err.message || 'Unable to load dashboard metrics.');
        if (err.status !== 404) break;
        continue;
      }
      lastError = new Error('Unable to load dashboard metrics. Please refresh or sign in again.');
      break;
    }
  }

  throw lastError || new Error('Unable to load dashboard metrics. Please refresh or sign in again.');
}
