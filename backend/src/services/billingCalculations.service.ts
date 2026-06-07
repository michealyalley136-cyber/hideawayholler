import {
  BillingFrequency,
  BusinessInvoice,
  BusinessInvoiceStatus,
  BusinessInvoiceType,
  BusinessPaymentStatus,
  BusinessSetupFeeStatus,
  BusinessSubscriptionStatus,
  ClientBillingSettings,
  ClientSubscriptionStatus,
} from '@prisma/client';

export type AccountHealthStatus = 'Good' | 'Needs Attention' | 'Past Due' | 'Critical';

export const UNPAID_INVOICE_STATUSES: BusinessInvoiceStatus[] = [
  BusinessInvoiceStatus.PENDING,
  BusinessInvoiceStatus.FAILED,
  BusinessInvoiceStatus.OVERDUE,
  BusinessInvoiceStatus.OPEN,
];

export function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

export function centsToDollars(cents: number) {
  return cents / 100;
}

export function calculateOutstandingBalance(invoices: BusinessInvoice[]) {
  if (!invoices.length) return 0;
  return invoices
    .filter((invoice) => UNPAID_INVOICE_STATUSES.includes(invoice.status))
    .reduce((sum, invoice) => sum + Math.max(0, invoice.amountDue - invoice.amountPaid), 0);
}

export function calculateMrr(settings: ClientBillingSettings | null, subscriptionStatus: ClientSubscriptionStatus) {
  if (!settings || settings.monthlySubscriptionAmount <= 0) return 0;
  if (subscriptionStatus !== ClientSubscriptionStatus.ACTIVE && subscriptionStatus !== ClientSubscriptionStatus.TRIAL) return 0;

  const amount = settings.monthlySubscriptionAmount;
  switch (settings.billingFrequency) {
    case BillingFrequency.QUARTERLY:
      return Math.round(amount / 3);
    case BillingFrequency.YEARLY:
      return Math.round(amount / 12);
    default:
      return amount;
  }
}

