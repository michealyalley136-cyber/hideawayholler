import {
  BillingFrequency,
  BusinessInvoiceStatus,
  BusinessInvoiceType,
  BusinessPaymentMethod,
  BusinessPaymentStatus,
  BusinessSetupFeeStatus,
  ClientBillingSettings,
  UserRole,
} from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logAuditEvent } from './audit.service';
import {
  addBillingInterval,
  dueDateFromPaymentDay,
  nextInvoiceNumber,
  UNPAID_INVOICE_STATUSES,
} from './billingCalculations.service';
import { APPCREATIVES_PAYEE_NAME, ensureStripeCustomer, getStripe } from './businessBilling.service';

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export async function createManualInvoice(input: {
  accountId: string;
  invoiceType: BusinessInvoiceType;
  amountCents: number;
  dueDate: Date;
  description?: string | null;
  actorId: string;
  actorRole: UserRole;
}) {
  const count = await prisma.businessInvoice.count({ where: { businessAccountId: input.accountId } });
  const invoice = await prisma.businessInvoice.create({
    data: {
      businessAccountId: input.accountId,
      invoiceNumber: nextInvoiceNumber(count),
      invoiceType: input.invoiceType,
      description: input.description || null,
      amountDue: input.amountCents,
      amountPaid: 0,
      status: BusinessInvoiceStatus.PENDING,
      dueDate: input.dueDate,
    },
  });

  await logAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: 'BUSINESS_INVOICE_CREATED',
    entityType: 'BusinessInvoice',
    entityId: invoice.id,
    metadata: { invoiceType: input.invoiceType, amountCents: input.amountCents },
  });

  return invoice;
}

export async function markInvoicePaid(input: {
  invoiceId: string;
  accountId: string;
  actorId: string;
  actorRole: UserRole;
  paymentMethod?: BusinessPaymentMethod;
}) {
  const invoice = await prisma.businessInvoice.findFirst({
    where: { id: input.invoiceId, businessAccountId: input.accountId },
  });
  if (!invoice) throw new Error('Invoice not found');

  const now = new Date();
  const [updatedInvoice, payment] = await prisma.$transaction([
    prisma.businessInvoice.update({
      where: { id: invoice.id },
      data: {
        status: BusinessInvoiceStatus.PAID,
        amountPaid: invoice.amountDue,
        paidAt: now,
      },
    }),
    prisma.businessPayment.create({
      data: {
        businessAccountId: input.accountId,
        businessInvoiceId: invoice.id,
        amount: invoice.amountDue,
        status: BusinessPaymentStatus.SUCCEEDED,
        paymentMethod: input.paymentMethod || BusinessPaymentMethod.MANUAL,
        paidAt: now,
      },
    }),
  ]);

  if (invoice.invoiceType === BusinessInvoiceType.SETUP_FEE) {
    await prisma.$transaction([
      prisma.businessAccount.update({
        where: { id: input.accountId },
        data: { setupFeeStatus: BusinessSetupFeeStatus.PAID, setupFeePaidAt: now },
      }),
      prisma.clientBillingSettings.updateMany({
        where: { clientId: input.accountId },
        data: { setupFeeStatus: BusinessSetupFeeStatus.PAID },
      }),
    ]);
  }

  await logAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: 'BUSINESS_INVOICE_MARKED_PAID',
    entityType: 'BusinessInvoice',
    entityId: invoice.id,
  });

  return { invoice: updatedInvoice, payment };
}

export async function markInvoiceWaived(input: {
  invoiceId: string;
  accountId: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const invoice = await prisma.businessInvoice.findFirst({
    where: { id: input.invoiceId, businessAccountId: input.accountId },
  });
  if (!invoice) throw new Error('Invoice not found');

  const updated = await prisma.businessInvoice.update({
    where: { id: invoice.id },
    data: { status: BusinessInvoiceStatus.WAIVED, amountPaid: invoice.amountDue, paidAt: new Date() },
  });

  if (invoice.invoiceType === BusinessInvoiceType.SETUP_FEE) {
    await prisma.$transaction([
      prisma.businessAccount.update({
        where: { id: input.accountId },
        data: { setupFeeStatus: BusinessSetupFeeStatus.WAIVED },
      }),
      prisma.clientBillingSettings.updateMany({
        where: { clientId: input.accountId },
        data: { setupFeeStatus: BusinessSetupFeeStatus.WAIVED },
      }),
    ]);
  }

  await logAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: 'BUSINESS_INVOICE_WAIVED',
    entityType: 'BusinessInvoice',
    entityId: invoice.id,
  });

  return updated;
}

export async function deleteDraftInvoice(input: {
  invoiceId: string;
  accountId: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const invoice = await prisma.businessInvoice.findFirst({
    where: { id: input.invoiceId, businessAccountId: input.accountId },
  });
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status !== BusinessInvoiceStatus.DRAFT) {
    throw new Error('Only draft invoices can be deleted');
  }

  await prisma.businessInvoice.delete({ where: { id: invoice.id } });
  await logAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: 'BUSINESS_INVOICE_DELETED',
    entityType: 'BusinessInvoice',
    entityId: invoice.id,
  });
}

