'use client';

import { useCallback, useEffect, useState, type WheelEvent } from 'react';
import {
  Plus,
  StickyNote,
  UserPlus,
  Wallet,
  Wrench,
} from 'lucide-react';
import type { Building } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import PaymentForm from '@/components/features/PaymentForm';
import TenantForm from '@/components/features/TenantForm';
import AddRoomModal from '@/components/features/AddRoomModal';
import CreateMaintenanceRequestModal from '@/components/features/CreateMaintenanceRequestModal';
import EntityNotesModal from '@/components/features/notes/EntityNotesModal';

type BuildingOption = Pick<Building, 'id' | 'name'>;

function forwardWheelToAppMain(event: WheelEvent<HTMLElement>) {
  if (event.ctrlKey || event.metaKey) return;
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
  const dx = event.deltaX * scale;
  const dy = event.deltaY * scale;
  const main = document.querySelector<HTMLElement>('[data-app-main]');
  if (main) {
    main.scrollTop += dy;
    main.scrollLeft += dx;
    return;
  }
  window.scrollBy(dx, dy);
}

function parseBuildings(json: unknown): Building[] {
  const root = json as {
    success?: boolean;
    data?: { buildings?: Building[] } | Building[];
    buildings?: Building[];
  };
  const list = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.data?.buildings)
      ? root.data.buildings
      : Array.isArray(root.buildings)
        ? root.buildings
        : [];
  return list;
}

