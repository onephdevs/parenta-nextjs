'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  CreditCard,
  FileText,
  Wrench,
  DollarSign,
  Calendar,
  User,
  ArrowRight,
  Bell,
  MapPin,
} from 'lucide-react';
import { LogoutButton } from '@/components/features/LogoutButton';
import { PageHeader } from '@/components/layout/PageHeader';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import {
  PaymentStatusBadge,
  MaintenanceStatusBadge,
} from '@/components/domain/StatusBadges';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
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

const QUICK_ACTIONS = [
  {
    title: 'Pay Rent',
    description: 'Make a payment',
    href: '/tenant/payments',
    icon: CreditCard,
    iconClass: 'bg-green-100 text-green-600',
  },
  {
    title: 'Request Maintenance',
    description: 'Submit a request',
    href: '/tenant/maintenance',
    icon: Wrench,
    iconClass: 'bg-blue-100 text-blue-600',
  },
  {
    title: 'View Documents',
    description: 'Access your files',
    href: '/tenant/documents',
    icon: FileText,
    iconClass: 'bg-purple-100 text-purple-600',
  },
  {
    title: 'My Profile',
    description: 'Update your details',
    href: '/tenant/profile',
    icon: User,
    iconClass: 'bg-yellow-100 text-yellow-700',
  },
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

export default function TenantDashboard() {
  const { data: session, status } = useSession();
  const { canAccess, isPreview, isLoading: gateLoading, exitPreview } = useTenantPortalGate();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [tenantData, setTenantData] = useState<TenantDashboardData | null>(null);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchTenantData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenant/profile');
      const data = await response.json();

      if (data.success) {
        setTenantData(data.data);

        if (data.data.roomAssignment?.assignmentStart) {
          const startDate = new Date(data.data.roomAssignment.assignmentStart);
          const nextDue = new Date(startDate);
          nextDue.setMonth(nextDue.getMonth() + 1);
          nextDue.setDate(1);
          setNextDueDate(nextDue.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch('/api/tenant/payments');
      const data = await response.json();

      if (data.success && data.data?.history) {
        setRecentPayments(
          data.data.history.slice(0, 3).map((p: Record<string, unknown>) => ({
            id: String(p.id),
            date: String(p.paymentDate || p.payment_date || ''),
            amount: Number(p.amount) || 0,
            status: String(p.paymentStatus || p.payment_status || 'pending'),
            type: String(p.paymentType || p.payment_type || 'Rent'),
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const fetchMaintenanceRequests = async () => {
    try {
      const response = await fetch('/api/tenant/maintenance');
      const data = await response.json();

      if (data.success && data.data) {
        const requestsArray = Array.isArray(data.data.requests)
          ? data.data.requests
          : Array.isArray(data.data)
            ? data.data
            : [];

        setMaintenanceRequests(
          requestsArray.slice(0, 3).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            title: String(r.title),
            status: String(r.status || 'open'),
            date: String(r.createdAt || r.created_at || ''),
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    }
  };

  useEffect(() => {
    if (gateLoading || status === 'loading') return;

    if (canAccess) {
      void fetchTenantData();
      void fetchPaymentHistory();
      void fetchMaintenanceRequests();
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

  if (status === 'loading' || gateLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} showHeader={false} lines={2} />
            ))}
          </div>
          <SkeletonCard showHeader lines={5} />
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return null;
  }

  const displayName =
    tenantData?.profile?.firstName && tenantData?.profile?.lastName
      ? `${tenantData.profile.firstName} ${tenantData.profile.lastName}`
      : session?.user?.name || session?.user?.email || 'Tenant';

  const assignment = tenantData?.roomAssignment;
  const hasAssignment = Boolean(assignment?.roomId);
  const monthlyRent =
    hasAssignment && typeof assignment?.monthlyRate === 'number' ? assignment.monthlyRate : null;
  const securityDeposit =
    hasAssignment && typeof assignment?.depositPaid === 'number'
      ? assignment.depositPaid
      : null;
  const dueDate = hasAssignment ? nextDueDate : null;
  const leaseEnd = hasAssignment ? assignment?.assignmentEnd || null : null;
  const activeMaintenance = maintenanceRequests.filter((r) =>
    ['open', 'pending', 'scheduled', 'in_progress'].includes(r.status.toLowerCase())
  ).length;
  const hasNotificationItems =
    maintenanceRequests.some((r) => r.status.toLowerCase() !== 'completed') ||
    recentPayments.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-600 p-2">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Tenant Portal</p>
              <p className="text-xs text-gray-500">Your home dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <IconButton
                label="Notifications"
                onClick={() => setShowNotifications((open) => !open)}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {hasNotificationItems && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </IconButton>

              {showNotifications && (
                <Card
                  padding="none"
                  className="absolute right-0 z-50 mt-2 w-80 overflow-hidden shadow-lg"
                >
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">Recent updates</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {!hasNotificationItems ? (
                      <p className="px-4 py-6 text-center text-sm text-gray-500">
                        No recent updates
                      </p>
                    ) : (
                      <>
                        {maintenanceRequests.map((req) => (
                          <Link
                            key={req.id}
                            href="/tenant/maintenance"
                            onClick={() => setShowNotifications(false)}
                            className="block border-b border-gray-50 px-4 py-3 hover:bg-gray-50"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              Maintenance: {req.title}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">{req.status}</p>
                          </Link>
                        ))}
                        {recentPayments.map((payment) => (
                          <Link
                            key={payment.id}
                            href="/tenant/payments"
                            onClick={() => setShowNotifications(false)}
                            className="block border-b border-gray-50 px-4 py-3 hover:bg-gray-50"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              Payment: {formatCurrency(payment.amount)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">{payment.type}</p>
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 border-t border-gray-100 px-4 py-2 text-xs">
                    <Link
                      href="/tenant/maintenance"
                      className="text-green-700 hover:underline"
                      onClick={() => setShowNotifications(false)}
                    >
                      Maintenance
                    </Link>
                    <Link
                      href="/tenant/payments"
                      className="text-green-700 hover:underline"
                      onClick={() => setShowNotifications(false)}
                    >
                      Payments
                    </Link>
                  </div>
                </Card>
              )}
            </div>

            <div className="hidden items-center gap-3 border-l border-gray-200 pl-4 md:flex">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">Tenant</p>
              </div>
              <Avatar name={displayName} size="md" className="bg-green-600" />
            </div>

            {isPreview ? (
              <Button variant="outline" size="sm" onClick={() => void exitPreview()}>
                Exit preview
              </Button>
            ) : (
              <LogoutButton />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title={`Welcome, ${tenantData?.profile?.firstName || displayName}`}
          description="Manage your rental and stay updated with your property information."
          actions={
            <Link href="/tenant/profile">
              <Button variant="outline" size="sm" leftIcon={<User className="h-4 w-4" />}>
                Profile
              </Button>
            </Link>
          }
        />

        <Card className="overflow-hidden border-0 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-xl font-bold">Your Unit</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Home className="mt-0.5 h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Unit</p>
                    <p className="font-semibold">
                      {hasAssignment ? assignment?.roomNumber : 'Not assigned'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Building</p>
                    <p className="font-semibold">
                      {hasAssignment ? assignment?.buildingName || '—' : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Address</p>
                    <p className="font-semibold">
                      {hasAssignment ? assignment?.address || '—' : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="mb-4 text-xl font-bold">Lease Details</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Monthly rent</p>
                    <p className="font-semibold">
                      {monthlyRent != null ? formatCurrency(monthlyRent) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Next due date</p>
                    <p className="font-semibold">{dueDate ? formatDate(dueDate) : '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Lease ends</p>
                    <p className="font-semibold">
                      {hasAssignment ? (leaseEnd ? formatDate(leaseEnd) : 'Ongoing') : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Next payment"
            value={monthlyRent != null ? formatCurrency(monthlyRent) : '—'}
            subtitle={
              dueDate
                ? `Due ${formatDate(dueDate)}`
                : hasAssignment
                  ? 'No due date set'
                  : 'No active lease'
            }
            tone="green"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Recent payments"
            value={recentPayments.length}
            subtitle="Last recorded payments"
            tone="blue"
            icon={<CreditCard className="h-5 w-5" />}
          />
          <StatCard
            title="Active requests"
            value={activeMaintenance}
            subtitle={`${maintenanceRequests.length} shown`}
            tone="purple"
            icon={<Wrench className="h-5 w-5" />}
          />
          <StatCard
            title="Security deposit"
            value={securityDeposit != null ? formatCurrency(securityDeposit) : '—'}
            subtitle={hasAssignment ? 'On file' : 'No active lease'}
            tone="yellow"
            icon={<FileText className="h-5 w-5" />}
          />
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">Quick actions</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.title} href={action.href} className="group block">
                <Card className="h-full transition hover:border-green-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={cn('mb-3 w-fit rounded-lg p-2', action.iconClass)}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{action.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-green-600" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="flex items-center text-lg font-bold text-gray-900">
                <CreditCard className="mr-2 h-5 w-5 text-green-600" />
                Recent payments
              </h2>
            </CardHeader>
            <CardBody>
              {recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{payment.type}</p>
                        <p className="text-xs text-gray-500">
                          {payment.date ? formatDate(payment.date) : '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <div className="mt-1 flex justify-end">
                          <PaymentStatusBadge status={payment.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CreditCard className="h-10 w-10" />}
                  title="No recent payments"
                  description="Payment history will appear here."
                  className="py-8"
                />
              )}
            </CardBody>
            <CardFooter>
              <Link href="/tenant/payments" className="block w-full">
                <Button variant="success" className="w-full">
                  View all payments
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="flex items-center text-lg font-bold text-gray-900">
                <Wrench className="mr-2 h-5 w-5 text-green-600" />
                Maintenance requests
              </h2>
            </CardHeader>
            <CardBody>
              {maintenanceRequests.length > 0 ? (
                <div className="space-y-3">
                  {maintenanceRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{request.title}</p>
                        <p className="text-xs text-gray-500">
                          {request.date ? formatDate(request.date) : '—'}
                        </p>
                      </div>
                      <MaintenanceStatusBadge status={request.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Wrench className="h-10 w-10" />}
                  title="No maintenance requests"
                  description="Submit a request when something needs attention."
                  className="py-8"
                />
              )}
            </CardBody>
            <CardFooter>
              <Link href="/tenant/maintenance" className="block w-full">
                <Button variant="outline" className="w-full">
                  {isPreview ? 'View maintenance' : 'Submit new request'}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
