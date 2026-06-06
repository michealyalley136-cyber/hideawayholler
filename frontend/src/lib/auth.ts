import { User, UserRole } from './types';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';

type StorageType = 'local' | 'session';

function getStorage(type: StorageType) {
  return type === 'local' ? localStorage : sessionStorage;
}

function getActiveStorage(): StorageType | null {
  if (typeof window === 'undefined') return null;
  if (localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_USER_KEY)) return 'local';
  if (sessionStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_USER_KEY)) return 'session';
  return null;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User, rememberMe = true) {
  if (typeof window === 'undefined') return;
  const storage = getStorage(rememberMe ? 'local' : 'session');
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));

  const otherStorage = getStorage(rememberMe ? 'session' : 'local');
  otherStorage.removeItem(AUTH_TOKEN_KEY);
  otherStorage.removeItem(AUTH_USER_KEY);
}

export function setStoredUser(user: User) {
  if (typeof window === 'undefined') return;
  const activeType = getActiveStorage() ?? 'local';
  getStorage(activeType).setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function getDashboardPath(role: UserRole | string): string {
  switch (role) {
    case 'ADMIN':
    case 'SUPERADMIN':
      return '/admin/dashboard';
    case 'ALUMNI':
      return '/alumni';
    case 'RESIDENT':
    case 'APPLICANT':
    default:
      return '/dashboard';
  }
}

export const STATUS_LABELS: Record<string, string> = {
  PAID: 'Paid',
  PARTIAL: 'Partial',
  DUE: 'Due',
  OVERDUE: 'Overdue',
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800',
  PARTIAL: 'bg-amber-100 text-amber-800',
  DUE: 'bg-blue-100 text-blue-800',
  OVERDUE: 'bg-red-100 text-red-800',
};
