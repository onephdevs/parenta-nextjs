'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Camera, Home, MapPin, Users } from 'lucide-react';
import type { RoomPageDetail } from '@/lib/api/properties';
import { getImageUrl } from '@/lib/format/image-url';
import { EntityNotesPanel } from '@/components/features/notes/EntityNotesModal';
import {
  formatBuildingAddress,
  googleMapsUrl,
} from '@/components/features/properties/property-utils';
import { formatUnitLabel } from './RoomDetailsContent';

const LATO = 'var(--font-lato), Lato, sans-serif';
const TEAL = '#39CCCC';

interface RoomHeroCardProps {
  detail: RoomPageDetail;
  notesRefreshKey?: number;
}

export default function RoomHeroCard({ detail, notesRefreshKey = 0 }: RoomHeroCardProps) {
  const { room, building } = detail;
  const unitLabel = formatUnitLabel(room.roomNumber);
  const address = formatBuildingAddress(building);
  const mapsHref = googleMapsUrl(address);
  const hero = useMemo(() => {
    const primary = room.images.find((img) => img.isPrimary) || room.images[0];
    return primary ? getImageUrl(primary.filePath) : null;
  }, [room.images]);

  const scrollToPhotos = () => {
    document.getElementById('photos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)]"
      style={{ fontFamily: LATO }}
    >
      <div className="flex flex-col lg:flex-row">
        <div className="relative h-48 w-full flex-shrink-0 bg-gray-100 lg:h-auto lg:min-h-[200px] lg:w-[220px] xl:w-[260px]">
          {hero ? (
            <button
              type="button"
              onClick={scrollToPhotos}
              className="group relative h-full w-full"
              aria-label="View room photos"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero} alt={unitLabel} className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                View photos
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={scrollToPhotos}
              className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 px-4 text-gray-500 transition hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <Camera className="h-7 w-7" />
              <span className="text-sm font-medium">Add room photo</span>
            </button>
          )}
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col gap-3 p-5 lg:max-w-[340px] xl:max-w-[380px]">
          <h3 className="text-[24px] font-bold leading-tight text-gray-900">{unitLabel}</h3>
          <Link
            href={`/admin/properties?buildingId=${building.id}`}
            className="text-[13px] font-semibold leading-snug text-gray-900 hover:underline"
          >
            {building.name}
          </Link>
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
              {building.totalUnits || 0} Rooms
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" style={{ color: TEAL }} />
              {building.occupiedUnits || 0} Tenants
            </span>
          </div>
        </div>

        <div className="relative flex min-h-[160px] min-w-0 flex-1 flex-col border-t border-gray-100 bg-gray-50/70 p-4 lg:border-l lg:border-t-0">
          <EntityNotesPanel
            entityType="room"
            entityId={room.id}
            entityLabel={unitLabel}
            title="Notes"
            compact
            dense
            showAddButton={false}
            refreshKey={notesRefreshKey}
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
