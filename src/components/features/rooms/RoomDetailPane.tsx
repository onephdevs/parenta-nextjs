'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StickyNote, UserPlus, Wallet, Wrench } from 'lucide-react';
import type { RoomPageDetail } from '@/lib/api/properties';
import AppLoader from '@/components/ui/AppLoader';
import { Button } from '@/components/ui/Button';
import TenantForm from '@/components/features/TenantForm';
import PaymentForm from '@/components/features/PaymentForm';
import CreateMaintenanceRequestModal from '@/components/features/CreateMaintenanceRequestModal';
import { AddNotesButton } from '@/components/features/notes/EntityNotesModal';
import RoomHeroCard from './RoomHeroCard';
import RoomDetailsContent, { formatUnitLabel } from './RoomDetailsContent';

const LATO = 'var(--font-lato), Lato, sans-serif';

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
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  useEffect(() => {
    setAddTenantOpen(false);
    setRecordPaymentOpen(false);
    setMaintenanceOpen(false);
    setNotesRefreshKey(0);
  }, [detail?.room.id]);

  const refresh = () => {
    onDocumentsChanged?.();
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#E2E5F7]" style={{ fontFamily: LATO }}>
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
          <div className="mx-auto max-w-[880px] space-y-8">
            <RoomHeroCard detail={detail} notesRefreshKey={notesRefreshKey} />

            <div className="flex flex-wrap items-center gap-2">
              {detail.room.tenant ? (
                <Button
                  type="button"
                  leftIcon={<Wallet className="h-4 w-4" />}
                  onClick={() => setRecordPaymentOpen(true)}
                >
                  Record Payment
                </Button>
              ) : (
                <Link href="/admin/financial/payments/new">
                  <Button leftIcon={<Wallet className="h-4 w-4" />}>Record Payment</Button>
                </Link>
              )}
              <AddNotesButton
                entityType="room"
                entityId={detail.room.id}
                entityLabel={formatUnitLabel(detail.room.roomNumber)}
                label="Add note"
                variant="outline"
                size="md"
                leftIcon={<StickyNote className="h-4 w-4" />}
                onSaved={() => {
                  setNotesRefreshKey((k) => k + 1);
                  refresh();
                }}
              />
              <Button
                type="button"
                variant="outline"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => setAddTenantOpen(true)}
                isDisabled={Boolean(detail.room.tenant)}
              >
                Add Tenant
              </Button>
              <Button
                type="button"
                variant="outline"
                leftIcon={<Wrench className="h-4 w-4" />}
                onClick={() => setMaintenanceOpen(true)}
              >
                Maintenance
              </Button>
            </div>

            <RoomDetailsContent
              detail={detail}
              onDocumentsChanged={refresh}
              onTenantCreated={refresh}
            />

            <TenantForm
              mode="modal"
              isOpen={addTenantOpen}
              initialBuildingId={detail.building.id}
              initialRoomId={detail.room.id}
              lockHousing
              redirectAfterCreate={false}
              onClose={() => setAddTenantOpen(false)}
              onCreated={() => {
                setAddTenantOpen(false);
                refresh();
              }}
            />

            <PaymentForm
              mode="modal"
              isOpen={recordPaymentOpen}
              buildingId={detail.building.id}
              initialData={
                detail.room.tenant ? { tenantId: detail.room.tenant.tenantId } : undefined
              }
              onCancel={() => setRecordPaymentOpen(false)}
              onSuccess={() => {
                setRecordPaymentOpen(false);
                refresh();
              }}
            />

            <CreateMaintenanceRequestModal
              isOpen={maintenanceOpen}
              buildingId={detail.building.id}
              buildingName={detail.building.name}
              rooms={[{ id: detail.room.id, roomNumber: detail.room.roomNumber }]}
              onClose={() => setMaintenanceOpen(false)}
              onCreated={() => {
                setMaintenanceOpen(false);
                refresh();
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
