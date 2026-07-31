'use client';

import Link from 'next/link';
import {
  Bath,
  BedDouble,
  Download,
  FileText,
  Maximize2,
  Pencil,
  UserRoundSearch,
} from 'lucide-react';
import type { PropertyRoomDetail, PropertyRoomDocument } from '@/lib/api/properties';
import { formatAmenityLabel } from '@/lib/format/amenities';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getImageUrl } from '@/lib/format/image-url';
import {
  formatShortDate,
  getRoomTypeStats,
  toDisplayRoomStatus,
} from './property-utils';
import { cn } from '@/lib/utils';

const LATO = 'var(--font-lato), Lato, sans-serif';
const TEAL = '#39CCCC';
const PANEL_BG = '#252A45';

interface PropertyRoomCardProps {
  room: PropertyRoomDetail;
  isActive?: boolean;
}

function formatFileSize(bytes?: number): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value < 10 && i > 0 ? value.toFixed(1) : Math.round(value)}${sizes[i]}`;
}

function fileTypeBadge(doc: PropertyRoomDocument): string {
  const fromName = doc.fileName?.split('.').pop()?.toUpperCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (doc.mimeType?.includes('pdf')) return 'PDF';
  if (doc.mimeType?.includes('sheet') || doc.mimeType?.includes('excel')) return 'XLS';
  if (doc.mimeType?.includes('word')) return 'DOC';
  if (doc.mimeType?.includes('image')) return 'IMG';
  return 'FILE';
}

function RoomDocumentsList({ documents }: { documents: PropertyRoomDocument[] }) {
  if (documents.length === 0) {
    return (
      <div className="border-t border-gray-100 px-3 py-3">
        <p className="text-[11px] font-normal leading-none text-gray-400">No documents yet</p>
      </div>
    );
  }

  return (
    <ul className="border-t border-gray-100">
      {documents.map((doc) => {
        const sizeLabel = formatFileSize(doc.fileSize);
        const typeLabel = fileTypeBadge(doc);
        return (
          <li
            key={doc.id}
            className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 last:border-b-0"
          >
            <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold leading-none text-gray-900">
                {doc.documentName || doc.fileName}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {sizeLabel && (
                  <span className="text-[10px] font-normal leading-none text-gray-500">
                    {sizeLabel}
                  </span>
                )}
                <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-gray-600">
                  {typeLabel}
                </span>
              </div>
            </div>
            <a
              href={`/api/documents/${doc.id}/download`}
              download
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              title={`Download ${doc.documentName || doc.fileName}`}
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default function PropertyRoomCard({ room, isActive = false }: PropertyRoomCardProps) {
  const displayStatus = toDisplayRoomStatus(room.roomStatus);
  const isOccupied = displayStatus === 'occupied' && room.tenant;
  const { bedroomsLabel, bathroomsLabel } = getRoomTypeStats(room.roomType);
  const areaLabel =
    room.squareFootage != null && Number.isFinite(room.squareFootage)
      ? `${Math.round(room.squareFootage)} sqft`
      : null;
  const amenityChips = room.amenities.slice(0, 8);
  const gallery = room.images.slice(0, 6);
  const documents = room.documents || [];
  const showDocuments = isOccupied || documents.length > 0;

  const balancePaid =
    isOccupied &&
    room.tenant &&
    room.tenant.overdueAmount <= 0 &&
    room.tenant.pendingAmount <= 0;

  return (
    <div
      id={`property-room-${room.id}`}
      className={cn(
        'scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)] transition-shadow',
        isActive && 'ring-2 ring-blue-400'
      )}
      style={{ fontFamily: LATO }}
    >
      <div className="flex min-h-[277px] flex-col lg:flex-row">
        {/* Room info */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[24px] font-bold leading-none text-gray-900">{room.roomNumber}</h4>
            <Link
              href={`/admin/rooms/${room.id}`}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              title="Edit room"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] font-normal leading-none text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-4 w-4" style={{ color: TEAL }} />
              {bedroomsLabel}
            </span>
            {bathroomsLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Bath className="h-4 w-4" style={{ color: TEAL }} />
                {bathroomsLabel}
              </span>
            )}
            {areaLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Maximize2 className="h-4 w-4" style={{ color: TEAL }} />
                {areaLabel}
              </span>
            )}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-2 text-[12px] font-bold leading-none text-gray-900">Amenities</p>
            {amenityChips.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {amenityChips.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex h-[30px] min-w-[84px] items-center justify-center rounded px-4 text-[12px] font-normal leading-none text-gray-800"
                    style={{ backgroundColor: '#E2E5F7' }}
                  >
                    {formatAmenityLabel(amenity)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-normal leading-none text-gray-400">No amenities listed</p>
            )}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[12px] font-bold leading-none text-gray-900">Gallery</p>
            {gallery.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gallery.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image.id}
                    src={getImageUrl(image.filePath)}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded object-cover"
                  />
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-normal leading-none text-gray-400">No photos yet</p>
            )}
          </div>
        </div>

        {/* Status / occupancy + documents column */}
        <div className="flex w-full flex-col lg:w-[220px] lg:flex-shrink-0">
          <div
            className="flex flex-col text-white"
            style={{ backgroundColor: PANEL_BG }}
          >
            {isOccupied && room.tenant ? (
              <div className="flex flex-col px-2 py-3">
                <div className="flex items-center gap-2.5 px-1 pb-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#39CCCC]/60 bg-white/10 text-xs font-bold">
                    {room.tenant.firstName.charAt(0)}
                    {room.tenant.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-bold leading-none">
                      {room.tenant.firstName} {room.tenant.lastName}
                    </p>
                    <p className="mt-1 text-[12px] font-normal leading-none text-white/60">Tenant</p>
                  </div>
                </div>

                <div className="mx-1 border-t border-white/10" />

                <dl className="space-y-2.5 px-1 py-3 text-[12px] font-normal leading-none">
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/60">Start date</dt>
                    <dd className="text-right text-white">{formatShortDate(room.tenant.startDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/60">Contact no.</dt>
                    <dd className="truncate text-right text-white">{room.tenant.phone || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/60">Balance</dt>
                    <dd
                      className="text-right"
                      style={{ color: balancePaid ? '#57D163' : '#FBBF24' }}
                    >
                      {balancePaid ? 'Paid' : 'Due'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-white/60">Monthly Rent</dt>
                    <dd className="text-right text-[16px] font-bold leading-none text-white">
                      {formatCurrency(room.tenant.monthlyRate)}
                    </dd>
                  </div>
                </dl>

                <Link
                  href={`/admin/tenants/${room.tenant.tenantId}`}
                  className="mx-auto flex h-[38px] w-[176px] items-center justify-center rounded bg-[#F5C518] px-4 text-center text-[12px] font-bold leading-none text-gray-900 hover:bg-[#e6b800]"
                >
                  View Tenant Profile
                </Link>

                {room.occupants.length > 0 && (
                  <div className="mt-3 border-t border-white/10 px-1 pt-3">
                    <p className="mb-2.5 text-[12px] font-bold leading-none text-white/70">Occupants</p>
                    <ul className="space-y-2.5">
                      {room.occupants.slice(0, 4).map((occ) => (
                        <li key={occ.id} className="flex items-center gap-2">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#8BA3C7]/40 text-[10px] font-semibold text-white">
                            {occ.firstName.charAt(0)}
                            {occ.lastName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[16px] font-bold leading-none">
                              {occ.firstName} {occ.lastName}
                            </p>
                            <p className="mt-1 truncate text-[12px] font-normal leading-none text-white/55">
                              {occ.relationshipToTenant
                                ? occ.relationshipToTenant.replace(/_/g, ' ')
                                : 'Family member'}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex min-h-[11rem] flex-col items-center justify-center gap-3 p-6 text-center">
                <UserRoundSearch className="h-12 w-12 text-white/80" strokeWidth={1.5} />
                <p className="text-[24px] font-bold leading-none tracking-wide">VACANT</p>
                <div className="absolute bottom-4 left-3 right-3 rounded bg-[#C4A35A] px-3 py-2 text-[12px] font-normal leading-none text-[#3a2f12]">
                  No pending applications
                </div>
              </div>
            )}
          </div>

          {showDocuments && <RoomDocumentsList documents={documents} />}
        </div>
      </div>
    </div>
  );
}
