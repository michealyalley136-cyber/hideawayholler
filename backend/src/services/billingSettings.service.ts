import {
  BillingFrequency,
  BusinessSetupFeeStatus,
  ClientBillingSettings,
  ClientSubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../utils/prisma';
import { addBillingInterval, dueDateFromPaymentDay } from './billingCalculations.service';

export async function ensureClientBillingSettings(accountId: string) {
  const account = await prisma.businessAccount.findUnique({
    where: { id: accountId },
    include: { billingSettings: true, subscriptions: { orderBy: { updatedAt: 'desc' }, take: 1 } },
  });
  if (!account) throw new Error('Business account not found');

  if (account.billingSettings) return { account, settings: account.billingSettings };

  const activeSubscription = account.subscriptions[0] || null;
  const settings = await prisma.clientBillingSettings.create({
    data: {
      clientId: account.id,
      setupFeeAmount: account.setupFeeAmount,
      setupFeeStatus: account.setupFeeStatus,
      monthlySubscriptionAmount: 0,
      billingFrequency: BillingFrequency.MONTHLY,
      billingStartDate: null,
      nextBillingDate: activeSubscription?.currentPeriodEnd || null,
      paymentDueDay: 1,
      gracePeriodDays: 7,
      subscriptionStatus: ClientSubscriptionStatus.INCOMPLETE,
      stripeCustomerId: account.stripeCustomerId,
      stripeSubscriptionId: activeSubscription?.stripeSubscriptionId || null,
      notes: null,
    },
  });

  return { account, settings };
}

export async function saveClientBillingSettings(
  accountId: string,
  input: {
    businessName?: string;
    billingEmail?: string | null;
    setupFeeAmount: number;
    setupFeeStatus?: BusinessSetupFeeStatus;
    monthlySubscriptionAmount: number;
    billingFrequency: BillingFrequency;
    billingStartDate?: string | null;
    nextBillingDate?: string | null;
    paymentDueDay: number;
    gracePeriodDays: number;
    subscriptionStatus?: ClientSubscriptionStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    notes?: string | null;
  },
) {
  const { account, settings } = await ensureClientBillingSettings(accountId);

  const billingStartDate = input.billingStartDate ? new Date(input.billingStartDate) : settings.billingStartDate;
  let nextBillingDate = input.nextBillingDate ? new Date(input.nextBillingDate) : settings.nextBillingDate;
  if (!nextBillingDate && billingStartDate) {
    nextBillingDate = addBillingInterval(billingStartDate, input.billingFrequency);
  }
  const setupFeeStatus = input.setupFeeStatus || settings.setupFeeStatus || account.setupFeeStatus;
  const subscriptionStatus =
    input.subscriptionStatus ||
    (account.isSuspended ? ClientSubscriptionStatus.SUSPENDED : settings.subscriptionStatus || ClientSubscriptionStatus.INCOMPLETE);

  const [updatedAccount, updatedSettings] = await prisma.$transaction([
    prisma.businessAccount.update({
      where: { id: account.id },
      data: {
        ...(input.businessName ? { businessName: input.businessName } : {}),
        billingEmail: input.billingEmail ?? account.billingEmail,
        setupFeeAmount: input.setupFeeAmount,
        setupFeeStatus,
        stripeCustomerId: input.stripeCustomerId ?? account.stripeCustomerId,
      },
    }),
    prisma.clientBillingSettings.update({
      where: { id: settings.id },
      data: {
        setupFeeAmount: input.setupFeeAmount,
        setupFeeStatus,
        monthlySubscriptionAmount: input.monthlySubscriptionAmount,
        billingFrequency: input.billingFrequency,
        billingStartDate,
        nextBillingDate,
        paymentDueDay: input.paymentDueDay,
        gracePeriodDays: input.gracePeriodDays,
        subscriptionStatus,
        stripeCustomerId: input.stripeCustomerId ?? settings.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId ?? settings.stripeSubscriptionId,
        notes: input.notes ?? null,
      },
    }),
    prisma.businessPlan.upsert({
      where: { clientId: account.id },
      create: {
        clientId: account.id,
        planName: 'HollerHub Standard',
        monthlySubscriptionAmount: input.monthlySubscriptionAmount,
        setupFeeAmount: input.setupFeeAmount,
        billingFrequency: input.billingFrequency,
      },
      update: {
        monthlySubscriptionAmount: input.monthlySubscriptionAmount,
        setupFeeAmount: input.setupFeeAmount,
        billingFrequency: input.billingFrequency,
      },
    }),
  ]);

  return { account: updatedAccount, settings: updatedSettings };
}

export function billingSettingsPayload(settings: ClientBillingSettings) {
  return {
    ...settings,
    setupFeeAmountDollars: settings.setupFeeAmount / 100,
    monthlySubscriptionAmountDollars: settings.monthlySubscriptionAmount / 100,
  };
}

export type BillingSettingsInput = Prisma.ClientBillingSettingsUpdateInput;
