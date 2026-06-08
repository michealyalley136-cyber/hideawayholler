import { Response } from 'express';
import {
  BillingFrequency,
  BusinessInvoiceStatus,
  BusinessInvoiceType,
  BusinessPaymentMethod,
  BusinessPaymentStatus,
  BusinessSetupFeeStatus,
  ClientSubscriptionStatus,
  ApprovalStatus,
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
  calculateMrr,
  calculateOutstandingBalance,
  deriveSetupFeeStatus,
  deriveSubscriptionStatus,
  dollarsToCents,
  evaluateAccountHealth,
  isInvoiceOverdue,
  UNPAID_INVOICE_STATUSES,
} from '../services/billingCalculations.service';
import {
  createManualInvoice,
  createStripeCheckoutForInvoice,
  deleteDraftInvoice,
  generateSetupFeeInvoice,
  markInvoicePaid,
  markInvoiceWaived,
  maybeGenerateRecurringInvoice,
} from '../services/billingInvoices.service';
import { billingSettingsPayload, ensureClientBillingSettings, saveClientBillingSettings } from '../services/billingSettings.service';
import {
  generateMissingServiceInvoices,
  getServiceBillingSummary,
  recordManualServicePayment,
  startServiceSubscription,
  updateServiceSubscriptionSettings,
} from '../services/clientServiceBilling.service';
import {
  APPCREATIVES_PAYEE_NAME,
  getDefaultBusinessAccount,
  getStripe,
  stripeCheckoutIsConfigured,
  stripeIsConfigured,
  upsertInvoiceFromStripe,
  upsertPaymentIntentFromStripe,
  upsertSubscriptionFromStripe,
} from '../services/businessBilling.service';

function requireBillingSuperAdmin(req: AuthRequest, res: Response) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'AppCreatives super admin access required' });
    return false;
  }
  return true;
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

async function loadClientDashboardData(accountId: string) {
  const { account, settings } = await ensureClientBillingSettings(accountId);

  if (settings) {
    await maybeGenerateRecurringInvoice(settings, account.id);
  }

  const refreshedSettings = await prisma.clientBillingSettings.findUnique({ where: { clientId: accountId } });
  const allInvoices = await prisma.businessInvoice.findMany({
    where: { businessAccountId: accountId },
    orderBy: { createdAt: 'desc' },
  });

  const gracePeriodDays = refreshedSettings?.gracePeriodDays || 7;
  for (const invoice of allInvoices) {
    if (UNPAID_INVOICE_STATUSES.includes(invoice.status) && isInvoiceOverdue(invoice, gracePeriodDays)) {
      await prisma.businessInvoice.update({
        where: { id: invoice.id },
        data: { status: BusinessInvoiceStatus.OVERDUE },
      });
      invoice.status = BusinessInvoiceStatus.OVERDUE;
    }
  }

  const accountWithHistory = await prisma.businessAccount.findUnique({
    where: { id: accountId },
    include: {
      subscriptions: { orderBy: { updatedAt: 'desc' } },
      invoices: { orderBy: { createdAt: 'desc' } },
      payments: { orderBy: { createdAt: 'desc' } },
      billingSettings: true,
      businessPlan: true,
    },
  });

  return { account: accountWithHistory!, settings: refreshedSettings, allInvoices };
}

