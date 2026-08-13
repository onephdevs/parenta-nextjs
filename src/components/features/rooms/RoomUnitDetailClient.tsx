'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import type { RoomPageDetail } from '@/lib/api/properties';
import type { Room } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import RoomDetailsContent, {
  formatUnitLabel,
} from '@/components/features/rooms/RoomDetailsContent';
import EditRoomForm from '@/components/features/EditRoomForm';
import DeleteRoomModal from '@/components/features/DeleteRoomModal';
import TenantAssignmentManager from '@/components/features/TenantAssignmentManager';

interface RoomUnitDetailClientProps {
  detail: RoomPageDetail;
}

function toEditRoom(detail: RoomPageDetail): Room & { buildingName?: string } {
  const { room, building } = detail;
  const status = room.roomStatus;
  return {
    id: room.id,
    buildingId: building.id,
    buildingName: building.name,
    roomNumber: room.roomNumber,
    floorNumber: room.floorNumber,
    roomType: room.roomType,
    squareFootage: room.squareFootage,
    monthlyRate: room.monthlyRate,
    depositAmount: room.depositAmount,
    roomStatus:
      status === 'occupied' ||
      status === 'vacant' ||
      status === 'maintenance' ||
      status === 'reserved'
        ? status
        : 'vacant',
    description: room.description,
    amenities: Array.isArray(room.amenities)
      ? room.amenities.join(', ')
      : String(room.amenities || ''),
    isActive: true,
    createdAt: room.createdAt ? new Date(room.createdAt) : new Date(),
    updatedAt: room.updatedAt ? new Date(room.updatedAt) : new Date(),
  };
}

export default function RoomUnitDetailClient({
  detail: initialDetail,
}: RoomUnitDetailClientProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [detail, setDetail] = useState(initialDetail);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#photos') return;
    const timer = window.setTimeout(() => {
      document.getElementById('photos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [detail.room.id]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/rooms/${detail.room.id}/properties`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to refresh room');
      }
      setDetail(json.data as RoomPageDetail);
      router.refresh();
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Refresh failed',
        message: err instanceof Error ? err.message : 'Failed to refresh room details',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    const response = await fetch(`/api/rooms/${detail.room.id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete room');
    showNotification({
      type: 'success',
      title: 'Room deleted',
      message: `Room ${detail.room.roomNumber} has been deleted.`,
    });
    router.push('/admin/rooms');
  };

  const editRoom = toEditRoom(detail);

  const assignmentHistory = (detail.assignmentHistory || []).map((item) => ({
    id: item.id,
    tenant_id: item.tenantId || '',
    start_date: String(item.startDate),
    end_date: item.endDate ? String(item.endDate) : undefined,
    monthly_rate: item.monthlyRate,
    assignment_status: item.assignmentStatus,
    first_name: item.tenantName.split(' ')[0] || item.tenantName,
    last_name: item.tenantName.split(' ').slice(1).join(' ') || '',
    email: item.tenantEmail || '',
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="mb-1 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/admin/rooms" className="hover:text-gray-800">
              Rooms
            </Link>
            <span>/</span>
            <span className="font-medium text-gray-800">
              {formatUnitLabel(detail.room.roomNumber)}
            </span>
          </nav>
          <h1 className="text-xl font-bold text-gray-900">{detail.building.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/rooms">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Rooms
            </Button>
          </Link>
          <Button
            variant="outline"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => setEditOpen(true)}
            disabled={refreshing}
          >
            Edit Room
          </Button>
          <Button
            variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <RoomDetailsContent
        detail={detail}
        hideRoomEdit
        onDocumentsChanged={() => {
          void refresh();
        }}
        onTenantCreated={() => {
          void refresh();
        }}
      />

      <section>
        <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">
          Tenant assignment
        </p>
        <div className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
          <TenantAssignmentManager
            roomId={detail.room.id}
            currentTenant={
              detail.room.tenant
                ? {
                    id: detail.room.tenant.tenantId,
                    tenant_id: detail.room.tenant.tenantId,
                    room_id: detail.room.id,
                    start_date: String(detail.room.tenant.startDate),
                    monthly_rate: detail.room.tenant.monthlyRate,
                    deposit_paid: detail.room.tenant.depositPaid,
                    notes: detail.room.tenant.notes || undefined,
                    first_name: detail.room.tenant.firstName,
                    last_name: detail.room.tenant.lastName,
                    email: detail.room.tenant.email || '',
                    phone: detail.room.tenant.phone || undefined,
                    tenant_status: 'active',
                  }
                : null
            }
            assignmentHistory={assignmentHistory}
            roomMonthlyRate={detail.room.monthlyRate}
            onAssignmentChange={() => {
              void refresh();
            }}
          />
        </div>
      </section>

      {editOpen && (
        <EditRoomForm
          key={`edit-room-${detail.room.id}`}
          room={editRoom}
          startInEditMode
          onCancel={() => setEditOpen(false)}
          onRoomUpdated={() => {
            setEditOpen(false);
            void refresh();
          }}
        />
      )}

      <DeleteRoomModal
        room={editRoom}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDelete={handleDelete}
      />
    </div>
  );
}
