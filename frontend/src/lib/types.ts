export type UserRole = 'APPLICANT' | 'RESIDENT' | 'ALUMNI' | 'ADMIN' | 'SUPER_ADMIN';

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
  avatarUrl?: string | null;
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

export type CommunityPostType = 'RESIDENT_MEMORY' | 'ADMIN_EVENT' | 'ANNOUNCEMENT_PHOTO' | 'ANIMAL_MOMENT' | 'COMMUNITY_ACTIVITY';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReactionType = 'LIKE' | 'LOVE' | 'SMILE';

export interface CommunityPostImage {
  id: string;
  imageUrl: string;
  imageOrder: number;
}

export interface CommunityProfile {
  fullName?: string;
  avatarUrl?: string | null;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorRole: UserRole;
  authorName: string;
  authorProfile?: CommunityProfile;
  caption?: string;
  postType: CommunityPostType;
  approvalStatus: ApprovalStatus;
  isPinned: boolean;
  commentsEnabled: boolean;
  isOfficial: boolean;
  createdAt: string;
  updatedAt: string;
  images: CommunityPostImage[];
  reactionCounts: number;
  commentCounts: number;
  reportCount: number;
}

export interface CommunityAlbumImage {
  id: string;
  imageUrl: string;
  caption?: string;
  imageOrder: number;
}

export interface CommunityAlbum {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: { profile?: { fullName?: string; avatarUrl?: string | null } };
  images: CommunityAlbumImage[];
}

export interface CommunityReport {
  id: string;
  postId: string;
  reason?: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
  createdAt: string;
  reviewedAt?: string;
  reporterName?: string;
  reviewedBy?: string;
  post: {
    id: string;
    caption?: string;
    approvalStatus: ApprovalStatus;
    isPinned: boolean;
    isOfficial: boolean;
    authorName: string;
    authorProfile?: CommunityProfile;
    createdAt: string;
    images: CommunityPostImage[];
  };
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
  activeSosAlerts: number;
}

export type SosAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'SAFE' | 'NEEDS_HELP' | 'RESOLVED';

export interface SosLocationHistory {
  id: string;
  sosAlertId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  streetAddress?: string;
  landmark?: string;
  city?: string;
  state?: string;
  residentId?: string;
  speed?: number;
  heading?: number;
  recordedAt?: string;
  createdAt: string;
}

export type SosEventType =
  | 'SOS_TRIGGERED'
  | 'ADMIN_NOTIFIED'
  | 'ADMIN_ACKNOWLEDGED'
  | 'RESIDENT_CONFIRMED_SAFE'
  | 'TRACKING_STARTED'
  | 'LOCATION_UPDATED'
  | 'ADMIN_MARKED_RESOLVED'
  | 'SOS_RESOLVED'
  | 'SOS_MUTED';

export interface SosEventLog {
  id: string;
  sosAlertId: string;
  residentId?: string;
  adminId?: string;
  eventType: SosEventType;
  eventMessage: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface SosAlert {
  id: string;
  residentId: string;
  businessId?: string | null;
  emergencyType?: string;
  message?: string | null;
  isTest?: boolean;
  residentName: string;
  assignment?: string;
  phone?: string;
  status: SosAlertStatus;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  accuracy?: number;
  streetAddress?: string;
  landmark?: string;
  city?: string;
  state?: string;
  adminAcknowledged: boolean;
  adminAcknowledgedAt?: string;
  adminAcknowledgedBy?: string;
  trackingActive: boolean;
  trackingStartedAt?: string;
  residentLastResponse?: string;
  residentRespondedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
  locationHistory?: SosLocationHistory[];
  eventLogs?: SosEventLog[];
}