export async function getSuperAdminClientDashboard(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  try {
    const baseAccount = await getDefaultBusinessAccount();
    const { account, settings, allInvoices } = await loadClientDashboardData(baseAccount.id);
    const serviceBilling = await getServiceBillingSummary(account.id);
    const activeSubscription = account.subscriptions[0] || null;
    const monthStart = startOfMonth();
    const yearStart = startOfYear();
    const gracePeriodDays = settings?.gracePeriodDays || 7;
    const unpaidInvoices = allInvoices.filter((invoice) => UNPAID_INVOICE_STATUSES.includes(invoice.status));
    const overdueInvoices = unpaidInvoices.filter((invoice) => isInvoiceOverdue(invoice, gracePeriodDays));

    const [
      totalPaid,
      paidThisMonth,
      paidThisYear,
      failedPayments,
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
      pendingLeases,
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
      prisma.businessPayment.aggregate({ where: { businessAccountId: account.id, status: BusinessPaymentStatus.SUCCEEDED }, _sum: { amount: true } }),
      prisma.businessPayment.aggregate({ where: { businessAccountId: account.id, status: BusinessPaymentStatus.SUCCEEDED, paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.businessPayment.aggregate({ where: { businessAccountId: account.id, status: BusinessPaymentStatus.SUCCEEDED, paidAt: { gte: yearStart } }, _sum: { amount: true } }),
      prisma.businessPayment.count({ where: { businessAccountId: account.id, status: BusinessPaymentStatus.FAILED } }),
      prisma.businessPayment.count({ where: { businessAccountId: account.id, status: BusinessPaymentStatus.SUCCEEDED, paymentMethod: BusinessPaymentMethod.MANUAL } }),
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
      prisma.lease.count({ where: { status: { in: [LeaseWorkflowStatus.ASSIGNED, LeaseWorkflowStatus.PENDING_SIGNATURE, LeaseWorkflowStatus.SIGNED_BY_RESIDENT] } } }),
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

    const hasBillingConfig = Boolean(settings && (settings.monthlySubscriptionAmount > 0 || settings.setupFeeAmount > 0 || settings.billingStartDate));
    const subscriptionStatus = deriveSubscriptionStatus({
      settings,
      accountSuspended: account.isSuspended,
      stripeStatus: activeSubscription?.status,
      unpaidInvoices,
      gracePeriodDays,
      hasBillingConfig,
    });
    const setupFeeStatus = deriveSetupFeeStatus({
      savedStatus: settings?.setupFeeStatus || account.setupFeeStatus,
      setupFeeInvoices: allInvoices,
    });
    const outstandingBalance = calculateOutstandingBalance(allInvoices);
    const mrr = calculateMrr(settings, subscriptionStatus);
    const healthResult = evaluateAccountHealth({
      subscriptionStatus,
      unpaidInvoices,
      overdueInvoices,
      failedPayments,
      openEmergencies: activeSosAlerts,
      unresolvedMaintenance,
      pendingLeases,
      failedNotifications,
      accountSuspended: account.isSuspended,
      gracePeriodDays,
    });

    const lastHealthLog = await prisma.clientAccountHealthLog.findFirst({
      where: { clientId: account.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastHealthLog || lastHealthLog.status !== healthResult.status || lastHealthLog.reasons.join('|') !== healthResult.reasons.join('|')) {
      await prisma.clientAccountHealthLog.create({
        data: {
          clientId: account.id,
          status: healthResult.status,
          reasons: healthResult.reasons,
        },
      });
    }

    const pendingInvoices = unpaidInvoices.length;
    const totalPaidAmount = totalPaid._sum.amount || 0;
    const paidThisMonthAmount = paidThisMonth._sum.amount || 0;
    const paidThisYearAmount = paidThisYear._sum.amount || 0;

    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      client: {
        id: account.id,
        slug: account.slug,
        name: account.businessName,
        billingEmail: account.billingEmail,
        stripeCustomerId: account.stripeCustomerId,
        isSuspended: account.isSuspended,
        payee: APPCREATIVES_PAYEE_NAME,
      },
      billingSettings: settings ? billingSettingsPayload(settings) : null,
      billingConfigured: hasBillingConfig,
      dashboardCards: {
        totalPaymentsReceived: totalPaidAmount,
        monthlyRecurringRevenue: mrr,
        setupFeePaymentStatus: setupFeeStatus,
        setupFeeAmount: settings?.setupFeeAmount || account.setupFeeAmount,
        outstandingBalance,
        nextBillingDate: settings?.nextBillingDate || activeSubscription?.currentPeriodEnd || null,
        subscriptionStatus,
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
        accountHealthStatus: healthResult.status,
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
        status: healthResult.status,
        reasons: healthResult.reasons,
        factors: {
          subscriptionStatus,
          failedPayments,
          openEmergencies: activeSosAlerts,
          unresolvedMaintenance,
          failedNotifications,
          pendingInvoices,
          overdueInvoices: overdueInvoices.length,
          pendingLeases,
        },
      },
      invoices: account.invoices,
      payments: account.payments,
      serviceBilling,
      maintenanceActivity: recentMaintenance,
      leaseActivity: { activeLeases, completedLeases, pendingLeases },
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
    console.error('[business-billing] Super admin client dashboard failed', { message });
    return res.status(500).json({
      error: 'Unable to load the Hideaway Holler client dashboard right now.',
      code: 'SUPER_ADMIN_CLIENT_DASHBOARD_FAILED',
      details: process.env.NODE_ENV === 'production' ? undefined : message,
    });
  }
}

export async function saveSuperAdminBillingSettings(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const { settings: existingSettings } = await ensureClientBillingSettings(account.id);
  const body = req.body || {};

  const setupFeeAmount = dollarsToCents(Number(body.setupFeeAmount));
  const monthlySubscriptionAmount = dollarsToCents(Number(body.monthlySubscriptionAmount));
  if (!Number.isFinite(setupFeeAmount) || setupFeeAmount < 0) return res.status(400).json({ error: 'Setup fee amount must be a valid non-negative number' });
  if (!Number.isFinite(monthlySubscriptionAmount) || monthlySubscriptionAmount < 0) {
    return res.status(400).json({ error: 'Monthly subscription amount must be a valid non-negative number' });
  }

  const setupFeeStatus = typeof body.setupFeeStatus === 'string' ? (body.setupFeeStatus as BusinessSetupFeeStatus) : undefined;
  const billingFrequency = body.billingFrequency as BillingFrequency;
  const subscriptionStatus = typeof body.subscriptionStatus === 'string' ? (body.subscriptionStatus as ClientSubscriptionStatus) : undefined;

  if (setupFeeStatus && !Object.values(BusinessSetupFeeStatus).includes(setupFeeStatus)) return res.status(400).json({ error: 'Invalid setup fee status' });
  if (!Object.values(BillingFrequency).includes(billingFrequency)) return res.status(400).json({ error: 'Invalid billing frequency' });
  if (subscriptionStatus && !Object.values(ClientSubscriptionStatus).includes(subscriptionStatus)) return res.status(400).json({ error: 'Invalid subscription status' });

  const paymentDueDay = Number(body.paymentDueDay);
  if (!Number.isInteger(paymentDueDay) || paymentDueDay < 1 || paymentDueDay > 31) {
    return res.status(400).json({ error: 'Payment due day must be between 1 and 31' });
  }

  const gracePeriodDays = Number(body.gracePeriodDays);
  if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0) {
    return res.status(400).json({ error: 'Grace period days must be a non-negative integer' });
  }

  const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
  if (!businessName) return res.status(400).json({ error: 'Business name is required' });

  const result = await saveClientBillingSettings(account.id, {
    businessName,
    billingEmail: typeof body.billingEmail === 'string' ? body.billingEmail.trim() || null : null,
    setupFeeAmount,
    setupFeeStatus,
    monthlySubscriptionAmount,
    billingFrequency,
    billingStartDate: body.billingStartDate || null,
    nextBillingDate: body.nextBillingDate || null,
    paymentDueDay,
    gracePeriodDays,
    subscriptionStatus,
    stripeCustomerId: typeof body.stripeCustomerId === 'string' ? body.stripeCustomerId.trim() || null : null,
    stripeSubscriptionId: typeof body.stripeSubscriptionId === 'string' ? body.stripeSubscriptionId.trim() || null : null,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'BUSINESS_BILLING_SETTINGS_SAVED',
    entityType: 'ClientBillingSettings',
    entityId: result.settings.id,
    metadata: {
      oldValues: {
        businessName: account.businessName,
        billingEmail: account.billingEmail,
        setupFeeAmount: existingSettings.setupFeeAmount,
        setupFeeStatus: existingSettings.setupFeeStatus,
        monthlySubscriptionAmount: existingSettings.monthlySubscriptionAmount,
        billingFrequency: existingSettings.billingFrequency,
        billingStartDate: existingSettings.billingStartDate,
        nextBillingDate: existingSettings.nextBillingDate,
        paymentDueDay: existingSettings.paymentDueDay,
        gracePeriodDays: existingSettings.gracePeriodDays,
        subscriptionStatus: existingSettings.subscriptionStatus,
        notes: existingSettings.notes,
      },
      newValues: {
        businessName: result.account.businessName,
        billingEmail: result.account.billingEmail,
        setupFeeAmount: result.settings.setupFeeAmount,
        setupFeeStatus: result.settings.setupFeeStatus,
        monthlySubscriptionAmount: result.settings.monthlySubscriptionAmount,
        billingFrequency: result.settings.billingFrequency,
        billingStartDate: result.settings.billingStartDate,
        nextBillingDate: result.settings.nextBillingDate,
        paymentDueDay: result.settings.paymentDueDay,
        gracePeriodDays: result.settings.gracePeriodDays,
        subscriptionStatus: result.settings.subscriptionStatus,
        notes: result.settings.notes,
      },
    },
  });

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    account: result.account,
    billingSettings: billingSettingsPayload(result.settings),
    serviceBilling: await getServiceBillingSummary(account.id),
  });
}

export async function updateSuperAdminServiceSubscriptionSettings(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const existingSubscription = await prisma.clientServiceSubscription.findUnique({ where: { businessId: account.id } });
  const body = req.body || {};
  const taxRate = body.taxRate !== undefined ? Number(body.taxRate) : undefined;
  const billingDay = body.billingDay !== undefined ? Number(body.billingDay) : undefined;
  const serviceSubscriptionStatus = typeof body.serviceSubscriptionStatus === 'string' ? body.serviceSubscriptionStatus : undefined;

  if (taxRate !== undefined && (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)) {
    return res.status(400).json({ error: 'Tax rate must be between 0 and 100' });
  }
  if (billingDay !== undefined && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31)) {
    return res.status(400).json({ error: 'Billing day must be between 1 and 31' });
  }
  if (serviceSubscriptionStatus && !['not_started', 'active', 'past_due', 'cancelled'].includes(serviceSubscriptionStatus)) {
    return res.status(400).json({ error: 'Invalid service subscription status' });
  }

  const subscription = await updateServiceSubscriptionSettings({
    businessId: account.id,
    taxRate,
    billingDay,
    serviceSubscriptionStatus,
    subscriptionStartDate: body.subscriptionStartDate || null,
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'CLIENT_SERVICE_SUBSCRIPTION_SETTINGS_UPDATED',
    entityType: 'ClientServiceSubscription',
    entityId: subscription.id,
    metadata: {
      oldValues: existingSubscription
        ? {
            taxRate: Number(existingSubscription.taxRate),
            billingDay: existingSubscription.billingDay,
            serviceSubscriptionStatus: existingSubscription.serviceSubscriptionStatus,
            subscriptionStartDate: existingSubscription.subscriptionStartDate,
          }
        : null,
      newValues: {
        taxRate: Number(subscription.taxRate),
        billingDay: subscription.billingDay,
        serviceSubscriptionStatus: subscription.serviceSubscriptionStatus,
        subscriptionStartDate: subscription.subscriptionStartDate,
      },
    },
  });

  res.setHeader('Cache-Control', 'no-store');
  res.json({ subscription, serviceBilling: await getServiceBillingSummary(account.id) });
}

export async function startSuperAdminServiceSubscription(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const subscription = await startServiceSubscription(account.id);

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'CLIENT_SERVICE_SUBSCRIPTION_STARTED',
    entityType: 'ClientServiceSubscription',
    entityId: subscription.id,
  });

  res.json({ subscription, serviceBilling: await getServiceBillingSummary(account.id) });
}

