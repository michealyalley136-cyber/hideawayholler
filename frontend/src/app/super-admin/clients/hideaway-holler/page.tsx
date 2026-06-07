'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileText,
  HeartPulse,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, ApiError } from '@/lib/api';

type HealthStatus = 'Good' | 'Needs Attention' | 'Past Due' | 'Critical';

interface BillingSettings {
  setupFeeAmount: number;
  setupFeeStatus: string;
  monthlySubscriptionAmount: number;
  billingFrequency: string;
  billingStartDate?: string | null;
  nextBillingDate?: string | null;
  paymentDueDay: number;
  gracePeriodDays: number;
  subscriptionStatus: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  notes?: string | null;
  setupFeeAmountDollars?: number;
  monthlySubscriptionAmountDollars?: number;
}

interface ClientDashboard {
  client: {
    id: string;
    slug: string;
    name: string;
    billingEmail?: string | null;
    stripeCustomerId?: string | null;
    isSuspended?: boolean;
    payee: string;
  };
  billingSettings?: BillingSettings | null;
  billingConfigured?: boolean;
  dashboardCards: Record<string, any>;
  subscription?: { status: string; planName?: string | null; currentPeriodEnd?: string | null } | null;
  paymentSummary: Record<string, any>;
  userSummary: {
    totalUsers: number;
    activeResidents: number;
    alumniUsers: number;
    adminUsers: number;
    inactiveUsers: number;
    recentlyCreatedUsers: UserRow[];
    connectedUsers: UserRow[];
  };
  sosSummary: {
    totalSosAlerts: number;
    activeSosAlerts: number;
    acknowledgedSosAlerts: number;
    resolvedSosAlerts: number;
    averageResponseSeconds?: number | null;
    lastEmergencyEvent?: { eventType: string; eventMessage: string; createdAt: string } | null;
    emergencyAuditTrail: SosRow[];
  };
  accountHealth: {
    status: HealthStatus;
    reasons: string[];
    factors: Record<string, any>;
  };
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  maintenanceActivity: MaintenanceRow[];
  auditLogs: AuditLogRow[];
  stripe: {
    configured: boolean;
    checkoutReady: boolean;
    webhookConfigured: boolean;
    priceId: 'configured' | 'missing';
  };
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  profile?: { fullName?: string | null; currentStatus?: string | null } | null;
}

interface InvoiceRow {
  id: string;
  invoiceNumber?: string | null;
  invoiceType?: string;
  description?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  stripeCheckoutUrl?: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  dueDate?: string | null;
  createdAt: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  receiptUrl?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

interface SosRow {
  id: string;
  residentName: string;
  status: string;
  createdAt: string;
  adminAcknowledgedAt?: string | null;
  resolvedAt?: string | null;
  eventLogs?: { eventType: string; eventMessage: string; createdAt: string }[];
}

interface MaintenanceRow {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  user?: { email: string; profile?: { fullName?: string | null } | null };
}

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  actor?: { email: string; profile?: { fullName?: string | null } | null } | null;
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  GOOD: 'bg-emerald-100 text-emerald-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  SUCCEEDED: 'bg-emerald-100 text-emerald-800',
  TRIAL: 'bg-sky-100 text-sky-800',
  TRIALING: 'bg-sky-100 text-sky-800',
  ACKNOWLEDGED: 'bg-sky-100 text-sky-800',
  'NEEDS ATTENTION': 'bg-amber-100 text-amber-800',
  PAST_DUE: 'bg-amber-100 text-amber-800',
  'PAST DUE': 'bg-amber-100 text-amber-800',
  OPEN: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  CRITICAL: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
  UNPAID: 'bg-red-100 text-red-800',
  OVERDUE: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-slate-200 text-slate-700',
  CANCELED: 'bg-slate-200 text-slate-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
  INCOMPLETE: 'bg-slate-200 text-slate-700',
  SUSPENDED: 'bg-red-100 text-red-800',
  WAIVED: 'bg-slate-200 text-slate-700',
};

