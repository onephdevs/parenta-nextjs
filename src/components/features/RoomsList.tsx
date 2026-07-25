'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Room, Building } from '@/types/database';
import RoomCard from './RoomCard';
import AddRoomModal from './AddRoomModal';
import QuickEditModal from './QuickEditModal';
import BulkRoomActions from './BulkRoomActions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { RoomStatusBadge } from '@/components/domain/StatusBadges';
import { cn } from '@/lib/utils';
import { CheckSquare, DoorOpen, LayoutGrid, List, Plus, Search } from 'lucide-react';

interface RoomsListProps {
  rooms: Room[];
  buildings: Building[];
}

export default function RoomsList({ rooms, buildings }: RoomsListProps) {
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('roomNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickEditRoom, setQuickEditRoom] = useState<Room | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  const filteredAndSortedRooms = useMemo(() => {
    const filtered = rooms.filter((room) => {
      const matchesSearch =
        searchTerm === '' ||
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buildings
          .find((b) => b.id === room.buildingId)
          ?.name.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesBuilding = selectedBuilding === '' || room.buildingId === selectedBuilding;
      const matchesRoomType = selectedRoomType === '' || room.roomType === selectedRoomType;
      const matchesStatus = selectedStatus === '' || room.roomStatus === selectedStatus;

      return matchesSearch && matchesBuilding && matchesRoomType && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: string | number = a[sortBy as keyof Room] as string | number;
      let bValue: string | number = b[sortBy as keyof Room] as string | number;

      if (sortBy === 'buildingName') {
        aValue = buildings.find((building) => building.id === a.buildingId)?.name || '';
        bValue = buildings.find((building) => building.id === b.buildingId)?.name || '';
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    rooms,
    buildings,
    searchTerm,
    selectedBuilding,
    selectedRoomType,
    selectedStatus,
    sortBy,
    sortOrder,
  ]);

  const roomTypes = Array.from(new Set(rooms.map((room) => room.roomType)));

  const getBuildingName = (buildingId: string) => {
    return buildings.find((b) => b.id === buildingId)?.name || 'Unknown';
  };

  const handleRoomUpdate = () => {
    setQuickEditRoom(null);
    window.location.reload();
  };

  const selectedRooms = rooms.filter((room) => selectedRoomIds.includes(room.id));

  const handleRoomSelection = (roomId: string, selected: boolean) => {
    if (selected) {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    } else {
      setSelectedRoomIds(selectedRoomIds.filter((id) => id !== roomId));
    }
  };

  const handleSelectAll = () => {
    if (selectedRoomIds.length === filteredAndSortedRooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredAndSortedRooms.map((room) => room.id));
    }
  };

  const handleBulkUpdate = () => {
    window.location.reload();
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-6 border-b border-gray-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-auto min-w-[9rem]"
            >
              <option value="">All Buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              className="w-auto min-w-[8rem]"
            >
              <option value="">All Types</option>
              {roomTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>

            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-auto min-w-[8rem]"
            >
              <option value="">All Status</option>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </Select>

            <Button
              type="button"
              variant={bulkSelectMode ? 'secondary' : 'outline'}
              leftIcon={<CheckSquare className="h-4 w-4" />}
              onClick={() => setBulkSelectMode(!bulkSelectMode)}
            >
              {bulkSelectMode ? 'Exit Bulk Select' : 'Bulk Select'}
            </Button>

            <Button
              type="button"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddModal(true)}
            >
              Add Room
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">
            {filteredAndSortedRooms.length} of {rooms.length} rooms
          </span>

          <div className="flex items-center gap-4">
            <Select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="w-auto min-w-[11rem]"
            >
              <option value="roomNumber-asc">Room Number (A-Z)</option>
              <option value="roomNumber-desc">Room Number (Z-A)</option>
              <option value="buildingName-asc">Building (A-Z)</option>
              <option value="buildingName-desc">Building (Z-A)</option>
              <option value="rent-asc">Rent (Low-High)</option>
              <option value="rent-desc">Rent (High-Low)</option>
              <option value="roomStatus-asc">Status (A-Z)</option>
            </Select>

            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={cn(
                  'inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-l-md border',
                  viewMode === 'grid'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={cn(
                  'inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b',
                  viewMode === 'list'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {bulkSelectMode && (
        <BulkRoomActions
          selectedRooms={selectedRooms}
          onSelectionChange={setSelectedRoomIds}
          onBulkUpdate={handleBulkUpdate}
        />
      )}

      <div className="p-6">
        {filteredAndSortedRooms.length === 0 ? (
          <EmptyState
            icon={<DoorOpen className="h-12 w-12" />}
            title="No rooms found"
            description={
              rooms.length === 0
                ? 'Get started by adding your first room.'
                : 'Try adjusting your search or filter criteria.'
            }
            action={
              rooms.length === 0 ? (
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
                  Add Room
                </Button>
              ) : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                buildingName={getBuildingName(room.buildingId)}
                selectionMode={bulkSelectMode}
                isSelected={selectedRoomIds.includes(room.id)}
                onSelectionChange={handleRoomSelection}
              />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {bulkSelectMode && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedRoomIds.length === filteredAndSortedRooms.length &&
                        filteredAndSortedRooms.length > 0
                      }
                      onChange={handleSelectAll}
                      aria-label="Select all rooms"
                    />
                  </TableHead>
                )}
                <TableHead>Room</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRooms.map((room) => (
                <TableRow key={room.id}>
                  {bulkSelectMode && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRoomIds.includes(room.id)}
                        onChange={(e) => handleRoomSelection(room.id, e.target.checked)}
                        aria-label={`Select room ${room.roomNumber}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium text-gray-900">{room.roomNumber}</div>
                    <div className="text-sm text-gray-500">Floor {room.floorNumber || 'N/A'}</div>
                  </TableCell>
                  <TableCell>{getBuildingName(room.buildingId)}</TableCell>
                  <TableCell className="capitalize">{room.roomType}</TableCell>
                  <TableCell>
                    <RoomStatusBadge status={room.roomStatus} />
                  </TableCell>
                  <TableCell>
                    {room.monthlyRate ? formatCurrency(Number(room.monthlyRate)) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {room.squareFootage ? `${room.squareFootage} sq ft` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => setQuickEditRoom(room)}
                      className="text-purple-600 hover:text-purple-900 mr-4 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <Link
                      href={`/admin/rooms/${room.id}`}
                      className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AddRoomModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        buildings={buildings}
      />

      {quickEditRoom && (
        <QuickEditModal
          room={quickEditRoom}
          isOpen={!!quickEditRoom}
          onClose={() => setQuickEditRoom(null)}
          onUpdate={handleRoomUpdate}
        />
      )}
    </Card>
  );
}
