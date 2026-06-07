import { Request, Response } from 'express';
import Stripe from 'stripe';
import {
  ApprovalStatus,
  BusinessInvoiceStatus,
  BusinessPaymentStatus,
  BusinessSetupFeeStatus,
  BusinessSubscriptionStatus,
  LeaseWorkflowStatus,
  MaintenanceStatus,
  ResidentStatus,
  SosAlertStatus,
  UserRole,
} from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/audit.service';
import {
  APPCREATIVES_PAYEE_NAME,
  ensureStripeCustomer,
  getDefaultBusinessAccount,
  getStripe,
  stripeCheckoutIsConfigured,
  stripeIsConfigured,
  upsertInvoiceFromStripe,
  upsertPaymentIntentFromStripe,
  upsertSubscriptionFromStripe,
} from '../services/businessBilling.service';

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function requireBillingSuperAdmin(req: AuthRequest, res: Response) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'AppCreatives super admin access required' });
    return false;
  }

  return true;
}

async function billingAccountWithHistory() {
  const account = await getDefaultBusinessAccount();
  return prisma.businessAccount.findUnique({
    where: { id: account.id },
    include: {
      subscriptions: { orderBy: { updatedAt: 'desc' } },
      invoices: { orderBy: { createdAt: 'desc' }, take: 24 },
      payments: { orderBy: { createdAt: 'desc' }, take: 24 },
    },
  });
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfYear() {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

function averageResponseSeconds(alerts: Array<{ createdAt: Date; adminAcknowledgedAt: Date | null }>) {
  const responded = alerts.filter((alert) => alert.adminAcknowledgedAt);
  if (!responded.length) return null;
  const totalMs = responded.reduce((sum, alert) => sum + (alert.adminAcknowledgedAt!.getTime() - alert.createdAt.getTime()), 0);
  return Math.round(totalMs / responded.length / 1000);
}

function accountHealth(input: {
  subscriptionStatus?: BusinessSubscriptionStatus | null;
  failedPayments: number;
  pendingInvoices: number;
  openEmergencies: number;
  unresolvedMaintenance: number;
  failedNotifications: number;
}) {
  if (input.openEmergencies > 0 || input.subscriptionStatus === BusinessSubscriptionStatus.UNPAID) return 'Critical';
  if (input.subscriptionStatus === BusinessSubscriptionStatus.PAST_DUE || input.failedPayments > 0 || input.failedNotifications > 0) return 'Past Due';
  if (input.pendingInvoices > 0 || input.unresolvedMaintenance > 10) return 'Needs Attention';
  return 'Good';
}

export async function getBusinessBillingOverview(req: AuthRequest, res: Response) {
  const account = await billingAccountWithHistory();
  const activeSubscription = account?.subscriptions[0] || null;

  res.json({
    payee: APPCREATIVES_PAYEE_NAME,
    account,
    activeSubscription,
    invoices: account?.invoices || [],
    payments: account?.payments || [],
    permissions: {
      isBillingSuperAdmin: false,
    },
    stripe: {
      configured: stripeIsConfigured(),
      checkoutReady: stripeCheckoutIsConfigured(),
      priceConfigured: Boolean(process.env.STRIPE_BUSINESS_SUBSCRIPTION_PRICE_ID),
    },
  });
}

export async function listBusinessInvoices(_req: AuthRequest, res: Response) {
  const account = await getDefaultBusinessAccount();
  const invoices = await prisma.businessInvoice.findMany({
    where: { businessAccountId: account.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ invoices });
}

export async function listBusinessPayments(_req: AuthRequest, res: Response) {
  const account = await getDefaultBusinessAccount();
  const payments = await prisma.businessPayment.findMany({
    where: { businessAccountId: account.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ payments });
}

export async function createBusinessCheckoutSession(req: AuthRequest, res: Response) {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_BUSINESS_SUBSCRIPTION_PRICE_ID;
  if (!stripe || !priceId) {
    return res.status(503).json({ error: 'Business subscription Stripe Checkout is not configured' });
  }

  const account = await getDefaultBusinessAccount();
  const customerId = await ensureStripeCustomer(account.id, req.user?.email);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: account.id,
    success_url: `${frontendUrl()}/admin/billing/subscription?checkout=success`,
    cancel_url: `${frontendUrl()}/admin/billing/subscription?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      businessAccountId: account.id,
      payee: APPCREATIVES_PAYEE_NAME,
      createdByAdminId: req.user!.userId,
    },
    subscription_data: {
      metadata: {
        businessAccountId: account.id,
        payee: APPCREATIVES_PAYEE_NAME,
      },
    },
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'BUSINESS_SUBSCRIPTION_CHECKOUT_CREATED',
    entityType: 'BusinessAccount',
    entityId: account.id,
    metadata: { stripeCheckoutSessionId: session.id },
  });

  res.json({ url: session.url });
}

export async function createBusinessBillingPortalSession(req: AuthRequest, res: Response) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' });

  const account = await getDefaultBusinessAccount();
  if (!account.stripeCustomerId) {
    return res.status(400).json({ error: 'Create a subscription checkout session before opening billing portal' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${frontendUrl()}/admin/billing/subscription`,
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'BUSINESS_BILLING_PORTAL_OPENED',
    entityType: 'BusinessAccount',
    entityId: account.id,
  });

  res.json({ url: session.url });
}

export async function getSuperAdminBillingControls(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await billingAccountWithHistory();
  res.json({
    payee: APPCREATIVES_PAYEE_NAME,
    account,
    stripe: {
      configured: stripeIsConfigured(),
      checkoutReady: stripeCheckoutIsConfigured(),
      webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      priceId: process.env.STRIPE_BUSINESS_SUBSCRIPTION_PRICE_ID ? 'configured' : 'missing',
    },
  });
}

export async function getSuperAdminClientDashboard(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  try {
    const account = await billingAccountWithHistory();
    if (!account) return res.status(404).json({ error: 'Client account not found', code: 'CLIENT_ACCOUNT_NOT_FOUND' });

    const activeSubscription = account.subscriptions[0] || null;
    const monthStart = startOfMonth();
    const yearStart = startOfYear();

  const [
    totalPaid,
    paidThisMonth,
    paidThisYear,
    failedPayments,
    pendingInvoices,
    manualPayments,
    totalUsers,
    activeResidents,
    residents,
    alumniUsers,
    adminUsers,
    inactiveUsers,
    recentlyCreatedUsers,
    activeLeases,
    completedLeases,
    activeSosAlerts,
    acknowledgedSosAlerts,
    resolvedSosAlerts,
    totalSosAlerts,
    lastSosAlert,
    responseAlerts,
    lastEmergencyEvent,
    unresolvedMaintenance,
    recentMaintenance,
    pendingCommunityPosts,
    auditLogs,
    recentLoginActivity,
    sosLogs,
    failedNotifications,
    connectedUsers,
  ] = await Promise.all([
    prisma.businessPayment.aggregate({ where: { status: BusinessPaymentStatus.SUCCEEDED }, _sum: { amount: true } }),
    prisma.businessPayment.aggregate({ where: { status: BusinessPaymentStatus.SUCCEEDED, paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.businessPayment.aggregate({ where: { status: BusinessPaymentStatus.SUCCEEDED, paidAt: { gte: yearStart } }, _sum: { amount: true } }),
    prisma.businessPayment.count({ where: { status: BusinessPaymentStatus.FAILED } }),
    prisma.businessInvoice.count({ where: { status: { in: [BusinessInvoiceStatus.OPEN, BusinessInvoiceStatus.DRAFT] } } }),
    prisma.businessPayment.count({ where: { status: BusinessPaymentStatus.SUCCEEDED, stripePaymentIntentId: null } }),
    prisma.user.count(),
    prisma.residentProfile.count({ where: { currentStatus: ResidentStatus.ACTIVE_RESIDENT } }),
    prisma.user.count({ where: { role: UserRole.RESIDENT } }),
    prisma.user.count({ where: { role: UserRole.ALUMNI } }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.residentProfile.count({ where: { currentStatus: { in: [ResidentStatus.CHECKED_OUT, ResidentStatus.ALUMNI] } } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, email: true, role: true, createdAt: true, profile: { select: { fullName: true, currentStatus: true } } },
    }),
    prisma.lease.count({ where: { status: { in: [LeaseWorkflowStatus.ASSIGNED, LeaseWorkflowStatus.PENDING_SIGNATURE, LeaseWorkflowStatus.SIGNED_BY_RESIDENT, LeaseWorkflowStatus.APPROVED_BY_ADMIN] } } }),
    prisma.lease.count({ where: { status: LeaseWorkflowStatus.COMPLETED } }),
    prisma.sosAlert.count({ where: { status: { in: [SosAlertStatus.ACTIVE, SosAlertStatus.ACKNOWLEDGED, SosAlertStatus.NEEDS_HELP] } } }),
    prisma.sosAlert.count({ where: { status: SosAlertStatus.ACKNOWLEDGED } }),
    prisma.sosAlert.count({ where: { status: SosAlertStatus.RESOLVED } }),
    prisma.sosAlert.count(),
    prisma.sosAlert.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.sosAlert.findMany({
      where: { adminAcknowledgedAt: { not: null } },
      select: { createdAt: true, adminAcknowledgedAt: true },
      take: 100,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sosEventLog.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.maintenanceRequest.count({ where: { status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS] } } }),
    prisma.maintenanceRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { include: { profile: true } } },
    }),
    prisma.communityPost.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { actor: { include: { profile: true } } },
    }),
    prisma.auditLog.findMany({
      where: { action: 'USER_LOGIN' },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { actor: { include: { profile: true } } },
    }),
    prisma.sosAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { eventLogs: { orderBy: { createdAt: 'desc' }, take: 3 } },
    }),
    prisma.emergencyNotificationLog.count({ where: { status: 'FAILED' } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, email: true, role: true, createdAt: true, profile: { select: { fullName: true, currentStatus: true } } },
    }),
  ]);

  const totalPaidAmount = totalPaid._sum.amount || 0;
  const paidThisMonthAmount = paidThisMonth._sum.amount || 0;
  const paidThisYearAmount = paidThisYear._sum.amount || 0;
  const mrr = activeSubscription?.status === BusinessSubscriptionStatus.ACTIVE
    ? account.invoices.find((invoice) => invoice.status === BusinessInvoiceStatus.PAID)?.amountPaid || paidThisMonthAmount
    : 0;
  const openInvoiceBalance = account.invoices
    .filter((invoice) => invoice.status === BusinessInvoiceStatus.OPEN || invoice.status === BusinessInvoiceStatus.DRAFT)
    .reduce((sum, invoice) => sum + Math.max(0, invoice.amountDue - invoice.amountPaid), 0);
  const setupFeeBalance = account.setupFeeStatus === BusinessSetupFeeStatus.PENDING ? account.setupFeeAmount : 0;
  const outstandingBalance = openInvoiceBalance + setupFeeBalance;
  const health = accountHealth({
    subscriptionStatus: activeSubscription?.status,
    failedPayments,
    pendingInvoices,
    openEmergencies: activeSosAlerts,
    unresolvedMaintenance,
    failedNotifications,
  });

    return res.json({
    client: {
      id: account.id,
      slug: 'hideaway-holler',
      name: account.businessName,
      billingEmail: account.billingEmail,
      stripeCustomerId: account.stripeCustomerId,
      payee: APPCREATIVES_PAYEE_NAME,
    },
    dashboardCards: {
      totalPaymentsReceived: totalPaidAmount,
      monthlyRecurringRevenue: mrr,
      setupFeePaymentStatus: account.setupFeeStatus,
      setupFeeAmount: account.setupFeeAmount,
      outstandingBalance,
      nextBillingDate: activeSubscription?.currentPeriodEnd,
      subscriptionStatus: activeSubscription?.status || 'INCOMPLETE',
      activeUsersConnected: totalUsers,
      residents,
      admins: adminUsers,
      activeLeases,
      completedLeases,
      openSosEmergencies: activeSosAlerts,
      resolvedSosEmergencies: resolvedSosAlerts,
      totalSosAlerts,
      lastSosAlertDate: lastSosAlert?.createdAt || null,
      unresolvedMaintenanceRequests: unresolvedMaintenance,
      pendingCommunityPosts,
      recentLoginActivity: recentLoginActivity.length,
      accountHealthStatus: health,
    },
    subscription: activeSubscription,
    paymentSummary: {
      totalPaidToAppCreatives: totalPaidAmount,
      paymentsThisMonth: paidThisMonthAmount,
      paymentsThisYear: paidThisYearAmount,
      failedPayments,
      pendingInvoices,
      manualPaymentsRecorded: manualPayments,
      stripePaymentReferences: account.payments
        .filter((payment) => payment.stripePaymentIntentId || payment.stripeChargeId)
        .map((payment) => ({
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          stripePaymentIntentId: payment.stripePaymentIntentId,
          stripeChargeId: payment.stripeChargeId,
          paidAt: payment.paidAt,
        })),
    },
    userSummary: {
      totalUsers,
      activeResidents,
      alumniUsers,
      adminUsers,
      inactiveUsers,
      recentlyCreatedUsers,
      connectedUsers,
    },
    sosSummary: {
      totalSosAlerts,
      activeSosAlerts,
      acknowledgedSosAlerts,
      resolvedSosAlerts,
      averageResponseSeconds: averageResponseSeconds(responseAlerts),
      lastEmergencyEvent,
      emergencyAuditTrail: sosLogs,
    },
    accountHealth: {
      status: health,
      factors: {
        subscriptionStatus: activeSubscription?.status || 'INCOMPLETE',
        failedPayments,
        openEmergencies: activeSosAlerts,
        unresolvedMaintenance,
        failedNotifications,
        recentSystemErrors: 0,
      },
    },
    invoices: account.invoices,
    payments: account.payments,
    maintenanceActivity: recentMaintenance,
    leaseActivity: {
      activeLeases,
      completedLeases,
    },
    auditLogs,
    stripe: {
      configured: stripeIsConfigured(),
      checkoutReady: stripeCheckoutIsConfigured(),
      webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      priceId: process.env.STRIPE_BUSINESS_SUBSCRIPTION_PRICE_ID ? 'configured' : 'missing',
    },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[business-billing] Super admin client dashboard failed', {
      userId: req.user?.userId,
      errorName: err instanceof Error ? err.name : 'UnknownError',
      errorMessage: message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err instanceof Error ? err.stack : undefined,
    });

    return res.status(500).json({
      error: 'Unable to load the Hideaway Holler client dashboard right now.',
      code: 'SUPER_ADMIN_CLIENT_DASHBOARD_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : message,
    });
  }
}

