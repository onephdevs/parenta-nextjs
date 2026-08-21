'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import AddRoomModal from '@/components/features/AddRoomModal';
import type { Building } from '@/types/database';
import type { RoomsPageListItem } from '@/lib/api/properties';
import { toDisplayRoomStatus } from '@/components/features/properties/property-utils';
import RoomListCard from './RoomListCard';

type StatusFilter = 'all' | 'vacant' | 'occupied' | 'pending';
type SortValue = 'number-asc' | 'number-desc' | 'building-asc' | 'vacant-first' | 'occupied-first';

interface RoomsListPanelProps {
  rooms: RoomsPageListItem[];
  buildings: Building[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onRoomAdded: (roomId?: string) => void;
}

function compareRoomNumbers(a: string, b: string): number {
  return (a || '').localeCompare(b || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareNames(a: string, b: string): number {
  return (a || '').trim().localeCompare((b || '').trim(), undefined, {
    numeric: true,
    sensitivity: 'base',
    ignorePunctuation: true,
  });
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
  const [sort, setSort] = useState<SortValue>('number-asc');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const selectedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedRoomId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = rooms.filter((room) => {
      const matchesSearch =
        !term ||
        room.roomNumber.toLowerCase().includes(term) ||
        room.buildingName.toLowerCase().includes(term) ||
        (room.tenantName || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (buildingFilter !== 'all' && room.buildingId !== buildingFilter) return false;
      if (statusFilter === 'all') return true;
      return toDisplayRoomStatus(room.roomStatus) === statusFilter;
    });

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'number-desc': {
          const byBuilding = compareNames(a.buildingName, b.buildingName);
          if (byBuilding !== 0) return byBuilding;
          return compareRoomNumbers(b.roomNumber, a.roomNumber);
        }
        case 'building-asc': {
          const byBuilding = compareNames(a.buildingName, b.buildingName);
          if (byBuilding !== 0) return byBuilding;
          return compareRoomNumbers(a.roomNumber, b.roomNumber);
        }
        case 'vacant-first': {
          const aVacant = toDisplayRoomStatus(a.roomStatus) === 'vacant' ? 0 : 1;
          const bVacant = toDisplayRoomStatus(b.roomStatus) === 'vacant' ? 0 : 1;
          if (aVacant !== bVacant) return aVacant - bVacant;
          return compareRoomNumbers(a.roomNumber, b.roomNumber);
        }
        case 'occupied-first': {
          const aOcc = toDisplayRoomStatus(a.roomStatus) === 'occupied' ? 0 : 1;
          const bOcc = toDisplayRoomStatus(b.roomStatus) === 'occupied' ? 0 : 1;
          if (aOcc !== bOcc) return aOcc - bOcc;
          return compareRoomNumbers(a.roomNumber, b.roomNumber);
        }
        case 'number-asc':
        default: {
          const byBuilding = compareNames(a.buildingName, b.buildingName);
          if (byBuilding !== 0) return byBuilding;
          return compareRoomNumbers(a.roomNumber, b.roomNumber);
        }
      }
    });
  }, [rooms, search, statusFilter, buildingFilter, sort]);

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
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#111827] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add
          </button>
        </div>

        <div className="mt-3">
          <span className="text-xs font-medium text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'Room' : 'Rooms'}
          </span>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className="min-w-0 w-full rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 focus:border-gray-900 focus:outline-none"
              aria-label="Sort rooms"
            >
              <option value="number-asc">Room A–Z</option>
              <option value="number-desc">Room Z–A</option>
              <option value="building-asc">Building A–Z</option>
              <option value="vacant-first">Vacant first</option>
              <option value="occupied-first">Occupied first</option>
            </select>
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="min-w-0 w-full rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 focus:border-gray-900 focus:outline-none"
              aria-label="Filter by building"
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
              className="min-w-0 w-full rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 focus:border-gray-900 focus:outline-none"
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
            <p className="text-sm font-medium text-gray-700">No rooms found</p>
            <p className="mt-1 text-xs text-gray-500">Try a different search or add a room.</p>
          </div>
        ) : (
          filtered.map((room) => {
            const isSelected = selectedRoomId === room.id;
            return (
              <div key={room.id} ref={isSelected ? selectedRef : undefined}>
                <RoomListCard
                  room={room}
                  isSelected={isSelected}
                  onSelect={() => onSelectRoom(room.id)}
                />
              </div>
            );
          })
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