export async function generateSuperAdminCurrentServiceInvoice(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const invoices = await generateMissingServiceInvoices(account.id);

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'CLIENT_SERVICE_INVOICES_GENERATED',
    entityType: 'BusinessAccount',
    entityId: account.id,
    metadata: { generatedCount: invoices.length },
  });

  res.json({ invoices, serviceBilling: await getServiceBillingSummary(account.id) });
}

export async function recordSuperAdminManualServicePayment(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Payment amount must be greater than zero' });

  const result = await recordManualServicePayment({
    businessId: account.id,
    invoiceId: typeof req.body.invoiceId === 'string' ? req.body.invoiceId : null,
    amount,
    paymentMethod: typeof req.body.paymentMethod === 'string' ? req.body.paymentMethod : 'manual',
    notes: typeof req.body.notes === 'string' ? req.body.notes : null,
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'CLIENT_SERVICE_MANUAL_PAYMENT_RECORDED',
    entityType: 'ClientPayment',
    entityId: result.payment.id,
    metadata: { invoiceId: result.invoice.id, amount },
  });

  res.json({ ...result, serviceBilling: await getServiceBillingSummary(account.id) });
}

export async function updateSuperAdminBusinessAccount(req: AuthRequest, res: Response) {
  return saveSuperAdminBillingSettings(req, res);
}

