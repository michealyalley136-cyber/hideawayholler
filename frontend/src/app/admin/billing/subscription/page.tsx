'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, ApiError } from '@/lib/api';

type SubscriptionStatus =
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'PAUSED';

type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'CANCELED';

interface BusinessAccount {
  id: string;
  businessName: string;
  billingEmail?: string | null;
  stripeCustomerId?: string | null;
}

interface BusinessSubscription {
  id: string;
  planName?: string | null;
  status: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  stripePriceId?: string | null;
}

interface BusinessInvoice {
  id: string;
  invoiceNumber?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: InvoiceStatus;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

interface BusinessPayment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  receiptUrl?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

interface BillingOverview {
  payee: string;
  account: BusinessAccount | null;
  activeSubscription: BusinessSubscription | null;
  invoices: BusinessInvoice[];
  payments: BusinessPayment[];
  permissions: {
    isBillingSuperAdmin: boolean;
  };
  stripe: {
    configured: boolean;
    checkoutReady: boolean;
    priceConfigured: boolean;
  };
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  TRIALING: 'bg-sky-100 text-sky-800',
  PAST_DUE: 'bg-amber-100 text-amber-800',
  OPEN: 'bg-amber-100 text-amber-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  SUCCEEDED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELED: 'bg-slate-200 text-slate-700',
  UNPAID: 'bg-red-100 text-red-800',
  INCOMPLETE: 'bg-slate-200 text-slate-700',
  PENDING: 'bg-slate-200 text-slate-700',
};

function formatMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format((cents || 0) / 100);
}

function formatDate(date?: string | null) {
  return date ? new Date(date).toLocaleDateString() : 'Not set';
}

function readableStatus(status?: string | null) {
  return (status || 'Not started').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function BusinessSubscriptionPage() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<BillingOverview>('/business-billing/subscription');
      setOverview(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load business billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get('checkout');
    if (checkout === 'success') {
      setMessage('Stripe Checkout completed. Subscription status will update after Stripe confirms payment.');
    }
    if (checkout === 'cancelled') {
      setMessage('Stripe Checkout was cancelled. No subscription changes were made.');
    }
  }, []);

  const redirectToStripe = async (path: string, action: string) => {
    setActionLoading(action);
    setError('');
    setMessage('');
    try {
      const data = await api<{ url?: string }>(path, { method: 'POST' });
      if (!data.url) throw new Error('Stripe did not return a redirect URL');
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Unable to open Stripe');
      setActionLoading(null);
    }
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Admin / Billing / Subscription</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Business Subscription</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Manage Hideaway Holler&apos;s portal subscription payments to AppCreatives LLC. This is separate from resident rent and deposit payments.
            </p>
          </div>
          <Button variant="outline" onClick={loadBilling} loading={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {(message || error) && (
          <div className="mb-4 space-y-2">
            {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-brand-700" />
                    <h2 className="text-lg font-semibold text-slate-900">Subscription Status</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Payee: {overview?.payee || 'AppCreatives LLC'}</p>
                </div>
                <Badge className={statusStyles[overview?.activeSubscription?.status || 'INCOMPLETE'] || 'bg-slate-200 text-slate-700'}>
                  {readableStatus(overview?.activeSubscription?.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <p className="text-sm text-slate-500">Loading billing details...</p>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Business</p>
                      <p className="mt-1 font-medium text-slate-900">{overview?.account?.businessName || 'Hideaway Holler'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Billing Email</p>
                      <p className="mt-1 font-medium text-slate-900">{overview?.account?.billingEmail || 'Not set'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Current Period</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {formatDate(overview?.activeSubscription?.currentPeriodStart)} - {formatDate(overview?.activeSubscription?.currentPeriodEnd)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Plan</p>
                      <p className="mt-1 font-medium text-slate-900">{overview?.activeSubscription?.planName || 'HollerHub subscription'}</p>
                    </div>
                  </div>

                  {!overview?.stripe.configured && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Stripe is not configured on the backend. Add the Stripe environment variables before collecting subscription payments.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => redirectToStripe('/business-billing/checkout-session', 'checkout')}
                      loading={actionLoading === 'checkout'}
                      disabled={!overview?.stripe.checkoutReady}
                    >
                      Start Stripe Checkout
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => redirectToStripe('/business-billing/billing-portal-session', 'portal')}
                      loading={actionLoading === 'portal'}
                      disabled={!overview?.account?.stripeCustomerId}
                    >
                      Open Billing Portal
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Managed Service</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  Hideaway Holler management can start or manage the business subscription here. AppCreatives LLC office controls are handled in the separate super admin dashboard.
                </p>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Service Provider</p>
                  <p className="mt-1 font-medium text-slate-900">{overview?.payee || 'AppCreatives LLC'}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Invoice History</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {(overview?.invoices || []).map((invoice) => (
                  <div key={invoice.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{invoice.invoiceNumber || 'Stripe invoice'}</p>
                        <p className="text-sm text-slate-500">Created {formatDate(invoice.createdAt)}</p>
                      </div>
                      <Badge className={statusStyles[invoice.status] || 'bg-slate-200 text-slate-700'}>{readableStatus(invoice.status)}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-700">
                      <span>Due {formatMoney(invoice.amountDue, invoice.currency)}</span>
                      <span>Paid {formatMoney(invoice.amountPaid, invoice.currency)}</span>
                      <span>Due date {formatDate(invoice.dueDate)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {invoice.hostedInvoiceUrl && (
                        <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                          View invoice
                        </a>
                      )}
                      {invoice.invoicePdf && (
                        <a href={invoice.invoicePdf} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                          Download PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {!overview?.invoices?.length && <p className="text-sm text-slate-500">No business invoices yet.</p>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {(overview?.payments || []).map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{formatMoney(payment.amount, payment.currency)}</p>
                        <p className="text-sm text-slate-500">{payment.paidAt ? `Paid ${formatDate(payment.paidAt)}` : `Created ${formatDate(payment.createdAt)}`}</p>
                      </div>
                      <Badge className={statusStyles[payment.status] || 'bg-slate-200 text-slate-700'}>{readableStatus(payment.status)}</Badge>
                    </div>
                    {payment.receiptUrl && (
                      <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
                        View receipt
                      </a>
                    )}
                  </div>
                ))}
                {!overview?.payments?.length && <p className="text-sm text-slate-500">No business subscription payments yet.</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