export async function createStripeCheckoutForInvoice(input: {
  invoiceId: string;
  accountId: string;
  billingEmail?: string | null;
  actorId: string;
  actorRole: UserRole;
}) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  const invoice = await prisma.businessInvoice.findFirst({
    where: { id: input.invoiceId, businessAccountId: input.accountId },
  });
  if (!invoice) throw new Error('Invoice not found');
  if (!UNPAID_INVOICE_STATUSES.includes(invoice.status)) {
    throw new Error('Only unpaid invoices can receive payment links');
  }

  const customerId = await ensureStripeCustomer(input.accountId, input.billingEmail || undefined);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: invoice.currency,
          product_data: {
            name: invoice.description || `${invoice.invoiceType.replace(/_/g, ' ')} invoice`,
            metadata: { businessInvoiceId: invoice.id, payee: APPCREATIVES_PAYEE_NAME },
          },
          unit_amount: Math.max(0, invoice.amountDue - invoice.amountPaid),
        },
        quantity: 1,
      },
    ],
    success_url: `${frontendUrl()}/admin/billing/subscription?invoice=success`,
    cancel_url: `${frontendUrl()}/admin/billing/subscription?invoice=cancelled`,
    metadata: {
      businessAccountId: input.accountId,
      businessInvoiceId: invoice.id,
      payee: APPCREATIVES_PAYEE_NAME,
    },
  });

  const updated = await prisma.businessInvoice.update({
    where: { id: invoice.id },
    data: { stripeCheckoutUrl: session.url },
  });

  await logAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: 'BUSINESS_INVOICE_PAYMENT_LINK_SENT',
    entityType: 'BusinessInvoice',
    entityId: invoice.id,
    metadata: { stripeCheckoutSessionId: session.id },
  });

  return { invoice: updated, checkoutUrl: session.url };
}

export async function generateSetupFeeInvoice(input: {
  accountId: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const account = await prisma.businessAccount.findUnique({
    where: { id: input.accountId },
    include: { billingSettings: true },
  });
  if (!account) throw new Error('Business account not found');

  const settings = account.billingSettings;
  const amount = settings?.setupFeeAmount || account.setupFeeAmount;
  if (amount <= 0) throw new Error('Setup fee amount must be greater than zero');

  const dueDate = dueDateFromPaymentDay(settings?.paymentDueDay || 1);
  const invoice = await createManualInvoice({
    accountId: input.accountId,
    invoiceType: BusinessInvoiceType.SETUP_FEE,
    amountCents: amount,
    dueDate,
    description: 'One-time setup fee',
    actorId: input.actorId,
    actorRole: input.actorRole,
  });

  await prisma.$transaction([
    prisma.businessAccount.update({
      where: { id: input.accountId },
      data: { setupFeeStatus: BusinessSetupFeeStatus.PENDING },
    }),
    prisma.clientBillingSettings.updateMany({
      where: { clientId: input.accountId },
      data: { setupFeeStatus: BusinessSetupFeeStatus.PENDING },
    }),
  ]);

  return invoice;
}

export async function maybeGenerateRecurringInvoice(settings: ClientBillingSettings, accountId: string) {
  if (!settings.billingStartDate || !settings.nextBillingDate || settings.monthlySubscriptionAmount <= 0) {
    return null;
  }

  const now = new Date();
  if (now < settings.nextBillingDate) return null;

  const existing = await prisma.businessInvoice.findFirst({
    where: {
      businessAccountId: accountId,
      invoiceType: BusinessInvoiceType.MONTHLY_SUBSCRIPTION,
      createdAt: { gte: new Date(settings.nextBillingDate.getTime() - 24 * 60 * 60 * 1000) },
      status: { in: [...UNPAID_INVOICE_STATUSES, BusinessInvoiceStatus.PAID] },
    },
  });
  if (existing) return null;

  const dueDate = dueDateFromPaymentDay(settings.paymentDueDay, settings.nextBillingDate);
  const count = await prisma.businessInvoice.count({ where: { businessAccountId: accountId } });
  const invoice = await prisma.businessInvoice.create({
    data: {
      businessAccountId: accountId,
      invoiceNumber: nextInvoiceNumber(count),
      invoiceType: BusinessInvoiceType.MONTHLY_SUBSCRIPTION,
      description: `${settings.billingFrequency.toLowerCase()} subscription charge`,
      amountDue: settings.monthlySubscriptionAmount,
      amountPaid: 0,
      status: BusinessInvoiceStatus.PENDING,
      dueDate,
    },
  });

  const nextBillingDate = addBillingInterval(settings.nextBillingDate, settings.billingFrequency);
  await prisma.clientBillingSettings.update({
    where: { id: settings.id },
    data: { nextBillingDate },
  });

  return invoice;
}

export async function advanceBillingDateAfterPayment(settingsId: string, frequency: BillingFrequency, paidAt = new Date()) {
  const settings = await prisma.clientBillingSettings.findUnique({ where: { id: settingsId } });
  if (!settings) return;

  const nextBillingDate = settings.nextBillingDate && settings.nextBillingDate > paidAt
    ? settings.nextBillingDate
    : addBillingInterval(paidAt, frequency);

  await prisma.clientBillingSettings.update({
    where: { id: settingsId },
    data: { nextBillingDate },
  });
}
