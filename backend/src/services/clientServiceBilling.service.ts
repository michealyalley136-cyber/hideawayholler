import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

const INVOICE_STATUS_UNPAID = 'unpaid';
const INVOICE_STATUS_PAID = 'paid';
const INVOICE_STATUS_PARTIAL = 'partial';
const INVOICE_STATUS_PAST_DUE = 'past_due';
const ACTIVE_STATUSES = ['active', 'past_due'];

function toMoney(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function dayClampedDate(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(day, 1), lastDay));
}

function isPastDueDate(dueDate: Date, now = new Date()) {
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today;
}

function invoiceNumber(monthNumber: number) {
  return `SVC-${new Date().getFullYear()}-${String(monthNumber).padStart(4, '0')}`;
}

export function getMonthlyServiceFee(monthNumber: number, introMonthlyFee = 149, introDurationMonths = 6, standardMonthlyFee = 99) {
  if (monthNumber <= introDurationMonths) return introMonthlyFee;
  return standardMonthlyFee;
}

export async function ensureServiceSubscription(businessId: string) {
  const existing = await prisma.clientServiceSubscription.findUnique({ where: { businessId } });
  if (existing) return existing;

  return prisma.clientServiceSubscription.create({
    data: {
      businessId,
      serviceSubscriptionStatus: 'not_started',
      billingDay: 1,
      introMonthlyFee: toMoney(149),
      introDurationMonths: 6,
      standardMonthlyFee: toMoney(99),
      taxRate: toMoney(0),
    },
  });
}

export async function startServiceSubscription(businessId: string, startDate = new Date()) {
  const billingDay = startDate.getDate();
  await ensureServiceSubscription(businessId);

  const subscription = await prisma.clientServiceSubscription.update({
    where: { businessId },
    data: {
      serviceSubscriptionStatus: 'active',
      subscriptionStartDate: startDate,
      firstPaymentDate: startDate,
      billingDay,
      nextPaymentDate: addMonths(startDate, 1),
    },
  });

  await generateMissingServiceInvoices(businessId, startDate);
  return prisma.clientServiceSubscription.findUniqueOrThrow({ where: { id: subscription.id } });
}

export async function updateServiceSubscriptionSettings(input: {
  businessId: string;
  taxRate?: number;
  subscriptionStartDate?: string | null;
  billingDay?: number;
  serviceSubscriptionStatus?: string;
}) {
  const subscription = await ensureServiceSubscription(input.businessId);
  const startDate = input.subscriptionStartDate ? new Date(input.subscriptionStartDate) : subscription.subscriptionStartDate;
  const billingDay = input.billingDay ?? subscription.billingDay;

  const updated = await prisma.clientServiceSubscription.update({
    where: { businessId: input.businessId },
    data: {
      ...(input.taxRate !== undefined ? { taxRate: toMoney(input.taxRate) } : {}),
      ...(input.serviceSubscriptionStatus ? { serviceSubscriptionStatus: input.serviceSubscriptionStatus } : {}),
      subscriptionStartDate: startDate,
      firstPaymentDate: startDate || subscription.firstPaymentDate,
      billingDay,
      nextPaymentDate: startDate && !subscription.nextPaymentDate ? addMonths(startDate, 1) : subscription.nextPaymentDate,
    },
  });

  if (updated.serviceSubscriptionStatus === 'active' && updated.subscriptionStartDate) {
    await generateMissingServiceInvoices(input.businessId);
  }

  return prisma.clientServiceSubscription.findUniqueOrThrow({ where: { businessId: input.businessId } });
}

