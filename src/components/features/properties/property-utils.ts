import { formatAddress } from '@/lib/format/address';
import {
  canonicalGoogleMapsUrl,
  isGoogleMapsShortUrl,
  isValidLatLng,
} from '@/lib/maps/google-maps-location';

export function formatBuildingAddress(building: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  return formatAddress({ ...building, postalCode: undefined }, '');
}

export function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function googleMapsUrlForBuilding(building: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
}): string {
  const stored = building.googleMapsUrl?.trim();
  if (stored && /^https?:\/\//i.test(stored) && !isGoogleMapsShortUrl(stored)) {
    return stored;
  }
  const lat = building.latitude;
  const lng = building.longitude;
  if (lat != null && lng != null && isValidLatLng(lat, lng)) {
    return canonicalGoogleMapsUrl(lat, lng);
  }
  if (stored && /^https?:\/\//i.test(stored)) return stored;
  const address = formatBuildingAddress(building);
  if (address) return googleMapsUrl(address);
  return 'https://www.google.com/maps';
}

export function formatArea(squareFootage?: number | null): string | null {
  if (squareFootage == null || !Number.isFinite(squareFootage)) return null;
  return `${Math.round(squareFootage)} sqm`;
}

/** Derive bedroom/bathroom labels from roomType (no bathroom column in schema). */
export function getRoomTypeStats(roomType: string): {
  bedroomsLabel: string;
  bathroomsLabel: string | null;
} {
  switch (roomType) {
    case 'studio':
      return { bedroomsLabel: 'Studio', bathroomsLabel: '1 bathroom' };
    case 'one_bedroom':
      return { bedroomsLabel: '1 bedroom', bathroomsLabel: '1 bathroom' };
    case 'two_bedroom':
      return { bedroomsLabel: '2 bedrooms', bathroomsLabel: '1 bathroom' };
    case 'three_bedroom':
      return { bedroomsLabel: '3 bedrooms', bathroomsLabel: '2 bathrooms' };
    case 'four_bedroom':
      return { bedroomsLabel: '4+ bedrooms', bathroomsLabel: '2 bathrooms' };
    default:
      return {
        bedroomsLabel: roomType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        bathroomsLabel: null,
      };
  }
}

export type DisplayRoomStatus = 'vacant' | 'occupied' | 'pending';

export function toDisplayRoomStatus(status: string): DisplayRoomStatus {
  const normalized = status.toLowerCase();
  if (normalized === 'vacant') return 'vacant';
  if (normalized === 'occupied') return 'occupied';
  return 'pending';
}

/** Occupied when a tenant is assigned; otherwise use the stored room status. */
export function occupancyStatusFromRoom(room: {
  roomStatus: string;
  tenant?: unknown;
}): DisplayRoomStatus {
  if (room.tenant) return 'occupied';
  return toDisplayRoomStatus(room.roomStatus);
}

export function displayStatusLabel(status: DisplayRoomStatus): string {
  switch (status) {
    case 'vacant':
      return 'Vacant';
    case 'occupied':
      return 'Occupied';
    default:
      return 'Pending';
  }
}

export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}
