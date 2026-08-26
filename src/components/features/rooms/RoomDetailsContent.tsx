'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  FileText,
  Home,
  MapPin,
  Paperclip,
  Phone,
  Mail,
  User,
  Users,
  Wallet,
  Building2,
} from 'lucide-react';
import type {
  PropertyRoomAsset,
  PropertyRoomDocument,
  PropertyRoomTenant,
  RoomPageDetail,
} from '@/lib/api/properties';
import { getImageUrl } from '@/lib/format/image-url';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { Button } from '@/components/ui/Button';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import {
  displayStatusLabel,
  formatArea,
  formatBuildingAddress,
  formatShortDate,
  getRoomTypeStats,
  googleMapsUrlForBuilding,
  toDisplayRoomStatus,
} from '@/components/features/properties/property-utils';
import { formatAmenityLabel } from '@/lib/format/amenities';
import { useNotifications } from '@/hooks/useNotifications';
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@/types/document';
import TenantProfileModal from '@/components/features/tenants/TenantProfileModal';
import AddTenantButton from '@/components/features/tenants/AddTenantButton';
import { EntityNotesPanel } from '@/components/features/notes/EntityNotesModal';
import RoomShowcaseGallery from '@/components/features/rooms/RoomShowcaseGallery';

const LATO = 'var(--font-lato), Lato, sans-serif';
const TEAL = '#39CCCC';

interface RoomDetailsContentProps {
  detail: RoomPageDetail;
  /** Hide pencil / edit affordance on the room card (e.g. inside view modal). */
  hideRoomEdit?: boolean;
  /** Modal view drops redundant building chrome and embeds the showcase gallery. */
  variant?: 'page' | 'modal';
  /** Called after a lease document is uploaded so the parent can refresh. */
  onDocumentsChanged?: () => void;
  /** Called after a tenant is created/assigned from the in-page modal. */
  onTenantCreated?: () => void;
}

/** Avoid "Unit Unit 1" when roomNumber already includes Unit. */
export function formatUnitLabel(roomNumber: string): string {
  const trimmed = (roomNumber || '').trim();
  if (!trimmed) return 'Unit';
  if (/^unit\b/i.test(trimmed)) return trimmed;
  return `Unit ${trimmed}`;
}

function cardClassName() {
  return 'overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)]';
}

function Field({
  label,
  value,
  emphasize = false,
  multiline = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={
          emphasize
            ? 'mt-1 text-base font-bold text-gray-900'
            : multiline
              ? 'mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800'
              : 'mt-1 text-sm font-medium text-gray-900'
        }
      >
        {value || '—'}
      </p>
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </span>
  );
}

function hasValue(value?: string | null) {
  return Boolean(value && value.trim() && value.trim() !== '—');
}

function isApplianceType(type: string) {
  const t = type.toLowerCase();
  return t.includes('appliance') || t.includes('electronic') || t.includes('equipment');
}

function isFurnitureType(type: string) {
  const t = type.toLowerCase();
  return t.includes('furniture') || t.includes('furnishing');
}

function formatAssetLabel(asset: PropertyRoomAsset) {
  const parts = [asset.assetName];
  if (asset.brand || asset.model) {
    parts.push([asset.brand, asset.model].filter(Boolean).join(' '));
  }
  return parts.filter(Boolean).join(' — ');
}

function splitAssets(assets: PropertyRoomAsset[]) {
  const appliances = assets.filter((a) => isApplianceType(a.assetType));
  const furniture = assets.filter((a) => isFurnitureType(a.assetType));
  const other = assets.filter(
    (a) => !isApplianceType(a.assetType) && !isFurnitureType(a.assetType)
  );
  return { appliances, furniture, other };
}

function findLeaseDocument(docs: PropertyRoomDocument[]) {
  return (
    docs.find((d) => {
      const hay = `${d.documentType || ''} ${d.documentName || ''}`.toLowerCase();
      return hay.includes('lease') || hay.includes('contract');
    }) || null
  );
}

