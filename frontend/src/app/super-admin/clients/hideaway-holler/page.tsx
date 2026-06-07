'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CreditCard,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
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
  monthlySubscriptionAmount: number;
  billingFrequency: string;
  billingStartDate?: string | null;
  nextBillingDate?: string | null;
  paymentDueDay: number;
  gracePeriodDays: number;
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
  invoices: unknown[];
  payments: unknown[];
  serviceBilling?: ServiceBilling | null;
  maintenanceActivity: MaintenanceRow[];
  auditLogs: AuditLogRow[];
  stripe: {
    configured: boolean;
    checkoutReady: boolean;
    webhookConfigured: boolean;
    priceId: 'configured' | 'missing';
  };
}

interface ServiceBilling {
  subscription: {
    id: string;
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
  };
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
  invoices: ServiceInvoiceRow[];
  payments: ServicePaymentRow[];
}

interface ServiceInvoiceRow {
  id: string;
  invoiceNumber: string;
  monthNumber: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  subtotal: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  totalDue: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  status: string;
  squareCheckoutUrl?: string | null;
}

interface ServicePaymentRow {
  id: string;
  invoiceId?: string | null;
  amount: string | number;
  paymentDate: string;
  paymentMethod: string;
  paymentProvider?: string | null;
  providerPaymentId?: string | null;
  notes?: string | null;
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  profile?: { fullName?: string | null; currentStatus?: string | null } | null;
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

function readable(value?: string | null) {
  return (value || 'Not set').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not set';
}

function formatDollars(amount?: string | number | null) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDuration(seconds?: number | null) {
  if (seconds == null) return 'Not enough data';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
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

export default function HideawayHollerClientPage() {
  const [data, setData] = useState<ClientDashboard | null>(null);
  const [serviceForm, setServiceForm] = useState({
    taxRate: '',
    subscriptionStartDate: '',
    billingDay: 1,
    serviceSubscriptionStatus: 'not_started',
  });
  const [manualPaymentForm, setManualPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'manual',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const populateBillingForm = useCallback((response: ClientDashboard) => {
    const serviceSubscription = response.serviceBilling?.subscription;
    if (serviceSubscription) {
      setServiceForm({
        taxRate: String(serviceSubscription.taxRate ?? ''),
        subscriptionStartDate: toDateInput(serviceSubscription.subscriptionStartDate),
        billingDay: serviceSubscription.billingDay || 1,
        serviceSubscriptionStatus: serviceSubscription.serviceSubscriptionStatus || 'not_started',
      });
    }
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

  const saveServiceSettings = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('save-service-settings', async () => {
      await api('/business-billing/super-admin/service-subscription', {
        method: 'PATCH',
        body: {
          taxRate: Number(serviceForm.taxRate || 0),
          subscriptionStartDate: serviceForm.subscriptionStartDate || null,
          billingDay: serviceForm.billingDay,
          serviceSubscriptionStatus: serviceForm.serviceSubscriptionStatus,
        },
      });
    }, 'Service subscription settings saved.');
  };

  const startService = async () => {
    await runAction('start-service-subscription', async () => {
      await api('/business-billing/super-admin/service-subscription/start', { method: 'POST' });
    }, 'Service subscription started and first invoice generated.');
  };

  const generateCurrentServiceInvoice = async () => {
    await runAction('generate-service-invoice', async () => {
      await api('/business-billing/super-admin/service-subscription/generate-current-invoice', { method: 'POST' });
    }, 'Current service invoices generated.');
  };

  const recordManualServicePayment = async (event: FormEvent) => {
    event.preventDefault();
    await runAction('manual-service-payment', async () => {
      await api('/business-billing/super-admin/service-subscription/manual-payment', {
        method: 'POST',
        body: {
          invoiceId: manualPaymentForm.invoiceId || null,
          amount: Number(manualPaymentForm.amount || 0),
          paymentMethod: manualPaymentForm.paymentMethod,
          notes: manualPaymentForm.notes,
        },
      });
      setManualPaymentForm({ invoiceId: '', amount: '', paymentMethod: 'manual', notes: '' });
    }, 'Manual service payment recorded.');
  };

  const cards = data?.dashboardCards;
  const healthKey = data?.accountHealth.status?.toUpperCase();
  const serviceBilling = data?.serviceBilling;
  const billingConfigured = Boolean(serviceBilling && serviceBilling.subscription.serviceSubscriptionStatus !== 'not_started');
  const hasInvoices = (serviceBilling?.invoices || []).length > 0;
  const hasPayments = (serviceBilling?.payments || []).length > 0;

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
          <StatCard title="Outstanding balance" value={formatDollars(serviceBilling?.outstandingBalance)} icon={AlertTriangle} accent="text-amber-700 bg-amber-50" />
          <StatCard title="Current amount due" value={formatDollars(serviceBilling?.currentAmountDue)} icon={Activity} />
          <StatCard title="Subscription status" value={readable(serviceBilling?.subscription.serviceSubscriptionStatus)} icon={ShieldCheck} />
          <StatCard title="Next payment date" value={formatDate(serviceBilling?.subscription.nextPaymentDate)} icon={CreditCard} />
          <StatCard title="Total payments received" value={formatDollars(serviceBilling?.totalPaymentsReceived)} icon={CreditCard} />
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
              <h2 className="text-lg font-semibold text-slate-900">Client Billing & Subscription</h2>
              <p className="text-sm text-slate-500">Service and maintenance billing is calculated automatically after the subscription starts.</p>
            </CardHeader>
            <CardBody>
              <form onSubmit={saveServiceSettings} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Summary label="Business Name" value={data?.client.name || 'Hideaway Holler'} />
                  <Summary label="Current Plan" value={serviceBilling?.currentPlan || 'Not started'} />
                  <Summary label="Current Monthly Fee" value={`${formatDollars(serviceBilling?.currentMonthlyFee)} + tax`} />
                  <Summary label="Current Amount Due" value={formatDollars(serviceBilling?.currentAmountDue)} />
                  <Summary label="Outstanding Balance" value={formatDollars(serviceBilling?.outstandingBalance)} />
                  <Summary label="Next Payment Date" value={formatDate(serviceBilling?.subscription.nextPaymentDate)} />
                  <Summary label="Total Invoices Generated" value={serviceBilling?.totalInvoicesGenerated ?? 0} />
                  <Summary label="Paid / Unpaid / Past Due" value={`${serviceBilling?.paidInvoices ?? 0} / ${serviceBilling?.unpaidInvoices ?? 0} / ${serviceBilling?.pastDueInvoices ?? 0}`} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tax Rate (%)">
                    <input type="number" min={0} max={100} step={0.01} value={serviceForm.taxRate} onChange={(e) => setServiceForm({ ...serviceForm, taxRate: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" />
                  </Field>
                  <Field label="Subscription Start Date">
                    <input type="date" value={serviceForm.subscriptionStartDate} onChange={(e) => setServiceForm({ ...serviceForm, subscriptionStartDate: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Billing Day">
                    <input type="number" min={1} max={31} value={serviceForm.billingDay} onChange={(e) => setServiceForm({ ...serviceForm, billingDay: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Service Subscription Status">
                    <select value={serviceForm.serviceSubscriptionStatus} onChange={(e) => setServiceForm({ ...serviceForm, serviceSubscriptionStatus: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="not_started">Not Started</option>
                      <option value="active">Active</option>
                      <option value="past_due">Past Due</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={startService} loading={actionLoading === 'start-service-subscription'} disabled={serviceBilling?.subscription.serviceSubscriptionStatus === 'active'}>
                    Start Service Subscription
                  </Button>
                  <Button type="submit" variant="outline" loading={actionLoading === 'save-service-settings'}>
                    Edit Tax Rate
                  </Button>
                  <Button type="button" variant="outline" onClick={generateCurrentServiceInvoice} loading={actionLoading === 'generate-service-invoice'}>
                    Generate Current Invoice
                  </Button>
                </div>
              </form>

              <form onSubmit={recordManualServicePayment} className="mt-6 space-y-3 rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">Mark Manual Payment</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Invoice">
                    <select value={manualPaymentForm.invoiceId} onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, invoiceId: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="">Oldest unpaid invoice</option>
                      {(serviceBilling?.invoices || []).filter((invoice) => invoice.status !== 'paid').map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} - {formatDollars(invoice.balanceDue)} due</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Amount ($)">
                    <input type="number" min={0.01} step={0.01} value={manualPaymentForm.amount} onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, amount: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  </Field>
                  <Field label="Payment Method">
                    <select value={manualPaymentForm.paymentMethod} onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, paymentMethod: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="manual">Manual</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="square">Square</option>
                    </select>
                  </Field>
                  <Field label="Notes">
                    <input value={manualPaymentForm.notes} onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, notes: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </Field>
                </div>
                <Button type="submit" loading={actionLoading === 'manual-service-payment'}>Mark Manual Payment</Button>
              </form>
            </CardBody>
          </Card>

          <div className="space-y-4">
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
                    <Summary label="Total paid to AppCreatives LLC" value={formatDollars(serviceBilling?.totalPaymentsReceived)} />
                    <Summary label="Tax rate" value={`${Number(serviceBilling?.subscription.taxRate || 0).toFixed(2)}%`} />
                    <Summary label="Paid invoices" value={serviceBilling?.paidInvoices ?? 0} />
                    <Summary label="Unpaid invoices" value={serviceBilling?.unpaidInvoices ?? 0} />
                    <Summary label="Past due invoices" value={serviceBilling?.pastDueInvoices ?? 0} />
                    <Summary label="Last payment date" value={formatDate(serviceBilling?.subscription.lastPaymentDate)} />
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
                  {(serviceBilling?.invoices || []).map((invoice) => (
                    <div key={invoice.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">
                            {invoice.invoiceNumber} — Month {invoice.monthNumber} — {readable(invoice.status)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDollars(invoice.totalDue)} total · {formatDollars(invoice.balanceDue)} balance · Due {formatDate(invoice.dueDate)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Subtotal {formatDollars(invoice.subtotal)} + tax {formatDollars(invoice.taxAmount)} ({Number(invoice.taxRate).toFixed(2)}%)</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {invoice.squareCheckoutUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(invoice.squareCheckoutUrl || '', '_blank')}
                            >
                              View Invoice
                            </Button>
                          )}
                          <Badge className={statusStyles[readable(invoice.status).toUpperCase()] || 'bg-slate-200 text-slate-700'}>{readable(invoice.status)}</Badge>
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
                  {(serviceBilling?.payments || []).map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{formatDollars(payment.amount)} — {readable(payment.paymentMethod)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDateTime(payment.paymentDate)}
                        {payment.notes ? ` · ${payment.notes}` : ''}
                      </p>
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