export function addBillingInterval(date: Date, frequency: BillingFrequency) {
  const next = new Date(date);
  switch (frequency) {
    case BillingFrequency.QUARTERLY:
      next.setMonth(next.getMonth() + 3);
      break;
    case BillingFrequency.YEARLY:
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

export function dueDateFromPaymentDay(paymentDueDay: number, reference = new Date()) {
  const day = Math.min(Math.max(paymentDueDay, 1), 28);
  const due = new Date(reference.getFullYear(), reference.getMonth(), day);
  if (due < reference) due.setMonth(due.getMonth() + 1);
  return due;
}

export function isInvoiceOverdue(invoice: BusinessInvoice, gracePeriodDays: number, now = new Date()) {
  if (!invoice.dueDate) return false;
  const graceMs = gracePeriodDays * 24 * 60 * 60 * 1000;
  return now.getTime() > invoice.dueDate.getTime() + graceMs;
}

export function syncInvoiceOverdueStatuses(invoices: BusinessInvoice[], gracePeriodDays: number) {
  const now = new Date();
  return invoices.map((invoice) => {
    if (!UNPAID_INVOICE_STATUSES.includes(invoice.status)) return invoice;
    if (isInvoiceOverdue(invoice, gracePeriodDays, now) && invoice.status !== BusinessInvoiceStatus.OVERDUE) {
      return { ...invoice, status: BusinessInvoiceStatus.OVERDUE };
    }
    return invoice;
  });
}

export function deriveSetupFeeStatus(input: {
  savedStatus: BusinessSetupFeeStatus;
  setupFeeInvoices: BusinessInvoice[];
}) {
  const setupInvoices = input.setupFeeInvoices.filter((invoice) => invoice.invoiceType === BusinessInvoiceType.SETUP_FEE);
  if (input.savedStatus === BusinessSetupFeeStatus.WAIVED) return BusinessSetupFeeStatus.WAIVED;

  const paid = setupInvoices.find((invoice) => invoice.status === BusinessInvoiceStatus.PAID);
  if (paid) return BusinessSetupFeeStatus.PAID;

  const failed = setupInvoices.find((invoice) => invoice.status === BusinessInvoiceStatus.FAILED);
  if (failed) return BusinessSetupFeeStatus.FAILED;

  const unpaid = setupInvoices.find((invoice) => UNPAID_INVOICE_STATUSES.includes(invoice.status));
  if (unpaid) return BusinessSetupFeeStatus.PENDING;

  if (input.savedStatus === BusinessSetupFeeStatus.NOT_SENT && setupInvoices.length === 0) {
    return BusinessSetupFeeStatus.NOT_SENT;
  }

  return input.savedStatus;
}

export function deriveSubscriptionStatus(input: {
  settings: ClientBillingSettings | null;
  accountSuspended: boolean;
  stripeStatus?: BusinessSubscriptionStatus | null;
  unpaidInvoices: BusinessInvoice[];
  gracePeriodDays: number;
  hasBillingConfig: boolean;
}) {
  if (input.accountSuspended) return ClientSubscriptionStatus.SUSPENDED;
  if (input.stripeStatus === BusinessSubscriptionStatus.CANCELED) return ClientSubscriptionStatus.CANCELLED;
  if (input.stripeStatus === BusinessSubscriptionStatus.TRIALING) return ClientSubscriptionStatus.TRIAL;

  const overdue = input.unpaidInvoices.some((invoice) => isInvoiceOverdue(invoice, input.gracePeriodDays));
  if (overdue) return ClientSubscriptionStatus.PAST_DUE;

  if (input.hasBillingConfig && !input.settings?.stripeSubscriptionId && input.stripeStatus !== BusinessSubscriptionStatus.ACTIVE) {
    return ClientSubscriptionStatus.INCOMPLETE;
  }

  if (input.settings?.subscriptionStatus === ClientSubscriptionStatus.CANCELLED) {
    return ClientSubscriptionStatus.CANCELLED;
  }

  if (input.stripeStatus === BusinessSubscriptionStatus.ACTIVE || input.settings?.subscriptionStatus === ClientSubscriptionStatus.ACTIVE) {
    return ClientSubscriptionStatus.ACTIVE;
  }

  return input.settings?.subscriptionStatus || ClientSubscriptionStatus.INCOMPLETE;
}

export function evaluateAccountHealth(input: {
  subscriptionStatus: ClientSubscriptionStatus;
  unpaidInvoices: BusinessInvoice[];
  overdueInvoices: BusinessInvoice[];
  failedPayments: number;
  openEmergencies: number;
  unresolvedMaintenance: number;
  pendingLeases: number;
  failedNotifications: number;
  accountSuspended: boolean;
  gracePeriodDays: number;
}) {
  const reasons: string[] = [];

  if (input.accountSuspended || input.subscriptionStatus === ClientSubscriptionStatus.SUSPENDED) {
    reasons.push('Subscription suspended');
  }
  if (input.openEmergencies > 0) {
    reasons.push(`${input.openEmergencies} active unresolved SOS ${input.openEmergencies === 1 ? 'emergency' : 'emergencies'}`);
  }
  if (input.failedPayments >= 2) {
    reasons.push('Multiple failed payments');
  }
  if (input.subscriptionStatus === ClientSubscriptionStatus.INCOMPLETE) {
    reasons.push('Subscription payment incomplete');
  }
  if (input.failedNotifications > 0) {
    reasons.push('System notification failure');
  }

  if (
    input.openEmergencies > 0 ||
    input.accountSuspended ||
    input.subscriptionStatus === ClientSubscriptionStatus.SUSPENDED ||
    input.failedPayments >= 2 ||
    (input.subscriptionStatus === ClientSubscriptionStatus.INCOMPLETE && input.failedPayments > 0) ||
    input.failedNotifications > 0
  ) {
    return { status: 'Critical' as AccountHealthStatus, reasons };
  }

  if (input.overdueInvoices.length > 0) {
    reasons.push(`${input.overdueInvoices.length} overdue ${input.overdueInvoices.length === 1 ? 'invoice' : 'invoices'}`);
  }
  if (input.failedPayments > 0) {
    reasons.push('Subscription payment failed');
  }
  if (input.subscriptionStatus === ClientSubscriptionStatus.PAST_DUE) {
    reasons.push('Subscription past due');
  }

  if (input.overdueInvoices.length > 0 || input.failedPayments > 0 || input.subscriptionStatus === ClientSubscriptionStatus.PAST_DUE) {
    return { status: 'Past Due' as AccountHealthStatus, reasons };
  }

  const pendingInvoices = input.unpaidInvoices.filter((invoice) => !isInvoiceOverdue(invoice, input.gracePeriodDays));
  if (pendingInvoices.length > 0) {
    reasons.push(`${pendingInvoices.length} pending ${pendingInvoices.length === 1 ? 'invoice' : 'invoices'} not yet overdue`);
  }
  if (input.unresolvedMaintenance > 0) {
    reasons.push(`${input.unresolvedMaintenance} unresolved maintenance ${input.unresolvedMaintenance === 1 ? 'request' : 'requests'}`);
  }
  if (input.pendingLeases > 0) {
    reasons.push(`${input.pendingLeases} pending lease ${input.pendingLeases === 1 ? 'action' : 'actions'}`);
  }

  if (pendingInvoices.length > 0 || input.unresolvedMaintenance > 0 || input.pendingLeases > 0) {
    return { status: 'Needs Attention' as AccountHealthStatus, reasons };
  }

  if (input.subscriptionStatus === ClientSubscriptionStatus.ACTIVE || input.subscriptionStatus === ClientSubscriptionStatus.TRIAL) {
    reasons.push('Subscription active');
  }
  reasons.push('No overdue invoices');
  reasons.push('No active unresolved SOS emergencies');
  if (input.failedPayments === 0) reasons.push('No failed payment alerts');

  return { status: 'Good' as AccountHealthStatus, reasons };
}

export function nextInvoiceNumber(existingCount: number) {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(existingCount + 1).padStart(4, '0')}`;
}
