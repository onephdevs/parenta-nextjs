'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DoorOpen,
  Home,
  Plus,
  Users,
  Wallet,
} from 'lucide-react';
import type { PropertyRoomDetail } from '@/lib/api/properties';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { compareNatural } from '@/lib/utils/natural-sort';
import { cn } from '@/lib/utils';
import {
  Button,
  EmptyState,
  FilterBar,
  FormField,
  ListSummaryCard,
  Pagination,
  SearchInput,
  Select,
  TableCard,
  WorkItemHeader,
  WorkItemRow,
} from '@/components/ui';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';
import {
  displayStatusLabel,
  formatShortDate,
  getRoomTypeStats,
  occupancyStatusFromRoom,
  type DisplayRoomStatus,
} from './property-utils';

const PAGE_SIZE = 20;

interface PropertyRoomsListProps {
  rooms: PropertyRoomDetail[];
  activeRoomId?: string | null;
  onAddRoom?: () => void;
  onViewDetails?: (roomId: string) => void;
  onRecordPayment?: (room?: PropertyRoomDetail) => void;
}

function unitTitle(roomNumber: string): string {
  const value = (roomNumber || '').trim();
  if (!value) return 'Unit';
  return /^unit\b/i.test(value) ? value : `Unit ${value}`;
}

function statusTone(status: DisplayRoomStatus): WorkItemTone {
  if (status === 'occupied') return 'success';
  if (status === 'pending') return 'warning';
  return 'info';
}

