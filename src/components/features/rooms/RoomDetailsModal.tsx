'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Wallet, X } from 'lucide-react';
import type { RoomPageDetail } from '@/lib/api/properties';
import TenantForm from '@/components/features/TenantForm';
import AppLoader from '@/components/ui/AppLoader';
import RoomDetailsContent, { formatUnitLabel } from './RoomDetailsContent';

interface RoomDetailsModalProps {
  isOpen: boolean;
  roomId: string | null;
  onClose: () => void;
  /** Optional preloaded detail to avoid a flash while fetching. */
  initialDetail?: RoomPageDetail | null;
  onRoomUpdated?: () => void;
}

export default function RoomDetailsModal({
  isOpen,
  roomId,
  onClose,
  initialDetail = null,
  onRoomUpdated,
}: RoomDetailsModalProps) {
  const [detail, setDetail] = useState<RoomPageDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slidIn, setSlidIn] = useState(false);
  const [addTenantOpen, setAddTenantOpen] = useState(false);

  const loadDetail = useCallback(async (id: string, opts?: { keepVisible?: boolean }) => {
    if (!opts?.keepVisible) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await fetch(`/api/rooms/${id}/properties`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load room');
      }
      setDetail(json.data as RoomPageDetail);
      setError(null);
    } catch (err) {
      if (!opts?.keepVisible) {
        setDetail(null);
        setError(err instanceof Error ? err.message : 'Failed to load room');
      }
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
      setAddTenantOpen(false);
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

  const title = detail ? formatUnitLabel(detail.room.roomNumber) : 'Room details';
  const isVacant = Boolean(detail && !detail.room.tenant);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dim overlay over the main content area (beside sidebar on desktop) */}
      <div
        className={`absolute inset-0 bg-gray-900/50 transition-opacity duration-300 lg:left-[var(--admin-sidebar-width,16rem)] ${
          slidIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Full-height slide-over anchored to the right of the main section */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex justify-end lg:left-[var(--admin-sidebar-width,16rem)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-details-modal-title"
          className={`pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-white text-gray-900 shadow-2xl transition-transform duration-300 ease-out lg:w-[min(92%,72rem)] lg:rounded-l-2xl ${
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
                  {detail?.building.name && (
                    <p className="mt-0.5 truncate text-sm text-gray-500">
                      {detail.building.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {isVacant && (
                  <button
                    type="button"
                    onClick={() => setAddTenantOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#111827] px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Tenant
                  </button>
                )}
                {detail?.room.tenant && (
                  <Link
                    href={`/admin/financial/payments/new?tenantId=${encodeURIComponent(detail.room.tenant.tenantId)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#111827] px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                  >
                    <Wallet className="h-4 w-4" />
                    Make Payment
                  </Link>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 transition-colors hover:text-gray-900"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50">
            <div className="mx-auto max-w-4xl p-4 sm:p-5">
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

              {!loading && !error && detail && (
                <RoomDetailsContent
                  detail={detail}
                  variant="modal"
                  hideRoomEdit
                  onDocumentsChanged={() => {
                    void loadDetail(detail.room.id);
                    onRoomUpdated?.();
                  }}
                  onTenantCreated={() => {
                    void loadDetail(detail.room.id);
                    onRoomUpdated?.();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {detail && (
        <TenantForm
          mode="modal"
          isOpen={addTenantOpen}
          onClose={() => setAddTenantOpen(false)}
          initialBuildingId={detail.building.id}
          initialRoomId={detail.room.id}
          lockHousing
          redirectAfterCreate={false}
          onCreated={() => {
            setAddTenantOpen(false);
            void loadDetail(detail.room.id, { keepVisible: true });
            onRoomUpdated?.();
          }}
        />
      )}
    </div>
  );
}
