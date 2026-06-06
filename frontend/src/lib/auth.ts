import { User, UserRole } from './types';

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
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
