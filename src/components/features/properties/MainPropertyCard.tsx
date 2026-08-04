'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Home,
  MapPin,
  MoreVertical,
  Plus,
  Users,
} from 'lucide-react';
import type { PropertyBuildingDetail } from '@/lib/api/properties';
import { getImageUrl } from '@/lib/format/image-url';
import EditBuildingModal from '@/components/features/EditBuildingModal';
import DeleteBuildingModal from '@/components/features/DeleteBuildingModal';
import AddRoomModal from '@/components/features/AddRoomModal';
import {
  formatBuildingAddress,
  googleMapsUrl,
} from './property-utils';

const LATO = 'var(--font-lato), Lato, sans-serif';
const TEAL = '#39CCCC';

interface MainPropertyCardProps {
  detail: PropertyBuildingDetail;
  onBuildingUpdated: () => void;
  onBuildingDeleted: () => void;
  onRoomAdded?: () => void;
}

export default function MainPropertyCard({
  detail,
  onBuildingUpdated,
  onBuildingDeleted,
  onRoomAdded,
}: MainPropertyCardProps) {
  const { building, buildingImages } = detail;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);

  const address = formatBuildingAddress(building);
  const hero = buildingImages[0] ? getImageUrl(buildingImages[0].filePath) : null;
  const mapsHref = googleMapsUrl(address);
  const roomCount = detail.rooms.length || building.totalUnits || 0;

  return (
    <>
      <div style={{ fontFamily: LATO }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[16px] font-bold leading-none text-gray-900">Main Property</p>
          <button
            type="button"
            onClick={() => setAddRoomOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#111827] px-3 py-2 text-sm font-medium text-white hover:bg-black"
          >
            <Plus className="h-4 w-4" />
            Add Room
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col md:flex-row">
            <div className="relative h-48 w-full flex-shrink-0 bg-gray-100 md:h-auto md:min-h-[200px] md:w-[240px] lg:w-[280px]">
              {hero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hero} alt={building.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[12rem] items-center justify-center text-gray-400">
                  <span className="text-sm">No photo</span>
                </div>
              )}
            </div>

            <div className="relative flex flex-1 flex-col gap-3 p-5">
              <div className="absolute right-3 top-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
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
                          setEditOpen(true);
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

              <h3 className="pr-8 text-[24px] font-bold leading-none text-gray-900">
                {building.name}, {address}
              </h3>

              {building.description && (
                <p className="line-clamp-3 text-[12px] font-normal leading-none text-gray-500">
                  {building.description}
                </p>
              )}

              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-normal leading-none text-gray-500 hover:text-gray-700"
              >
                <MapPin className="h-4 w-4" style={{ color: TEAL }} />
                Open on Google Maps
              </a>

              <div className="mt-auto flex flex-wrap items-center gap-5 pt-1 text-[12px] font-normal leading-none text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <Home className="h-4 w-4" style={{ color: TEAL }} />
                  {roomCount} Rooms
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" style={{ color: TEAL }} />
                  {detail.tenantCount || 0} Tenants
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditBuildingModal
        building={building}
        isOpen={editOpen}
        onImagesChanged={onBuildingUpdated}
        onClose={() => {
          setEditOpen(false);
          onBuildingUpdated();
        }}
      />

      <AddRoomModal
        buildingId={building.id}
        building={building}
        isOpen={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
        onRoomAdded={() => {
          setAddRoomOpen(false);
          onRoomAdded?.();
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