function accountNoFromTenantId(tenantId: string) {
  return tenantId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function statusLabel(roomStatus: string) {
  const display = toDisplayRoomStatus(roomStatus);
  if (display === 'vacant') return 'Available';
  if (display === 'occupied') return 'Occupied';
  return displayStatusLabel(display);
}

export default function RoomDetailsContent({
  detail,
  variant = 'page',
  onDocumentsChanged,
  onTenantCreated,
}: RoomDetailsContentProps) {
  const { showSuccess, showError } = useNotifications();
  const leaseInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<PropertyRoomDocument[]>(
    detail.room.documents || []
  );
  const [uploadingLease, setUploadingLease] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [profileTenantId, setProfileTenantId] = useState<string | null>(null);
  const isModal = variant === 'modal';

  useEffect(() => {
    setDocuments(detail.room.documents || []);
  }, [detail.room.id, detail.room.documents]);

  const { room, building, financialSummary, assets = [] } = detail;
  const unitLabel = formatUnitLabel(room.roomNumber);
  const tenant = room.tenant;
  const { appliances, furniture, other } = splitAssets(assets);
  const amenityFallback = room.amenities.length ? room.amenities.join(', ') : '';
  const applianceText =
    [...appliances, ...other.filter((a) => !furniture.includes(a))]
      .map(formatAssetLabel)
      .join('\n') || amenityFallback;
  const furnitureText = furniture.map(formatAssetLabel).join('\n');
  const amountDue =
    (tenant?.overdueAmount || 0) + (tenant?.pendingAmount || 0) > 0
      ? (tenant?.overdueAmount || 0) + (tenant?.pendingAmount || 0)
      : financialSummary.unpaidBalance || 0;
  const isPastDue = (financialSummary.overdueAmount || 0) > 0;
  const isSettled = amountDue <= 0;
  const leaseDoc = findLeaseDocument(documents);
  const dueDate = tenant?.dueDate || financialSummary.nextDueDate;
  const deposit =
    tenant?.depositPaid ??
    financialSummary.depositReceived ??
    room.depositAmount ??
    0;
  const advance = tenant?.advancePaid ?? 0;
  const utilityDeposit = tenant?.utilityDepositPaid ?? 0;
  const history = detail.assignmentHistory || [];
  const showPayments = !isModal || Boolean(tenant);
  const showHistory = !isModal || history.length > 0;
  const { bedroomsLabel } = getRoomTypeStats(room.roomType);
  const areaLabel = formatArea(room.squareFootage);
  const amenityChips = room.amenities.slice(0, 8);

  const handleLeaseAttach = async (file: File) => {
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      showError('Unsupported file type. Use PDF, image, Word, Excel, or text.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showError(`File must be under ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    setUploadingLease(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append(
        'documentName',
        file.name?.replace(/\.[^.]+$/, '') || 'Lease Contract'
      );
      form.append('documentType', 'lease');
      form.append('roomId', room.id);
      form.append('buildingId', building.id);
      form.append('accessLevel', tenant ? 'tenant' : 'admin');
      if (tenant?.tenantId) form.append('tenantId', tenant.tenantId);

      const res = await fetch('/api/documents', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to attach lease');
      }

      const created = json.data as {
        id: string;
        documentName?: string;
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
        documentType?: string;
      };
      const mapped: PropertyRoomDocument = {
        id: String(created.id),
        documentName: created.documentName || file.name || 'Lease Contract',
        fileName: created.fileName || file.name,
        fileSize: created.fileSize,
        mimeType: created.mimeType || file.type,
        documentType: created.documentType || 'lease',
      };
      setDocuments((prev) => [mapped, ...prev.filter((d) => d.id !== mapped.id)]);
      showSuccess('Lease document attached');
      onDocumentsChanged?.();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to attach lease');
    } finally {
      setUploadingLease(false);
      if (leaseInputRef.current) leaseInputRef.current.value = '';
    }
  };

  const handleSendPaymentReminder = async () => {
    if (!tenant) return;
    setSendingReminder(true);
    try {
      const res = await fetch('/api/notifications/payment-reminder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.tenantId,
          amountDue,
          dueDate: dueDate || null,
          roomNumber: room.roomNumber,
          buildingName: building.name,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send payment reminder');
      }
      showSuccess(json.message || 'Payment reminder sent to tenant');
    } catch (err) {
      showError(
        err instanceof Error ? err.message : 'Failed to send payment reminder'
      );
    } finally {
      setSendingReminder(false);
    }
  };

  const leasePanel = (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3.5">
      <input
        ref={leaseInputRef}
        type="file"
        className="hidden"
        accept={[...SUPPORTED_FILE_TYPES, 'image/*'].join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleLeaseAttach(file);
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Lease contract
          </p>
          {leaseDoc ? (
            <a
              href={`/api/documents/${leaseDoc.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline"
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{leaseDoc.documentName || leaseDoc.fileName}</span>
            </a>
          ) : (
            <p className="mt-1 text-sm text-gray-600">No lease attached</p>
          )}
          <p className="mt-1 text-[11px] leading-snug text-gray-400">
            PDF or photo of the signed lease.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Paperclip className="h-4 w-4" />}
            isLoading={uploadingLease}
            isDisabled={uploadingLease}
            onClick={() => leaseInputRef.current?.click()}
          >
            {leaseDoc ? 'Replace' : 'Attach'}
          </Button>
          <TakePhotoButton
            size="sm"
            disabled={uploadingLease}
            onCapture={(file) => void handleLeaseAttach(file)}
            title="Take lease photo"
            description="Allow camera access if prompted, then capture the lease document."
            fileNamePrefix="lease"
          />
        </div>
      </div>
    </div>
  );

  const photosSection = (
    <div>
      <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Photos</p>
      <div className={`${cardClassName()} p-4 sm:p-5`}>
        <RoomShowcaseGallery
          roomId={room.id}
          unitLabel={unitLabel}
          amenities={room.amenities}
          hideHeading={isModal}
          compact={isModal}
          onImagesChanged={() => onDocumentsChanged?.()}
        />
      </div>
    </div>
  );

  const displayStatus = toDisplayRoomStatus(room.roomStatus);

  return (
    <>
    <div className={isModal ? 'space-y-5' : 'space-y-8'} style={{ fontFamily: LATO }}>
      {isModal && (
        <div className={`${cardClassName()} px-5 py-4`}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                displayStatus === 'occupied'
                  ? 'bg-emerald-50 text-emerald-700'
                  : displayStatus === 'pending'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {statusLabel(room.roomStatus)}
            </span>
            <InlineStat
              label="Rent"
              value={formatCurrency(tenant?.monthlyRate || room.monthlyRate)}
            />
            <InlineStat label="Type" value={bedroomsLabel} />
            {areaLabel && <InlineStat label="Area" value={areaLabel} />}
            {room.floorNumber != null && (
              <InlineStat label="Floor" value={String(room.floorNumber)} />
            )}
          </div>
          {amenityChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {amenityChips.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                >
                  {formatAmenityLabel(amenity)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {isModal && !tenant && photosSection}

      <section>
        <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Tenant</p>
        <div className={`${cardClassName()} p-5`}>
          {tenant && isModal ? (
            <ModalOccupiedTenant
              tenant={tenant}
              accountNo={accountNoFromTenantId(tenant.tenantId)}
              dueDate={dueDate}
              amountDue={amountDue}
              isSettled={isSettled}
              isPastDue={isPastDue}
              applianceItems={[
                ...appliances,
                ...other.filter((a) => !furniture.includes(a)),
              ].map(formatAssetLabel)}
              furnitureItems={furniture.map(formatAssetLabel)}
              onViewProfile={() => setProfileTenantId(tenant.tenantId)}
            />
          ) : tenant ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr_auto]">
              <div className="space-y-4">
                <Field label="Account No." value={accountNoFromTenantId(tenant.tenantId)} />
                <Field
                  label="Full Name"
                  value={`${tenant.firstName} ${tenant.lastName}`.trim()}
                  emphasize
                />
                <Field
                  label="Address"
                  value={tenant.previousAddress || formatBuildingAddress(building)}
                  multiline
                />
                <Field label="Mobile Number" value={tenant.phone || '—'} />
                <Field label="E-mail Address" value={tenant.email || '—'} />
                <Field
                  label="Emergency Contact Person"
                  value={tenant.emergencyContactName || '—'}
                />
                <Field
                  label="Emergency Contact Phone"
                  value={tenant.emergencyContactPhone || '—'}
                />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Date" value={formatShortDate(tenant.startDate)} />
                  <Field
                    label="End Date"
                    value={tenant.endDate ? formatShortDate(tenant.endDate) : 'Present'}
                  />
                  <Field label="Due Date" value={formatShortDate(dueDate)} />
                </div>

                <div
                  className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
                    isSettled
                      ? 'border-emerald-100 bg-emerald-50/70'
                      : isPastDue
                        ? 'border-rose-200 bg-rose-50'
                        : 'border-rose-100 bg-rose-50/60'
                  }`}
                >
                  <div className="flex-1">
                    <p
                      className={`text-[11px] font-medium uppercase tracking-wide ${
                        isSettled ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isSettled ? 'Settled' : isPastDue ? 'Past due' : 'Amount Due'}
                    </p>
                    <p
                      className={`mt-1 text-xl font-bold ${
                        isSettled ? 'text-emerald-800' : 'text-rose-700'
                      }`}
                    >
                      {formatCurrency(amountDue)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      leftIcon={<Bell className="h-4 w-4" />}
                      isLoading={sendingReminder}
                      isDisabled={sendingReminder || isSettled}
                      onClick={() => void handleSendPaymentReminder()}
                    >
                      Payment Reminder
                    </Button>
                    <Link
                      href={`/admin/financial/payments/new?tenantId=${encodeURIComponent(tenant.tenantId)}`}
                    >
                      <Button
                        leftIcon={<Wallet className="h-4 w-4" />}
                        className={
                          isSettled ? undefined : 'bg-rose-600 hover:bg-rose-700'
                        }
                      >
                        Make Payment
                      </Button>
                    </Link>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Appliances
                  </p>
                  <div className="mt-1 min-h-[72px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                    {applianceText || '—'}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Furnitures
                  </p>
                  <div className="mt-1 min-h-[72px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                    {furnitureText || '—'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                  {tenant.profileImagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getImageUrl(tenant.profileImagePath)}
                      alt={`${tenant.firstName} ${tenant.lastName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setProfileTenantId(tenant.tenantId)}
                  className="text-xs font-semibold text-indigo-700 hover:underline"
                >
                  View profile
                </button>
              </div>
            </div>
          ) : (
            <div
              className={
                isModal
                  ? 'py-1'
                  : 'flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between'
              }
            >
              <p className="text-sm text-gray-500">No tenant assigned to this unit.</p>
              {!isModal && (
                <AddTenantButton
                  buildingId={building.id}
                  roomId={room.id}
                  lockHousing
                  redirectAfterCreate={false}
                  refreshOnCreated={false}
                  onCreated={() => {
                    onTenantCreated?.();
                    onDocumentsChanged?.();
                  }}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {showPayments && (
      <section>
        <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Payments</p>
        <div className={`${cardClassName()} space-y-6 p-5`}>
          <div
            className={
              isModal
                ? 'grid grid-cols-1 gap-6 sm:grid-cols-2'
                : 'grid grid-cols-1 gap-6 lg:grid-cols-3'
            }
          >
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-900">Payment Information</p>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {`Total Amount Due${dueDate ? ` by ${formatShortDate(dueDate)}` : ''}`}
              </p>
              <p
                className={`mt-1 text-base font-bold ${
                  isSettled ? 'text-emerald-800' : isPastDue ? 'text-rose-700' : 'text-gray-900'
                }`}
              >
                {formatCurrency(amountDue)}
              </p>
            </div>
            <Field
              label="Last Payment"
              value={
                financialSummary.lastPaymentAmount
                  ? `${formatCurrency(financialSummary.lastPaymentAmount)}${
                      financialSummary.lastPaymentDate
                        ? ` — ${formatShortDate(financialSummary.lastPaymentDate)}`
                        : ''
                    }`
                  : '—'
              }
            />
            <Field
              label="Previous Unpaid Balance"
              value={formatCurrency(financialSummary.unpaidBalance || 0)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Electric Bill"
                value={formatCurrency(financialSummary.electricBillAmount || 0)}
              />
              <Field
                label="Water Bill"
                value={formatCurrency(financialSummary.waterBillAmount || 0)}
              />
            </div>

            {isPastDue && (
              <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                Payment Reminder – Your Account is Past Due.
              </div>
            )}

            {!isModal && leasePanel}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-900">Advance Payment</p>
            <Field
              label="Total Amount Deposited"
              value={formatCurrency((deposit || 0) + (advance || 0) + (utilityDeposit || 0))}
            />
            <Field label="1 Month Deposit" value={formatCurrency(deposit)} />
            <Field label="1 Month Advance" value={formatCurrency(advance)} />
            <Field label="Utility Deposit" value={formatCurrency(utilityDeposit)} />
            <Field label="Monthly Rental Fee" value={formatCurrency(tenant?.monthlyRate || room.monthlyRate || 0)} />
          </div>

          {!isModal && tenant && (
            <EntityNotesPanel
              entityType="tenant"
              entityId={tenant.tenantId}
              entityLabel={`${tenant.firstName} ${tenant.lastName}`.trim()}
              title="Tenant notes"
              compact
            />
          )}
          </div>

          {isModal && leasePanel}

          {isModal && (
            <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
              <EntityNotesPanel
                entityType="room"
                entityId={room.id}
                entityLabel={unitLabel}
                title="Room notes"
                compact
                dense
              />
              {tenant && (
                <EntityNotesPanel
                  entityType="tenant"
                  entityId={tenant.tenantId}
                  entityLabel={`${tenant.firstName} ${tenant.lastName}`.trim()}
                  title="Tenant notes"
                  compact
                  dense
                />
              )}
            </div>
          )}
        </div>
      </section>
      )}

      {isModal && tenant && photosSection}

      {isModal && !tenant && (
        <section>
          <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Notes</p>
          <div className={`${cardClassName()} p-5`}>
            <EntityNotesPanel
              entityType="room"
              entityId={room.id}
              entityLabel={unitLabel}
              title="Room notes"
              compact
              dense
            />
          </div>
        </section>
      )}

      {showHistory && <AssignmentHistoryCard detail={detail} hideWhenEmpty={isModal} />}
      {!isModal && <BuildingSummaryCard detail={detail} />}
      {!isModal && photosSection}
    </div>

    <TenantProfileModal
      isOpen={Boolean(profileTenantId)}
      tenantId={profileTenantId}
      onClose={() => setProfileTenantId(null)}
    />
    </>
  );
}

function ModalOccupiedTenant({
  tenant,
  accountNo,
  dueDate,
  amountDue,
  isSettled,
  isPastDue,
  applianceItems,
  furnitureItems,
  onViewProfile,
}: {
  tenant: PropertyRoomTenant;
  accountNo: string;
  dueDate?: string | Date | null;
  amountDue: number;
  isSettled: boolean;
  isPastDue: boolean;
  applianceItems: string[];
  furnitureItems: string[];
  onViewProfile: () => void;
}) {
  const fullName = `${tenant.firstName} ${tenant.lastName}`.trim();
  const contacts = [
    hasValue(tenant.phone) && { icon: Phone, label: 'Mobile', value: tenant.phone as string },
    hasValue(tenant.email) && { icon: Mail, label: 'Email', value: tenant.email as string },
    (hasValue(tenant.emergencyContactName) || hasValue(tenant.emergencyContactPhone)) && {
      icon: User,
      label: 'Emergency',
      value: [tenant.emergencyContactName, tenant.emergencyContactPhone]
        .filter((part) => hasValue(part))
        .join(' · '),
    },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string }[];
  const inventory = [
    ...applianceItems.map((item) => ({ item, kind: 'Appliance' })),
    ...furnitureItems.map((item) => ({ item, kind: 'Furniture' })),
  ].filter((entry) => hasValue(entry.item));

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        {tenant.profileImagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getImageUrl(tenant.profileImagePath)}
            alt={fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-6 w-6 text-gray-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-tight text-gray-900">{fullName}</p>
            <p className="mt-1 text-xs text-gray-500">
              Account {accountNo}
              {' · '}
              Started {formatShortDate(tenant.startDate)}
              {dueDate ? ` · Due ${formatShortDate(dueDate)}` : ''}
            </p>
            <button
              type="button"
              onClick={onViewProfile}
              className="mt-1 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:underline"
            >
              View profile
            </button>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isSettled
                  ? 'bg-emerald-50 text-emerald-800'
                  : isPastDue
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-amber-50 text-amber-800'
              }`}
            >
              {isSettled
                ? 'Settled'
                : `${isPastDue ? 'Past due' : 'Due'} ${formatCurrency(amountDue)}`}
            </span>
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {contacts.map((contact) => (
              <div key={contact.label} className="flex min-w-0 items-start gap-2 text-sm">
                <contact.icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {contact.label}
                  </p>
                  <p className="truncate font-medium text-gray-900">{contact.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasValue(tenant.previousAddress) && (
          <p className="mt-3 text-sm leading-snug text-gray-600">{tenant.previousAddress}</p>
        )}

        {inventory.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {inventory.map((entry) => (
              <span
                key={`${entry.kind}-${entry.item}`}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
              >
                {entry.item}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentHistoryCard({
  detail,
  hideWhenEmpty = false,
}: {
  detail: RoomPageDetail;
  hideWhenEmpty?: boolean;
}) {
  const history = detail.assignmentHistory || [];
  if (hideWhenEmpty && history.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Occupant history</p>
      <div className={cardClassName()}>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-gray-400">
            No previous occupants.
          </p>
        ) : (
          <ul>
            {history.map((item) => {
              const badge = item.occupancyBadge;
              const isCurrent = badge === 'current';
              const isRenewed = badge === 'renewed';
              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    {item.tenantId && item.tenantExists !== false ? (
                      <Link
                        href={`/admin/tenants/${item.tenantId}`}
                        className="truncate text-[13px] font-bold leading-none text-gray-900 hover:underline"
                      >
                        {item.tenantName}
                      </Link>
                    ) : (
                      <p className="truncate text-[13px] font-bold leading-none text-gray-900">
                        {item.tenantName}
                        {item.tenantExists === false && (
                          <span className="ml-1.5 text-[10px] font-medium text-gray-400">
                            (archived)
                          </span>
                        )}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] font-normal leading-none text-gray-500">
                      {formatShortDate(item.startDate)}
                      {' – '}
                      {item.endDate
                        ? formatShortDate(item.endDate)
                        : isCurrent
                          ? 'Present'
                          : '—'}
                    </p>
                    <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                      {(item.depositPaid != null ||
                        item.advancePaid != null ||
                        item.utilityDepositPaid != null) && (
                        <p>
                          <span className="text-gray-400">Total deposited: </span>
                          {formatCurrency(
                            (item.depositPaid || 0) +
                              (item.advancePaid || 0) +
                              (item.utilityDepositPaid || 0)
                          )}
                        </p>
                      )}
                      {item.utilityDepositPaid != null && item.utilityDepositPaid > 0 && (
                        <p>
                          <span className="text-gray-400">Utility deposit: </span>
                          {formatCurrency(item.utilityDepositPaid)}
                        </p>
                      )}
                      {item.tenantPhone && (
                        <p className="truncate">
                          <span className="text-gray-400">Phone: </span>
                          {item.tenantPhone}
                        </p>
                      )}
                      {item.tenantEmail && (
                        <p className="truncate">
                          <span className="text-gray-400">Email: </span>
                          {item.tenantEmail}
                        </p>
                      )}
                      {(item.emergencyContactName || item.emergencyContactPhone) && (
                        <p className="truncate">
                          <span className="text-gray-400">Emergency: </span>
                          {[item.emergencyContactName, item.emergencyContactPhone]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-none ${
                        isCurrent
                          ? 'bg-emerald-100 text-emerald-800'
                          : isRenewed
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isCurrent ? 'Current' : isRenewed ? 'Renewed' : 'Terminated'}
                    </span>
                    <span className="text-[12px] font-medium leading-none text-gray-900">
                      {formatCurrency(item.monthlyRate)}
                      <span className="ml-0.5 text-[10px] font-normal text-gray-500">/mo</span>
                    </span>
                  </div>
                </li>
              );
            })}
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
  const mapsHref = googleMapsUrlForBuilding(building);

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
