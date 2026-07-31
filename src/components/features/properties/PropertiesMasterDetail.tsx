'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  PropertyBuildingDetail,
  PropertyListBuilding,
  PropertyRoomDetail,
} from '@/lib/api/properties';
import PropertiesListPanel from './PropertiesListPanel';
import PropertyDetailPane from './PropertyDetailPane';
import RoomDetailsModal from '@/components/features/rooms/RoomDetailsModal';

interface PropertiesMasterDetailProps {
  initialBuildings: PropertyListBuilding[];
  initialBuildingId?: string | null;
}

export default function PropertiesMasterDetail({
  initialBuildings,
  initialBuildingId = null,
}: PropertiesMasterDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [buildings, setBuildings] = useState(initialBuildings);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    initialBuildingId || initialBuildings[0]?.id || null
  );
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(
    initialBuildingId || initialBuildings[0]?.id || null
  );
  const [detail, setDetail] = useState<PropertyBuildingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [roomsByBuilding, setRoomsByBuilding] = useState<Record<string, PropertyRoomDetail[]>>({});
  const [roomsLoadingId, setRoomsLoadingId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [scrollRequest, setScrollRequest] = useState<{ roomId: string; nonce: number } | null>(
    null
  );
  const [modalRoomId, setModalRoomId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const syncUrl = useCallback(
    (buildingId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (buildingId) {
        params.set('buildingId', buildingId);
      } else {
        params.delete('buildingId');
      }
      const query = params.toString();
      router.replace(query ? `/admin/buildings?${query}` : '/admin/buildings', { scroll: false });
    },
    [router, searchParams]
  );

  const loadDetail = useCallback(async (buildingId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setRoomsLoadingId(buildingId);

    try {
      const response = await fetch(`/api/buildings/${buildingId}/properties`, {
        credentials: 'include',
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load property');
      }

      const data = json.data as PropertyBuildingDetail;
      setDetail(data);
      setRoomsByBuilding((prev) => ({
        ...prev,
        [buildingId]: data.rooms,
      }));
    } catch (err) {
      setDetail(null);
      setDetailError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      setDetailLoading(false);
      setRoomsLoadingId(null);
    }
  }, []);

  const refreshBuildingsList = useCallback(async () => {
    try {
      const response = await fetch('/api/buildings', { credentials: 'include' });
      const json = await response.json();
      if (response.ok && json.success) {
        const next = (json.data.buildings as PropertyListBuilding[]).map((b) => ({
          ...b,
          occupiedUnits: b.occupiedUnits ?? 0,
          vacantUnits: b.vacantUnits ?? 0,
          primaryImagePath:
            (b as PropertyListBuilding).primaryImagePath ?? null,
        }));
        setBuildings(next);
        return next;
      }
    } catch (err) {
      console.error('Failed to refresh buildings:', err);
    }
    return buildings;
  }, [buildings]);

  // Keep selection in sync when URL buildingId changes (e.g. after add)
  useEffect(() => {
    const fromUrl = searchParams.get('buildingId');
    if (fromUrl && fromUrl !== selectedBuildingId) {
      const exists = buildings.some((b) => b.id === fromUrl);
      if (exists) {
        setSelectedBuildingId(fromUrl);
        setExpandedBuildingId(fromUrl);
      }
    }
  }, [searchParams, buildings, selectedBuildingId]);

  useEffect(() => {
    if (!selectedBuildingId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedBuildingId);
  }, [selectedBuildingId, loadDetail]);

  const handleSelectBuilding = (id: string) => {
    setSelectedBuildingId(id);
    setActiveRoomId(null);
    setScrollRequest(null);
    syncUrl(id);
  };

  const handleSelectRoom = (buildingId: string, roomId: string) => {
    setActiveRoomId(roomId);
    setScrollRequest({ roomId, nonce: Date.now() });
    if (selectedBuildingId !== buildingId) {
      setSelectedBuildingId(buildingId);
      setExpandedBuildingId(buildingId);
      syncUrl(buildingId);
    }
  };

  const openRoomModal = (roomId: string) => {
    setActiveRoomId(roomId);
    setModalRoomId(roomId);
    setModalOpen(true);
  };

  const handleViewRoom = (buildingId: string, roomId: string) => {
    handleSelectRoom(buildingId, roomId);
    openRoomModal(roomId);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedBuildingId((prev) => (prev === id ? null : id));
    if (!roomsByBuilding[id] && id !== selectedBuildingId) {
      // Prefetch rooms for expand without changing selection detail if not selected
      void (async () => {
        setRoomsLoadingId(id);
        try {
          const response = await fetch(`/api/buildings/${id}/properties`, {
            credentials: 'include',
          });
          const json = await response.json();
          if (response.ok && json.success) {
            setRoomsByBuilding((prev) => ({
              ...prev,
              [id]: (json.data as PropertyBuildingDetail).rooms,
            }));
          }
        } finally {
          setRoomsLoadingId(null);
        }
      })();
    }
  };

  const handleBuildingAdded = async (buildingId?: string) => {
    router.refresh();
    const next = await refreshBuildingsList();
    const targetId =
      buildingId ||
      next.find((b) => !buildings.some((old) => old.id === b.id))?.id ||
      next[0]?.id ||
      null;
    if (targetId) {
      setSelectedBuildingId(targetId);
      setExpandedBuildingId(targetId);
      syncUrl(targetId);
    }
  };

  const handleBuildingUpdated = () => {
    void loadDetail(selectedBuildingId!);
    void refreshBuildingsList();
    router.refresh();
  };

  const handleBuildingDeleted = async () => {
    const deletedId = selectedBuildingId;
    const next = (await refreshBuildingsList()).filter((b) => b.id !== deletedId);
    setBuildings(next);
    const fallback = next[0]?.id || null;
    setSelectedBuildingId(fallback);
    setExpandedBuildingId(fallback);
    syncUrl(fallback);
    router.refresh();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-white lg:flex-row">
      <div className="h-[42vh] flex-shrink-0 border-b border-gray-200 lg:h-full lg:border-b-0">
        <PropertiesListPanel
          buildings={buildings}
          selectedBuildingId={selectedBuildingId}
          expandedBuildingId={expandedBuildingId}
          roomsByBuilding={roomsByBuilding}
          roomsLoadingId={roomsLoadingId}
          activeRoomId={activeRoomId}
          onSelectBuilding={handleSelectBuilding}
          onToggleExpand={handleToggleExpand}
          onSelectRoom={handleSelectRoom}
          onViewRoom={handleViewRoom}
          onBuildingAdded={handleBuildingAdded}
        />
      </div>

      <PropertyDetailPane
        detail={detail}
        loading={detailLoading}
        error={detailError}
        activeRoomId={activeRoomId}
        scrollToRoomId={scrollRequest?.roomId ?? null}
        scrollNonce={scrollRequest?.nonce ?? null}
        onBuildingUpdated={handleBuildingUpdated}
        onBuildingDeleted={handleBuildingDeleted}
        onViewRoomDetails={openRoomModal}
      />

      <RoomDetailsModal
        isOpen={modalOpen}
        roomId={modalRoomId}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
