'use client';

import { useEffect } from 'react';
import type { PropertyBuildingDetail } from '@/lib/api/properties';
import MainPropertyCard from './MainPropertyCard';
import PropertyRoomCard from './PropertyRoomCard';

const LATO = 'var(--font-lato), Lato, sans-serif';

interface PropertyDetailPaneProps {
  detail: PropertyBuildingDetail | null;
  loading: boolean;
  error: string | null;
  activeRoomId?: string | null;
  scrollToRoomId?: string | null;
  scrollNonce?: number | null;
  onBuildingUpdated: () => void;
  onBuildingDeleted: () => void;
}

export default function PropertyDetailPane({
  detail,
  loading,
  error,
  activeRoomId = null,
  scrollToRoomId = null,
  scrollNonce = null,
  onBuildingUpdated,
  onBuildingDeleted,
}: PropertyDetailPaneProps) {
  useEffect(() => {
    if (!scrollToRoomId || loading || !detail) return;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(`property-room-${scrollToRoomId}`);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [scrollToRoomId, scrollNonce, loading, detail]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#E2E5F7]" style={{ fontFamily: LATO }}>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading && (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">
            Loading property…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && !detail && (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 text-center">
            <p className="text-base font-medium text-gray-800">Select a property</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Choose a building from the list to see its details and rooms.
            </p>
          </div>
        )}

        {!loading && detail && (
          <div className="mx-auto max-w-[720px] space-y-8">
            <MainPropertyCard
              detail={detail}
              onBuildingUpdated={onBuildingUpdated}
              onBuildingDeleted={onBuildingDeleted}
            />

            <div>
              <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Rooms</p>
              {detail.rooms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
                  No rooms in this property yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {detail.rooms.map((room) => (
                    <PropertyRoomCard
                      key={room.id}
                      room={room}
                      isActive={activeRoomId === room.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
