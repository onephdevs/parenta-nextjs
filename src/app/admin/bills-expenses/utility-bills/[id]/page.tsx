import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { ExternalLink, Zap, Droplets } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getRoomUtilityBillById } from '@/lib/api/room-utility-bills';
import {
  ALLOCATION_METHOD_LABELS,
  UTILITY_TYPE_LABELS,
  type UtilityType,
} from '@/lib/constants/bills-expenses';
import {
  Badge,
  Button,
  DetailSection,
  DescriptionItem,
  DescriptionList,
  PageHeader,
} from '@/components/ui';
import { InvoiceStatusBadge } from '@/components/domain/StatusBadges';

interface UtilityBillDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function utilityLabel(type: string) {
  const key = type as UtilityType;
  return UTILITY_TYPE_LABELS[key] || type.charAt(0).toUpperCase() + type.slice(1);
}

export default async function UtilityBillDetailPage({ params }: UtilityBillDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const bill = await getRoomUtilityBillById(id);
  if (!bill) {
    notFound();
  }

  const location =
    bill.buildingName && bill.roomNumber
      ? `${bill.buildingName} · Room ${bill.roomNumber}`
      : bill.buildingName || (bill.roomNumber ? `Room ${bill.roomNumber}` : 'Building-wide');

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title={`${utilityLabel(String(bill.utilityType))} bill`}
        description={location}
        backHref="/admin/bills-expenses/utility-bills"
        backLabel="Back to utility bills"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {bill.billStatus === 'disputed' ? (
              <Badge tone="purple">Disputed</Badge>
            ) : (
              <InvoiceStatusBadge status={bill.billStatus} />
            )}
            {bill.billUrl && (
              <a href={bill.billUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />}>
                  Open bill
                </Button>
              </a>
            )}
          </div>
        }
      />

      <DetailSection title="Overview">
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
              {String(bill.utilityType) === 'water' ? (
                <Droplets className="h-5 w-5 text-blue-500" />
              ) : (
                <Zap className="h-5 w-5 text-yellow-500" />
              )}
            </span>
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(bill.amount)}
            </span>
            <span className="text-sm text-gray-600">{utilityLabel(String(bill.utilityType))}</span>
          </div>
        </div>
      </DetailSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailSection title="Bill details" description="Provider, period, and amount.">
          <DescriptionList>
            <DescriptionItem label="Provider">{bill.providerName || '—'}</DescriptionItem>
            {bill.providerAccountNumber && (
              <DescriptionItem label="Account">{bill.providerAccountNumber}</DescriptionItem>
            )}
            <DescriptionItem label="Billing period">
              {formatDate(bill.billingPeriodStart)} – {formatDate(bill.billingPeriodEnd)}
            </DescriptionItem>
            <DescriptionItem label="Due date">{formatDate(bill.dueDate)}</DescriptionItem>
            <DescriptionItem label="Amount">
              <span className="font-semibold">{formatCurrency(bill.amount)}</span>
            </DescriptionItem>
            <DescriptionItem label="Status">
              {bill.billStatus === 'disputed' ? (
                <Badge tone="purple">Disputed</Badge>
              ) : (
                <InvoiceStatusBadge status={bill.billStatus} />
              )}
            </DescriptionItem>
          </DescriptionList>
        </DetailSection>

        <DetailSection title="Location" description="Where this bill applies.">
          <DescriptionList>
            <DescriptionItem label="Building">{bill.buildingName || '—'}</DescriptionItem>
            <DescriptionItem label="Room">
              {bill.roomNumber ? `Room ${bill.roomNumber}` : 'Building-wide / common area'}
            </DescriptionItem>
            <DescriptionItem label="Allocation">
              {ALLOCATION_METHOD_LABELS[bill.allocationMethod] || bill.allocationMethod}
            </DescriptionItem>
            <DescriptionItem label="Cost bearer">
              {bill.costBearer === 'OWNER' ? 'Owner' : 'Tenant'}
            </DescriptionItem>
          </DescriptionList>
        </DetailSection>
      </div>

      {(bill.usageAmount != null ||
        bill.meterReadingPrevious != null ||
        bill.meterReadingCurrent != null) && (
        <DetailSection title="Usage" description="Meter readings and consumption.">
          <DescriptionList>
            {bill.usageAmount != null && (
              <DescriptionItem label="Usage">
                {bill.usageAmount} {bill.usageUnit || ''}
              </DescriptionItem>
            )}
            {bill.meterReadingPrevious != null && (
              <DescriptionItem label="Previous reading">
                {bill.meterReadingPrevious}
              </DescriptionItem>
            )}
            {bill.meterReadingCurrent != null && (
              <DescriptionItem label="Current reading">{bill.meterReadingCurrent}</DescriptionItem>
            )}
          </DescriptionList>
        </DetailSection>
      )}

      {bill.notes && (
        <DetailSection title="Notes">
          <div className="border-t border-gray-200 px-4 py-5 text-sm text-gray-700 sm:px-6 whitespace-pre-wrap">
            {bill.notes}
          </div>
        </DetailSection>
      )}

      <DetailSection title="Record" description="When this bill was saved.">
        <DescriptionList>
          <DescriptionItem label="Created">{formatDate(bill.createdAt)}</DescriptionItem>
          <DescriptionItem label="Last updated">{formatDate(bill.updatedAt)}</DescriptionItem>
          <DescriptionItem label="Bill ID">
            <span className="font-mono text-xs">{bill.id}</span>
          </DescriptionItem>
        </DescriptionList>
      </DetailSection>
    </div>
  );
}
