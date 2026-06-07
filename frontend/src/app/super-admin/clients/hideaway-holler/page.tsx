'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  HeartPulse,
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

interface ClientDashboard {
  client: {
    id: string;
    slug: string;
    name: string;
    billingEmail?: string | null;
    stripeCustomerId?: string | null;
    payee: string;
  };
  dashboardCards: Record<string, any>;
  subscription?: {
    status: string;
    planName?: string | null;
    currentPeriodEnd?: string | null;
  } | null;
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
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
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
  RESOLVED: 'bg-slate-200 text-slate-700',
  CANCELED: 'bg-slate-200 text-slate-700',
  INCOMPLETE: 'bg-slate-200 text-slate-700',
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

function formatMoney(cents?: number | null, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100);
}

function formatDuration(seconds?: number | null) {
  if (seconds == null) return 'Not enough data';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
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
  const [businessName, setBusinessName] = useState('Hideaway Holler');
  const [billingEmail, setBillingEmail] = useState('');
  const [setupFeeAmount, setSetupFeeAmount] = useState(0);
  const [setupFeeStatus, setSetupFeeStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api<ClientDashboard>('/business-billing/super-admin-client-dashboard');
      setData(response);
      setBusinessName(response.client.name || 'Hideaway Holler');
      setBillingEmail(response.client.billingEmail || '');
      setSetupFeeAmount(response.dashboardCards.setupFeeAmount || 0);
      setSetupFeeStatus(response.dashboardCards.setupFeePaymentStatus || 'PENDING');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load client dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    setActionLoading('save');
    setError('');
    setMessage('');
    try {
      await api('/business-billing/super-admin-account', {
        method: 'PATCH',
        body: { businessName, billingEmail, setupFeeAmount, setupFeeStatus },
      });
      setMessage('Hideaway Holler client account saved.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save client account');
    } finally {
      setActionLoading(null);
    }
  };

  const syncStripe = async () => {
    setActionLoading('sync');
    setError('');
    setMessage('');
    try {
      await api('/business-billing/super-admin-sync-stripe', { method: 'POST' });
      setMessage('Stripe records synced.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sync Stripe records');
    } finally {
      setActionLoading(null);
    }
  };

  const cards = data?.dashboardCards;
  const healthKey = data?.accountHealth.status?.toUpperCase();

  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Super Admin / Clients / Hideaway Holler</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Hideaway Holler Account Dashboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              AppCreatives LLC office view for client billing, account health, user activity, SOS history, leases, maintenance, and audit logs.
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

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Account warnings are visible here for AppCreatives and in business-admin billing only. Resident portal access is never blocked by subscription status.
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total payments received" value={formatMoney(cards?.totalPaymentsReceived)} icon={CreditCard} />
          <StatCard title="Monthly recurring revenue" value={formatMoney(cards?.monthlyRecurringRevenue)} icon={Activity} />
          <StatCard title="Outstanding balance" value={formatMoney(cards?.outstandingBalance)} icon={AlertTriangle} accent="text-amber-700 bg-amber-50" />
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">Account health</p>
              <Badge className={`mt-2 ${statusStyles[healthKey || ''] || 'bg-slate-200 text-slate-700'}`}>{data?.accountHealth.status || 'Loading'}</Badge>
            </CardBody>
          </Card>
          <StatCard title="Next billing date" value={formatDate(cards?.nextBillingDate)} icon={CreditCard} />
          <StatCard title="Subscription status" value={readable(cards?.subscriptionStatus)} icon={ShieldCheck} />
          <StatCard title="Setup fee status" value={readable(cards?.setupFeePaymentStatus)} icon={CheckCircle2} />
          <StatCard title="Active users connected" value={cards?.activeUsersConnected ?? '...'} icon={Users} />
          <StatCard title="Residents" value={cards?.residents ?? '...'} icon={Users} />
          <StatCard title="Admins" value={cards?.admins ?? '...'} icon={ShieldCheck} />
          <StatCard title="Active leases" value={cards?.activeLeases ?? '...'} icon={FileText} />
          <StatCard title="Completed leases" value={cards?.completedLeases ?? '...'} icon={FileText} />
          <StatCard title="Open SOS emergencies" value={cards?.openSosEmergencies ?? '...'} icon={HeartPulse} accent="text-red-700 bg-red-50" />
          <StatCard title="Resolved SOS emergencies" value={cards?.resolvedSosEmergencies ?? '...'} icon={HeartPulse} />
          <StatCard title="Total SOS alerts" value={cards?.totalSosAlerts ?? '...'} icon={AlertTriangle} />
          <StatCard title="Last SOS alert" value={formatDate(cards?.lastSosAlertDate)} icon={AlertTriangle} />
          <StatCard title="Unresolved maintenance" value={cards?.unresolvedMaintenanceRequests ?? '...'} icon={Wrench} />
          <StatCard title="Pending community posts" value={cards?.pendingCommunityPosts ?? '...'} icon={Activity} />
          <StatCard title="Recent login activity" value={cards?.recentLoginActivity ?? '...'} icon={Users} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Client Management</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={saveAccount} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Client Business
                  <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Billing Email
                  <input type="email" value={billingEmail} onChange={(event) => setBillingEmail(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Setup Fee Amount
                    <input type="number" min={0} step={1} value={setupFeeAmount} onChange={(event) => setSetupFeeAmount(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Setup Fee Status
                    <select value={setupFeeStatus} onChange={(event) => setSetupFeeStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="WAIVED">Waived</option>
                      <option value="NOT_REQUIRED">Not required</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" loading={actionLoading === 'save'}>Save Client</Button>
                  <Button type="button" variant="outline" onClick={syncStripe} loading={actionLoading === 'sync'} disabled={!data?.client.stripeCustomerId}>Sync Stripe</Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Payment Summary</h2>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2">
                <Summary label="Total paid to AppCreatives LLC" value={formatMoney(data?.paymentSummary.totalPaidToAppCreatives)} />
                <Summary label="Payments this month" value={formatMoney(data?.paymentSummary.paymentsThisMonth)} />
                <Summary label="Payments this year" value={formatMoney(data?.paymentSummary.paymentsThisYear)} />
                <Summary label="Failed payments" value={data?.paymentSummary.failedPayments ?? 0} />
                <Summary label="Pending invoices" value={data?.paymentSummary.pendingInvoices ?? 0} />
                <Summary label="Manual payments recorded" value={data?.paymentSummary.manualPaymentsRecorded ?? 0} />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-slate-800">Stripe payment references</p>
                {(data?.paymentSummary.stripePaymentReferences || []).slice(0, 6).map((payment: any) => (
                  <div key={payment.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-900">{formatMoney(payment.amount, payment.currency)} - {readable(payment.status)}</p>
                    <p className="break-all text-xs text-slate-500">{payment.stripePaymentIntentId || payment.stripeChargeId}</p>
                  </div>
                ))}
                {!data?.paymentSummary.stripePaymentReferences?.length && <p className="text-sm text-slate-500">No Stripe payment references yet.</p>}
              </div>
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
                <Summary label="Alumni users" value={data?.userSummary.alumniUsers ?? 0} />
                <Summary label="Admin users" value={data?.userSummary.adminUsers ?? 0} />
                <Summary label="Inactive users" value={data?.userSummary.inactiveUsers ?? 0} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900">SOS Summary</h2></CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <Summary label="Total SOS alerts" value={data?.sosSummary.totalSosAlerts ?? 0} />
                <Summary label="Active SOS alerts" value={data?.sosSummary.activeSosAlerts ?? 0} />
                <Summary label="Acknowledged SOS alerts" value={data?.sosSummary.acknowledgedSosAlerts ?? 0} />
                <Summary label="Resolved SOS alerts" value={data?.sosSummary.resolvedSosAlerts ?? 0} />
                <Summary label="Average response time" value={formatDuration(data?.sosSummary.averageResponseSeconds)} />
                <Summary label="Last emergency event" value={data?.sosSummary.lastEmergencyEvent ? readable(data.sosSummary.lastEmergencyEvent.eventType) : 'None'} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900">Account Health Factors</h2></CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                {Object.entries(data?.accountHealth.factors || {}).map(([key, value]) => (
                  <Summary key={key} label={readable(key)} value={String(value)} />
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <TableCard title="Connected Users" empty="No connected users yet.">
            {(data?.userSummary.connectedUsers || []).map((user) => (
              <Row key={user.id} title={user.profile?.fullName || user.email} meta={`${user.email} - ${readable(user.role)} - ${readable(user.profile?.currentStatus)}`} />
            ))}
          </TableCard>

          <TableCard title="Recent Login Activity" empty="No login audit activity yet.">
            {(data?.auditLogs || []).filter((log) => log.action === 'USER_LOGIN').slice(0, 10).map((log) => (
              <Row key={log.id} title={log.actor?.profile?.fullName || log.actor?.email || 'User'} meta={`${log.actor?.email || 'Unknown email'} - ${formatDateTime(log.createdAt)}`} />
            ))}
          </TableCard>

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

          <TableCard title="Invoice History" empty="No invoices yet.">
            {(data?.invoices || []).map((invoice) => (
              <Row key={invoice.id} title={`${invoice.invoiceNumber || 'Stripe invoice'} - ${readable(invoice.status)}`} meta={`${formatMoney(invoice.amountDue, invoice.currency)} due / ${formatMoney(invoice.amountPaid, invoice.currency)} paid`} href={invoice.hostedInvoiceUrl || invoice.invoicePdf || undefined} />
            ))}
          </TableCard>

          <TableCard title="Payment History" empty="No payments yet.">
            {(data?.payments || []).map((payment) => (
              <Row key={payment.id} title={`${formatMoney(payment.amount, payment.currency)} - ${readable(payment.status)}`} meta={`${formatDateTime(payment.paidAt || payment.createdAt)} ${payment.stripePaymentIntentId ? `- ${payment.stripePaymentIntentId}` : ''}`} href={payment.receiptUrl || undefined} />
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
