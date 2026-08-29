'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, StickyNote, UserPlus, Wallet, Wrench } from 'lucide-react';
import type { PropertyBuildingDetail } from '@/lib/api/properties';
import AddRoomModal from '@/components/features/AddRoomModal';
import TenantForm from '@/components/features/TenantForm';
import PaymentForm from '@/components/features/PaymentForm';
import CreateMaintenanceRequestModal from '@/components/features/CreateMaintenanceRequestModal';
import EntityNotesModal, {
  EntityNotesPanel,
} from '@/components/features/notes/EntityNotesModal';
import { Tab, TabList, TabPanel, Tabs } from '@/components/ui/Tabs';
import AppLoader from '@/components/ui/AppLoader';
import QuickActionRail from '@/components/layout/QuickActionRail';
import MainPropertyCard from './MainPropertyCard';
import PropertyReportPanel from './PropertyReportPanel';
import PropertyRoomsList from './PropertyRoomsList';
import PropertyMaintenanceList from './PropertyMaintenanceList';
import { occupancyStatusFromRoom } from './property-utils';

const LATO = 'var(--font-lato), Lato, sans-serif';

type PropertyTab = 'overview' | 'rooms' | 'maintenance';

interface PropertyDetailPaneProps {
  detail: PropertyBuildingDetail | null;
  loading: boolean;
  error: string | null;
  activeRoomId?: string | null;
  scrollToRoomId?: string | null;
  scrollNonce?: number | null;
  onBuildingUpdated: () => void;
  onBuildingDeleted: () => void;
  onViewRoomDetails?: (roomId: string) => void;
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
  onViewRoomDetails,
}: PropertyDetailPaneProps) {
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentRoomId, setPaymentRoomId] = useState<string | undefined>();
  const [paymentTenantId, setPaymentTenantId] = useState<string | undefined>();
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [maintenanceRefreshKey, setMaintenanceRefreshKey] = useState(0);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [tab, setTab] = useState<PropertyTab>('overview');

  // Close action modals when the loaded property changes (avoids creating into wrong building)
  useEffect(() => {
    setAddRoomOpen(false);
    setAddTenantOpen(false);
    setRecordPaymentOpen(false);
    setPaymentRoomId(undefined);
    setPaymentTenantId(undefined);
    setMaintenanceOpen(false);
    setNoteOpen(false);
    setMaintenanceRefreshKey(0);
    setNotesRefreshKey(0);
    setTab('overview');
  }, [detail?.building.id]);

  useEffect(() => {
    if (!scrollToRoomId) return;
    setTab('rooms');
  }, [scrollToRoomId, scrollNonce]);

  useEffect(() => {
    if (!scrollToRoomId || loading || !detail || tab !== 'rooms') return;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(`property-room-${scrollToRoomId}`);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [scrollToRoomId, scrollNonce, loading, detail, tab]);

  const openRecordPayment = (room?: { id: string; tenant?: { tenantId: string } | null }) => {
    setPaymentRoomId(room?.id);
    setPaymentTenantId(room?.tenant?.tenantId);
    setRecordPaymentOpen(true);
  };

  const vacantCount = detail
    ? detail.rooms.filter((room) => occupancyStatusFromRoom(room) === 'vacant').length
    : 0;

  const railActions = useMemo(
    () =>
      detail
        ? [
            {
              id: 'payment',
              label: 'Record Payment',
              icon: Wallet,
              onClick: () => openRecordPayment(),
              tile: 'bg-[#252A45] text-white hover:bg-[#1c2040]',
              badge: null as string | null,
            },
            {
              id: 'note',
              label: 'Add note',
              icon: StickyNote,
              onClick: () => setNoteOpen(true),
              tile: 'bg-[#FBE3D4] text-[#252A45] hover:bg-[#f5d5c0]',
              badge: null,
            },
            {
              id: 'tenant',
              label: 'Add Tenant',
              icon: UserPlus,
              onClick: () => setAddTenantOpen(true),
              tile: 'bg-[#D7ECFF] text-[#252A45] hover:bg-[#c5e2fb]',
              badge: vacantCount > 0 ? String(vacantCount) : null,
            },
            {
              id: 'room',
              label: 'Add Room',
              icon: Plus,
              onClick: () => setAddRoomOpen(true),
              tile: 'bg-[#D4F0E4] text-[#252A45] hover:bg-[#c3e8d8]',
              badge: null,
            },
            {
              id: 'maintenance',
              label: 'Maintenance',
              icon: Wrench,
              onClick: () => setMaintenanceOpen(true),
              tile: 'bg-[#E8EAF2] text-[#252A45] hover:bg-[#dce0eb]',
              badge: null,
            },
          ]
        : [],
    [detail, vacantCount]
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#E2E5F7]" style={{ fontFamily: LATO }}>
      <div className="flex-1 overflow-y-auto px-6 py-5 lg:pr-20">
        {loading && (
          <AppLoader
            variant="inline"
            label="Loading…"
            size={96}
            className="min-h-[50vh] bg-transparent"
          />
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
          <div className="w-full space-y-6">
            <MainPropertyCard
              detail={detail}
              onBuildingUpdated={onBuildingUpdated}
              onBuildingDeleted={onBuildingDeleted}
            />

            <Tabs value={tab} onValueChange={(value) => setTab(value as PropertyTab)}>
              <TabList className="gap-6 space-x-0">
                <Tab value="overview" className="px-0 text-sm font-semibold">
                  Overview
                </Tab>
                <Tab value="rooms" className="px-0 text-sm font-semibold">
                  Rooms
                </Tab>
                <Tab value="maintenance" className="px-0 text-sm font-semibold">
                  Maintenance
                </Tab>
              </TabList>

              <TabPanel value="overview" className="pt-5">
                <div className="space-y-6">
                  <PropertyReportPanel
                    buildingId={detail.building.id}
                    onTenantCreated={onBuildingUpdated}
                  />
                  <section className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
                    <EntityNotesPanel
                      entityType="building"
                      entityId={detail.building.id}
                      entityLabel={detail.building.name}
                      title="Notes"
                      refreshKey={notesRefreshKey}
                    />
                  </section>
                </div>
              </TabPanel>

              <TabPanel value="rooms" className="pt-5">
                <PropertyRoomsList
                  key={detail.building.id}
                  rooms={detail.rooms}
                  activeRoomId={activeRoomId}
                  onAddRoom={() => setAddRoomOpen(true)}
                  onViewDetails={onViewRoomDetails}
                  onRecordPayment={openRecordPayment}
                />
              </TabPanel>

              <TabPanel value="maintenance" className="pt-5">
                <PropertyMaintenanceList
                  key={detail.building.id}
                  buildingId={detail.building.id}
                  refreshKey={maintenanceRefreshKey}
                  onAddRequest={() => setMaintenanceOpen(true)}
                />
              </TabPanel>
            </Tabs>

            <AddRoomModal
              buildingId={detail.building.id}
              building={detail.building}
              isOpen={addRoomOpen}
              onClose={() => setAddRoomOpen(false)}
              onRoomAdded={() => {
                setAddRoomOpen(false);
                onBuildingUpdated();
              }}
            />

            <TenantForm
              mode="modal"
              isOpen={addTenantOpen}
              initialBuildingId={detail.building.id}
              lockHousing={false}
              redirectAfterCreate={false}
              onClose={() => setAddTenantOpen(false)}
              onCreated={() => {
                setAddTenantOpen(false);
                onBuildingUpdated();
              }}
            />

            <PaymentForm
              key={`${recordPaymentOpen}-${paymentRoomId || 'any'}-${paymentTenantId || 'any'}`}
              mode="modal"
              isOpen={recordPaymentOpen}
              buildingId={detail.building.id}
              roomId={paymentRoomId}
              initialData={paymentTenantId ? { tenantId: paymentTenantId } : undefined}
              onCancel={() => {
                setRecordPaymentOpen(false);
                setPaymentRoomId(undefined);
                setPaymentTenantId(undefined);
              }}
              onSuccess={() => {
                setRecordPaymentOpen(false);
                setPaymentRoomId(undefined);
                setPaymentTenantId(undefined);
                onBuildingUpdated();
              }}
            />

            <CreateMaintenanceRequestModal
              isOpen={maintenanceOpen}
              buildingId={detail.building.id}
              buildingName={detail.building.name}
              rooms={detail.rooms.map((r) => ({ id: r.id, roomNumber: r.roomNumber }))}
              onClose={() => setMaintenanceOpen(false)}
              onCreated={() => {
                setMaintenanceOpen(false);
                setMaintenanceRefreshKey((k) => k + 1);
                setTab('maintenance');
                onBuildingUpdated();
              }}
            />

            <EntityNotesModal
              isOpen={noteOpen}
              entityType="building"
              entityId={detail.building.id}
              entityLabel={detail.building.name}
              onClose={() => setNoteOpen(false)}
              onSaved={() => setNotesRefreshKey((k) => k + 1)}
            />
          </div>
        )}
      </div>
      {!loading && detail ? (
        <QuickActionRail actions={railActions} ariaLabel="Property actions" />
      ) : null}
    </section>
  );
}