export async function createSuperAdminInvoice(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const invoiceType = req.body.invoiceType as BusinessInvoiceType;
  const amountCents = dollarsToCents(Number(req.body.amount));
  const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

  if (!Object.values(BusinessInvoiceType).includes(invoiceType)) return res.status(400).json({ error: 'Invalid invoice type' });
  if (!Number.isFinite(amountCents) || amountCents <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });
  if (!dueDate || Number.isNaN(dueDate.getTime())) return res.status(400).json({ error: 'Valid due date is required' });

  const invoice = await createManualInvoice({
    accountId: account.id,
    invoiceType,
    amountCents,
    dueDate,
    description,
    actorId: req.user!.userId,
    actorRole: req.user!.role,
  });

  if (req.body.sendToClient) {
    try {
      const checkout = await createStripeCheckoutForInvoice({
        invoiceId: invoice.id,
        accountId: account.id,
        billingEmail: account.billingEmail,
        actorId: req.user!.userId,
        actorRole: req.user!.role,
      });
      return res.json({ invoice: checkout.invoice, checkoutUrl: checkout.checkoutUrl });
    } catch {
      return res.json({ invoice, checkoutUrl: null, warning: 'Invoice created but payment link could not be generated' });
    }
  }

  res.json({ invoice });
}

export async function sendInvoicePaymentLink(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const invoiceId = req.params.invoiceId;
  const result = await createStripeCheckoutForInvoice({
    invoiceId,
    accountId: account.id,
    billingEmail: account.billingEmail,
    actorId: req.user!.userId,
    actorRole: req.user!.role,
  });
  res.json(result);
}

