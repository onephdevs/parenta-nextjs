'use client';

import { Building2, Home, Users } from 'lucide-react';
import { getImageUrl } from '@/lib/format/image-url';
import { cn } from '@/lib/utils';
import HomeTraceLoader from '@/components/ui/HomeTraceLoader';
import type { PropertyListBuilding } from '@/lib/api/properties';
import type { PropertyRoomDetail } from '@/lib/api/properties';
import {
  displayStatusLabel,
  formatArea,
  formatBuildingAddress,
  occupancyStatusFromRoom,
  type DisplayRoomStatus,
} from './property-utils';

const LATO = 'var(--font-lato), Lato, sans-serif';

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
  onViewRoom: (roomId: string) => void;
}

function StatusBadge({ status }: { status: DisplayRoomStatus }) {
  return (
    <span
      className="inline-flex h-[18px] min-w-[52px] items-center justify-center gap-2.5 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none text-white"
      style={{
        fontFamily: LATO,
        backgroundColor:
          status === 'occupied' ? '#57D163' : status === 'pending' ? '#F59E0B' : '#9CA3AF',
      }}
    >
      {displayStatusLabel(status)}
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
  onViewRoom,
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
          ? 'border-gray-900 bg-gray-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3',
          isSelected && 'border-l-[3px] border-l-gray-900'
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
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
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

            <div className="mt-2 flex items-center gap-3 text-[12px] font-normal leading-none text-gray-600">
              <span className="inline-flex items-center gap-1">
                <Home className="h-3.5 w-3.5 text-gray-900" />
                {building.totalUnits || 0} Rooms
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-gray-900" />
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
          className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
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
        <div className="space-y-1 border-t border-gray-200 bg-[#E2E5F7] px-2 py-2">
          {roomsLoading && (
            <div className="flex items-center justify-center py-4" role="status" aria-label="Loading">
              <HomeTraceLoader size={36} />
            </div>
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
              const isActive = activeRoomId === room.id;
              const status = occupancyStatusFromRoom(room);

              return (
                <div
                  key={room.id}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 transition-colors',
                    isActive ? 'bg-white ring-1 ring-gray-900' : 'bg-white hover:bg-white/90'
                  )}
                  style={{ fontFamily: LATO }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect();
                      onSelectRoom(room.id);
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
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
                      <StatusBadge status={status} />
                      <span className="text-[12px] font-normal leading-none text-gray-500">
                        {area}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect();
                      onViewRoom(room.id);
                    }}
                    className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-[11px] font-semibold text-gray-900 shadow-sm hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                  >
                    View
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