export function calculateServiceInvoiceAmounts(input: {
  monthNumber: number;
  introMonthlyFee: Prisma.Decimal;
  introDurationMonths: number;
  standardMonthlyFee: Prisma.Decimal;
  taxRate: Prisma.Decimal;
}) {
  const monthlyFee = input.monthNumber <= input.introDurationMonths ? input.introMonthlyFee : input.standardMonthlyFee;
  const taxAmount = monthlyFee.mul(input.taxRate).div(100).toDecimalPlaces(2);
  const totalDue = monthlyFee.plus(taxAmount).toDecimalPlaces(2);
  return {
    subtotal: monthlyFee.toDecimalPlaces(2),
    taxAmount,
    totalDue,
  };
}

export async function generateMissingServiceInvoices(businessId: string, now = new Date()) {
  const subscription = await ensureServiceSubscription(businessId);
  if (!ACTIVE_STATUSES.includes(subscription.serviceSubscriptionStatus) || !subscription.subscriptionStartDate) return [];

  const generated = [];
  const start = subscription.firstPaymentDate || subscription.subscriptionStartDate;
  let monthNumber = 1;
  let periodStart = new Date(start);

  while (periodStart <= now) {
    const existing = await prisma.clientServiceInvoice.findFirst({
      where: { businessId, monthNumber },
    });

    if (!existing) {
      const periodEnd = addMonths(periodStart, 1);
      const dueDate = dayClampedDate(periodStart.getFullYear(), periodStart.getMonth(), subscription.billingDay);
      const amounts = calculateServiceInvoiceAmounts({
        monthNumber,
        introMonthlyFee: subscription.introMonthlyFee,
        introDurationMonths: subscription.introDurationMonths,
        standardMonthlyFee: subscription.standardMonthlyFee,
        taxRate: subscription.taxRate,
      });

      generated.push(await prisma.clientServiceInvoice.create({
        data: {
          businessId,
          invoiceNumber: invoiceNumber(monthNumber),
          monthNumber,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          dueDate,
          subtotal: amounts.subtotal,
          taxRate: subscription.taxRate,
          taxAmount: amounts.taxAmount,
          totalDue: amounts.totalDue,
          amountPaid: toMoney(0),
          balanceDue: amounts.totalDue,
          status: isPastDueDate(dueDate, now) ? INVOICE_STATUS_PAST_DUE : INVOICE_STATUS_UNPAID,
        },
      }));
    } else if (existing.balanceDue.gt(0) && isPastDueDate(existing.dueDate, now) && existing.status === INVOICE_STATUS_UNPAID) {
      await prisma.clientServiceInvoice.update({
        where: { id: existing.id },
        data: { status: INVOICE_STATUS_PAST_DUE },
      });
    }

    monthNumber += 1;
    periodStart = addMonths(start, monthNumber - 1);
  }

  const nextPaymentDate = dayClampedDate(periodStart.getFullYear(), periodStart.getMonth(), subscription.billingDay);
  await prisma.clientServiceSubscription.update({
    where: { businessId },
    data: {
      nextPaymentDate,
      serviceSubscriptionStatus: await hasPastDueInvoices(businessId) ? INVOICE_STATUS_PAST_DUE : subscription.serviceSubscriptionStatus,
    },
  });

  return generated;
}

async function hasPastDueInvoices(businessId: string) {
  const count = await prisma.clientServiceInvoice.count({
    where: { businessId, status: INVOICE_STATUS_PAST_DUE, balanceDue: { gt: toMoney(0) } },
  });
  return count > 0;
}

