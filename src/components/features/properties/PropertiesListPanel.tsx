'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import AddBuildingModal from '@/components/features/AddBuildingModal';
import type { PropertyListBuilding, PropertyRoomDetail } from '@/lib/api/properties';
import PropertyListCard from './PropertyListCard';

type FilterValue = 'all' | 'has_vacant' | 'fully_occupied';

interface PropertiesListPanelProps {
  buildings: PropertyListBuilding[];
  selectedBuildingId: string | null;
  expandedBuildingId: string | null;
  roomsByBuilding: Record<string, PropertyRoomDetail[]>;
  roomsLoadingId: string | null;
  activeRoomId?: string | null;
  onSelectBuilding: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSelectRoom: (buildingId: string, roomId: string) => void;
  onBuildingAdded: (buildingId?: string) => void;
}

export default function PropertiesListPanel({
  buildings,
  selectedBuildingId,
  expandedBuildingId,
  roomsByBuilding,
  roomsLoadingId,
  activeRoomId = null,
  onSelectBuilding,
  onToggleExpand,
  onSelectRoom,
  onBuildingAdded,
}: PropertiesListPanelProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return buildings.filter((b) => {
      const matchesSearch =
        !term ||
        b.name.toLowerCase().includes(term) ||
        b.city.toLowerCase().includes(term) ||
        b.addressLine1.toLowerCase().includes(term) ||
        b.state.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (filter === 'has_vacant') return (b.vacantUnits || 0) > 0;
      if (filter === 'fully_occupied') {
        return (b.totalUnits || 0) > 0 && (b.vacantUnits || 0) === 0;
      }
      return true;
    });
  }, [buildings, search, filter]);

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
            {filtered.length} {filtered.length === 1 ? 'Property' : 'Properties'}
          </span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterValue)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
          >
            <option value="all">All properties</option>
            <option value="has_vacant">Has vacant rooms</option>
            <option value="fully_occupied">Fully occupied</option>
          </select>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
            <p className="text-sm font-medium text-gray-700">No properties found</p>
            <p className="mt-1 text-xs text-gray-500">Try a different search or add a property.</p>
          </div>
        ) : (
          filtered.map((building) => (
            <PropertyListCard
              key={building.id}
              building={building}
              rooms={roomsByBuilding[building.id] ?? null}
              roomsLoading={roomsLoadingId === building.id}
              isSelected={selectedBuildingId === building.id}
              isExpanded={expandedBuildingId === building.id}
              activeRoomId={activeRoomId}
              onSelect={() => onSelectBuilding(building.id)}
              onToggleExpand={() => onToggleExpand(building.id)}
              onSelectRoom={(roomId) => onSelectRoom(building.id, roomId)}
            />
          ))
        )}
      </div>

      <AddBuildingModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onBuildingAdded={(buildingId) => {
          setIsAddOpen(false);
          onBuildingAdded(buildingId);
        }}
      />
    </aside>
  );
}
