'use client';

import Link from 'next/link';
import { Building2, Home, MapPin, Users } from 'lucide-react';
import type { RoomPageDetail } from '@/lib/api/properties';
import PropertyRoomCard from '@/components/features/properties/PropertyRoomCard';
import { getImageUrl } from '@/lib/format/image-url';
import {
  formatBuildingAddress,
  googleMapsUrl,
} from '@/components/features/properties/property-utils';

const LATO = 'var(--font-lato), Lato, sans-serif';
const TEAL = '#39CCCC';

interface RoomDetailPaneProps {
  detail: RoomPageDetail | null;
  loading: boolean;
  error: string | null;
}

export default function RoomDetailPane({ detail, loading, error }: RoomDetailPaneProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#E2E5F7]" style={{ fontFamily: LATO }}>
      <div className="flex-1 overflow-y-auto px-6 py-5">
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

        {!loading && !error && !detail && (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 text-center">
            <p className="text-base font-medium text-gray-800">Select a room</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Choose a room from the list to see its details and occupancy.
            </p>
          </div>
        )}

        {!loading && detail && (
          <div className="mx-auto max-w-[720px] space-y-6">
            <BuildingSummaryCard detail={detail} />

            <div>
              <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Room</p>
              <PropertyRoomCard room={detail.room} isActive />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BuildingSummaryCard({ detail }: { detail: RoomPageDetail }) {
  const { building, buildingImages } = detail;
  const address = formatBuildingAddress(building);
  const hero = buildingImages[0] ? getImageUrl(buildingImages[0].filePath) : null;
  const mapsHref = googleMapsUrl(address);

  return (
    <div>
      <p className="mb-3 text-[16px] font-bold leading-none text-gray-900">Property</p>
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col md:flex-row">
          <div className="relative h-36 w-full flex-shrink-0 bg-gray-100 md:h-auto md:w-[200px]">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt={building.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[9rem] items-center justify-center text-gray-400">
                <Building2 className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2 p-4">
            <Link
              href={`/admin/buildings?buildingId=${building.id}`}
              className="text-[20px] font-bold leading-none text-gray-900 hover:underline"
            >
              {building.name}, {address}
            </Link>

            {building.description && (
              <p className="line-clamp-2 text-[12px] font-normal leading-none text-gray-500">
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

            <div className="mt-auto flex flex-wrap items-center gap-4 pt-1 text-[12px] font-normal leading-none text-gray-600">
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
        </div>
      </div>
    </div>
  );
}
