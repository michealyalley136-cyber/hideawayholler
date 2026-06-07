import { Request, Response } from 'express';
import { BusinessInvoiceStatus, BusinessPaymentMethod, BusinessPaymentStatus, ClientSubscriptionStatus } from '@prisma/client';
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

async function handleCheckoutSessionCompleted(session: any) {
  const accountId = session.client_reference_id || session.metadata?.businessAccountId;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const invoiceId = session.metadata?.businessInvoiceId;

  if (accountId && customerId) {
    await prisma.businessAccount.update({
      where: { id: accountId },
      data: { stripeCustomerId: customerId },
    });
  }

  if (invoiceId && session.payment_status === 'paid') {
    const invoice = await prisma.businessInvoice.findUnique({ where: { id: invoiceId } });
    if (invoice) {
      await prisma.businessInvoice.update({
        where: { id: invoice.id },
        data: { status: BusinessInvoiceStatus.PAID, amountPaid: invoice.amountDue, paidAt: new Date() },
      });
      await prisma.businessPayment.create({
        data: {
          businessAccountId: invoice.businessAccountId,
          businessInvoiceId: invoice.id,
          amount: invoice.amountDue,
          status: BusinessPaymentStatus.SUCCEEDED,
          paymentMethod: BusinessPaymentMethod.STRIPE,
          paidAt: new Date(),
        },
      });
      await prisma.clientBillingSettings.updateMany({
        where: { clientId: invoice.businessAccountId },
        data: { subscriptionStatus: ClientSubscriptionStatus.ACTIVE },
      });
    }
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
