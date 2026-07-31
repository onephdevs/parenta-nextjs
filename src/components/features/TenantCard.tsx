'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Phone, Calendar, User, Mail, PhilippinePeso } from 'lucide-react';
import { Tenant } from '@/types/database';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TenantStatusBadge } from '@/components/domain/StatusBadges';
import { cn } from '@/lib/utils';

interface TenantCardProps {
  tenant: Tenant & {
    currentMonthlyRent?: number | null;
  };
}

function StatRow({
  icon,
  label,
  children,
  isEmpty = false,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="flex min-h-[1.5rem] items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 text-right font-medium',
          isEmpty ? 'italic text-gray-400' : 'text-gray-900'
        )}
      >
        {children}
      </span>
    </div>
  );
}

export default function TenantCard({ tenant }: TenantCardProps) {
  const fullName = `${tenant.firstName} ${tenant.lastName}`.trim() || 'Unnamed tenant';
  const monthlyRent = tenant.currentMonthlyRent;
  const hasRent = typeof monthlyRent === 'number' && monthlyRent > 0;
  const hasIncome = typeof tenant.monthlyIncome === 'number' && tenant.monthlyIncome > 0;
  const hasPhone = Boolean(tenant.phone?.trim());
  const hasEmail = Boolean(tenant.email?.trim());
  const hasMoveIn = Boolean(tenant.moveInDate);
  const hasEmergency = Boolean(tenant.emergencyContactName?.trim());
  const hasNotes = Boolean(tenant.notes?.trim());
  const detailHref = `/admin/tenants/${tenant.id}`;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const rentDisplay = hasRent
    ? `${formatCurrency(monthlyRent!)}/mo`
    : hasIncome
      ? formatCurrency(tenant.monthlyIncome!)
      : 'No rent set';

  return (
    <Card
      padding="none"
      className={cn(
        'flex h-full flex-col border border-gray-100 shadow-sm',
        'transition-all duration-200 hover:border-purple-100 hover:shadow-md'
      )}
    >
      <div className="flex h-full flex-col p-6">
        {/* Header — same structure as Building/Room cards */}
        <div className="min-h-[5.5rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Avatar
                name={fullName}
                size="md"
                className="mt-0.5 h-10 w-10 flex-shrink-0 text-sm"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold leading-snug text-gray-900">
                  <Link
                    href={detailHref}
                    className="line-clamp-2 break-words hover:text-purple-700"
                    title={fullName}
                  >
                    {fullName}
                  </Link>
                </h3>
                <p
                  className="mt-2 flex items-start gap-1.5 text-sm leading-snug text-gray-500"
                  title={hasEmail ? tenant.email! : undefined}
                >
                  <Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  <span
                    className={cn(
                      'line-clamp-2 break-words',
                      !hasEmail && 'italic text-gray-400'
                    )}
                  >
                    {hasEmail ? tenant.email : 'No email'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2.5 pt-0.5">
              <TenantStatusBadge status={tenant.tenantStatus || 'pending'} />
            </div>
          </div>
        </div>

        {/* Stats — label left / value right like RoomCard */}
        <div className="mt-5 space-y-3">
          <StatRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" isEmpty={!hasPhone}>
            {hasPhone ? tenant.phone : 'Not set'}
          </StatRow>

          <StatRow
            icon={<PhilippinePeso className="h-3.5 w-3.5" />}
            label={hasRent ? 'Rent' : hasIncome ? 'Income' : 'Rent'}
            isEmpty={!hasRent && !hasIncome}
          >
            {rentDisplay}
          </StatRow>

          <StatRow
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Move-in"
            isEmpty={!hasMoveIn}
          >
            {hasMoveIn ? formatDate(tenant.moveInDate!) : 'Not set'}
          </StatRow>
        </div>

        {/* Tertiary block — fixed height like Amenities on Building/Room */}
        <div className="mt-4 min-h-[3.5rem]">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Emergency / Notes
          </p>
          {hasEmergency ? (
            <div className="space-y-1">
              <p className="flex items-start gap-1.5 text-sm text-gray-700">
                <User className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <span className="line-clamp-2 break-words">
                  {tenant.emergencyContactName}
                  {tenant.emergencyContactRelationship
                    ? ` · ${tenant.emergencyContactRelationship}`
                    : ''}
                  {tenant.emergencyContactPhone ? ` · ${tenant.emergencyContactPhone}` : ''}
                </span>
              </p>
              {hasNotes && (
                <p className="line-clamp-1 text-sm text-gray-500">{tenant.notes}</p>
              )}
            </div>
          ) : hasNotes ? (
            <p className="line-clamp-2 text-sm text-gray-600">{tenant.notes}</p>
          ) : (
            <p className="text-sm italic text-gray-400">No details listed</p>
          )}
        </div>

        <div className="mt-auto flex gap-3 pt-6">
          <Link href={detailHref} className="flex-1">
            <Button className="w-full" size="sm">
              View Details
            </Button>
          </Link>
          <Link href={`/admin/tenants/${tenant.id}/edit`} className="flex-1">
            <Button className="w-full" variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
