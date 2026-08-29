'use client';

import { Home, Users } from 'lucide-react';
import { getImageUrl } from '@/lib/format/image-url';
import { cn } from '@/lib/utils';
import type { RoomsPageListItem } from '@/lib/api/properties';
import {
  displayStatusLabel,
  formatArea,
  getRoomTypeStats,
  toDisplayRoomStatus,
} from '@/components/features/properties/property-utils';

const LATO = 'var(--font-lato), Lato, sans-serif';

function unitLabel(roomNumber: string): string {
  const trimmed = (roomNumber || '').trim();
  if (!trimmed) return 'Unit';
  if (/^unit\b/i.test(trimmed)) return trimmed;
  return `Unit ${trimmed}`;
}

interface RoomListCardProps {
  room: RoomsPageListItem;
  isSelected: boolean;
  onSelect: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const display = toDisplayRoomStatus(status);
  return (
    <span
      className="inline-flex h-[18px] min-w-[52px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none text-white"
      style={{
        fontFamily: LATO,
        backgroundColor:
          display === 'occupied' ? '#57D163' : display === 'pending' ? '#F59E0B' : '#9CA3AF',
      }}
    >
      {displayStatusLabel(display)}
    </span>
  );
}

export default function RoomListCard({ room, isSelected, onSelect }: RoomListCardProps) {
  const thumb = room.primaryImagePath ? getImageUrl(room.primaryImagePath) : null;
  const area = formatArea(room.squareFootage);
  const { bedroomsLabel } = getRoomTypeStats(room.roomType);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full overflow-hidden rounded-xl border text-left transition-shadow',
        isSelected
          ? 'border-gray-900 bg-gray-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          isSelected && 'border-l-[3px] border-l-gray-900'
        )}
        style={{ fontFamily: LATO }}
      >
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <Home className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold leading-none text-gray-900">
            {unitLabel(room.roomNumber)}
            <span className="ml-1 font-normal text-gray-500">· {room.buildingName}</span>
          </p>
          <div className="mt-2 flex items-center gap-3 text-[12px] font-normal leading-none text-gray-600">
            <span className="inline-flex min-w-0 items-center gap-1">
              <Users className="h-3.5 w-3.5 flex-shrink-0 text-gray-900" />
              <span className="truncate">{room.tenantName || 'Vacant'}</span>
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-1">
              <Home className="h-3.5 w-3.5 text-gray-900" />
              {area || bedroomsLabel}
            </span>
          </div>
        </div>

        <StatusBadge status={room.tenantName ? 'occupied' : toDisplayRoomStatus(room.roomStatus)} />
      </div>
    </button>
  );
}
