'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, ApiError } from '@/lib/api';

interface BusinessAccount {
  id: string;
  slug: string;
  businessName: string;
  billingEmail?: string | null;
  setupFeeAmount: number;
  setupFeeStatus: string;
  setupFeePaidAt?: string | null;
  isSuspended: boolean;
}

interface ServiceSubscription {
  serviceSubscriptionStatus: string;
  subscriptionStartDate?: string | null;
  firstPaymentDate?: string | null;
  billingDay: number;
  introMonthlyFee: string | number;
  introDurationMonths: number;
  standardMonthlyFee: string | number;
  taxRate: string | number;
  nextPaymentDate?: string | null;
  lastPaymentDate?: string | null;
}

interface ServiceInvoice {
  id: string;
  invoiceNumber: string;
  monthNumber: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  subtotal: string | number;
  taxAmount: string | number;
  totalDue: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  status: string;
  squareCheckoutUrl?: string | null;
  createdAt: string;
}

interface ServicePayment {
  id: string;
  amount: string | number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string | null;
  createdAt: string;
}

interface BillingOverview {
  payee: string;
  account: BusinessAccount;
  serviceBilling: {
    subscription: ServiceSubscription;
    currentPlan: string;
    currentMonthlyFee: number;
    currentAmountDue: number;
    currentTaxAmount: number;
    outstandingBalance: number;
    totalPaymentsReceived: number;
    totalInvoicesGenerated: number;
    paidInvoices: number;
    unpaidInvoices: number;
    pastDueInvoices: number;
    invoices: ServiceInvoice[];
    payments: ServicePayment[];
  };
  summary: {
    currentPlan: string;
    currentMonthlyFee: number;
    currentAmountDue: number;
    outstandingBalance: number;
    nextPaymentDate?: string | null;
    subscriptionStatus: string;
  };
  lastUpdatedAt: string;
}

const POLL_INTERVAL_MS = 20_000;

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  not_started: 'bg-slate-200 text-slate-700',
  past_due: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-200 text-slate-700',
  paid: 'bg-emerald-100 text-emerald-800',
  unpaid: 'bg-amber-100 text-amber-800',
  partial: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  NOT_SENT: 'bg-slate-200 text-slate-700',
  SENT: 'bg-sky-100 text-sky-800',
  WAIVED: 'bg-slate-200 text-slate-700',
};

function formatMoney(amount: number | string) {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
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
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const loadBilling = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api<BillingOverview>('/admin/billing/subscription', { suppressErrorLog: true });
      setOverview(data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      try {
        const fallback = await api<BillingOverview>('/business-billing/subscription', { suppressErrorLog: true });
        setOverview(fallback);
        setLastRefresh(new Date().toLocaleTimeString());
      } catch {
        setError(err instanceof ApiError ? err.message : 'Unable to load billing subscription');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
    const timer = window.setInterval(() => void loadBilling(true), POLL_INTERVAL_MS);
    const refreshOnFocus = () => void loadBilling(true);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [loadBilling]);

  const billing = overview?.serviceBilling;
  const unpaidInvoice = billing?.invoices.find(
    (invoice) => invoice.status !== 'paid' && Number(invoice.balanceDue) > 0
  );

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Admin / Billing / Subscription</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Service Subscription</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              View Hideaway Holler&apos;s portal service subscription managed by {overview?.payee || 'AppCreatives LLC'}.
              Billing updates from the AppCreatives office appear here automatically.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button variant="outline" onClick={() => loadBilling()} loading={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {lastRefresh && <p className="text-xs text-slate-500">Last updated {lastRefresh}</p>}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
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
                <Badge className={statusStyles[billing?.subscription.serviceSubscriptionStatus || 'not_started']}>
                  {readableStatus(billing?.subscription.serviceSubscriptionStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              {loading && !overview ? (
                <p className="text-sm text-slate-500">Loading billing details...</p>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Business</p>
                      <p className="mt-1 font-medium text-slate-900">{overview?.account.businessName}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Current Plan</p>
                      <p className="mt-1 font-medium text-slate-900">{billing?.currentPlan || 'Not started'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Monthly Fee</p>
                      <p className="mt-1 font-medium text-slate-900">{formatMoney(billing?.currentMonthlyFee || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Current Amount Due</p>
                      <p className="mt-1 font-medium text-slate-900">{formatMoney(billing?.currentAmountDue || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Next Billing Date</p>
                      <p className="mt-1 font-medium text-slate-900">{formatDate(billing?.subscription.nextPaymentDate)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Outstanding Balance</p>
                      <p className="mt-1 font-medium text-slate-900">{formatMoney(billing?.outstandingBalance || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Setup Fee</p>
                      <p className="mt-1 font-medium text-slate-900">{formatMoney((overview?.account.setupFeeAmount || 0) / 100)}</p>
                      <Badge className={`mt-2 ${statusStyles[overview?.account.setupFeeStatus || 'NOT_SENT']}`}>
                        {readableStatus(overview?.account.setupFeeStatus)}
                      </Badge>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Tax Rate</p>
                      <p className="mt-1 font-medium text-slate-900">{Number(billing?.subscription.taxRate || 0).toFixed(2)}%</p>
                    </div>
                  </div>

                  {unpaidInvoice?.squareCheckoutUrl ? (
                    <a
                      href={unpaidInvoice.squareCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Pay Now
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : billing && billing.unpaidInvoices > 0 ? (
                    <p className="text-sm text-slate-600">Payment link pending setup. Contact AppCreatives LLC to complete payment.</p>
                  ) : null}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Billing Summary</h2>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Total invoices</span>
                  <span className="font-semibold text-slate-900">{billing?.totalInvoicesGenerated ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Paid invoices</span>
                  <span className="font-semibold text-emerald-700">{billing?.paidInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Unpaid invoices</span>
                  <span className="font-semibold text-amber-700">{billing?.unpaidInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Past due invoices</span>
                  <span className="font-semibold text-red-700">{billing?.pastDueInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Total payments received</span>
                  <span className="font-semibold text-slate-900">{formatMoney(billing?.totalPaymentsReceived || 0)}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Subscription started</span>
                  <span className="font-semibold text-slate-900">{formatDate(billing?.subscription.subscriptionStartDate)}</span>
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
                {(billing?.invoices || []).map((invoice) => (
                  <div key={invoice.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-slate-500">
                          Month {invoice.monthNumber} · Due {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                      <Badge className={statusStyles[invoice.status] || 'bg-slate-200 text-slate-700'}>
                        {readableStatus(invoice.status)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-700">
                      <span>Total {formatMoney(invoice.totalDue)}</span>
                      <span>Paid {formatMoney(invoice.amountPaid)}</span>
                      <span>Balance {formatMoney(invoice.balanceDue)}</span>
                    </div>
                    {invoice.squareCheckoutUrl && invoice.status !== 'paid' && (
                      <a
                        href={invoice.squareCheckoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Pay this invoice
                      </a>
                    )}
                  </div>
                ))}
                {!billing?.invoices?.length && <p className="text-sm text-slate-500">No service invoices yet.</p>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {(billing?.payments || []).map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{formatMoney(payment.amount)}</p>
                        <p className="text-sm text-slate-500">Paid {formatDate(payment.paymentDate)}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800">{readableStatus(payment.paymentMethod)}</Badge>
                    </div>
                    {payment.notes && <p className="mt-2 text-sm text-slate-600">{payment.notes}</p>}
                  </div>
                ))}
                {!billing?.payments?.length && <p className="text-sm text-slate-500">No payments recorded yet.</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
