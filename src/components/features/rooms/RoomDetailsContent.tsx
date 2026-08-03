'use client';

import Link from 'next/link';
import { Building2, Home, MapPin, Users } from 'lucide-react';
import type { RoomPageDetail } from '@/lib/api/properties';
import PropertyRoomCard from '@/components/features/properties/PropertyRoomCard';
import { getImageUrl } from '@/lib/format/image-url';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import {
  displayStatusLabel,
  formatBuildingAddress,
  formatShortDate,
  getRoomTypeStats,
  googleMapsUrl,
  toDisplayRoomStatus,
} from '@/components/features/properties/property-utils';

const LATO = 'var(--font-lato), Lato, sans-serif';
const TEAL = '#39CCCC';

interface RoomDetailsContentProps {
  detail: RoomPageDetail;
  /** Hide pencil / edit affordance on the room card (e.g. inside view modal). */
  hideRoomEdit?: boolean;
}

function cardClassName() {
  return 'overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)]';
}

export default function RoomDetailsContent({
  detail,
  hideRoomEdit = false,
}: RoomDetailsContentProps) {
  return (
    <div className="space-y-6" style={{ fontFamily: LATO }}>
      <div>
        <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Room</p>
        <PropertyRoomCard room={detail.room} isActive hideEdit={hideRoomEdit} />
      </div>

      <RoomDetailsCard detail={detail} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FinancialSnapshotCard detail={detail} />
        <OccupancySnapshotCard detail={detail} />
      </div>

      <AssignmentHistoryCard detail={detail} />

      <BuildingSummaryCard detail={detail} />
    </div>
  );
}

