'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Building } from '@/types/database';
import type { RoomPageDetail, RoomsPageListItem } from '@/lib/api/properties';
import RoomsListPanel from './RoomsListPanel';
import RoomDetailPane from './RoomDetailPane';

interface RoomsMasterDetailProps {
  initialRooms: RoomsPageListItem[];
  buildings: Building[];
  initialRoomId?: string | null;
}

export default function RoomsMasterDetail({
  initialRooms,
  buildings,
  initialRoomId = null,
}: RoomsMasterDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rooms, setRooms] = useState(initialRooms);

  useEffect(() => {
    setRooms(initialRooms);
  }, [initialRooms]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    initialRoomId || initialRooms[0]?.id || null
  );
  const [detail, setDetail] = useState<RoomPageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailLoadGen = useRef(0);

  const syncUrl = useCallback(
    (roomId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (roomId) {
        params.set('roomId', roomId);
      } else {
        params.delete('roomId');
      }
      const query = params.toString();
      router.replace(query ? `/admin/rooms?${query}` : '/admin/rooms', { scroll: false });
    },
    [router, searchParams]
  );

  const loadDetail = useCallback(async (roomId: string) => {
    const gen = ++detailLoadGen.current;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}/properties`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await response.json();
      if (gen !== detailLoadGen.current) return;
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load room');
      }
      setDetail(json.data as RoomPageDetail);
    } catch (err) {
      if (gen !== detailLoadGen.current) return;
      setDetail(null);
      setDetailError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      if (gen === detailLoadGen.current) {
        setDetailLoading(false);
      }
    }
  }, []);

  const refreshRoomsList = useCallback(async () => {
    try {
      router.refresh();
      const response = await fetch('/api/rooms?limit=1000', { credentials: 'include' });
      const json = await response.json();
      if (response.ok && json.success && Array.isArray(json.data)) {
        setRooms((prev) => {
          const byId = new Map(prev.map((r) => [r.id, r]));
          return (
            json.data as Array<{
              id: string;
              buildingId: string;
              buildingName?: string;
              roomNumber: string;
              roomType: string;
              roomStatus: string;
              squareFootage?: number;
              monthlyRate: number;
            }>
          ).map((r) => {
            const existing = byId.get(r.id);
            return {
              id: r.id,
              buildingId: r.buildingId,
              buildingName: r.buildingName || existing?.buildingName || 'Building',
              roomNumber: r.roomNumber,
              roomType: r.roomType,
              roomStatus: r.roomStatus,
              squareFootage: r.squareFootage,
              monthlyRate: r.monthlyRate,
              tenantName: existing?.tenantName ?? null,
              primaryImagePath: existing?.primaryImagePath ?? null,
            };
          });
        });
      }
    } catch (err) {
      console.error('Failed to refresh rooms:', err);
    }
  }, [router]);

  useEffect(() => {
    const fromUrl = searchParams.get('roomId');
    if (fromUrl && fromUrl !== selectedRoomId) {
      const exists = rooms.some((r) => r.id === fromUrl);
      if (exists) setSelectedRoomId(fromUrl);
    }
  }, [searchParams, rooms, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedRoomId);
  }, [selectedRoomId, loadDetail]);

  const handleSelectRoom = (roomId: string) => {
    if (roomId === selectedRoomId) return;
    detailLoadGen.current += 1;
    setSelectedRoomId(roomId);
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    syncUrl(roomId);
  };

  const handleRoomAdded = async (roomId?: string) => {
    await refreshRoomsList();
    if (roomId) {
      setSelectedRoomId(roomId);
      syncUrl(roomId);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-white lg:flex-row">
      <div className="h-[42vh] flex-shrink-0 border-b border-gray-200 lg:h-full lg:border-b-0">
        <RoomsListPanel
          rooms={rooms}
          buildings={buildings}
          selectedRoomId={selectedRoomId}
          onSelectRoom={handleSelectRoom}
          onRoomAdded={handleRoomAdded}
        />
      </div>

      <RoomDetailPane
        detail={
          detail && selectedRoomId && detail.room.id === selectedRoomId ? detail : null
        }
        loading={
          detailLoading ||
          Boolean(selectedRoomId && detail && detail.room.id !== selectedRoomId)
        }
        error={detailError}
        onDocumentsChanged={() => {
          if (selectedRoomId) void loadDetail(selectedRoomId);
        }}
      />
    </div>
  );
}
