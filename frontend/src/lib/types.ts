export type UserRole = 'APPLICANT' | 'RESIDENT' | 'ALUMNI' | 'ADMIN';

export type ResidentStatus =
  | 'APPLICANT'
  | 'APPROVED'
  | 'LEASE_SENT'
  | 'LEASE_SIGNED'
  | 'DEPOSIT_RECEIVED'
  | 'ROOM_ASSIGNED'
  | 'CHECKED_IN'
  | 'ACTIVE_RESIDENT'
  | 'CHECKED_OUT'
  | 'ALUMNI';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile?: ResidentProfile;
}

export interface ResidentProfile {
  id: string;
  fullName: string;
  phone?: string;
  country?: string;
  passportNumber?: string;
  sponsor?: string;
  employer?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  arrivalDate?: string;
  departureDate?: string;
  currentStatus: ResidentStatus;
}

export interface JourneyStep {
  status: ResidentStatus;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface Season {
  id: string;
  name: string;
  slug: string;
  year: number;
  term: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Payment {
  id: string;
  type: string;
  description?: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE';
  notes?: string;
  receiptPath?: string;
  receiptVerified?: boolean;
  season?: Season;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  publishedAt: string;
  isRead?: boolean;
}

export interface DashboardStats {
  totalResidents: number;
  activeResidents: number;
  newApplications: number;
  vacantBeds: number;
  occupiedBeds: number;
  openMaintenance: number;
  rentDue: number;
  overduePayments: number;
  arrivalsThisWeek: number;
  departuresThisWeek: number;
  openSupplyRequests: number;
  houseOccupancy: string;
  pendingReviews: number;
  weatherAlerts: number;
}
