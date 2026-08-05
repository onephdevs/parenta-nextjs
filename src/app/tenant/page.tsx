'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  FileText,
  Wrench,
  Calendar,
  User,
  MapPin,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PaymentStatusBadge } from '@/components/domain/StatusBadges';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import {
  useTenantData,
  fetchTenantProfile,
  fetchTenantBalance,
  fetchTenantPayments,
  fetchTenantMaintenance,
} from '@/hooks/useTenantPortalData';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

interface TenantDashboardData {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  roomAssignment: {
    roomId: string;
    roomNumber: string;
    floorNumber?: number;
    roomType?: string;
    buildingId: string;
    buildingName: string;
    address: string;
    assignmentStart: string;
    assignmentEnd?: string;
    monthlyRate: number;
    depositPaid?: number;
    advancePaid?: number;
    utilityDepositPaid?: number;
  } | null;
}

interface RecentPayment {
  id: string;
  date: string;
  amount: number;
  status: string;
  type: string;
}

interface MaintenanceItem {
  id: string;
  title: string;
  status: string;
  date: string;
}

type DueTone = 'ok' | 'upcoming' | 'warning' | 'danger';

interface DueStatus {
  label: string;
  tone: DueTone;
  hasAmountDue: boolean;
}

const QUICK_ACTIONS = [
  { title: 'Documents', href: '/tenant/documents', icon: FileText },
  { title: 'Maintenance', href: '/tenant/maintenance', icon: Wrench },
  { title: 'My profile', href: '/tenant/profile?section=personal', icon: User },
  { title: 'Statements', href: '/tenant/payments?tab=statements', icon: BarChart3 },
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateShort(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntil(dueDate: string) {
  const due = startOfLocalDay(new Date(dueDate));
  const today = startOfLocalDay(new Date());
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDueStatus(dueDate: string | null, dueAmount: number | null): DueStatus {
  if (dueAmount == null || dueAmount <= 0 || !dueDate) {
    return {
      label: 'ALL CAUGHT UP',
      tone: 'ok',
      hasAmountDue: false,
    };
  }

  const days = daysUntil(dueDate);
  const dateLabel = formatDateShort(dueDate);

  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      label: `OVERDUE BY ${overdue} DAY${overdue === 1 ? '' : 'S'} · ${dateLabel}`,
      tone: 'danger',
      hasAmountDue: true,
    };
  }
  if (days === 0) {
    return {
      label: `DUE TODAY · ${dateLabel}`,
      tone: 'danger',
      hasAmountDue: true,
    };
  }
  if (days === 1) {
    return {
      label: `DUE TOMORROW · ${dateLabel}`,
      tone: 'warning',
      hasAmountDue: true,
    };
  }
  if (days <= 7) {
    return {
      label: `DUE IN ${days} DAYS · ${dateLabel}`,
      tone: 'warning',
      hasAmountDue: true,
    };
  }
  return {
    label: `DUE ${dateLabel}`,
    tone: 'upcoming',
    hasAmountDue: true,
  };
}

function leaseMonthsLeft(endDate?: string | null) {
  if (!endDate) return null;
  const end = startOfLocalDay(new Date(endDate));
  const today = startOfLocalDay(new Date());
  if (end < today) return 0;
  const months =
    (end.getFullYear() - today.getFullYear()) * 12 +
    (end.getMonth() - today.getMonth()) -
    (end.getDate() < today.getDate() ? 1 : 0);
  return Math.max(0, months);
}

function applyBalance(
  data: Record<string, unknown>,
  setters: {
    setOutstandingBalance: (v: number | null) => void;
    setPastDueTotal: (v: number | null) => void;
    setNextDueDate: (v: string | null) => void;
    setNextDueAmount: (v: number | null) => void;
  }
) {
  const pastDueTotal =
    data.pastDueTotal != null
      ? Number(data.pastDueTotal)
      : data.total != null
        ? Number(data.total)
        : 0;
  setters.setPastDueTotal(pastDueTotal);
  setters.setOutstandingBalance(
    typeof data.outstanding === 'number' ? data.outstanding : Number(data.outstanding) || 0
  );
  setters.setNextDueDate(data.nextDueDate ? String(data.nextDueDate) : null);
  setters.setNextDueAmount(data.nextAmount != null ? Number(data.nextAmount) : null);
}

function mapRecentPayments(paymentsData: Record<string, unknown>): RecentPayment[] {
  const history = Array.isArray(paymentsData.history) ? paymentsData.history : [];
  return history.slice(0, 3).map((p: Record<string, unknown>) => ({
    id: String(p.id),
    date: String(p.paymentDate || p.payment_date || ''),
    amount: Number(p.amount) || 0,
    status: String(p.status || p.paymentStatus || p.payment_status || 'pending'),
    type: String(p.paymentType || p.payment_type || 'Rent'),
  }));
}

function mapMaintenancePreview(data: { requests: unknown[] }): MaintenanceItem[] {
  return (data.requests || []).slice(0, 2).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      title: String(row.title),
      status: String(row.status || 'open'),
      date: String(row.createdAt || row.created_at || ''),
    };
  });
}