export async function markSuperAdminInvoicePaid(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const result = await markInvoicePaid({
    invoiceId: req.params.invoiceId,
    accountId: account.id,
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    paymentMethod: BusinessPaymentMethod.MANUAL,
  });
  res.json(result);
}

export async function markSuperAdminInvoiceWaived(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const invoice = await markInvoiceWaived({
    invoiceId: req.params.invoiceId,
    accountId: account.id,
    actorId: req.user!.userId,
    actorRole: req.user!.role,
  });
  res.json({ invoice });
}

export async function deleteSuperAdminInvoice(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  await deleteDraftInvoice({
    invoiceId: req.params.invoiceId,
    accountId: account.id,
    actorId: req.user!.userId,
    actorRole: req.user!.role,
  });
  res.json({ ok: true });
}

export async function generateSuperAdminSetupFeeInvoice(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const invoice = await generateSetupFeeInvoice({
    accountId: account.id,
    actorId: req.user!.userId,
    actorRole: req.user!.role,
  });
  res.json({ invoice });
}

export async function waiveSuperAdminSetupFee(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  await prisma.$transaction([
    prisma.businessAccount.update({
      where: { id: account.id },
      data: { setupFeeStatus: BusinessSetupFeeStatus.WAIVED },
    }),
    prisma.clientBillingSettings.updateMany({
      where: { clientId: account.id },
      data: { setupFeeStatus: BusinessSetupFeeStatus.WAIVED },
    }),
  ]);

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'BUSINESS_SETUP_FEE_WAIVED',
    entityType: 'BusinessAccount',
    entityId: account.id,
  });

  res.json({ ok: true });
}

export async function suspendSuperAdminAccount(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const updated = await prisma.businessAccount.update({
    where: { id: account.id },
    data: { isSuspended: true },
  });

  await prisma.clientBillingSettings.updateMany({
    where: { clientId: account.id },
    data: { subscriptionStatus: ClientSubscriptionStatus.SUSPENDED },
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'BUSINESS_ACCOUNT_SUSPENDED',
    entityType: 'BusinessAccount',
    entityId: account.id,
  });

  res.json({ account: updated });
}

export async function reactivateSuperAdminAccount(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const updated = await prisma.businessAccount.update({
    where: { id: account.id },
    data: { isSuspended: false },
  });

  await prisma.clientBillingSettings.updateMany({
    where: { clientId: account.id },
    data: { subscriptionStatus: ClientSubscriptionStatus.ACTIVE },
  });

  await logAuditEvent({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: 'BUSINESS_ACCOUNT_REACTIVATED',
    entityType: 'BusinessAccount',
    entityId: account.id,
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

  for (const subscription of subscriptions.data) await upsertSubscriptionFromStripe(subscription);
  for (const invoice of invoices.data) await upsertInvoiceFromStripe(invoice);
  for (const paymentIntent of paymentIntents.data) await upsertPaymentIntentFromStripe(paymentIntent);

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

export async function getSuperAdminInvoice(req: AuthRequest, res: Response) {
  if (!requireBillingSuperAdmin(req, res)) return;

  const account = await getDefaultBusinessAccount();
  const invoice = await prisma.businessInvoice.findFirst({
    where: { id: req.params.invoiceId, businessAccountId: account.id },
    include: { payments: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice });
}
