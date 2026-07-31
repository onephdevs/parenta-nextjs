'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import {
  Building2,
  Home,
  Layers,
  Ruler,
  PhilippinePeso,
  Wallet,
} from 'lucide-react';
import { Room } from '@/types/database';
import QuickEditModal from './QuickEditModal';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AmenityBadges } from '@/components/domain/AmenityBadges';
import { RoomStatusBadge } from '@/components/domain/StatusBadges';
import { normalizeAmenities } from '@/lib/format/amenities';
import { cn } from '@/lib/utils';

interface RoomCardProps {
  room: Room;
  buildingName: string;
  onRoomUpdate?: (updatedRoom: Room) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (roomId: string, selected: boolean) => void;
}

function StatRow({
  icon,
  label,
  children,
  isEmpty = false,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="flex min-h-[1.5rem] items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 text-right font-medium',
          isEmpty ? 'italic text-gray-400' : 'text-gray-900'
        )}
      >
        {children}
      </span>
    </div>
  );
}

export default function RoomCard({
  room,
  buildingName,
  onRoomUpdate,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: RoomCardProps) {
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(room);
  const { formatCurrency } = useCurrency();
  const amenities = normalizeAmenities(currentRoom.amenities);

  const handleRoomUpdate = (updatedRoom: Room) => {
    setCurrentRoom(updatedRoom);
    if (onRoomUpdate) {
      onRoomUpdate(updatedRoom);
    }
  };

  const handleSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      onSelectionChange(room.id, e.target.checked);
    }
  };

  const monthlyRate = currentRoom.monthlyRate != null ? Number(currentRoom.monthlyRate) : null;
  const depositAmount =
    currentRoom.depositAmount != null ? Number(currentRoom.depositAmount) : null;
  const hasRent = monthlyRate != null && monthlyRate > 0;
  const hasDeposit = depositAmount != null && depositAmount > 0;

  return (
    <Card
      padding="none"
      className={cn(
        'relative flex h-full flex-col border border-gray-100 shadow-sm',
        'transition-all duration-200 hover:border-purple-100 hover:shadow-md',
        isSelected && 'ring-2 ring-purple-500'
      )}
    >
      {selectionMode && (
        <div className="absolute top-3 right-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </div>
      )}

      <div className="flex h-full flex-col p-6">
        <div className="mb-5 flex min-h-[4.25rem] items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className="text-xl font-bold leading-snug text-gray-900 line-clamp-2 break-words"
              title={String(currentRoom.roomNumber)}
            >
              Room {currentRoom.roomNumber}
            </h3>
            <p
              className="mt-1.5 flex items-start gap-1.5 text-sm leading-snug text-gray-500"
              title={buildingName || 'Unknown building'}
            >
              <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <span className="line-clamp-2 break-words">
                {buildingName || 'Unknown building'}
              </span>
            </p>
          </div>
          <div className="flex-shrink-0 pt-0.5">
            <RoomStatusBadge status={currentRoom.roomStatus || 'vacant'} />
          </div>
        </div>

        <div className="space-y-3">
          <StatRow icon={<Home className="h-3.5 w-3.5" />} label="Type">
            {currentRoom.roomType ? (
              <span className="capitalize">{currentRoom.roomType}</span>
            ) : (
              '—'
            )}
          </StatRow>

          <StatRow
            icon={<Ruler className="h-3.5 w-3.5" />}
            label="Size"
            isEmpty={!currentRoom.squareFootage}
          >
            {currentRoom.squareFootage ? `${currentRoom.squareFootage} sq ft` : 'Not set'}
          </StatRow>

          <StatRow
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Floor"
            isEmpty={currentRoom.floorNumber == null}
          >
            {currentRoom.floorNumber != null ? currentRoom.floorNumber : 'Not set'}
          </StatRow>

          <StatRow
            icon={<PhilippinePeso className="h-3.5 w-3.5" />}
            label="Rent"
            isEmpty={!hasRent}
          >
            {hasRent ? `${formatCurrency(monthlyRate!)}/mo` : 'No rent set'}
          </StatRow>

          <StatRow
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Deposit"
            isEmpty={!hasDeposit}
          >
            {hasDeposit ? formatCurrency(depositAmount!) : 'No deposit set'}
          </StatRow>
        </div>

        <div className="mt-4 min-h-[3.5rem]">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Amenities
          </p>
          <AmenityBadges amenities={amenities} tone="purple" />
        </div>

        <div className="mt-auto flex gap-3 pt-6">
          <Link href={`/admin/rooms/${room.id}`} className="flex-1">
            <Button className="w-full" size="sm">
              View Details
            </Button>
          </Link>
          <Button
            className="flex-1"
            variant="secondary"
            size="sm"
            onClick={() => setIsQuickEditOpen(true)}
          >
            Quick Edit
          </Button>
        </div>
      </div>

      <QuickEditModal
        room={currentRoom}
        isOpen={isQuickEditOpen}
        onClose={() => setIsQuickEditOpen(false)}
        onUpdate={handleRoomUpdate}
      />
    </Card>
  );
}
