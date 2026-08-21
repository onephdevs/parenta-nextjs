'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Home,
  MapPin,
  MoreVertical,
  Pencil,
  Users,
} from 'lucide-react';
import type { PropertyBuildingDetail } from '@/lib/api/properties';
import { getImageUrl } from '@/lib/format/image-url';
import { useNotifications } from '@/hooks/useNotifications';
import EditBuildingModal from '@/components/features/EditBuildingModal';
import DeleteBuildingModal from '@/components/features/DeleteBuildingModal';
import { EntityNotesPanel } from '@/components/features/notes/EntityNotesModal';
import {
  formatBuildingAddress,
  googleMapsUrl,
} from './property-utils';
import { Switch } from '@/components/ui/Switch';

const LATO = 'var(--font-lato), Lato, sans-serif';
const TEAL = '#39CCCC';

interface MainPropertyCardProps {
  detail: PropertyBuildingDetail;
  onBuildingUpdated: () => void;
  onBuildingDeleted: () => void;
  /** Bump after adding a note from the action row so the list reloads. */
  notesRefreshKey?: number;
}

export default function MainPropertyCard({
  detail,
  onBuildingUpdated,
  onBuildingDeleted,
  notesRefreshKey = 0,
}: MainPropertyCardProps) {
  const { building, buildingImages } = detail;
  const { showNotification } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<'basic' | 'photos'>('basic');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(building.name);
  const [savingName, setSavingName] = useState(false);
  const [savingNearbyToggle, setSavingNearbyToggle] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameDraft(building.name);
  }, [building.name]);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  const address = formatBuildingAddress(building);
  const hero = buildingImages[0] ? getImageUrl(buildingImages[0].filePath) : null;
  const mapsHref = googleMapsUrl(address);
  const roomCount = detail.rooms.length || building.totalUnits || 0;

  const openEdit = (section: 'basic' | 'photos' = 'basic') => {
    setEditSection(section);
    setEditOpen(true);
  };

  const saveName = async () => {
    const next = nameDraft.trim();
    if (!next) {
      setNameDraft(building.name);
      setEditingName(false);
      return;
    }
    if (next === building.name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const response = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: next }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Failed to update property name');
      }
      showNotification({
        type: 'success',
        title: 'Property updated',
        message: 'Property name saved.',
      });
      setEditingName(false);
      onBuildingUpdated();
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Failed to update property name',
      });
      setNameDraft(building.name);
    } finally {
      setSavingName(false);
    }
  };

  const toggleShowOnLandingNearby = async (checked: boolean) => {
    setSavingNearbyToggle(true);
    try {
      const response = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ showOnLandingNearby: checked }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Failed to update nearby visibility');
      }
      showNotification({
        type: 'success',
        title: 'Property updated',
        message: checked
          ? 'Property will show in landing “What’s nearby”.'
          : 'Property hidden from landing “What’s nearby”.',
      });
      onBuildingUpdated();
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Update failed',
        message:
          err instanceof Error ? err.message : 'Failed to update nearby visibility',
      });
    } finally {
      setSavingNearbyToggle(false);
    }
  };

  return (
    <>
      <div
        className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)]"
        style={{ fontFamily: LATO }}
      >
        <div className="flex flex-col lg:flex-row">
          {/* Photo */}
          <div className="relative h-48 w-full flex-shrink-0 bg-gray-100 lg:h-auto lg:min-h-[200px] lg:w-[220px] xl:w-[260px]">
            {hero ? (
              <button
                type="button"
                onClick={() => openEdit('photos')}
                className="group relative h-full w-full"
                aria-label="Edit property photos"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero} alt={building.name} className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                  Change photo
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openEdit('photos')}
                className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 px-4 text-gray-500 transition hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <Camera className="h-7 w-7" />
                <span className="text-sm font-medium">Add property photo</span>
              </button>
            )}
          </div>

          {/* Property info */}
          <div className="relative flex min-w-0 flex-1 flex-col gap-3 p-5 lg:max-w-[340px] xl:max-w-[380px]">
            {editingName ? (
              <div>
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  disabled={savingName}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => {
                    void saveName();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveName();
                    }
                    if (e.key === 'Escape') {
                      setNameDraft(building.name);
                      setEditingName(false);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[24px] font-bold leading-none text-gray-900 focus:border-gray-500 focus:outline-none"
                  aria-label="Property name"
                />
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <h3 className="text-[24px] font-bold leading-tight text-gray-900">
                  {building.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="mt-1 rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                  aria-label="Edit property name"
                  title="Edit property name"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}

            <p className="text-[13px] leading-snug text-gray-600">{address}</p>

            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-normal leading-none text-blue-600 hover:text-blue-700"
            >
              <MapPin className="h-4 w-4" style={{ color: TEAL }} />
              Open on Google Maps
            </a>

            <div className="mt-auto flex flex-wrap items-center gap-3 pt-1 text-[12px] font-normal leading-none text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Home className="h-4 w-4" style={{ color: TEAL }} />
                {roomCount} Rooms
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" style={{ color: TEAL }} />
                {detail.tenantCount || 0} Tenants
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5">
              <Switch
                checked={building.showOnLandingNearby !== false}
                onCheckedChange={(checked) => {
                  void toggleShowOnLandingNearby(checked);
                }}
                isDisabled={savingNearbyToggle}
                label="Show in What’s nearby"
                description="Landing page nearby / commute property picker"
              />
            </div>
          </div>

          {/* Notes (right side) */}
          <div className="relative flex min-h-[160px] min-w-0 flex-1 flex-col border-t border-gray-100 bg-gray-50/70 p-4 lg:border-l lg:border-t-0">
            <div className="absolute right-2 top-2 z-10">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-700"
                aria-label="Property options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setMenuOpen(false);
                        openEdit('basic');
                      }}
                    >
                      Edit property
                    </button>
                    <Link
                      href={`/admin/buildings/${building.id}/rooms`}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Manage rooms
                    </Link>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      Delete property
                    </button>
                  </div>
                </>
              )}
            </div>

            <EntityNotesPanel
              entityType="building"
              entityId={building.id}
              entityLabel={building.name}
              title="Notes"
              compact
              dense
              showAddButton={false}
              refreshKey={notesRefreshKey}
              className="min-h-0 flex-1 pr-7"
            />
          </div>
        </div>
      </div>

      <EditBuildingModal
        building={building}
        isOpen={editOpen}
        initialSection={editSection}
        onImagesChanged={onBuildingUpdated}
        onClose={() => {
          setEditOpen(false);
          onBuildingUpdated();
        }}
      />

      <DeleteBuildingModal
        building={building}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDelete={async () => {
          const response = await fetch(`/api/buildings/${building.id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete building');
          onBuildingDeleted();
        }}
      />
    </>
  );
}