export async function updateSuperAdminBusinessAccount(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const businessName = typeof req.body.businessName === 'string' ? req.body.businessName.trim() : '';
  const billingEmail = typeof req.body.billingEmail === 'string' ? req.body.billingEmail.trim() : '';
  const setupFeeAmount = Number(req.body.setupFeeAmount);
  const setupFeeStatus = typeof req.body.setupFeeStatus === 'string' ? req.body.setupFeeStatus : '';

  if (!businessName) return res.status(400).json({ error: 'Business name is required' });
  if (!Number.isFinite(setupFeeAmount) || setupFeeAmount < 0) return res.status(400).json({ error: 'Setup fee amount must be a valid non-negative number' });
  if (setupFeeStatus && !Object.values(BusinessSetupFeeStatus).includes(setupFeeStatus as BusinessSetupFeeStatus)) {
    return res.status(400).json({ error: 'Invalid setup fee status' });
  }

  const updated = await prisma.businessAccount.update({
    where: { id: account.id },
    data: {
      businessName,
      billingEmail: billingEmail || null,
      setupFeeAmount: Math.round(setupFeeAmount),
      ...(setupFeeStatus && {
        setupFeeStatus: setupFeeStatus as BusinessSetupFeeStatus,
        setupFeePaidAt: setupFeeStatus === BusinessSetupFeeStatus.PAID ? account.setupFeePaidAt || new Date() : null,
      }),
    },
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'BUSINESS_BILLING_ACCOUNT_UPDATED',
    entityType: 'BusinessAccount',
    entityId: account.id,
    metadata: { businessName, billingEmailConfigured: Boolean(billingEmail), setupFeeAmount: Math.round(setupFeeAmount), setupFeeStatus },
  });

  res.json({ account: updated });
}

