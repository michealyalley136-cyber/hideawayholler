import Stripe from 'stripe';
import {
  BusinessInvoiceStatus,
  BusinessPaymentStatus,
  BusinessSubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../utils/prisma';

const DEFAULT_BUSINESS_NAME = 'Hideaway Holler';
export const APPCREATIVES_PAYEE_NAME = 'AppCreatives LLC';

let stripeClient: any = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function stripeIsConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeCheckoutIsConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_BUSINESS_SUBSCRIPTION_PRICE_ID);
}

export function fromUnix(value?: number | null) {
  return value ? new Date(value * 1000) : null;
}

export function mapSubscriptionStatus(status?: string | null): BusinessSubscriptionStatus {
  switch ((status || '').toLowerCase()) {
    case 'trialing':
      return BusinessSubscriptionStatus.TRIALING;
    case 'active':
      return BusinessSubscriptionStatus.ACTIVE;
    case 'past_due':
      return BusinessSubscriptionStatus.PAST_DUE;
    case 'canceled':
      return BusinessSubscriptionStatus.CANCELED;
    case 'unpaid':
      return BusinessSubscriptionStatus.UNPAID;
    case 'incomplete_expired':
      return BusinessSubscriptionStatus.INCOMPLETE_EXPIRED;
    case 'paused':
      return BusinessSubscriptionStatus.PAUSED;
    default:
      return BusinessSubscriptionStatus.INCOMPLETE;
  }
}

export function mapInvoiceStatus(status?: string | null): BusinessInvoiceStatus {
  switch ((status || '').toLowerCase()) {
    case 'draft':
      return BusinessInvoiceStatus.DRAFT;
    case 'paid':
      return BusinessInvoiceStatus.PAID;
    case 'void':
      return BusinessInvoiceStatus.VOID;
    case 'uncollectible':
      return BusinessInvoiceStatus.UNCOLLECTIBLE;
    default:
      return BusinessInvoiceStatus.OPEN;
  }
}

export function mapPaymentStatus(status?: string | null): BusinessPaymentStatus {
  switch ((status || '').toLowerCase()) {
    case 'succeeded':
      return BusinessPaymentStatus.SUCCEEDED;
    case 'failed':
      return BusinessPaymentStatus.FAILED;
    case 'refunded':
      return BusinessPaymentStatus.REFUNDED;
    case 'canceled':
      return BusinessPaymentStatus.CANCELED;
    default:
      return BusinessPaymentStatus.PENDING;
  }
}

function stripeId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in value && typeof (value as { id?: unknown }).id === 'string') {
    return (value as { id: string }).id;
  }
  return null;
}

export async function getDefaultBusinessAccount() {
  const existing = await prisma.businessAccount.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) return existing;

  return prisma.businessAccount.create({
    data: {
      businessName: process.env.BUSINESS_BILLING_NAME || DEFAULT_BUSINESS_NAME,
      billingEmail: process.env.BUSINESS_BILLING_EMAIL || null,
    },
  });
}

export async function ensureStripeCustomer(accountId: string, email?: string | null) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  const account = await prisma.businessAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error('Business account not found');
  if (account.stripeCustomerId) return account.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: account.businessName,
    email: account.billingEmail || email || undefined,
    metadata: {
      businessAccountId: account.id,
      product: 'HollerHub Business Subscription',
      payee: APPCREATIVES_PAYEE_NAME,
    },
  });

  await prisma.businessAccount.update({
    where: { id: account.id },
    data: {
      stripeCustomerId: customer.id,
      billingEmail: account.billingEmail || email || null,
    },
  });

  return customer.id;
}

export async function upsertSubscriptionFromStripe(subscription: any) {
  const stripeSubscription = subscription as {
    id: string;
    customer?: unknown;
    items: { data: Array<{ price?: { id?: string; nickname?: string | null; product?: unknown } }> };
    latest_invoice?: unknown;
    status?: string;
    cancel_at_period_end?: boolean;
    trial_end?: number | null;
    canceled_at?: number | null;
    current_period_start?: number;
    current_period_end?: number;
  };
  const customerId = stripeId(stripeSubscription.customer);
  const account =
    (customerId && (await prisma.businessAccount.findUnique({ where: { stripeCustomerId: customerId } }))) ||
    (await getDefaultBusinessAccount());
  const item = stripeSubscription.items.data[0];

  return prisma.businessSubscription.upsert({
    where: { stripeSubscriptionId: stripeSubscription.id },
    create: {
      businessAccountId: account.id,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customerId,
      stripePriceId: item?.price?.id || null,
      planName: item?.price?.nickname || item?.price?.product?.toString() || 'HollerHub subscription',
      status: mapSubscriptionStatus(stripeSubscription.status),
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
      currentPeriodStart: fromUnix(stripeSubscription.current_period_start),
      currentPeriodEnd: fromUnix(stripeSubscription.current_period_end),
      trialEnd: fromUnix(stripeSubscription.trial_end),
      canceledAt: fromUnix(stripeSubscription.canceled_at),
      latestInvoiceId: stripeId(stripeSubscription.latest_invoice),
    },
    update: {
      businessAccountId: account.id,
      stripeCustomerId: customerId,
      stripePriceId: item?.price?.id || null,
      planName: item?.price?.nickname || item?.price?.product?.toString() || 'HollerHub subscription',
      status: mapSubscriptionStatus(stripeSubscription.status),
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
      currentPeriodStart: fromUnix(stripeSubscription.current_period_start),
      currentPeriodEnd: fromUnix(stripeSubscription.current_period_end),
      trialEnd: fromUnix(stripeSubscription.trial_end),
      canceledAt: fromUnix(stripeSubscription.canceled_at),
      latestInvoiceId: stripeId(stripeSubscription.latest_invoice),
    },
  });
}