function RoomDetailsCard({ detail }: { detail: RoomPageDetail }) {
  const { room } = detail;
  const displayStatus = toDisplayRoomStatus(room.roomStatus);
  const { bedroomsLabel } = getRoomTypeStats(room.roomType);
  const roomTypeLabel = room.roomType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Room details</p>
      <div className={`${cardClassName()} p-5`}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <DetailItem label="Room type" value={roomTypeLabel || bedroomsLabel} />
          <DetailItem
            label="Floor"
            value={room.floorNumber != null ? String(room.floorNumber) : '—'}
          />
          <DetailItem
            label="Size"
            value={
              room.squareFootage != null && Number.isFinite(room.squareFootage)
                ? `${Math.round(room.squareFootage)} sqft`
                : '—'
            }
          />
          <DetailItem label="Monthly rate" value={formatCurrency(room.monthlyRate)} emphasize />
          <DetailItem
            label="Deposit"
            value={
              room.depositAmount != null && room.depositAmount > 0
                ? formatCurrency(room.depositAmount)
                : '—'
            }
          />
          <DetailItem label="Status" value={displayStatusLabel(displayStatus)} />
        </dl>

        {room.description && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-2 text-[12px] font-bold leading-none text-gray-900">Description</p>
            <p className="text-[13px] font-normal leading-relaxed text-gray-600">{room.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-normal leading-none text-gray-500">{label}</dt>
      <dd
        className={
          emphasize
            ? 'mt-1.5 text-[16px] font-bold leading-none text-gray-900'
            : 'mt-1.5 text-[13px] font-medium leading-none text-gray-900 capitalize'
        }
      >
        {value}
      </dd>
    </div>
  );
}

function FinancialSnapshotCard({ detail }: { detail: RoomPageDetail }) {
  const { financialSummary } = detail;

  return (
    <div className={`${cardClassName()} p-4`}>
      <p className="mb-3 text-[12px] font-bold leading-none text-gray-900">Financials</p>
      <dl className="space-y-2.5 text-[12px] font-normal leading-none">
        <SnapshotRow
          label="Current rate"
          value={formatCurrency(financialSummary.currentMonthlyRate || detail.room.monthlyRate)}
        />
        <SnapshotRow
          label="Overdue"
          value={formatCurrency(financialSummary.overdueAmount)}
          valueClassName={financialSummary.overdueAmount > 0 ? 'text-amber-600' : undefined}
        />
        <SnapshotRow label="Pending" value={formatCurrency(financialSummary.pendingAmount)} />
        <SnapshotRow
          label="Deposit received"
          value={formatCurrency(financialSummary.depositReceived)}
        />
        <SnapshotRow label="Paid (12 mo)" value={formatCurrency(financialSummary.totalPayments)} />
      </dl>
    </div>
  );
}

function OccupancySnapshotCard({ detail }: { detail: RoomPageDetail }) {
  const { occupancyMetrics, room } = detail;

  return (
    <div className={`${cardClassName()} p-4`}>
      <p className="mb-3 text-[12px] font-bold leading-none text-gray-900">Occupancy</p>
      <dl className="space-y-2.5 text-[12px] font-normal leading-none">
        <SnapshotRow label="Assignments" value={String(occupancyMetrics.totalAssignments)} />
        <SnapshotRow
          label="Occupancy rate"
          value={`${Math.round(occupancyMetrics.occupancyRatePercent)}%`}
        />
        <SnapshotRow label="Created" value={formatShortDate(room.createdAt)} />
        <SnapshotRow label="Last updated" value={formatShortDate(room.updatedAt)} />
      </dl>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right font-medium text-gray-900 ${valueClassName || ''}`}>{value}</dd>
    </div>
  );
}

function AssignmentHistoryCard({ detail }: { detail: RoomPageDetail }) {
  const history = detail.assignmentHistory || [];

  return (
    <div>
      <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Assignment history</p>
      <div className={cardClassName()}>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-gray-400">No assignment history</p>
        ) : (
          <ul>
            {history.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  {item.tenantId ? (
                    <Link
                      href={`/admin/tenants/${item.tenantId}`}
                      className="truncate text-[13px] font-bold leading-none text-gray-900 hover:underline"
                    >
                      {item.tenantName}
                    </Link>
                  ) : (
                    <p className="truncate text-[13px] font-bold leading-none text-gray-900">
                      {item.tenantName}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] font-normal leading-none text-gray-500">
                    {formatShortDate(item.startDate)}
                    {' – '}
                    {item.endDate ? formatShortDate(item.endDate) : 'Present'}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase leading-none text-gray-600">
                    {item.assignmentStatus.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[12px] font-medium leading-none text-gray-900">
                    {formatCurrency(item.monthlyRate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BuildingSummaryCard({ detail }: { detail: RoomPageDetail }) {
  const { building, buildingImages } = detail;
  const address = formatBuildingAddress(building);
  const hero = buildingImages[0] ? getImageUrl(buildingImages[0].filePath) : null;
  const mapsHref = googleMapsUrl(address);

  return (
    <div>
      <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Property</p>
      <div className={cardClassName()}>
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-28 w-full flex-shrink-0 bg-gray-100 sm:h-auto sm:w-[160px]">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt={building.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[7rem] items-center justify-center text-gray-400">
                <Building2 className="h-7 w-7" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2 p-4">
            <Link
              href={`/admin/properties?buildingId=${building.id}`}
              className="text-[16px] font-bold leading-none text-gray-900 hover:underline"
            >
              {building.name}
            </Link>
            <p className="text-[12px] font-normal leading-snug text-gray-500">{address}</p>

            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-normal leading-none text-gray-500 hover:text-gray-700"
            >
              <MapPin className="h-4 w-4" style={{ color: TEAL }} />
              Open on Google Maps
            </a>

            <div className="mt-auto flex flex-wrap items-center gap-4 pt-1 text-[12px] font-normal leading-none text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Home className="h-4 w-4" style={{ color: TEAL }} />
                {building.totalUnits || 0} Rooms
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" style={{ color: TEAL }} />
                {building.occupiedUnits || 0} Tenants
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