export async function syncBusinessBillingFromStripe(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' });

  const account = await getDefaultBusinessAccount();
  if (!account.stripeCustomerId) {
    return res.status(400).json({ error: 'No Stripe customer is linked to the business account yet' });
  }

  const [subscriptions, invoices, paymentIntents] = await Promise.all([
    stripe.subscriptions.list({ customer: account.stripeCustomerId, limit: 10 }),
    stripe.invoices.list({ customer: account.stripeCustomerId, limit: 24 }),
    stripe.paymentIntents.list({ customer: account.stripeCustomerId, limit: 24 }),
  ]);

  for (const subscription of subscriptions.data) {
    await upsertSubscriptionFromStripe(subscription);
  }
  for (const invoice of invoices.data) {
    await upsertInvoiceFromStripe(invoice);
  }
  for (const paymentIntent of paymentIntents.data) {
    await upsertPaymentIntentFromStripe(paymentIntent);
  }

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'BUSINESS_BILLING_STRIPE_SYNCED',
    entityType: 'BusinessAccount',
    entityId: account.id,
    metadata: {
      subscriptions: subscriptions.data.length,
      invoices: invoices.data.length,
      payments: paymentIntents.data.length,
    },
  });

  res.json({ ok: true });
}

async function handleCheckoutSessionCompleted(session: any) {
  const accountId = session.client_reference_id || session.metadata?.businessAccountId;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (accountId && customerId) {
    await prisma.businessAccount.update({
      where: { id: accountId },
      data: { stripeCustomerId: customerId },
    });
  }

  if (typeof session.subscription === 'string') {
    const stripe = getStripe();
    if (stripe) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await upsertSubscriptionFromStripe(subscription);
    }
  }
}

export async function stripeBusinessBillingWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return res.status(503).json({ error: 'Stripe webhook is not configured' });

  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) return res.status(400).json({ error: 'Missing Stripe signature' });

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid webhook signature';
    console.error('[business-billing] Stripe webhook signature failed', { message });
    return res.status(400).json({ error: 'Invalid Stripe webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await upsertSubscriptionFromStripe(event.data.object);
        break;
      case 'invoice.created':
      case 'invoice.finalized':
      case 'invoice.updated':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await upsertInvoiceFromStripe(event.data.object);
        break;
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await upsertPaymentIntentFromStripe(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    console.error('[business-billing] Stripe webhook processing failed', { eventType: event.type, message });
    return res.status(500).json({ error: 'Stripe webhook processing failed' });
  }

  res.json({ received: true });
}
