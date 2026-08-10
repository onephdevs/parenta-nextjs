'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2,
  Footprints,
  Car,
  Loader2,
  MapPin,
  Navigation,
  School,
  ShoppingBag,
  Store,
  Trees,
  Hospital,
  Scissors,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  AMENITY_CATEGORIES,
  type AmenityCategory,
  type NearbyPlace,
} from '@/lib/maps/nearby-amenities';

const NearbyMap = dynamic(() => import('./NearbyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-100 text-sm text-[#6B7280]">
      Loading map…
    </div>
  ),
});

export interface NearbyPropertyOption {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string;
  availableUnits: number;
  latitude: number | null;
  longitude: number | null;
}

interface NearbyApiData {
  origin: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  places: NearbyPlace[];
  categoriesWithResults: AmenityCategory[];
  emptyCategories: AmenityCategory[];
  fromCache?: boolean;
  fetchedAt?: string | null;
  refreshDays?: number;
}

interface CommuteApiData {
  drivingMinutes: number | null;
  walkingMinutes: number | null;
  distanceMeters: number;
  origin: { label: string };
  destination: { label: string };
}

interface PlaceRouteData {
  placeId: string;
  profile: 'walking' | 'driving';
  distanceMeters: number;
  durationMinutes: number;
  coordinates: [number, number][];
  fromCache?: boolean;
}

const CATEGORY_META: {
  id: AmenityCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'school', label: 'School', icon: School },
  { id: 'market', label: 'Market', icon: ShoppingBag },
  { id: 'mall', label: 'Mall', icon: ShoppingBag },
  { id: 'park', label: 'Park', icon: Trees },
  { id: 'store', label: 'Store', icon: Store },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { id: 'barber', label: 'Barber / salon', icon: Scissors },
  { id: 'hospital', label: 'Hospital', icon: Hospital },
];

const DEFAULT_LIST_CATEGORY: AmenityCategory = 'school';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function propertyLabel(p: NearbyPropertyOption): string {
  const loc = [p.city, p.state].filter(Boolean).join(', ');
  return loc ? `${p.name} — ${loc}` : p.name;
}

interface NearbyAmenitiesSectionProps {
  properties: NearbyPropertyOption[];
}

