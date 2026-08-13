'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  FileText,
  Home,
  MapPin,
  User,
  Users,
  Wallet,
  Building2,
} from 'lucide-react';
import type {
  PropertyRoomAsset,
  PropertyRoomDocument,
  RoomPageDetail,
} from '@/lib/api/properties';
import { getImageUrl } from '@/lib/format/image-url';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { Button } from '@/components/ui/Button';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import {
  displayStatusLabel,
  formatBuildingAddress,
  formatShortDate,
  googleMapsUrl,
  toDisplayRoomStatus,
} from '@/components/features/properties/property-utils';
import { useNotifications } from '@/hooks/useNotifications';
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@/types/document';
import TenantProfileModal from '@/components/features/tenants/TenantProfileModal';
import AddTenantButton from '@/components/features/tenants/AddTenantButton';
import { AddNotesButton, EntityNotesPanel } from '@/components/features/notes/EntityNotesModal';
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

  return (
    <>
    <div className="space-y-5" style={{ fontFamily: LATO }}>
      {/* Unit summary */}
      <div className={`${cardClassName()} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{unitLabel}</h2>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500">Status: </span>
                <span className="font-semibold text-gray-900">{statusLabel(room.roomStatus)}</span>
              </div>
              <div>
                <span className="text-gray-500">Rent Amount: </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(tenant?.monthlyRate || room.monthlyRate)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-800"
              defaultValue=""
              aria-label="Appliances"
            >
              <option value="" disabled>
                Appliances
              </option>
              {(appliances.length ? appliances : [{ id: 'none', assetName: 'None listed' } as PropertyRoomAsset]).map(
                (a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetName}
                  </option>
                )
              )}
            </select>
            <select
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-800"
              defaultValue=""
              aria-label="Furnitures"
            >
              <option value="" disabled>
                Furnitures
              </option>
              {(furniture.length ? furniture : [{ id: 'none', assetName: 'None listed' } as PropertyRoomAsset]).map(
                (a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetName}
                  </option>
                )
              )}
            </select>
            <AddNotesButton
              entityType="room"
              entityId={room.id}
              entityLabel={unitLabel}
              label="Add note"
              onSaved={() => onDocumentsChanged?.()}
            />
          </div>
        </div>
      </div>

      {/* Tenant Information */}
      <section>
        <div className="mb-2 rounded-t-xl bg-rose-50 px-4 py-2">
          <p className="text-sm font-bold text-rose-900">Tenant Information</p>
        </div>
        <div className={`${cardClassName()} rounded-t-none p-5`}>
          {tenant ? (
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
            <div className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">No tenant assigned to this unit.</p>
              <AddTenantButton
                buildingId={building.id}
                roomId={room.id}
                lockHousing
                refreshOnCreated={false}
                onCreated={() => {
                  onTenantCreated?.();
                  onDocumentsChanged?.();
                }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Payment / Advance / Remarks */}
      <section
        className={`${cardClassName()} border p-5 ${
          isSettled ? 'border-emerald-100' : 'border-rose-100'
        }`}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Payment Information */}
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

            <div className="pt-1">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Document (Lease Contract)
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {leaseDoc ? (
                  <a
                    href={`/api/documents/${leaseDoc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    {leaseDoc.documentName || leaseDoc.fileName}
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">No lease attached</span>
                )}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
              <p className="mt-2 text-[11px] leading-snug text-gray-400">
                Lease contract agreement for this tenant. Attach a PDF or photo here — no need to leave this page.
              </p>
            </div>
          </div>

          {/* Advance Payment */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-900">Advance Payment</p>
            <Field label="1 Month Deposit" value={formatCurrency(deposit)} />
            <Field label="1 Month Advance" value={formatCurrency(advance)} />
            <Field label="Utility Deposit" value={formatCurrency(utilityDeposit)} />
          </div>

          {/* Historical notes — room + tenant (if assigned) */}
          <div className="space-y-4 lg:col-span-1">
            <EntityNotesPanel
              entityType="room"
              entityId={room.id}
              entityLabel={unitLabel}
              title="Room notes"
              compact
            />
            {tenant && (
              <EntityNotesPanel
                entityType="tenant"
                entityId={tenant.tenantId}
                entityLabel={`${tenant.firstName} ${tenant.lastName}`.trim()}
                title="Tenant notes"
                compact
              />
            )}
          </div>
        </div>
      </section>

      <AssignmentHistoryCard detail={detail} />
      {!isModal && <BuildingSummaryCard detail={detail} />}

      {/* Showcase gallery — Airbnb-style collage + photo tour */}
      <div className={`${cardClassName()} p-4 sm:p-5`}>
        <RoomShowcaseGallery
          roomId={room.id}
          unitLabel={unitLabel}
          amenities={room.amenities}
          onImagesChanged={() => onDocumentsChanged?.()}
        />
      </div>
    </div>

    <TenantProfileModal
      isOpen={Boolean(profileTenantId)}
      tenantId={profileTenantId}
      onClose={() => setProfileTenantId(null)}
    />
    </>
  );
}

function AssignmentHistoryCard({ detail }: { detail: RoomPageDetail }) {
  const history = detail.assignmentHistory || [];

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
              const status = (item.assignmentStatus || '').replace(/_/g, ' ');
              const isCurrent = status === 'active' && !item.endDate;
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
                      {item.endDate ? formatShortDate(item.endDate) : 'Present'}
                    </p>
                    <div className="mt-2 space-y-1 text-[11px] text-gray-600">
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
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isCurrent ? 'Current' : status || 'Past'}
                    </span>
                    <span className="text-[12px] font-medium leading-none text-gray-900">
                      {formatCurrency(item.monthlyRate)}
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
