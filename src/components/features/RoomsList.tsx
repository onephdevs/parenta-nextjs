'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Room, Building } from '@/types/database';
import RoomCard from './RoomCard';
import AddRoomModal from './AddRoomModal';
import QuickEditModal from './QuickEditModal';
import BulkRoomActions from './BulkRoomActions';

interface RoomsListProps {
  rooms: Room[];
  buildings: Building[];
}

export default function RoomsList({ rooms, buildings }: RoomsListProps) {
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

  // Filter and sort rooms
  const filteredAndSortedRooms = useMemo(() => {
    const filtered = rooms.filter(room => {
      const matchesSearch = searchTerm === '' || 
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buildings.find(b => b.id === room.buildingId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBuilding = selectedBuilding === '' || room.buildingId === selectedBuilding;
      const matchesRoomType = selectedRoomType === '' || room.roomType === selectedRoomType;
      const matchesStatus = selectedStatus === '' || room.roomStatus === selectedStatus;

      return matchesSearch && matchesBuilding && matchesRoomType && matchesStatus;
    });

    // Sort rooms
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortBy as keyof Room] as string | number;
      let bValue: string | number = b[sortBy as keyof Room] as string | number;

      // Special handling for building name
      if (sortBy === 'buildingName') {
        aValue = buildings.find(b => b.id === a.buildingId)?.name || '';
        bValue = buildings.find(b => b.id === b.buildingId)?.name || '';
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [rooms, buildings, searchTerm, selectedBuilding, selectedRoomType, selectedStatus, sortBy, sortOrder]);

  // Get unique room types
  const roomTypes = Array.from(new Set(rooms.map(room => room.roomType)));

  // Note: handleSort function is defined but not currently used in UI
  // const handleSort = (field: string) => {
  //   if (sortBy === field) {
  //     setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortBy(field);
  //     setSortOrder('asc');
  //   }
  // };

  const getBuildingName = (buildingId: string) => {
    return buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800';
      case 'vacant': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      case 'reserved': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRoomUpdate = () => {
    // This would ideally trigger a refresh of the rooms list
    // For now, we'll close the modal and refresh the page
    setQuickEditRoom(null);
    window.location.reload();
  };

  const selectedRooms = rooms.filter(room => selectedRoomIds.includes(room.id));

  const handleRoomSelection = (roomId: string, selected: boolean) => {
    if (selected) {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    } else {
      setSelectedRoomIds(selectedRoomIds.filter(id => id !== roomId));
    }
  };

  const handleSelectAll = () => {
    if (selectedRoomIds.length === filteredAndSortedRooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredAndSortedRooms.map(room => room.id));
    }
  };

  const handleBulkUpdate = () => {
    window.location.reload();
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Buildings</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>{building.name}</option>
              ))}
            </select>

            <select
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Types</option>
              {roomTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Status</option>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>

            <button
              onClick={() => setBulkSelectMode(!bulkSelectMode)}
              className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                bulkSelectMode 
                  ? 'border-purple-600 text-purple-700 bg-purple-50 hover:bg-purple-100' 
                  : 'border-gray-300 text-gray-900 bg-white hover:bg-gray-50'
              }`}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {bulkSelectMode ? 'Exit Bulk Select' : 'Bulk Select'}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Room
            </button>
          </div>
        </div>

        {/* View Mode Toggle and Sort */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-900">
              {filteredAndSortedRooms.length} of {rooms.length} rooms
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="roomNumber-asc">Room Number (A-Z)</option>
              <option value="roomNumber-desc">Room Number (Z-A)</option>
              <option value="buildingName-asc">Building (A-Z)</option>
              <option value="buildingName-desc">Building (Z-A)</option>
              <option value="rent-asc">Rent (Low-High)</option>
              <option value="rent-desc">Rent (High-Low)</option>
              <option value="roomStatus-asc">Status (A-Z)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {bulkSelectMode && (
        <BulkRoomActions
          selectedRooms={selectedRooms}
          onSelectionChange={setSelectedRoomIds}
          onBulkUpdate={handleBulkUpdate}
        />
      )}

      {/* Rooms Display */}
      <div className="p-6">
        {filteredAndSortedRooms.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms found</h3>
            <p className="mt-1 text-sm text-gray-900">
              {rooms.length === 0 
                ? "Get started by adding your first room."
                : "Try adjusting your search or filter criteria."
              }
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedRooms.map(room => (
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {bulkSelectMode && (
                    <th className="px-6 py-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedRoomIds.length === filteredAndSortedRooms.length && filteredAndSortedRooms.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Building</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Rent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedRooms.map(room => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    {bulkSelectMode && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRoomIds.includes(room.id)}
                          onChange={(e) => handleRoomSelection(room.id, e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{room.roomNumber}</div>
                      <div className="text-sm text-gray-900">Floor {room.floorNumber || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getBuildingName(room.buildingId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {room.roomType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(room.roomStatus)}`}>
                        {room.roomStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${room.monthlyRate ? parseFloat(room.monthlyRate).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {room.squareFootage ? `${room.squareFootage} sq ft` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => setQuickEditRoom(room)}
                        className="text-purple-600 hover:text-purple-900 mr-4"
                      >
                        Edit
                      </button>
                      <Link 
                        href={`/admin/rooms/${room.id}`}
                        className="text-gray-900 hover:text-gray-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      <AddRoomModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        buildings={buildings}
      />

      {/* Quick Edit Modal */}
      {quickEditRoom && (
        <QuickEditModal
          room={quickEditRoom}
          isOpen={!!quickEditRoom}
          onClose={() => setQuickEditRoom(null)}
          onUpdate={handleRoomUpdate}
        />
      )}
    </div>
  );
} 