'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import AddRoomModal from '@/components/features/AddRoomModal';
import type { Building } from '@/types/database';
import type { RoomsPageListItem } from '@/lib/api/properties';
import {
  displayStatusLabel,
  formatArea,
  toDisplayRoomStatus,
} from '@/components/features/properties/property-utils';
import { cn } from '@/lib/utils';

const LATO = 'var(--font-lato), Lato, sans-serif';

type StatusFilter = 'all' | 'vacant' | 'occupied' | 'pending';

interface RoomsListPanelProps {
  rooms: RoomsPageListItem[];
  buildings: Building[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onRoomAdded: (roomId?: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  const display = toDisplayRoomStatus(status);
  return (
    <span
      className="inline-flex h-[18px] min-w-[52px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none text-white"
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

export default function RoomsListPanel({
  rooms,
  buildings,
  selectedRoomId,
  onSelectRoom,
  onRoomAdded,
}: RoomsListPanelProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedRoomId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rooms
      .filter((room) => {
        const matchesSearch =
          !term ||
          room.roomNumber.toLowerCase().includes(term) ||
          room.buildingName.toLowerCase().includes(term) ||
          (room.tenantName || '').toLowerCase().includes(term);

        if (!matchesSearch) return false;

        if (buildingFilter !== 'all' && room.buildingId !== buildingFilter) return false;

        if (statusFilter === 'all') return true;
        const display = toDisplayRoomStatus(room.roomStatus);
        return display === statusFilter;
      })
      .sort((a, b) => {
        const byBuilding = a.buildingName.localeCompare(b.buildingName, undefined, {
          sensitivity: 'base',
        });
        if (byBuilding !== 0) return byBuilding;
        return a.roomNumber.localeCompare(b.roomNumber, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
  }, [rooms, search, statusFilter, buildingFilter]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white lg:w-[340px] lg:flex-shrink-0">
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'Room' : 'Rooms'}
          </span>
          <div className="flex items-center gap-1.5">
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="max-w-[7.5rem] rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
            >
              <option value="all">All buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
            >
              <option value="all">All status</option>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
            <p className="text-sm font-medium text-gray-700">No rooms found</p>
            <p className="mt-1 text-xs text-gray-500">Try a different search or add a room.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {filtered.map((room) => {
              const area = formatArea(room.squareFootage) ?? '—';
              const isSelected = selectedRoomId === room.id;

              return (
                <button
                  key={room.id}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                  onClick={() => onSelectRoom(room.id)}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 transition-colors',
                    isSelected
                      ? 'border-l-[3px] border-l-blue-500 bg-[#E2E5F7]'
                      : 'hover:bg-gray-50'
                  )}
                  style={{ fontFamily: LATO }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold leading-none text-gray-900">
                      {room.roomNumber}
                      <span className="ml-1.5 font-normal text-gray-500">· {room.buildingName}</span>
                    </p>
                    <p className="mt-1.5 truncate text-[12px] font-normal leading-none text-gray-500">
                      {room.tenantName || 'No tenants'}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={room.roomStatus} />
                    <span className="text-[12px] font-normal leading-none text-gray-500">{area}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AddRoomModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        buildings={buildings}
        buildingId={buildingFilter !== 'all' ? buildingFilter : undefined}
        building={
          buildingFilter !== 'all'
            ? buildings.find((b) => b.id === buildingFilter)
            : undefined
        }
        onRoomAdded={(roomId) => {
          setIsAddOpen(false);
          onRoomAdded(roomId);
        }}
      />
    </aside>
  );
}
