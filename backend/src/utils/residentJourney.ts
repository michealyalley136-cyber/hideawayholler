import { ResidentStatus } from '@prisma/client';

export const JOURNEY_STEPS: { status: ResidentStatus; label: string }[] = [
  { status: ResidentStatus.APPLICANT, label: 'Applicant' },
  { status: ResidentStatus.APPROVED, label: 'Approved' },
  { status: ResidentStatus.LEASE_SENT, label: 'Lease Sent' },
  { status: ResidentStatus.LEASE_SIGNED, label: 'Lease Signed' },
  { status: ResidentStatus.DEPOSIT_RECEIVED, label: 'Deposit Received' },
  { status: ResidentStatus.ROOM_ASSIGNED, label: 'Room Assigned' },
  { status: ResidentStatus.CHECKED_IN, label: 'Checked In' },
  { status: ResidentStatus.ACTIVE_RESIDENT, label: 'Active Resident' },
  { status: ResidentStatus.CHECKED_OUT, label: 'Checked Out' },
  { status: ResidentStatus.ALUMNI, label: 'Alumni' },
];

export function getJourneyProgress(status: ResidentStatus): number {
  const index = JOURNEY_STEPS.findIndex((s) => s.status === status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / JOURNEY_STEPS.length) * 100);
}

export function getJourneySteps(status: ResidentStatus) {
  const currentIndex = JOURNEY_STEPS.findIndex((s) => s.status === status);
  return JOURNEY_STEPS.map((step, i) => ({
    ...step,
    completed: i <= currentIndex,
    current: i === currentIndex,
  }));
}