export function NearbyAmenitiesSection({ properties }: NearbyAmenitiesSectionProps) {
  const defaultId = useMemo(() => {
    const withAvail = properties.find((p) => p.availableUnits > 0);
    return (withAvail ?? properties[0])?.id ?? '';
  }, [properties]);

  const [buildingId, setBuildingId] = useState(defaultId);
  const [listCategory, setListCategory] = useState<AmenityCategory>(DEFAULT_LIST_CATEGORY);
  const [data, setData] = useState<NearbyApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [route, setRoute] = useState<PlaceRouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeProfile, setRouteProfile] = useState<'walking' | 'driving'>('walking');

  const [workplace, setWorkplace] = useState('');
  const [commute, setCommute] = useState<CommuteApiData | null>(null);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [commuteError, setCommuteError] = useState<string | null>(null);

  useEffect(() => {
    if (!buildingId && defaultId) setBuildingId(defaultId);
  }, [defaultId, buildingId]);

  const loadNearby = useCallback(async () => {
    if (!buildingId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Full catalog once (weekly DB cache) so category tabs switch instantly.
      const params = new URLSearchParams({
        buildingId,
        categories: AMENITY_CATEGORIES.join(','),
      });
      const res = await fetch(`/api/public/nearby?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setData(null);
        setError(json.error || 'Could not load nearby places');
        return;
      }
      setData(json.data as NearbyApiData);
    } catch {
      setData(null);
      setError('Could not load nearby places. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    void loadNearby();
  }, [loadNearby]);

  useEffect(() => {
    if (!data?.places.length) return;
    const hasCurrent = data.places.some((p) => p.category === listCategory);
    if (hasCurrent) return;
    const first = CATEGORY_META.find((m) =>
      data.places.some((p) => p.category === m.id)
    );
    if (first) setListCategory(first.id);
  }, [data, listCategory]);

  useEffect(() => {
    setCommute(null);
    setCommuteError(null);
    setSelectedPlace(null);
    setRoute(null);
    setRouteError(null);
  }, [buildingId]);

  const loadRoute = useCallback(
    async (place: NearbyPlace, profile: 'walking' | 'driving') => {
      if (!buildingId) return;
      setRouteLoading(true);
      setRouteError(null);
      try {
        const params = new URLSearchParams({
          buildingId,
          placeId: place.id,
          toLat: String(place.latitude),
          toLng: String(place.longitude),
          profile,
        });
        const res = await fetch(`/api/public/place-route?${params}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setRouteError(json.error || 'Could not load street route');
          return;
        }
        const next = json.data as PlaceRouteData;
        const coords =
          Array.isArray(next.coordinates) && next.coordinates.length >= 2
            ? next.coordinates
            : null;
        if (!coords) {
          setRouteError('Could not draw a path to that place');
          return;
        }
        setRoute({ ...next, coordinates: coords });
      } catch {
        setRouteError('Could not load route. Please try again.');
      } finally {
        setRouteLoading(false);
      }
    },
    [buildingId]
  );

  const handleSelectPlace = (place: NearbyPlace) => {
    setSelectedPlace(place);
    setRoute(null);
    setRouteError(null);
    void loadRoute(place, routeProfile);
  };

  const clearSelectedPlace = () => {
    setSelectedPlace(null);
    setRoute(null);
    setRouteError(null);
  };

  const selectListCategory = (id: AmenityCategory) => {
    setListCategory(id);
    setSelectedPlace(null);
    setRoute(null);
    setRouteError(null);
  };

  useEffect(() => {
    if (!selectedPlace) return;
    setRoute(null);
    void loadRoute(selectedPlace, routeProfile);
  }, [routeProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimateCommute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId || workplace.trim().length < 3) {
      setCommuteError('Enter a workplace address or area');
      return;
    }
    setCommuteLoading(true);
    setCommuteError(null);
    try {
      const params = new URLSearchParams({
        buildingId,
        workplace: workplace.trim(),
      });
      const res = await fetch(`/api/public/commute?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCommute(null);
        setCommuteError(json.error || 'Could not estimate commute');
        return;
      }
      setCommute(json.data as CommuteApiData);
    } catch {
      setCommute(null);
      setCommuteError('Could not estimate commute. Please try again.');
    } finally {
      setCommuteLoading(false);
    }
  };

  const places = data?.places ?? [];

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<AmenityCategory, number>;
    for (const meta of CATEGORY_META) counts[meta.id] = 0;
    for (const p of places) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [places]);

  const categoriesWithPlaces = useMemo(
    () => CATEGORY_META.filter((m) => (categoryCounts[m.id] ?? 0) > 0),
    [categoryCounts]
  );

  const activeMeta =
    CATEGORY_META.find((m) => m.id === listCategory) ?? CATEGORY_META[0];
  const ActiveIcon = activeMeta.icon;

  const filteredPlaces = useMemo(
    () =>
      places
        .filter((p) => p.category === listCategory)
        .sort((a, b) => a.distanceMeters - b.distanceMeters),
    [places, listCategory]
  );

  if (properties.length === 0) return null;

  return (
    <section
      id="nearby"
      className="bg-white px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="nearby-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <h2
            id="nearby-heading"
            className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl"
          >
            What’s nearby
          </h2>
          <p className="mt-3 text-lg text-[#6B7280]">
            Pick a property, choose a category, then tap a place to see the path from the
            apartment.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block min-w-0 flex-1 sm:max-w-md">
            <span className="mb-1.5 block text-sm font-medium text-[#111827]">Property</span>
            <div className="relative">
              <Building2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 pr-8 pl-10 text-sm text-[#111827] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {propertyLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </label>
          {data?.fetchedAt && (
            <p className="text-xs text-[#9CA3AF] sm:pb-2">
              {data.fromCache ? 'Cached places' : 'Just refreshed'} · updates every{' '}
              {data.refreshDays ?? 7} days
            </p>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 lg:col-span-3">
            {loading && !data ? (
              <div className="flex h-80 items-center justify-center bg-[#F8FAFC] text-sm text-[#6B7280]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding nearby places…
              </div>
            ) : error ? (
              <div className="flex h-80 flex-col items-center justify-center gap-2 bg-[#F8FAFC] px-6 text-center">
                <MapPin className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-[#111827]">Map unavailable</p>
                <p className="max-w-sm text-sm text-[#6B7280]">{error}</p>
              </div>
            ) : data ? (
              <div className="relative">
                {(loading || routeLoading) && (
                  <div className="absolute top-3 right-3 z-[1000] rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-[#6B7280] shadow-sm">
                    {routeLoading ? 'Drawing route…' : 'Updating…'}
                  </div>
                )}
                {selectedPlace && (
                  <div className="absolute top-3 left-3 z-[1000] max-w-[min(100%-6rem,20rem)] rounded-xl bg-white/95 px-3 py-2 text-xs shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#111827]">
                          {data.origin.name} → {selectedPlace.name}
                        </p>
                        {route && (
                          <p className="mt-0.5 text-[#6B7280]">
                            ~{route.durationMinutes} min {route.profile} ·{' '}
                            {formatDistance(route.distanceMeters)}
                          </p>
                        )}
                        {routeError && <p className="mt-0.5 text-amber-800">{routeError}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={clearSelectedPlace}
                        className="rounded-lg p-1 text-[#6B7280] hover:bg-slate-100 hover:text-[#111827]"
                        aria-label="Clear route"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {(['walking', 'driving'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRouteProfile(p)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-medium capitalize ${
                            routeProfile === p
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-slate-100 text-[#6B7280]'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <NearbyMap
                  home={{
                    latitude: data.origin.latitude,
                    longitude: data.origin.longitude,
                    name: data.origin.name,
                  }}
                  places={filteredPlaces}
                  selectedPlaceId={selectedPlace?.id ?? null}
                  routeCoordinates={route?.coordinates ?? null}
                  onSelectPlace={handleSelectPlace}
                  className="h-80 w-full sm:h-[28rem]"
                />
              </div>
            ) : (
              <div className="flex h-80 items-center justify-center bg-[#F8FAFC] text-sm text-[#6B7280]">
                Select a property to explore the area.
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-1 text-sm font-semibold tracking-wide text-[#6B7280] uppercase">
              Places nearby
            </h3>
            <p className="mb-3 text-xs text-[#9CA3AF]">
              Filter by category, then tap a place for the path.
            </p>

            {categoriesWithPlaces.length > 0 && (
              <div
                className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Place categories"
              >
                {categoriesWithPlaces.map(({ id, label, icon: Icon }) => {
                  const active = listCategory === id;
                  const count = categoryCounts[id] ?? 0;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => selectListCategory(id)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        active
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'border border-slate-200 bg-[#F8FAFC] text-[#6B7280] hover:border-slate-300 hover:text-[#111827]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-[#4B5563]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {loading && !data ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : filteredPlaces.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-[#F8FAFC] p-6 text-sm text-[#6B7280]">
                {error
                  ? error
                  : `No ${activeMeta.label.toLowerCase()} places found within about 1.5 km.`}
              </p>
            ) : (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#6B7280] uppercase">
                  <ActiveIcon className="h-3.5 w-3.5 text-[#0EA5E9]" />
                  {activeMeta.label}
                  <span className="font-normal normal-case text-[#9CA3AF]">
                    · {filteredPlaces.length} nearby
                  </span>
                </p>
                <ul className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                  {filteredPlaces.map((place) => {
                    const isActive = selectedPlace?.id === place.id;
                    return (
                      <li key={place.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectPlace(place)}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                            isActive
                              ? 'border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#2563EB]/30'
                              : 'border-slate-100 bg-[#F8FAFC] hover:border-slate-200'
                          }`}
                        >
                          <p className="text-sm font-medium text-[#111827]">{place.name}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                            <span>{formatDistance(place.distanceMeters)}</span>
                            <span className="inline-flex items-center gap-1">
                              <Footprints className="h-3 w-3" />~{place.walkMinutes} min walk
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Car className="h-3 w-3" />~{place.driveMinutes} min drive
                            </span>
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 sm:p-8">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Check your commute</h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                Enter your workplace or school address to estimate travel time to this property.
              </p>
            </div>
          </div>
          <form onSubmit={estimateCommute} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1">
              <span className="mb-1.5 block text-sm font-medium text-[#111827]">
                Workplace or school
              </span>
              <input
                type="text"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                placeholder="e.g. BGC Taguig, Makati CBD…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </label>
            <button
              type="submit"
              disabled={commuteLoading || !buildingId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {commuteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Estimating…
                </>
              ) : (
                'Estimate travel time'
              )}
            </button>
          </form>
          {commuteError && (
            <p className="mt-3 text-sm text-amber-800" role="alert">
              {commuteError}
            </p>
          )}
          {commute && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#111827]">
              {commute.drivingMinutes != null && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <Car className="h-4 w-4 text-[#2563EB]" />
                  ~{commute.drivingMinutes} min drive
                </span>
              )}
              {commute.walkingMinutes != null && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <Footprints className="h-4 w-4 text-[#0EA5E9]" />
                  ~{commute.walkingMinutes} min walk
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[#6B7280]">
                {formatDistance(commute.distanceMeters)} to {commute.destination.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
