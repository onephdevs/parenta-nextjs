'use client';

import type { RoomPageDetail } from '@/lib/api/properties';
import AppLoader from '@/components/ui/AppLoader';
import RoomDetailsContent from './RoomDetailsContent';

interface RoomDetailPaneProps {
  detail: RoomPageDetail | null;
  loading: boolean;
  error: string | null;
  onDocumentsChanged?: () => void;
}

export default function RoomDetailPane({
  detail,
  loading,
  error,
  onDocumentsChanged,
}: RoomDetailPaneProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#E2E5F7]">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading && (
          <AppLoader
            variant="inline"
            label="Loading room…"
            size={96}
            className="min-h-[16rem] bg-transparent"
          />
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && !detail && (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 text-center">
            <p className="text-base font-medium text-gray-800">Select a room</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Choose a room from the list to view its details.
            </p>
          </div>
        )}

        {!loading && detail && (
          <div className="mx-auto max-w-[920px]">
            <RoomDetailsContent
              detail={detail}
              onDocumentsChanged={onDocumentsChanged}
            />
          </div>
        )}
      </div>
    </section>
  );
}