const UNPAID_STATUSES = ['PENDING', 'FAILED', 'OVERDUE', 'OPEN', 'DRAFT'];

function readable(value?: string | null) {
  return (value || 'Not set').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not set';
}

function formatMoney(cents?: number | null, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100);
}

function formatDuration(seconds?: number | null) {
  if (seconds == null) return 'Not enough data';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function centsToDollars(cents?: number | null) {
  return (cents || 0) / 100;
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function StatCard({ title, value, icon: Icon, accent = 'text-brand-700 bg-brand-50' }: { title: string; value: string | number; icon: any; accent?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`rounded-lg p-3 ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

const defaultBillingForm = {
  businessName: 'Hideaway Holler',
  billingEmail: '',
  setupFeeAmount: 0,
  setupFeeStatus: 'NOT_SENT',
  monthlySubscriptionAmount: 0,
  billingFrequency: 'MONTHLY',
  billingStartDate: '',
  nextBillingDate: '',
  paymentDueDay: 1,
  gracePeriodDays: 7,
  subscriptionStatus: 'INCOMPLETE',
  stripeCustomerId: '',
  stripeSubscriptionId: '',
  notes: '',
};

export default function HideawayHollerClientPage() {
  const [data, setData] = useState<ClientDashboard | null>(null);
  const [billingForm, setBillingForm] = useState(defaultBillingForm);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceType: 'MONTHLY_SUBSCRIPTION',
    amount: 0,
    dueDate: '',
    description: '',
    sendToClient: false,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const populateBillingForm = useCallback((response: ClientDashboard) => {
    const settings = response.billingSettings;
    setBillingForm({
      businessName: response.client.name || 'Hideaway Holler',
      billingEmail: response.client.billingEmail || '',
      setupFeeAmount: settings?.setupFeeAmountDollars ?? centsToDollars(response.dashboardCards.setupFeeAmount),
      setupFeeStatus: settings?.setupFeeStatus || response.dashboardCards.setupFeePaymentStatus || 'NOT_SENT',
      monthlySubscriptionAmount: settings?.monthlySubscriptionAmountDollars ?? centsToDollars(settings?.monthlySubscriptionAmount),
      billingFrequency: settings?.billingFrequency || 'MONTHLY',
      billingStartDate: toDateInput(settings?.billingStartDate),
      nextBillingDate: toDateInput(settings?.nextBillingDate || response.dashboardCards.nextBillingDate),
      paymentDueDay: settings?.paymentDueDay || 1,
      gracePeriodDays: settings?.gracePeriodDays ?? 7,
      subscriptionStatus: settings?.subscriptionStatus || response.dashboardCards.subscriptionStatus || 'INCOMPLETE',
      stripeCustomerId: settings?.stripeCustomerId || response.client.stripeCustomerId || '',
      stripeSubscriptionId: settings?.stripeSubscriptionId || '',
      notes: settings?.notes || '',
    });
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api<ClientDashboard>('/business-billing/super-admin-client-dashboard');
      setData(response);
      populateBillingForm(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load client dashboard');
    } finally {
      setLoading(false);
    }
  }, [populateBillingForm]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const runAction = async (key: string, action: () => Promise<void>, successMessage: string) => {
    setActionLoading(key);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const saveBillingSettings = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('save-billing', async () => {
      await api('/business-billing/super-admin/billing-settings', {
        method: 'PATCH',
        body: billingForm,
      });
    }, 'Billing settings saved.');
  };

  const syncStripe = async () => {
    await runAction('sync', async () => {
      await api('/business-billing/super-admin-sync-stripe', { method: 'POST' });
    }, 'Stripe records synced.');
  };

  const createInvoice = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('create-invoice', async () => {
      await api('/business-billing/super-admin/invoices', {
        method: 'POST',
        body: invoiceForm,
      });
      setInvoiceForm({ invoiceType: 'MONTHLY_SUBSCRIPTION', amount: 0, dueDate: '', description: '', sendToClient: false });
    }, 'Invoice created.');
  };

  const invoiceAction = async (invoiceId: string, action: string, key: string) => {
    await runAction(key, async () => {
      if (action === 'send-link') {
        const result = await api<{ checkoutUrl?: string }>(`/business-billing/super-admin/invoices/${invoiceId}/send-payment-link`, { method: 'POST' });
        if (result.checkoutUrl) window.open(result.checkoutUrl, '_blank');
      } else if (action === 'mark-paid') {
        await api(`/business-billing/super-admin/invoices/${invoiceId}/mark-paid`, { method: 'POST' });
      } else if (action === 'mark-waived') {
        await api(`/business-billing/super-admin/invoices/${invoiceId}/mark-waived`, { method: 'POST' });
      } else if (action === 'delete') {
        await api(`/business-billing/super-admin/invoices/${invoiceId}`, { method: 'DELETE' });
      }
    }, 'Invoice updated.');
  };

  const generateSetupFeeInvoice = async () => {
    await runAction('setup-fee-invoice', async () => {
      await api('/business-billing/super-admin/setup-fee/generate-invoice', { method: 'POST' });
    }, 'Setup fee invoice generated.');
  };

  const waiveSetupFee = async () => {
    await runAction('waive-setup-fee', async () => {
      await api('/business-billing/super-admin/setup-fee/waive', { method: 'POST' });
    }, 'Setup fee waived.');
  };

  const suspendAccount = async () => {
    await runAction('suspend', async () => {
      await api('/business-billing/super-admin/account/suspend', { method: 'POST' });
    }, 'Account suspended.');
  };

  const reactivateAccount = async () => {
    await runAction('reactivate', async () => {
      await api('/business-billing/super-admin/account/reactivate', { method: 'POST' });
    }, 'Account reactivated.');
  };

  const cards = data?.dashboardCards;
  const healthKey = data?.accountHealth.status?.toUpperCase();
  const billingConfigured = data?.billingConfigured;
  const hasInvoices = (data?.invoices || []).length > 0;
  const hasPayments = (data?.payments || []).length > 0;

  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Super Admin / Clients / Hideaway Holler</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Hideaway Holler Account Dashboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Manage billing configuration, invoices, payments, and account health for AppCreatives LLC.
            </p>
          </div>
          <Button variant="outline" onClick={loadDashboard} loading={loading}>
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

        {!billingConfigured && !loading && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No subscription has been configured yet. Use Client Billing Setup below to set amounts, frequency, and billing dates.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Outstanding balance" value={formatMoney(cards?.outstandingBalance)} icon={AlertTriangle} accent="text-amber-700 bg-amber-50" />
          <StatCard title="Monthly recurring revenue" value={billingConfigured ? formatMoney(cards?.monthlyRecurringRevenue) : '$0.00'} icon={Activity} />
          <StatCard title="Subscription status" value={readable(cards?.subscriptionStatus)} icon={ShieldCheck} />
          <StatCard title="Setup fee status" value={readable(cards?.setupFeePaymentStatus)} icon={CheckCircle2} />
          <StatCard title="Next billing date" value={formatDate(cards?.nextBillingDate)} icon={CreditCard} />
          <StatCard title="Total payments received" value={hasPayments ? formatMoney(cards?.totalPaymentsReceived) : '$0.00'} icon={CreditCard} />
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">Account health</p>
              <Badge className={`mt-2 ${statusStyles[healthKey || ''] || 'bg-slate-200 text-slate-700'}`}>{data?.accountHealth.status || 'Loading'}</Badge>
            </CardBody>
          </Card>
          <StatCard title="Open SOS emergencies" value={cards?.openSosEmergencies ?? 0} icon={HeartPulse} accent="text-red-700 bg-red-50" />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Client Billing Setup</h2>
              <p className="text-sm text-slate-500">Configure how much Hideaway Holler owes and when invoices are due.</p>
            </CardHeader>
            <CardBody>
              <form onSubmit={saveBillingSettings} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Client Business Name">
                    <input value={billingForm.businessName} onChange={(e) => setBillingForm({ ...billingForm, businessName: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  </Field>
                  <Field label="Billing Email">
                    <input type="email" value={billingForm.billingEmail} onChange={(e) => setBillingForm({ ...billingForm, billingEmail: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Setup Fee Amount ($)">
                    <input type="number" min={0} step={0.01} value={billingForm.setupFeeAmount} onChange={(e) => setBillingForm({ ...billingForm, setupFeeAmount: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Setup Fee Status">
                    <select value={billingForm.setupFeeStatus} onChange={(e) => setBillingForm({ ...billingForm, setupFeeStatus: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="NOT_SENT">Not Sent</option>
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="WAIVED">Waived</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </Field>
                  <Field label="Monthly Subscription Amount ($)">
                    <input type="number" min={0} step={0.01} value={billingForm.monthlySubscriptionAmount} onChange={(e) => setBillingForm({ ...billingForm, monthlySubscriptionAmount: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Billing Frequency">
                    <select value={billingForm.billingFrequency} onChange={(e) => setBillingForm({ ...billingForm, billingFrequency: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </Field>
                  <Field label="Billing Start Date">
                    <input type="date" value={billingForm.billingStartDate} onChange={(e) => setBillingForm({ ...billingForm, billingStartDate: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Next Billing Date">
                    <input type="date" value={billingForm.nextBillingDate} onChange={(e) => setBillingForm({ ...billingForm, nextBillingDate: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Payment Due Day (1-31)">
                    <input type="number" min={1} max={31} value={billingForm.paymentDueDay} onChange={(e) => setBillingForm({ ...billingForm, paymentDueDay: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Grace Period Days">
                    <input type="number" min={0} value={billingForm.gracePeriodDays} onChange={(e) => setBillingForm({ ...billingForm, gracePeriodDays: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Subscription Status">
                    <select value={billingForm.subscriptionStatus} onChange={(e) => setBillingForm({ ...billingForm, subscriptionStatus: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="TRIAL">Trial</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PAST_DUE">Past Due</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="INCOMPLETE">Incomplete</option>
                    </select>
                  </Field>
                  <Field label="Stripe Customer ID">
                    <input value={billingForm.stripeCustomerId} onChange={(e) => setBillingForm({ ...billingForm, stripeCustomerId: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Stripe Subscription ID">
                    <input value={billingForm.stripeSubscriptionId} onChange={(e) => setBillingForm({ ...billingForm, stripeSubscriptionId: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={billingForm.notes} onChange={(e) => setBillingForm({ ...billingForm, notes: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" loading={actionLoading === 'save-billing'}>Save Billing Settings</Button>
                  {data?.stripe.configured && (
                    <Button type="button" variant="outline" onClick={syncStripe} loading={actionLoading === 'sync'} disabled={!billingForm.stripeCustomerId}>
                      Sync Stripe
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={generateSetupFeeInvoice} loading={actionLoading === 'setup-fee-invoice'} disabled={billingForm.setupFeeAmount <= 0}>
                    Generate Setup Fee Invoice
                  </Button>
                  <Button type="button" variant="outline" onClick={waiveSetupFee} loading={actionLoading === 'waive-setup-fee'}>
                    Waive Setup Fee
                  </Button>
                  {data?.client.isSuspended ? (
                    <Button type="button" variant="outline" onClick={reactivateAccount} loading={actionLoading === 'reactivate'}>
                      Reactivate Account
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={suspendAccount} loading={actionLoading === 'suspend'}>
                      Suspend Account
                    </Button>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">Create Invoice</h2>
              </CardHeader>
              <CardBody>
                <form onSubmit={createInvoice} className="space-y-3">
                  <Field label="Invoice Type">
                    <select value={invoiceForm.invoiceType} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceType: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="SETUP_FEE">Setup Fee</option>
                      <option value="MONTHLY_SUBSCRIPTION">Monthly Subscription</option>
                      <option value="CUSTOM_CHARGE">Custom Charge</option>
                    </select>
                  </Field>
                  <Field label="Amount ($)">
                    <input type="number" min={0.01} step={0.01} value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  </Field>
                  <Field label="Due Date">
                    <input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  </Field>
                  <Field label="Description">
                    <input value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={invoiceForm.sendToClient} onChange={(e) => setInvoiceForm({ ...invoiceForm, sendToClient: e.target.checked })} />
                    Send payment link to client
                  </label>
                  <Button type="submit" loading={actionLoading === 'create-invoice'}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-lg font-semibold text-slate-900">Account Health</h2></CardHeader>
              <CardBody>
                <Badge className={`${statusStyles[healthKey || ''] || 'bg-slate-200 text-slate-700'}`}>{data?.accountHealth.status || 'Loading'}</Badge>
                {(data?.accountHealth.reasons || []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-700">Reasons:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {data?.accountHealth.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-lg font-semibold text-slate-900">Payment Summary</h2></CardHeader>
              <CardBody>
                {hasPayments ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Summary label="Total paid to AppCreatives LLC" value={formatMoney(data?.paymentSummary.totalPaidToAppCreatives)} />
                    <Summary label="Payments this month" value={formatMoney(data?.paymentSummary.paymentsThisMonth)} />
                    <Summary label="Payments this year" value={formatMoney(data?.paymentSummary.paymentsThisYear)} />
                    <Summary label="Failed payments" value={data?.paymentSummary.failedPayments ?? 0} />
                    <Summary label="Pending invoices" value={data?.paymentSummary.pendingInvoices ?? 0} />
                    <Summary label="Manual payments recorded" value={data?.paymentSummary.manualPaymentsRecorded ?? 0} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No payments received yet.</p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900">Invoices</h2></CardHeader>
            <CardBody>
              {!hasInvoices ? (
                <p className="text-sm text-slate-500">No invoices created yet.</p>
              ) : (
                <div className="space-y-3">
                  {(data?.invoices || []).map((invoice) => (
                    <div key={invoice.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">
                            {invoice.invoiceNumber || 'Invoice'} — {readable(invoice.invoiceType)} — {readable(invoice.status)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatMoney(invoice.amountDue, invoice.currency)} due · Due {formatDate(invoice.dueDate)}
                          </p>
                          {invoice.description && <p className="mt-1 text-sm text-slate-500">{invoice.description}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(invoice.hostedInvoiceUrl || invoice.invoicePdf || invoice.stripeCheckoutUrl) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(invoice.hostedInvoiceUrl || invoice.invoicePdf || invoice.stripeCheckoutUrl || '', '_blank')}
                            >
                              View Invoice
                            </Button>
                          )}
                          {invoice.invoicePdf && (
                            <Button type="button" variant="outline" size="sm" onClick={() => window.open(invoice.invoicePdf!, '_blank')}>
                              Download Invoice
                            </Button>
                          )}
                          {UNPAID_STATUSES.includes(invoice.status) && data?.stripe.configured && (
                            <Button type="button" variant="outline" size="sm" loading={actionLoading === `send-${invoice.id}`} onClick={() => invoiceAction(invoice.id, 'send-link', `send-${invoice.id}`)}>
                              Send Payment Link
                            </Button>
                          )}
                          {UNPAID_STATUSES.includes(invoice.status) && (
                            <Button type="button" variant="outline" size="sm" loading={actionLoading === `paid-${invoice.id}`} onClick={() => invoiceAction(invoice.id, 'mark-paid', `paid-${invoice.id}`)}>
                              Mark Manual Payment
                            </Button>
                          )}
                          {UNPAID_STATUSES.includes(invoice.status) && (
                            <Button type="button" variant="outline" size="sm" loading={actionLoading === `waived-${invoice.id}`} onClick={() => invoiceAction(invoice.id, 'mark-waived', `waived-${invoice.id}`)}>
                              Mark as Waived
                            </Button>
                          )}
                          {invoice.status === 'DRAFT' && (
                            <Button type="button" variant="outline" size="sm" loading={actionLoading === `delete-${invoice.id}`} onClick={() => invoiceAction(invoice.id, 'delete', `delete-${invoice.id}`)}>
                              Delete Draft
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900">Payments</h2></CardHeader>
            <CardBody>
              {!hasPayments ? (
                <p className="text-sm text-slate-500">No payments received yet.</p>
              ) : (
                <div className="space-y-2">
                  {(data?.payments || []).map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{formatMoney(payment.amount, payment.currency)} — {readable(payment.status)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDateTime(payment.paidAt || payment.createdAt)}
                        {payment.paymentMethod ? ` · ${readable(payment.paymentMethod)}` : ''}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {payment.receiptUrl && (
                          <Button type="button" variant="outline" size="sm" onClick={() => window.open(payment.receiptUrl!, '_blank')}>
                            View Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900">User Summary</h2></CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <Summary label="Total users" value={data?.userSummary.totalUsers ?? 0} />
                <Summary label="Active residents" value={data?.userSummary.activeResidents ?? 0} />
                <Summary label="Admin users" value={data?.userSummary.adminUsers ?? 0} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900">SOS Summary</h2></CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <Summary label="Active SOS alerts" value={data?.sosSummary.activeSosAlerts ?? 0} />
                <Summary label="Resolved SOS alerts" value={data?.sosSummary.resolvedSosAlerts ?? 0} />
                <Summary label="Average response time" value={formatDuration(data?.sosSummary.averageResponseSeconds)} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900">Operational Activity</h2></CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <Summary label="Unresolved maintenance" value={cards?.unresolvedMaintenanceRequests ?? 0} />
                <Summary label="Active leases" value={cards?.activeLeases ?? 0} />
                <Summary label="Pending community posts" value={cards?.pendingCommunityPosts ?? 0} />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <TableCard title="SOS Logs" empty="No SOS alerts recorded.">
            {(data?.sosSummary.emergencyAuditTrail || []).map((alert) => (
              <Row key={alert.id} title={`${alert.residentName} - ${readable(alert.status)}`} meta={`${formatDateTime(alert.createdAt)}${alert.resolvedAt ? ` - Resolved ${formatDateTime(alert.resolvedAt)}` : ''}`} />
            ))}
          </TableCard>
          <TableCard title="Maintenance Activity" empty="No maintenance requests.">
            {(data?.maintenanceActivity || []).map((request) => (
              <Row key={request.id} title={`${readable(request.category)} - ${readable(request.status)}`} meta={`${request.user?.profile?.fullName || request.user?.email || 'Resident'} - ${request.description}`} />
            ))}
          </TableCard>
          <TableCard title="Audit Logs" empty="No audit logs yet.">
            {(data?.auditLogs || []).map((log) => (
              <Row key={log.id} title={`${readable(log.action)} - ${log.entityType}`} meta={`${log.actor?.profile?.fullName || log.actor?.email || 'System'} - ${formatDateTime(log.createdAt)}`} />
            ))}
          </TableCard>
        </div>

      </AppShell>
    </ProtectedRoute>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TableCard({ title, empty, children }: { title: string; empty: string; children: ReactNode[] | ReactNode }) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : children ? 1 : 0;
  return (
    <Card>
      <CardHeader><h2 className="text-lg font-semibold text-slate-900">{title}</h2></CardHeader>
      <CardBody>
        <div className="space-y-2">
          {count ? children : <p className="text-sm text-slate-500">{empty}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

function Row({ title, meta, href }: { title: string; meta: string; href?: string }) {
  const content = (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{meta}</p>
    </div>
  );
  if (!href) return content;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="block hover:border-brand-300">
      {content}
    </a>
  );
}
