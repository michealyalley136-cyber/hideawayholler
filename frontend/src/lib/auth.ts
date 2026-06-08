import { User, UserRole } from './types';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';
const AUTH_LAST_ACTIVITY_KEY = 'auth:lastActivity';

type StorageType = 'local' | 'session';

function getStorage(type: StorageType): Storage | null {
  if (typeof window === 'undefined') return null;
  return type === 'local' ? localStorage : sessionStorage;
}

function getStorageItem(type: StorageType, key: string): string | null {
  try {
    return getStorage(type)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function setStorageItem(type: StorageType, key: string, value: string) {
  try {
    getStorage(type)?.setItem(key, value);
  } catch {
    // Some mobile/private browser modes expose storage but throw on use.
  }
}

function removeStorageItem(type: StorageType, key: string) {
  try {
    getStorage(type)?.removeItem(key);
  } catch {
    // Ignore storage cleanup failures; auth guards will recover on next load.
  }
}

export function getActiveAuthStorage(): StorageType | null {
  if (typeof window === 'undefined') return null;
  if (getStorageItem('local', AUTH_TOKEN_KEY) || getStorageItem('local', AUTH_USER_KEY)) return 'local';
  if (getStorageItem('session', AUTH_TOKEN_KEY) || getStorageItem('session', AUTH_USER_KEY)) return 'session';
  return null;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getStorageItem('local', AUTH_TOKEN_KEY) || getStorageItem('session', AUTH_TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = getStorageItem('local', AUTH_USER_KEY) || getStorageItem('session', AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User, rememberMe = true) {
  if (typeof window === 'undefined') return;
  const activeStorage = rememberMe ? 'local' : 'session';
  setStorageItem(activeStorage, AUTH_TOKEN_KEY, token);
  setStorageItem(activeStorage, AUTH_USER_KEY, JSON.stringify(user));
  if (!rememberMe) setStorageItem(activeStorage, AUTH_LAST_ACTIVITY_KEY, String(Date.now()));

  const otherStorage = rememberMe ? 'session' : 'local';
  removeStorageItem(otherStorage, AUTH_TOKEN_KEY);
  removeStorageItem(otherStorage, AUTH_USER_KEY);
  removeStorageItem(otherStorage, AUTH_LAST_ACTIVITY_KEY);
}

export function setStoredUser(user: User) {
  if (typeof window === 'undefined') return;
  const activeType = getActiveAuthStorage() ?? 'local';
  setStorageItem(activeType, AUTH_USER_KEY, JSON.stringify(user));
}

export function touchSessionActivity() {
  if (typeof window === 'undefined') return;
  if (getActiveAuthStorage() === 'session') {
    setStorageItem('session', AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
  }
}

export function getSessionLastActivity(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = getStorageItem('session', AUTH_LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  removeStorageItem('local', AUTH_TOKEN_KEY);
  removeStorageItem('local', AUTH_USER_KEY);
  removeStorageItem('session', AUTH_TOKEN_KEY);
  removeStorageItem('session', AUTH_USER_KEY);
  removeStorageItem('session', AUTH_LAST_ACTIVITY_KEY);
}

export function getDashboardPath(role: UserRole | string): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'SUPERADMIN':
      return '/super-admin/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'ALUMNI':
      return '/dashboard';
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
