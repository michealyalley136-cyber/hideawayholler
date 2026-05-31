import { PaymentStatus } from '@prisma/client';

export function computePaymentStatus(
  amountDue: number,
  amountPaid: number,
  dueDate: Date
): PaymentStatus {
  const balance = amountDue - amountPaid;
  if (balance <= 0) return PaymentStatus.PAID;
  if (amountPaid > 0) return PaymentStatus.PARTIAL;
  if (new Date() > dueDate) return PaymentStatus.OVERDUE;
  return PaymentStatus.DUE;
}

export function computeBalance(amountDue: number, amountPaid: number): number {
  return Math.max(0, amountDue - amountPaid);
}
