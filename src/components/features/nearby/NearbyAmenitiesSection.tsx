'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2,
  Building,
  Bus,
  Car,
  Footprints,
  Hospital,
  Loader2,
  Lock,
  Map as MapIcon,
  MapPin,
  School,
  Scissors,
  ShoppingBag,
  Store,
  Trees,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  AMENITY_CATEGORIES,
  CATEGORY_COLORS,
  type AmenityCategory,
  type NearbyPlace,
} from '@/lib/maps/nearby-amenities';
import type { CommuteEstimate, CommuteMode } from '@/lib/maps/commute';

const NearbyMap = dynamic(() => import('./NearbyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[16rem] items-center justify-center rounded-2xl bg-slate-100 text-sm text-[#6B7280]">
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

interface PlaceRouteData {
  placeId: string;
  profile: 'walking' | 'driving';
  distanceMeters: number;
  durationMinutes: number;
  coordinates: [number, number][];
  fromCache?: boolean;
}

type ExplorerMode = 'nearby' | 'commute';

const CATEGORY_META: {
  id: AmenityCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'school', label: 'School', icon: School },
  { id: 'market', label: 'Market', icon: ShoppingBag },
  { id: 'mall', label: 'Mall', icon: Building },
  { id: 'park', label: 'Park', icon: Trees },
  { id: 'store', label: 'Store', icon: Store },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { id: 'barber', label: 'Salon', icon: Scissors },
  { id: 'hospital', label: 'Hospital', icon: Hospital },
];

const COMMUTE_META: Record<
  CommuteMode,
  {
    label: string;
    hint: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  walking: { label: 'Walk', hint: 'On foot', color: '#0EA5E9', icon: Footprints },
  driving: { label: 'Drive', hint: 'By car', color: '#2563EB', icon: Car },
  transit: { label: 'Transit', hint: 'Est. wait + ride', color: '#7C3AED', icon: Bus },
};

const DEFAULT_LIST_CATEGORY: AmenityCategory = 'school';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function propertyLabel(p: NearbyPropertyOption): string {
  const loc = [p.city, p.state].filter(Boolean).join(', ');
  return loc ? `${p.name} — ${loc}` : p.name;
}

function hexAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return `rgba(37, 99, 235, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const [mode, setMode] = useState<ExplorerMode>('nearby');
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
  const [commute, setCommute] = useState<CommuteEstimate | null>(null);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [commuteError, setCommuteError] = useState<string | null>(null);
  const [selectedCommuteMode, setSelectedCommuteMode] = useState<CommuteMode | null>(null);

  const [showMap, setShowMap] = useState(false);
  const [mapSizeTick, setMapSizeTick] = useState(0);

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
    const first = CATEGORY_META.find((m) => data.places.some((p) => p.category === m.id));
    if (first) setListCategory(first.id);
  }, [data, listCategory]);

  useEffect(() => {
    setCommute(null);
    setCommuteError(null);
    setSelectedCommuteMode(null);
    setSelectedPlace(null);
    setRoute(null);
    setRouteError(null);
  }, [buildingId]);

  useEffect(() => {
    setMapSizeTick((n) => n + 1);
  }, [showMap, mode]);

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
    const profile = place.walkMinutes <= 25 ? 'walking' : 'driving';
    setRouteProfile(profile);
    setSelectedPlace(place);
    setRoute(null);
    setRouteError(null);
    setShowMap(true);
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
  }, [selectedPlace, routeProfile, loadRoute]);

  useEffect(() => {
    if (!selectedPlace) return;
    const el = document.getElementById(`nearby-place-${selectedPlace.id}`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedPlace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimateCommute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId || workplace.trim().length < 3) {
      setCommuteError('Enter a workplace or school');
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
        setSelectedCommuteMode(null);
        setCommuteError(json.error || 'Could not estimate commute');
        return;
      }
      const next = json.data as CommuteEstimate;
      const options = Array.isArray(next.options) ? next.options : [];
      setCommute({ ...next, options });
      setSelectedCommuteMode(options[0]?.mode ?? null);
    } catch {
      setCommute(null);
      setSelectedCommuteMode(null);
      setCommuteError('Could not estimate commute. Please try again.');
    } finally {
      setCommuteLoading(false);
    }
  };

  const places = data?.places ?? [];
  const selectedProperty = properties.find((p) => p.id === buildingId) ?? properties[0];
  const categoryColor = CATEGORY_COLORS[listCategory];

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<AmenityCategory, number>;
    for (const meta of CATEGORY_META) counts[meta.id] = 0;
    for (const p of places) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [places]);

  const activeMeta = CATEGORY_META.find((m) => m.id === listCategory) ?? CATEGORY_META[0];

  const filteredPlaces = useMemo(
    () =>
      places
        .filter((p) => p.category === listCategory)
        .sort((a, b) => a.distanceMeters - b.distanceMeters),
    [places, listCategory]
  );

  const closestId = filteredPlaces[0]?.id ?? null;

  const home = useMemo(() => {
    if (data?.origin) {
      return {
        latitude: data.origin.latitude,
        longitude: data.origin.longitude,
        name: data.origin.name,
        address: data.origin.address,
      };
    }
    if (
      selectedProperty?.latitude != null &&
      selectedProperty.longitude != null
    ) {
      return {
        latitude: selectedProperty.latitude,
        longitude: selectedProperty.longitude,
        name: selectedProperty.name,
        address: selectedProperty.address,
      };
    }
    return null;
  }, [data, selectedProperty]);

  const selectedCommute = commute?.options.find((o) => o.mode === selectedCommuteMode) ?? null;
  const commuteRouteColor = selectedCommute
    ? COMMUTE_META[selectedCommute.mode].color
    : '#2563EB';

  const mapPlaces = useMemo(
    () => (mode === 'nearby' ? filteredPlaces : []),
    [mode, filteredPlaces]
  );
  const mapDestination = useMemo(
    () =>
      mode === 'commute' && commute
        ? {
            latitude: commute.origin.latitude,
            longitude: commute.origin.longitude,
            name: commute.origin.label,
          }
        : null,
    [mode, commute]
  );
  const mapRoute =
    mode === 'nearby'
      ? (route?.coordinates ?? null)
      : (selectedCommute?.coordinates ?? null);
  const mapRouteColor = mode === 'nearby' ? categoryColor : commuteRouteColor;
  const mapSelectedId = mode === 'nearby' ? (selectedPlace?.id ?? null) : null;

  if (properties.length === 0) return null;

  const mapShellClass = showMap
    ? 'fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-white p-4 lg:static lg:inset-auto lg:z-0 lg:col-span-3 lg:sticky lg:top-20 lg:block lg:bg-transparent lg:p-0'
    : 'hidden lg:col-span-3 lg:sticky lg:top-20 lg:block';

  const mapFrameClass = showMap
    ? 'relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 lg:h-[calc(100vh-6rem)] lg:min-h-[28rem] lg:flex-none'
    : 'relative h-[calc(100vh-6rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-slate-200';

  return (
    <section
      id="nearby"
      className="bg-white px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="nearby-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <h2
            id="nearby-heading"
            className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl"
          >
            What’s nearby
          </h2>
          <p className="mt-3 text-lg text-[#6B7280]">
            Compare places around a property, or check the commute to work or school.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block min-w-0 flex-1 sm:max-w-md">
            <span className="mb-1.5 block text-sm font-medium text-[#111827]">Property</span>
            <div className="relative">
              <Building2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <select
                value={buildingId}
                onChange={(e) => {
                  setBuildingId(e.target.value);
                  setCommute(null);
                  setCommuteError(null);
                  setSelectedCommuteMode(null);
                  setSelectedPlace(null);
                  setRoute(null);
                  setRouteError(null);
                }}
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

          <div
            className="inline-flex rounded-xl bg-slate-100 p-1"
            role="tablist"
            aria-label="Nearby or commute"
          >
            {([
              { id: 'nearby', label: 'Nearby' },
              { id: 'commute', label: 'Commute' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                onClick={() => setMode(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === tab.id
                    ? 'bg-white text-[#111827] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
          <div className={mapShellClass}>
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <p className="text-sm font-semibold text-[#111827]">Map</p>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-[#6B7280] hover:bg-slate-100 hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
            <div className={mapFrameClass}>
              {loading && !data && !home ? (
                <div className="flex h-full min-h-[16rem] items-center justify-center bg-[#F8FAFC] text-sm text-[#6B7280]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding nearby places…
                </div>
              ) : error && !home ? (
                <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 bg-[#F8FAFC] px-6 text-center">
                  <MapPin className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-[#111827]">Map unavailable</p>
                  <p className="max-w-sm text-sm text-[#6B7280]">{error}</p>
                </div>
              ) : home ? (
                <>
                  {(loading || routeLoading || commuteLoading) && (
                    <div className="absolute top-3 right-3 z-[1000] rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-[#6B7280] shadow-sm">
                      {routeLoading
                        ? 'Drawing route…'
                        : commuteLoading
                          ? 'Comparing times…'
                          : 'Updating…'}
                    </div>
                  )}
                  {mode === 'nearby' && selectedPlace && (
                    <div className="absolute top-3 left-3 z-[1000] max-w-[min(100%-6rem,20rem)] rounded-xl bg-white/95 px-3 py-2 text-xs shadow-sm">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[#111827]">
                            {home.name} → {selectedPlace.name}
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
                    </div>
                  )}
                  <NearbyMap
                    key={buildingId}
                    home={home}
                    places={mapPlaces}
                    selectedPlaceId={mapSelectedId}
                    routeCoordinates={mapRoute}
                    routeColor={mapRouteColor}
                    routeDashed={mode === 'commute' && selectedCommuteMode === 'transit'}
                    destination={mapDestination}
                    destinationColor={commuteRouteColor}
                    onSelectPlace={handleSelectPlace}
                    sizeTick={mapSizeTick}
                    className="h-full min-h-[16rem] w-full"
                  />
                </>
              ) : (
                <div className="flex h-full min-h-[16rem] items-center justify-center bg-[#F8FAFC] text-sm text-[#6B7280]">
                  Select a property to explore the area.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!showMap && (
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:border-slate-300 lg:hidden"
              >
                <MapIcon className="h-4 w-4 text-[#2563EB]" />
                View map
              </button>
            )}

            {mode === 'nearby' ? (
              <>
                <h3 className="mb-1 text-sm font-semibold tracking-wide text-[#6B7280] uppercase">
                  Places nearby
                </h3>
                <p className="mb-3 text-xs text-[#9CA3AF]">
                  All categories stay visible. Tap one, then compare places by walk time.
                </p>

                <div
                  className="mb-5 grid grid-cols-4 gap-1.5"
                  role="tablist"
                  aria-label="Place categories"
                >
                  {CATEGORY_META.map(({ id, label, icon: Icon }) => {
                    const active = listCategory === id;
                    const count = categoryCounts[id] ?? 0;
                    const color = CATEGORY_COLORS[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-label={`${label}${id === 'barber' ? ' / barber' : ''}, ${count} nearby`}
                        onClick={() => selectListCategory(id)}
                        className={`flex w-full min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition ${
                          active ? 'bg-slate-50 ring-1 ring-slate-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="relative flex h-11 w-11 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: active ? color : hexAlpha(color, 0.12),
                            color: active ? '#fff' : color,
                          }}
                        >
                          <Icon className="h-5 w-5" />
                          <span
                            className={`absolute -top-1 -right-1 min-w-[1.1rem] rounded-full px-1 text-[10px] font-semibold ${
                              active ? 'bg-white text-[#111827]' : 'bg-slate-200 text-[#4B5563]'
                            }`}
                          >
                            {count}
                          </span>
                        </span>
                        <span
                          className={`text-[11px] leading-tight font-medium ${
                            active ? 'text-[#111827]' : 'text-[#6B7280]'
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

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
                      : `No ${activeMeta.label.toLowerCase()} places found nearby for this category.`}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filteredPlaces.map((place) => {
                      const isActive = selectedPlace?.id === place.id;
                      const isClosest = place.id === closestId;
                      return (
                        <li key={place.id} id={`nearby-place-${place.id}`}>
                          <div
                            className="rounded-xl border transition"
                            style={{
                              borderColor: isActive ? categoryColor : '#F1F5F9',
                              backgroundColor: isActive
                                ? hexAlpha(categoryColor, 0.08)
                                : '#F8FAFC',
                              boxShadow: isActive
                                ? `0 0 0 1px ${hexAlpha(categoryColor, 0.35)}`
                                : undefined,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectPlace(place)}
                              className="w-full px-3 py-3 text-left"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm"
                                  style={{ backgroundColor: categoryColor }}
                                  aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-medium text-[#111827]">
                                      {place.name}
                                    </p>
                                    <p
                                      className="shrink-0 text-base font-semibold tabular-nums"
                                      style={{ color: isActive ? categoryColor : '#111827' }}
                                    >
                                      {place.walkMinutes} min
                                    </p>
                                  </div>
                                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B7280]">
                                    {isClosest && (
                                      <span
                                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                                        style={{
                                          backgroundColor: hexAlpha(categoryColor, 0.15),
                                          color: categoryColor,
                                        }}
                                      >
                                        Closest
                                      </span>
                                    )}
                                    <span>{formatDistance(place.distanceMeters)} walk</span>
                                    <span className="inline-flex items-center gap-1">
                                      <Car className="h-3 w-3" />
                                      {place.driveMinutes} min drive
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </button>
                            {isActive && (
                              <div className="flex gap-1 px-3 pb-3 pl-9">
                                {(['walking', 'driving'] as const).map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => setRouteProfile(p)}
                                    className="rounded-lg px-2 py-1 text-[11px] font-medium"
                                    style={
                                      routeProfile === p
                                        ? { backgroundColor: categoryColor, color: '#fff' }
                                        : { backgroundColor: '#E2E8F0', color: '#4B5563' }
                                    }
                                  >
                                    {p === 'walking' ? 'Walk' : 'Drive'}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {data?.fetchedAt && (
                  <p className="mt-4 text-xs text-[#9CA3AF]">
                    {data.fromCache ? 'Cached places' : 'Just refreshed'} · updates every{' '}
                    {data.refreshDays ?? 7} days
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="mb-1 text-sm font-semibold tracking-wide text-[#6B7280] uppercase">
                  Commute
                </h3>
                <p className="mb-4 text-xs text-[#9CA3AF]">
                  From is this apartment. Enter work or school — then pick the fastest option.
                </p>

                <div className="mb-3">
                  <span className="mb-1.5 block text-sm font-medium text-[#111827]">From</span>
                  <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#4B5563]">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                    <span className="min-w-0">
                      <span className="block font-medium text-[#111827]">
                        {selectedProperty?.name ?? home?.name ?? 'This property'}
                      </span>
                      <span className="block truncate text-xs text-[#6B7280]">
                        {home?.address || selectedProperty?.address}
                      </span>
                    </span>
                  </div>
                </div>

                <form onSubmit={estimateCommute} className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#111827]">
                      To — workplace or school
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
                  >
                    {commuteLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Comparing times…
                      </>
                    ) : (
                      'See travel times'
                    )}
                  </button>
                </form>

                {commuteError && (
                  <p className="mt-3 text-sm text-amber-800" role="alert">
                    {commuteError}
                  </p>
                )}

                {commute && commute.options.length > 0 && (
                  <ul className="mt-5 space-y-2" role="listbox" aria-label="Commute options">
                    {commute.options.map((option, index) => {
                      const meta = COMMUTE_META[option.mode];
                      const Icon = meta.icon;
                      const isBest = index === 0;
                      const isActive = option.mode === selectedCommuteMode;
                      return (
                        <li key={option.mode}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => {
                              setSelectedCommuteMode(option.mode);
                              setShowMap(true);
                            }}
                            className="w-full rounded-xl border px-3 py-3 text-left transition"
                            style={{
                              borderColor: isActive ? meta.color : '#E2E8F0',
                              backgroundColor: isActive ? hexAlpha(meta.color, 0.08) : '#F8FAFC',
                              boxShadow: isActive
                                ? `0 0 0 1px ${hexAlpha(meta.color, 0.35)}`
                                : undefined,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                style={{
                                  backgroundColor: isActive ? meta.color : hexAlpha(meta.color, 0.12),
                                  color: isActive ? '#fff' : meta.color,
                                }}
                              >
                                <Icon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-[#111827]">{meta.label}</p>
                                  <p
                                    className="text-base font-semibold tabular-nums"
                                    style={{ color: isActive ? meta.color : '#111827' }}
                                  >
                                    {option.minutes} min
                                  </p>
                                </div>
                                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                                  {isBest && (
                                    <span
                                      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                                      style={{
                                        backgroundColor: hexAlpha(meta.color, 0.15),
                                        color: meta.color,
                                      }}
                                    >
                                      Best
                                    </span>
                                  )}
                                  <span>{meta.hint}</span>
                                  <span>{formatDistance(option.distanceMeters)}</span>
                                </p>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {commute?.options.some((o) => o.estimated) && (
                  <p className="mt-3 text-xs text-[#9CA3AF]">
                    Transit is an estimate (typical wait + city speed), not live arrivals.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