export async function recordManualServicePayment(input: {
  businessId: string;
  invoiceId?: string | null;
  amount: number;
  paymentMethod: string;
  notes?: string | null;
}) {
  const amount = toMoney(input.amount);
  if (amount.lte(0)) throw new Error('Payment amount must be greater than zero');

  const invoice = input.invoiceId
    ? await prisma.clientServiceInvoice.findFirst({ where: { id: input.invoiceId, businessId: input.businessId } })
    : await prisma.clientServiceInvoice.findFirst({
        where: { businessId: input.businessId, balanceDue: { gt: toMoney(0) }, status: { not: INVOICE_STATUS_PAID } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      });

  if (!invoice) throw new Error('No unpaid service invoice found');

  const nextPaid = invoice.amountPaid.plus(amount).toDecimalPlaces(2);
  const calculatedBalance = invoice.totalDue.minus(nextPaid);
  const nextBalance = (calculatedBalance.lt(0) ? toMoney(0) : calculatedBalance).toDecimalPlaces(2);
  const nextStatus = nextBalance.eq(0) ? INVOICE_STATUS_PAID : INVOICE_STATUS_PARTIAL;
  const paidAt = new Date();

  const [payment, updatedInvoice] = await prisma.$transaction([
    prisma.clientPayment.create({
      data: {
        businessId: input.businessId,
        invoiceId: invoice.id,
        amount,
        paymentDate: paidAt,
        paymentMethod: input.paymentMethod || 'manual',
        paymentProvider: input.paymentMethod === 'manual' ? null : input.paymentMethod,
        notes: input.notes || null,
      },
    }),
    prisma.clientServiceInvoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: nextPaid,
        balanceDue: nextBalance,
        status: nextStatus,
      },
    }),
  ]);

  await prisma.clientServiceSubscription.updateMany({
    where: { businessId: input.businessId },
    data: {
      lastPaymentDate: paidAt,
      serviceSubscriptionStatus: await hasPastDueInvoices(input.businessId) ? INVOICE_STATUS_PAST_DUE : 'active',
    },
  });

  return { payment, invoice: updatedInvoice };
}

export async function getServiceBillingSummary(businessId: string) {
  const subscription = await ensureServiceSubscription(businessId);
  await generateMissingServiceInvoices(businessId);

  const [freshSubscription, invoices, payments] = await Promise.all([
    prisma.clientServiceSubscription.findUniqueOrThrow({ where: { businessId } }),
    prisma.clientServiceInvoice.findMany({ where: { businessId }, orderBy: [{ monthNumber: 'desc' }] }),
    prisma.clientPayment.findMany({ where: { businessId }, orderBy: [{ paymentDate: 'desc' }] }),
  ]);

  const latestInvoice = invoices[0] || null;
  const currentMonthNumber = latestInvoice?.monthNumber || 1;
  const currentMonthlyFee = getMonthlyServiceFee(
    currentMonthNumber,
    Number(freshSubscription.introMonthlyFee),
    freshSubscription.introDurationMonths,
    Number(freshSubscription.standardMonthlyFee),
  );
  const taxAmount = toMoney(currentMonthlyFee).mul(freshSubscription.taxRate).div(100).toDecimalPlaces(2);
  const currentAmountDue = toMoney(currentMonthlyFee).plus(taxAmount).toDecimalPlaces(2);
  const outstandingBalance = invoices.reduce((sum, invoice) => sum.plus(invoice.status === INVOICE_STATUS_PAID ? 0 : invoice.balanceDue), toMoney(0));
  const totalPaymentsReceived = payments.reduce((sum, payment) => sum.plus(payment.amount), toMoney(0));

  return {
    subscription: freshSubscription,
    currentPlan: currentMonthNumber <= freshSubscription.introDurationMonths ? 'Intro Service Plan' : 'Standard Service Plan',
    currentMonthlyFee,
    currentAmountDue: Number(currentAmountDue),
    currentTaxAmount: Number(taxAmount),
    outstandingBalance: Number(outstandingBalance),
    totalPaymentsReceived: Number(totalPaymentsReceived),
    totalInvoicesGenerated: invoices.length,
    paidInvoices: invoices.filter((invoice) => invoice.status === INVOICE_STATUS_PAID).length,
    unpaidInvoices: invoices.filter((invoice) => invoice.status === INVOICE_STATUS_UNPAID || invoice.status === INVOICE_STATUS_PARTIAL).length,
    pastDueInvoices: invoices.filter((invoice) => invoice.status === INVOICE_STATUS_PAST_DUE).length,
    invoices,
    payments,
  };
}
