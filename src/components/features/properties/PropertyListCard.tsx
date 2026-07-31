'use client';

import { Building2, Home, Users } from 'lucide-react';
import { getImageUrl } from '@/lib/format/image-url';
import { cn } from '@/lib/utils';
import type { PropertyListBuilding } from '@/lib/api/properties';
import type { PropertyRoomDetail } from '@/lib/api/properties';
import {
  displayStatusLabel,
  formatArea,
  formatBuildingAddress,
  toDisplayRoomStatus,
} from './property-utils';

const LATO = 'var(--font-lato), Lato, sans-serif';
const TEAL = '#39CCCC';
const SELECTED_BG = '#E2E5F7';

interface PropertyListCardProps {
  building: PropertyListBuilding;
  rooms: PropertyRoomDetail[] | null;
  roomsLoading: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  activeRoomId?: string | null;
  onSelect: () => void;
  onToggleExpand: () => void;
  onSelectRoom: (roomId: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  const display = toDisplayRoomStatus(status);
  return (
    <span
      className="inline-flex h-[18px] min-w-[52px] items-center justify-center gap-2.5 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none text-white"
      style={{
        fontFamily: LATO,
        backgroundColor:
          display === 'vacant' ? '#57D163' : display === 'occupied' ? '#FF6C64' : '#B0B0B0',
      }}
    >
      {displayStatusLabel(display)}
    </span>
  );
}

export default function PropertyListCard({
  building,
  rooms,
  roomsLoading,
  isSelected,
  isExpanded,
  activeRoomId = null,
  onSelect,
  onToggleExpand,
  onSelectRoom,
}: PropertyListCardProps) {
  const address = formatBuildingAddress(building);
  const thumb = building.primaryImagePath
    ? getImageUrl(building.primaryImagePath)
    : null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border transition-shadow',
        isSelected
          ? 'border-transparent shadow-sm ring-1 ring-[#c5cae8]'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
      style={isSelected ? { backgroundColor: SELECTED_BG } : undefined}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3',
          isSelected && 'border-l-[3px] border-l-blue-500'
        )}
      >
        <button
          type="button"
          onClick={() => {
            onSelect();
            if (!isExpanded) onToggleExpand();
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-white/80">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <Building2 className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ fontFamily: LATO }}>
            <p className="truncate text-[12px] font-bold leading-none text-gray-900">
              {building.name}, {address}
            </p>

            <div className="mt-2 flex items-center gap-3 text-[12px] font-normal leading-none text-gray-700">
              <span className="inline-flex items-center gap-1">
                <Home className="h-3.5 w-3.5" style={{ color: TEAL }} />
                {building.totalUnits || 0} Rooms
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" style={{ color: TEAL }} />
                {building.occupiedUnits || 0} Tenants
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          aria-label={isExpanded ? 'Collapse rooms' : 'Expand rooms'}
          aria-expanded={isExpanded}
          onClick={() => {
            onSelect();
            onToggleExpand();
          }}
          className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-white/60 hover:text-gray-700"
        >
          <svg
            className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="bg-white px-4">
          {roomsLoading && (
            <p className="py-3 text-center text-xs text-gray-500">Loading rooms…</p>
          )}
          {!roomsLoading && rooms && rooms.length === 0 && (
            <p className="py-3 text-center text-xs text-gray-500">No rooms yet</p>
          )}
          {!roomsLoading &&
            rooms?.map((room) => {
              const tenantName = room.tenant
                ? `${room.tenant.firstName} ${room.tenant.lastName}`.trim()
                : 'No tenants';
              const area = formatArea(room.squareFootage) ?? '—';

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    onSelect();
                    onSelectRoom(room.id);
                  }}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 border-b border-gray-100 py-3 text-left last:border-b-0 transition-colors',
                    activeRoomId === room.id ? 'bg-[#E2E5F7]/70' : 'hover:bg-gray-50'
                  )}
                  style={{ fontFamily: LATO }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold leading-none text-gray-900">
                      {room.roomNumber}
                    </p>
                    <p className="mt-1.5 truncate text-[12px] font-normal leading-none text-gray-500">
                      {tenantName}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={room.roomStatus} />
                    <span className="text-[12px] font-normal leading-none text-gray-500">
                      {area}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
