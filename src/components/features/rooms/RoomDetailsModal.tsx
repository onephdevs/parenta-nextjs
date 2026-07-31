'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { RoomPageDetail } from '@/lib/api/properties';
import RoomDetailsContent from './RoomDetailsContent';

interface RoomDetailsModalProps {
  isOpen: boolean;
  roomId: string | null;
  onClose: () => void;
  /** Optional preloaded detail to avoid a flash while fetching. */
  initialDetail?: RoomPageDetail | null;
}

export default function RoomDetailsModal({
  isOpen,
  roomId,
  onClose,
  initialDetail = null,
}: RoomDetailsModalProps) {
  const [detail, setDetail] = useState<RoomPageDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slidIn, setSlidIn] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${id}/properties`, {
        credentials: 'include',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load room');
      }
      setDetail(json.data as RoomPageDetail);
    } catch (err) {
      setDetail(null);
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !roomId) return;

    if (initialDetail?.room.id === roomId) {
      setDetail(initialDetail);
      setError(null);
      setLoading(false);
      return;
    }

    void loadDetail(roomId);
  }, [isOpen, roomId, initialDetail, loadDetail]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Start off-screen so the panel animates in on open.
  useEffect(() => {
    if (!isOpen) {
      setSlidIn(false);
      return;
    }
    const frame = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen || !roomId) return null;

  const title = detail ? `Room ${detail.room.roomNumber}` : 'Room details';
  const subtitle = detail?.building.name;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dim overlay over the main content area (beside sidebar on desktop) */}
      <div
        className={`absolute inset-0 bg-gray-900/50 transition-opacity duration-300 lg:left-64 ${
          slidIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Full-height slide-over anchored to the right of the main section */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex justify-end lg:left-64">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-details-modal-title"
          className={`pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-white text-gray-900 shadow-2xl transition-transform duration-300 ease-out lg:w-[80%] lg:rounded-l-2xl ${
            slidIn ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex-shrink-0 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-900"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h1
                    id="room-details-modal-title"
                    className="truncate text-xl font-semibold text-gray-900"
                  >
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1 truncate text-sm text-gray-600">{subtitle}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-900"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#E2E5F7]">
            <div className="mx-auto max-w-4xl p-4 sm:p-6">
              {loading && (
                <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                  Loading room…
                </div>
              )}

              {!loading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!loading && !error && detail && (
                <RoomDetailsContent detail={detail} hideRoomEdit />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