export default function DashboardActionRail() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [vacantCount, setVacantCount] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickMode, setPickMode] = useState<'note' | 'maintenance'>('note');
  const [pickedId, setPickedId] = useState('');
  const [noteBuilding, setNoteBuilding] = useState<BuildingOption | null>(null);
  const [maintenanceBuilding, setMaintenanceBuilding] = useState<BuildingOption | null>(
    null
  );
  const [maintenanceRooms, setMaintenanceRooms] = useState<
    Array<{ id: string; roomNumber: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [buildingsRes, statsRes] = await Promise.all([
          fetch('/api/buildings', { credentials: 'include' }),
          fetch('/api/dashboard/stats', { credentials: 'include' }),
        ]);
        if (buildingsRes.ok) {
          const json = await buildingsRes.json();
          if (!cancelled) setBuildings(parseBuildings(json));
        }
        if (statsRes.ok) {
          const json = await statsRes.json();
          const vacant = Number(json.data?.rooms?.vacant ?? 0);
          if (!cancelled) setVacantCount(Number.isFinite(vacant) ? vacant : 0);
        }
      } catch {
        /* rail still works without counts */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openWithProperty = useCallback(
    (mode: 'note' | 'maintenance') => {
      if (buildings.length === 1) {
        const only = buildings[0];
        if (mode === 'note') {
          setNoteBuilding({ id: only.id, name: only.name });
          setNoteOpen(true);
          return;
        }
        setMaintenanceBuilding({ id: only.id, name: only.name });
        setMaintenanceOpen(true);
        return;
      }
      setPickMode(mode);
      setPickedId(buildings[0]?.id || '');
      setPickOpen(true);
    },
    [buildings]
  );

  useEffect(() => {
    if (!maintenanceOpen || !maintenanceBuilding?.id) {
      setMaintenanceRooms([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/rooms?buildingId=${encodeURIComponent(maintenanceBuilding.id)}`,
          { credentials: 'include' }
        );
        const json = await res.json();
        const list = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.rooms)
            ? json.rooms
            : [];
        if (cancelled) return;
        setMaintenanceRooms(
          list.map((r: { id: string; roomNumber?: string; room_number?: string }) => ({
            id: String(r.id),
            roomNumber: String(r.roomNumber || r.room_number || ''),
          }))
        );
      } catch {
        if (!cancelled) setMaintenanceRooms([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maintenanceOpen, maintenanceBuilding?.id]);

  const confirmPick = () => {
    const building = buildings.find((b) => b.id === pickedId);
    if (!building) return;
    setPickOpen(false);
    if (pickMode === 'note') {
      setNoteBuilding({ id: building.id, name: building.name });
      setNoteOpen(true);
      return;
    }
    setMaintenanceBuilding({ id: building.id, name: building.name });
    setMaintenanceOpen(true);
  };

  const actions = [
    {
      id: 'payment',
      label: 'Record Payment',
      icon: Wallet,
      onClick: () => setPaymentOpen(true),
      tile: 'bg-[#252A45] text-white hover:bg-[#1c2040]',
      badge: null as string | null,
    },
    {
      id: 'note',
      label: 'Add note',
      icon: StickyNote,
      onClick: () => openWithProperty('note'),
      tile: 'bg-[#FBE3D4] text-[#252A45] hover:bg-[#f5d5c0]',
      badge: null,
    },
    {
      id: 'tenant',
      label: 'Add Tenant',
      icon: UserPlus,
      onClick: () => setTenantOpen(true),
      tile: 'bg-[#D7ECFF] text-[#252A45] hover:bg-[#c5e2fb]',
      badge: vacantCount > 0 ? String(vacantCount) : null,
    },
    {
      id: 'room',
      label: 'Add Room',
      icon: Plus,
      onClick: () => setRoomOpen(true),
      tile: 'bg-[#D4F0E4] text-[#252A45] hover:bg-[#c3e8d8]',
      badge: null,
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: Wrench,
      onClick: () => openWithProperty('maintenance'),
      tile: 'bg-[#E8EAF2] text-[#252A45] hover:bg-[#dce0eb]',
      badge: null,
    },
  ];

  return (
    <>
      <aside
        className="pointer-events-none fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
        aria-label="Dashboard actions"
      >
        <div
          className="pointer-events-auto flex flex-col rounded-l-md shadow-[0_8px_24px_rgba(37,42,69,0.16)]"
          onWheel={forwardWheelToAppMain}
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            const round =
              index === 0
                ? 'rounded-tl-md'
                : index === actions.length - 1
                  ? 'rounded-bl-md'
                  : '';
            return (
              <div key={action.id} className="group relative">
                <button
                  type="button"
                  onClick={action.onClick}
                  aria-label={action.label}
                  className={`relative flex h-12 w-12 items-center justify-center transition ${action.tile} ${round}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  {action.badge ? (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                      {action.badge}
                    </span>
                  ) : null}
                </button>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 whitespace-nowrap rounded-sm bg-black px-3 py-1.5 font-[family-name:var(--font-lato)] text-sm font-medium text-white shadow-[0_4px_14px_rgba(0,0,0,0.22)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {action.label}
                  <span className="absolute left-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-l-black" />
                </span>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="pointer-events-auto flex justify-end">
          <div
            className="flex overflow-hidden rounded-tl-md shadow-[0_-4px_20px_rgba(15,23,42,0.16)]"
            onWheel={forwardWheelToAppMain}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  aria-label={action.label}
                  className={`relative flex h-12 w-12 items-center justify-center ${action.tile}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  {action.badge ? (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                      {action.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <PaymentForm
        mode="modal"
        isOpen={paymentOpen}
        onCancel={() => setPaymentOpen(false)}
        onSuccess={() => setPaymentOpen(false)}
      />
      <TenantForm
        mode="modal"
        isOpen={tenantOpen}
        lockHousing={false}
        redirectAfterCreate={false}
        onClose={() => setTenantOpen(false)}
        onCreated={() => setTenantOpen(false)}
      />
      <AddRoomModal
        isOpen={roomOpen}
        buildings={buildings}
        onClose={() => setRoomOpen(false)}
        onRoomAdded={() => setRoomOpen(false)}
      />
      {maintenanceBuilding ? (
        <CreateMaintenanceRequestModal
          isOpen={maintenanceOpen}
          buildingId={maintenanceBuilding.id}
          buildingName={maintenanceBuilding.name}
          rooms={maintenanceRooms}
          onClose={() => {
            setMaintenanceOpen(false);
            setMaintenanceBuilding(null);
          }}
        />
      ) : null}
      {noteBuilding ? (
        <EntityNotesModal
          isOpen={noteOpen}
          entityType="building"
          entityId={noteBuilding.id}
          entityLabel={noteBuilding.name}
          onClose={() => {
            setNoteOpen(false);
            setNoteBuilding(null);
          }}
        />
      ) : null}

      <Dialog
        isOpen={pickOpen}
        onClose={() => setPickOpen(false)}
        title={pickMode === 'note' ? 'Add note' : 'Maintenance'}
        description="Choose a property for this action."
        size="sm"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPickOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmPick} isDisabled={!pickedId}>
              Continue
            </Button>
          </>
        }
      >
        <FormField label="Property" htmlFor="dashboard-action-property" required>
          <Select
            id="dashboard-action-property"
            value={pickedId}
            onChange={(e) => setPickedId(e.target.value)}
          >
            <option value="">Select a property</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
      </Dialog>
    </>
  );
}
