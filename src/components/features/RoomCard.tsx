'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Room } from '@/types/database';
import QuickEditModal from './QuickEditModal';

interface RoomCardProps {
  room: Room;
  buildingName: string;
  onRoomUpdate?: (updatedRoom: Room) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (roomId: string, selected: boolean) => void;
}

export default function RoomCard({ 
  room, 
  buildingName, 
  onRoomUpdate,
  selectionMode = false,
  isSelected = false,
  onSelectionChange
}: RoomCardProps) {
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(room);

  const handleRoomUpdate = (updatedRoom: Room) => {
    setCurrentRoom(updatedRoom);
    if (onRoomUpdate) {
      onRoomUpdate(updatedRoom);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800 border-green-200';
      case 'vacant': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'maintenance': return 'bg-red-100 text-red-800 border-red-200';
      case 'reserved': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'occupied':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'vacant':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  const handleSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      onSelectionChange(room.id, e.target.checked);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 relative ${
      isSelected ? 'ring-2 ring-purple-500 border-purple-500' : ''
    }`}>
      {selectionMode && (
        <div className="absolute top-3 right-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
        </div>
      )}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{currentRoom.roomNumber}</h3>
            <p className="text-sm text-gray-500">{buildingName}</p>
          </div>
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(currentRoom.roomStatus)}`}>
            {getStatusIcon(currentRoom.roomStatus)}
            <span className="ml-1 capitalize">{currentRoom.roomStatus}</span>
          </div>
        </div>

        {/* Room Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Type</span>
            <span className="text-sm font-medium text-gray-900 capitalize">{currentRoom.roomType}</span>
          </div>

          {currentRoom.squareFootage && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Size</span>
              <span className="text-sm font-medium text-gray-900">{currentRoom.squareFootage} sq ft</span>
            </div>
          )}

          {currentRoom.floorNumber && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Floor</span>
              <span className="text-sm font-medium text-gray-900">{currentRoom.floorNumber}</span>
            </div>
          )}

          {currentRoom.monthlyRate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Rent</span>
              <span className="text-sm font-semibold text-gray-900">${parseFloat(currentRoom.monthlyRate).toLocaleString()}/mo</span>
            </div>
          )}

          {currentRoom.depositAmount && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Deposit</span>
              <span className="text-sm font-medium text-gray-900">${parseFloat(currentRoom.depositAmount).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Amenities */}
        {currentRoom.amenities && currentRoom.amenities.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-2">Amenities</div>
            <div className="flex flex-wrap gap-1">
              {currentRoom.amenities.slice(0, 3).map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {amenity}
                </span>
              ))}
              {currentRoom.amenities.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  +{currentRoom.amenities.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex space-x-3">
          <Link
            href={`/admin/rooms/${room.id}`}
            className="flex-1 bg-purple-600 text-white text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            View Details
          </Link>
          <button 
            onClick={() => setIsQuickEditOpen(true)}
            className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Quick Edit
          </button>
        </div>
      </div>

      {/* Quick Edit Modal */}
      <QuickEditModal
        room={currentRoom}
        isOpen={isQuickEditOpen}
        onClose={() => setIsQuickEditOpen(false)}
        onUpdate={handleRoomUpdate}
      />
    </div>
  );
} 