export async function upsertInvoiceFromStripe(invoice: any) {
  const stripeInvoice = invoice as {
    id: string;
    customer?: unknown;
    subscription?: unknown;
    number?: string | null;
    hosted_invoice_url?: string | null;
    invoice_pdf?: string | null;
    amount_due?: number;
    amount_paid?: number;
    currency?: string;
    status?: string | null;
    due_date?: number | null;
    status_transitions?: { paid_at?: number | null };
    paid_at?: number | null;
  };
  const customerId = stripeId(stripeInvoice.customer);
  const account =
    (customerId && (await prisma.businessAccount.findUnique({ where: { stripeCustomerId: customerId } }))) ||
    (await getDefaultBusinessAccount());
  const subscriptionId = stripeId(stripeInvoice.subscription);
  const subscription = subscriptionId
    ? await prisma.businessSubscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } })
    : null;

  return prisma.businessInvoice.upsert({
    where: { stripeInvoiceId: stripeInvoice.id },
    create: {
      businessAccountId: account.id,
      businessSubscriptionId: subscription?.id || null,
      stripeInvoiceId: stripeInvoice.id,
      invoiceNumber: stripeInvoice.number || null,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || null,
      invoicePdf: stripeInvoice.invoice_pdf || null,
      amountDue: stripeInvoice.amount_due || 0,
      amountPaid: stripeInvoice.amount_paid || 0,
      currency: stripeInvoice.currency || 'usd',
      status: mapInvoiceStatus(stripeInvoice.status),
      dueDate: fromUnix(stripeInvoice.due_date),
      paidAt: fromUnix(stripeInvoice.status_transitions?.paid_at || stripeInvoice.paid_at),
    },
    update: {
      businessAccountId: account.id,
      businessSubscriptionId: subscription?.id || null,
      invoiceNumber: stripeInvoice.number || null,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || null,
      invoicePdf: stripeInvoice.invoice_pdf || null,
      amountDue: stripeInvoice.amount_due || 0,
      amountPaid: stripeInvoice.amount_paid || 0,
      currency: stripeInvoice.currency || 'usd',
      status: mapInvoiceStatus(stripeInvoice.status),
      dueDate: fromUnix(stripeInvoice.due_date),
      paidAt: fromUnix(stripeInvoice.status_transitions?.paid_at || stripeInvoice.paid_at),
    },
  });
}

export async function upsertPaymentIntentFromStripe(paymentIntent: any) {
  const customerId = stripeId(paymentIntent.customer);
  const account =
    (customerId && (await prisma.businessAccount.findUnique({ where: { stripeCustomerId: customerId } }))) ||
    (await getDefaultBusinessAccount());
  const invoiceId = typeof paymentIntent.invoice === 'string' ? paymentIntent.invoice : null;
  const invoice = invoiceId ? await prisma.businessInvoice.findUnique({ where: { stripeInvoiceId: invoiceId } }) : null;

  return prisma.businessPayment.upsert({
    where: { stripePaymentIntentId: paymentIntent.id },
    create: {
      businessAccountId: account.id,
      businessInvoiceId: invoice?.id || null,
      businessSubscriptionId: invoice?.businessSubscriptionId || null,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount_received || paymentIntent.amount || 0,
      currency: paymentIntent.currency || 'usd',
      status: mapPaymentStatus(paymentIntent.status),
      paidAt: paymentIntent.status === 'succeeded' ? new Date() : null,
      failureMessage: paymentIntent.last_payment_error?.message || null,
    },
    update: {
      businessAccountId: account.id,
      businessInvoiceId: invoice?.id || null,
      businessSubscriptionId: invoice?.businessSubscriptionId || null,
      amount: paymentIntent.amount_received || paymentIntent.amount || 0,
      currency: paymentIntent.currency || 'usd',
      status: mapPaymentStatus(paymentIntent.status),
      paidAt: paymentIntent.status === 'succeeded' ? new Date() : null,
      failureMessage: paymentIntent.last_payment_error?.message || null,
    },
  });
}

export function centsToDollars(cents: number) {
  return cents / 100;
}

export type BusinessBillingOverview = Prisma.BusinessAccountGetPayload<{
  include: {
    subscriptions: true;
    invoices: true;
    payments: true;
  };
}>;
