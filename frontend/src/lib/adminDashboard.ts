import { api, ApiError } from './api';
import { DashboardStats } from './types';

const PRIMARY_ADMIN_DASHBOARD_PATH = '/admin/dashboard';
const LEGACY_ADMIN_DASHBOARD_PATH = '/dashboard/admin';

export async function fetchAdminDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await api<{ stats: DashboardStats }>(PRIMARY_ADMIN_DASHBOARD_PATH, { suppressErrorLog: true });
    return response.stats;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      const fallback = await api<{ stats: DashboardStats }>(LEGACY_ADMIN_DASHBOARD_PATH, { suppressErrorLog: true });
      return fallback.stats;
    }

    if (err instanceof ApiError) {
      throw new Error(err.message || 'Unable to load dashboard metrics.');
    }

    throw new Error('Unable to load dashboard metrics. Please refresh or sign in again.');
  }
}