export default function TenantDashboard() {
  const { data: session, status } = useSession();
  const { canAccess, isPreview, isLoading: gateLoading } = useTenantPortalGate();
  const { load, getCached, isLoading: cacheLoading } = useTenantData();
  const theme = useTenantTheme();
  const router = useRouter();
  const [tenantData, setTenantData] = useState<TenantDashboardData | null>(
    () => getCached<TenantDashboardData>('profile') ?? null
  );
  const [nextDueDate, setNextDueDate] = useState<string | null>(() => {
    const bal = getCached<Record<string, unknown>>('balance');
    return bal?.nextDueDate ? String(bal.nextDueDate) : null;
  });
  const [nextDueAmount, setNextDueAmount] = useState<number | null>(() => {
    const bal = getCached<Record<string, unknown>>('balance');
    return bal?.nextAmount != null ? Number(bal.nextAmount) : null;
  });
  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(() => {
    const bal = getCached<Record<string, unknown>>('balance');
    return bal?.outstanding != null ? Number(bal.outstanding) : null;
  });
  const [pastDueTotal, setPastDueTotal] = useState<number | null>(() => {
    const bal = getCached<Record<string, unknown>>('balance');
    if (bal?.pastDueTotal != null) return Number(bal.pastDueTotal);
    return bal?.total != null ? Number(bal.total) : null;
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>(() => {
    const payments = getCached<Record<string, unknown>>('payments');
    return payments ? mapRecentPayments(payments) : [];
  });
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceItem[]>(() => {
    const maint = getCached<{ requests: unknown[] }>('maintenance');
    return maint ? mapMaintenancePreview(maint) : [];
  });

  useEffect(() => {
    if (gateLoading || status === 'loading') return;

    if (canAccess) {
      void load('profile', fetchTenantProfile)
        .then((data) => setTenantData(data as unknown as TenantDashboardData))
        .catch((err) => console.error('Error fetching tenant data:', err));

      const cachedBalance = getCached<Record<string, unknown>>('balance');
      const balanceNeedsRefresh =
        cachedBalance == null || typeof cachedBalance.pastDue !== 'number';
      void load('balance', fetchTenantBalance, { force: balanceNeedsRefresh })
        .then((data) =>
          applyBalance(data, {
            setOutstandingBalance,
            setPastDueTotal,
            setNextDueDate,
            setNextDueAmount,
          })
        )
        .catch((err) => console.error('Error fetching balance:', err));

      void load('payments', fetchTenantPayments)
        .then((data) => setRecentPayments(mapRecentPayments(data)))
        .catch((err) => console.error('Error fetching payment history:', err));

      void load('maintenance', fetchTenantMaintenance)
        .then((data) => setMaintenanceRequests(mapMaintenancePreview(data)))
        .catch((err) => console.error('Error fetching maintenance requests:', err));
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/auth/tenant/signin');
      return;
    }

    if (status === 'authenticated' && session?.user?.role === 'admin' && !isPreview) {
      router.push('/admin');
    }
  }, [status, session, router, canAccess, gateLoading, isPreview]);

  const showSkeleton =
    status === 'loading' ||
    gateLoading ||
    (!tenantData && cacheLoading('profile'));

  if (showSkeleton) {
    return <TenantPageSkeleton variant="home" />;
  }

  if (!canAccess) return null;

  const firstName = tenantData?.profile?.firstName || session?.user?.firstName || 'Tenant';

  const assignment = tenantData?.roomAssignment;
  const hasAssignment = Boolean(assignment?.roomId);
  const monthlyRent =
    hasAssignment && typeof assignment?.monthlyRate === 'number' ? assignment.monthlyRate : null;
  const depositPaid =
    hasAssignment && typeof assignment?.depositPaid === 'number' && assignment.depositPaid > 0
      ? assignment.depositPaid
      : null;
  const advancePaid =
    hasAssignment && typeof assignment?.advancePaid === 'number' && assignment.advancePaid > 0
      ? assignment.advancePaid
      : null;

  const dueStatus = getDueStatus(nextDueDate, nextDueAmount);
  const monthsLeft = leaseMonthsLeft(assignment?.assignmentEnd);
  const openMaintenance = maintenanceRequests.filter((r) =>
    ['open', 'pending', 'scheduled', 'in_progress'].includes(r.status.toLowerCase())
  );

  const heroToneClass =
    theme.mode === 'light'
      ? dueStatus.tone === 'danger'
        ? 'bg-red-50 border-red-200'
        : dueStatus.tone === 'warning'
          ? 'bg-amber-50 border-amber-200'
          : dueStatus.tone === 'upcoming'
            ? 'bg-amber-50/80 border-amber-100'
            : 'bg-emerald-50 border-emerald-200'
      : dueStatus.tone === 'danger'
        ? 'bg-red-950/80 border-red-800/60'
        : dueStatus.tone === 'warning'
          ? 'bg-amber-950/70 border-amber-800/50'
          : dueStatus.tone === 'upcoming'
            ? 'bg-amber-950/40 border-amber-900/40'
            : 'bg-emerald-950/50 border-emerald-800/40';

  const heroTextClass =
    theme.mode === 'light'
      ? dueStatus.tone === 'danger'
        ? 'text-red-700'
        : dueStatus.tone === 'ok'
          ? 'text-emerald-700'
          : 'text-amber-700'
      : dueStatus.tone === 'danger'
        ? 'text-red-300'
        : dueStatus.tone === 'ok'
          ? 'text-emerald-300'
          : 'text-amber-300';

  const heroAmountClass =
    theme.mode === 'light'
      ? dueStatus.tone === 'danger'
        ? 'text-red-800'
        : dueStatus.tone === 'ok'
          ? 'text-emerald-800'
          : 'text-amber-800'
      : dueStatus.tone === 'danger'
        ? 'text-red-200'
        : dueStatus.tone === 'ok'
          ? 'text-emerald-200'
          : 'text-amber-200';

  const payButtonClass =
    dueStatus.tone === 'danger'
      ? 'bg-red-500 text-white hover:bg-red-400'
      : dueStatus.tone === 'ok'
        ? theme.primaryButton
        : 'bg-emerald-500 text-white hover:bg-emerald-400';

  return (
    <div className={theme.page}>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <div>
          <h1 className={cn('text-3xl font-semibold tracking-tight', theme.shellHeader)}>
            Welcome, {firstName}
          </h1>
          <p className={cn('mt-1', theme.muted)}>
            {hasAssignment
              ? `Room ${assignment?.roomNumber} · ${assignment?.buildingName}`
              : 'No room assigned yet'}
          </p>
        </div>

        {/* Amount due hero */}
        <section
          className={cn(
            'flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6',
            heroToneClass
          )}
        >
          <div>
            <p className={cn('text-xs font-semibold uppercase tracking-wider', heroTextClass)}>
              {dueStatus.label}
            </p>
            <p className={cn('mt-2 text-4xl font-bold tracking-tight sm:text-5xl', heroAmountClass)}>
              {dueStatus.hasAmountDue && nextDueAmount != null
                ? formatCurrency(nextDueAmount)
                : formatCurrency(0)}
            </p>
            <p className={cn('mt-2 text-sm', heroTextClass, 'opacity-80')}>
              {pastDueTotal != null && pastDueTotal > 0
                ? `${formatCurrency(pastDueTotal)} past due`
                : dueStatus.hasAmountDue
                  ? 'Next invoice due'
                  : outstandingBalance != null && outstandingBalance > 0
                    ? 'Nothing past due'
                    : 'Nothing outstanding'}
            </p>
          </div>

          <Link href="/tenant/payments?tab=pay" className="shrink-0">
            <button
              type="button"
              className={cn(
                'w-full rounded-xl px-6 py-3 text-sm font-semibold transition sm:w-auto',
                payButtonClass
              )}
            >
              {dueStatus.hasAmountDue ? 'Pay now' : 'View payments'}
            </button>
          </Link>
        </section>

        {/* Unit + rent — shown once */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className={theme.cardPad}>
            <p className={cn('mb-3 text-xs font-medium uppercase tracking-wide', theme.shellMuted)}>
              Your unit
            </p>
            <div className={cn('space-y-3', theme.body)}>
              <div className="flex items-start gap-2.5">
                <MapPin className={cn('mt-0.5 h-4 w-4 shrink-0', theme.iconInfo)} />
                <p>{hasAssignment ? assignment?.address || 'Address not set' : 'Not assigned'}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className={cn('mt-0.5 h-4 w-4 shrink-0', theme.iconPending)} />
                <p>
                  {assignment?.assignmentStart ? (
                    <>
                      Lease: {formatDate(assignment.assignmentStart)}
                      {assignment.assignmentEnd
                        ? ` – ${formatDate(assignment.assignmentEnd)}`
                        : ''}
                      {monthsLeft != null && (
                        <span className={theme.listValue}>
                          {' '}
                          · {monthsLeft} month{monthsLeft === 1 ? '' : 's'} left
                        </span>
                      )}
                    </>
                  ) : (
                    'No active lease'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className={cn(theme.cardPad, 'flex flex-col justify-center')}>
            <p className={theme.label}>Monthly rent</p>
            <p className={cn('mt-1 text-3xl font-semibold', theme.shellHeader)}>
              {monthlyRent != null ? formatCurrency(monthlyRent) : '—'}
            </p>
            {(depositPaid != null || advancePaid != null) && (
              <p className={cn('mt-2', theme.muted)}>
                {[
                  depositPaid != null ? `Deposit ${formatCurrency(depositPaid)}` : null,
                  advancePaid != null ? `Advance ${formatCurrency(advancePaid)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        </section>

        {/* Quick actions — neutral icons */}
        <section>
          <h2 className={cn('mb-3', theme.sectionTitle)}>Quick actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className={cn(
                  theme.card,
                  'flex flex-col items-start gap-3 p-4 transition',
                  theme.mode === 'dark' ? 'hover:border-zinc-600' : 'hover:border-zinc-300'
                )}
              >
                <action.icon className={cn('h-5 w-5', theme.iconMoney)} strokeWidth={1.75} />
                <span className={cn('text-sm font-medium', theme.listValue)}>{action.title}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Compact activity */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className={theme.cardPad}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={theme.sectionTitle}>Recent payments</h2>
              <Link
                href="/tenant/payments?tab=history"
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                View all
              </Link>
            </div>
            {recentPayments.length > 0 ? (
              <ul className="space-y-2.5">
                {recentPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className={cn('truncate', theme.listValue)}>{payment.type}</p>
                      <p className={theme.subtle}>
                        {payment.date ? formatDate(payment.date) : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-medium', theme.shellHeader)}>
                        {formatCurrency(payment.amount)}
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <PaymentStatusBadge status={payment.status} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={theme.muted}>No payments yet. History will appear here.</p>
            )}
          </div>

          <div className={theme.cardPad}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={theme.sectionTitle}>Maintenance requests</h2>
              <Link
                href="/tenant/maintenance"
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                View all
              </Link>
            </div>
            {openMaintenance.length > 0 ? (
              <ul className="space-y-2.5">
                {openMaintenance.map((request) => (
                  <li key={request.id} className="text-sm">
                    <p className={cn('truncate', theme.listValue)}>{request.title}</p>
                    <p className={cn('capitalize', theme.subtle)}>{request.status}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={theme.muted}>No open requests.</p>
            )}
            <Link href="/tenant/maintenance" className="mt-4 block">
              <Button
                variant="outline"
                size="sm"
                className={cn('w-full', theme.outlineButton)}
              >
                {isPreview ? 'View requests' : 'Submit request'}
              </Button>
            </Link>
          </div>
        </section>

        {/* Quiet brand footer cue */}
        <p className={cn('flex items-center justify-center gap-2 pb-4 text-xs', theme.shellMuted)}>
          <Home className="h-3.5 w-3.5" />
          Maintenance and other requests stay available from quick actions
        </p>
      </main>
    </div>
  );
}