export default function PropertyRoomsList({
  rooms,
  activeRoomId = null,
  onAddRoom,
  onViewDetails,
  onRecordPayment,
}: PropertyRoomsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisplayRoomStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => compareNatural(a.roomNumber, b.roomNumber)),
    [rooms]
  );

  const summary = useMemo(() => {
    let occupied = 0;
    let vacant = 0;
    let pending = 0;
    for (const room of sortedRooms) {
      const status = occupancyStatusFromRoom(room);
      if (status === 'occupied') occupied += 1;
      else if (status === 'vacant') vacant += 1;
      else pending += 1;
    }
    return { total: sortedRooms.length, occupied, vacant, pending };
  }, [sortedRooms]);

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedRooms.filter((room) => {
      const status = occupancyStatusFromRoom(room);
      if (statusFilter && status !== statusFilter) return false;
      if (!term) return true;
      const tenantName = room.tenant
        ? `${room.tenant.firstName} ${room.tenant.lastName}`.toLowerCase()
        : '';
      const typeLabel = getRoomTypeStats(room.roomType).bedroomsLabel.toLowerCase();
      return (
        room.roomNumber.toLowerCase().includes(term) ||
        tenantName.includes(term) ||
        typeLabel.includes(term) ||
        displayStatusLabel(status).toLowerCase().includes(term)
      );
    });
  }, [sortedRooms, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (!activeRoomId) return;
    const index = filteredRooms.findIndex((room) => room.id === activeRoomId);
    if (index < 0) return;
    setCurrentPage(Math.floor(index / PAGE_SIZE) + 1);
  }, [activeRoomId, filteredRooms]);

  const pageRooms = filteredRooms.slice(
    (Math.min(currentPage, totalPages) - 1) * PAGE_SIZE,
    Math.min(currentPage, totalPages) * PAGE_SIZE
  );

  const addRoomButton = onAddRoom ? (
    <Button type="button" leftIcon={<Plus className="h-4 w-4" />} onClick={onAddRoom}>
      Add Room
    </Button>
  ) : null;

  const recordPaymentButton = onRecordPayment ? (
    <Button
      type="button"
      variant="outline"
      leftIcon={<Wallet className="h-4 w-4" />}
      onClick={() => onRecordPayment()}
    >
      Record Payment
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total units"
          value={summary.total}
          footer="rooms in this property"
          icon={<Home className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Occupied"
          value={summary.occupied}
          footer="units with a tenant"
          icon={<Users className="h-8 w-8 text-emerald-600" />}
        />
        <ListSummaryCard
          title="Vacant"
          value={summary.vacant}
          footer="units ready to rent"
          icon={<DoorOpen className="h-8 w-8 text-sky-600" />}
        />
        <ListSummaryCard
          title="Unassigned"
          value={summary.pending}
          footer="pending or unassigned"
          icon={<AlertTriangle className="h-8 w-8 text-amber-600" />}
        />
      </div>

      <FilterBar
        columns={2}
        footer={
          <p className="text-sm text-gray-600">
            Showing {filteredRooms.length} of {sortedRooms.length} rooms
          </p>
        }
      >
        <FormField label="Search" htmlFor="property-room-search">
          <SearchInput
            id="property-room-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Room, tenant, type..."
            aria-label="Search rooms"
          />
        </FormField>
        <FormField label="Status" htmlFor="property-room-status">
          <Select
            id="property-room-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DisplayRoomStatus | '')}
          >
            <option value="">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="pending">Unassigned</option>
          </Select>
        </FormField>
      </FilterBar>

      <TableCard
        title="Rooms"
        description="Units in this property, occupancy, and listed rent."
        actions={
          addRoomButton || recordPaymentButton ? (
            <div className="flex flex-wrap items-center gap-2">
              {recordPaymentButton}
              {addRoomButton}
            </div>
          ) : undefined
        }
      >
        {filteredRooms.length === 0 ? (
          <EmptyState
            title={sortedRooms.length === 0 ? 'No rooms in this property yet' : 'No rooms match your filters'}
            description={
              sortedRooms.length === 0
                ? 'Get started by adding a room'
                : 'Try a different search or status'
            }
            action={sortedRooms.length === 0 ? addRoomButton : undefined}
          />
        ) : (
          <>
            <WorkItemHeader
              title="Unit"
              status="Status"
              date="Date"
              meta="Rent"
              showActions={Boolean(onRecordPayment)}
            />
            {pageRooms.map((room) => {
              const status = occupancyStatusFromRoom(room);
              const tone = statusTone(status);
              const { bedroomsLabel } = getRoomTypeStats(room.roomType);
              const tenantName = room.tenant
                ? `${room.tenant.firstName} ${room.tenant.lastName}`
                : null;
              const amountDue = room.tenant
                ? (room.tenant.overdueAmount || 0) + (room.tenant.pendingAmount || 0)
                : 0;
              const rent = room.tenant?.monthlyRate || room.monthlyRate;
              const date =
                room.lastPaymentDate || room.tenant?.startDate
                  ? formatShortDate(room.lastPaymentDate || room.tenant?.startDate)
                  : null;

              return (
                <div
                  key={room.id}
                  id={`property-room-${room.id}`}
                  className="scroll-mt-4"
                >
                  <WorkItemRow
                    onClick={onViewDetails ? () => onViewDetails(room.id) : undefined}
                    className={cn(
                      activeRoomId === room.id && 'bg-blue-50/80 ring-1 ring-inset ring-blue-200'
                    )}
                    title={unitTitle(room.roomNumber)}
                    subtitle={tenantName || bedroomsLabel}
                    badges={[
                      {
                        key: 'status',
                        label: displayStatusLabel(status),
                        tone,
                      },
                      {
                        key: 'type',
                        label: bedroomsLabel,
                        tone: 'neutral',
                      },
                    ]}
                    date={date}
                    metaLabel={displayStatusLabel(status)}
                    metaDetail={formatCurrency(rent)}
                    metaTone={
                      status === 'occupied' && amountDue > 0
                        ? 'danger'
                        : status === 'pending'
                          ? 'warning'
                          : status === 'vacant'
                            ? 'default'
                            : 'muted'
                    }
                    dotTone={tone}
                    trailingIcon={
                      status === 'occupied' && amountDue <= 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : status === 'occupied' && amountDue > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                      ) : null
                    }
                    actions={
                      room.tenant && onRecordPayment ? (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(room)}
                          className="text-gray-500 hover:text-gray-900"
                          title="Record Payment"
                          aria-label={`Record payment for ${unitTitle(room.roomNumber)}`}
                        >
                          <Wallet className="h-5 w-5" />
                        </button>
                      ) : onRecordPayment ? (
                        <span className="inline-block h-5 w-5" aria-hidden />
                      ) : null
                    }
                  />
                </div>
              );
            })}
            <Pagination
              currentPage={Math.min(currentPage, totalPages)}
              totalPages={totalPages}
              totalItems={filteredRooms.length}
              itemsPerPage={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </TableCard>
    </div>
  );
}
