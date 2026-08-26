'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';
import {
  AMENITY_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type AmenityCategory,
  type NearbyPlace,
} from '@/lib/maps/nearby-amenities';
import {
  canonicalGoogleMapsUrl,
  formatLatLngPreview,
  isGoogleMapsShortUrl,
  parseGoogleMapsLocation,
} from '@/lib/maps/google-maps-location';

interface BuildingNearbyPlacesPanelProps {
  buildingId: string | null;
  onEnsureBuilding?: () => Promise<string | null>;
}

export interface BuildingNearbyPlacesPanelHandle {
  persist: (buildingId: string) => Promise<void>;
}

interface PlaceDraft {
  id: string;
  name: string;
  category: AmenityCategory;
  pin: string;
  latitude: number | null;
  longitude: number | null;
}

function toDraft(place: NearbyPlace): PlaceDraft {
  return {
    id: place.id,
    name: place.name,
    category: place.category,
    pin: formatLatLngPreview(place.latitude, place.longitude),
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

function newDraft(category: AmenityCategory): PlaceDraft {
  return {
    id: `admin/${crypto.randomUUID()}`,
    name: '',
    category,
    pin: '',
    latitude: null,
    longitude: null,
  };
}

function resolvedPin(draft: PlaceDraft): { latitude: number; longitude: number } | null {
  const parsed = parseGoogleMapsLocation(draft.pin);
  if (parsed) return parsed;
  if (
    draft.latitude != null &&
    draft.longitude != null &&
    !isGoogleMapsShortUrl(draft.pin)
  ) {
    return { latitude: draft.latitude, longitude: draft.longitude };
  }
  return null;
}

async function putNearbyPlaces(
  buildingId: string,
  drafts: PlaceDraft[],
  osmFetched = false
) {
  const payload = drafts
    .filter((row) => row.name.trim() || row.pin.trim())
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      category: row.category,
      pin: row.pin.trim(),
      latitude: row.latitude,
      longitude: row.longitude,
    }));

  const res = await fetch('/api/admin/nearby', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ buildingId, places: payload, osmFetched }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to save nearby places');
  }
  return json;
}

const BuildingNearbyPlacesPanel = forwardRef<
  BuildingNearbyPlacesPanelHandle,
  BuildingNearbyPlacesPanelProps
>(function BuildingNearbyPlacesPanel({ buildingId, onEnsureBuilding }, ref) {
  const { showNotification } = useNotifications();
  const [drafts, setDrafts] = useState<PlaceDraft[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [category, setCategory] = useState<AmenityCategory>('school');
  const draftsRef = useRef(drafts);
  const dirtyRef = useRef(dirty);
  const osmPreviewPendingRef = useRef(false);
  draftsRef.current = drafts;
  dirtyRef.current = dirty;

  const load = useCallback(async () => {
    if (!buildingId) return;
    if (dirtyRef.current && draftsRef.current.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/nearby?buildingId=${encodeURIComponent(buildingId)}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load nearby places');
      }
      const places = Array.isArray(json.data?.places) ? json.data.places : [];
      setDrafts(places.map(toDraft));
      setFetchedAt(json.data?.fetchedAt ?? null);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nearby places');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const next = {} as Record<AmenityCategory, number>;
    for (const id of AMENITY_CATEGORIES) next[id] = 0;
    for (const place of drafts) {
      next[place.category] = (next[place.category] ?? 0) + 1;
    }
    return next;
  }, [drafts]);

  const filtered = useMemo(
    () => drafts.filter((p) => p.category === category),
    [drafts, category]
  );

  const updateDraft = (id: string, fields: Partial<PlaceDraft>) => {
    setDirty(true);
    setDrafts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...fields } : row))
    );
  };

  const addPlace = () => {
    setDirty(true);
    setDrafts((prev) => [...prev, newDraft(category)]);
  };

  const removePlace = (id: string) => {
    setDirty(true);
    setDrafts((prev) => prev.filter((row) => row.id !== id));
  };

  const refresh = async () => {
    if (!buildingId) return;
    if (
      !window.confirm(
        dirty
          ? 'Load the latest OpenStreetMap places into this list? Unsaved edits will be replaced. Review names and pins, then click Save nearby places to publish them on the landing map.'
          : 'Load the latest OpenStreetMap places into this list? Review names and pins, then click Save nearby places to publish them on the landing map.'
      )
    ) {
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/nearby/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ buildingId, preview: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch nearby places');
      }
      const places = Array.isArray(json.data?.places) ? json.data.places : [];
      if (places.length === 0) {
        throw new Error('OpenStreetMap returned no places near this pin.');
      }
      setDrafts(places.map(toDraft));
      setDirty(true);
      osmPreviewPendingRef.current = true;
      showNotification({
        type: 'success',
        title: 'OpenStreetMap places loaded',
        message: 'Review the names and pins below, then save to update the landing map.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nearby places');
    } finally {
      setRefreshing(false);
    }
  };

  const persistToBuilding = useCallback(
    async (id: string, notify: boolean) => {
      const json = await putNearbyPlaces(
        id,
        draftsRef.current,
        osmPreviewPendingRef.current
      );
      const places = Array.isArray(json.data?.places) ? json.data.places : [];
      setDrafts(places.map(toDraft));
      setFetchedAt((prev) => json.data?.fetchedAt ?? prev);
      setDirty(false);
      osmPreviewPendingRef.current = false;
      if (notify) {
        showNotification({
          type: 'success',
          title: 'Nearby places saved',
          message: 'Landing What’s nearby will use these names and pins.',
        });
      }
    },
    [showNotification]
  );

  useImperativeHandle(
    ref,
    () => ({
      persist: async (id: string) => {
        const hasContent = draftsRef.current.some(
          (row) => row.name.trim() || row.pin.trim()
        );
        if (!hasContent) return;
        await persistToBuilding(id, false);
      },
    }),
    [persistToBuilding]
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      let id = buildingId;
      if (!id && onEnsureBuilding) {
        id = await onEnsureBuilding();
      }
      if (!id) {
        showNotification({
          type: 'info',
          title: 'Places kept for now',
          message: 'They will be saved when you create the building.',
        });
        return;
      }
      await persistToBuilding(id, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save nearby places';
      setError(message);
      showNotification({ type: 'error', title: 'Could not save nearby places', message });
    } finally {
      setSaving(false);
    }
  };

  const addButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={addPlace}
      leftIcon={<Plus className="h-4 w-4" />}
    >
      Add {CATEGORY_LABELS[category].toLowerCase()}
    </Button>
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Add places by hand, or click Get latest from OpenStreetMap after the property
        has a map pin. Review the list, then save — the landing What’s nearby map only
        uses places you have saved.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {fetchedAt
            ? `${drafts.length} places · last OSM fetch ${new Date(fetchedAt).toLocaleString()}`
            : buildingId
              ? 'No snapshot yet. Get latest from OpenStreetMap or add places below.'
              : 'Add places now. They save when you create the building.'}
          {dirty ? ' · unsaved changes — save to publish on the landing map' : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            isLoading={refreshing}
            isDisabled={!buildingId}
            leftIcon={!refreshing ? <RefreshCw className="h-4 w-4" /> : undefined}
          >
            Get latest from OpenStreetMap
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            isLoading={saving}
            isDisabled={!dirty}
          >
            Save nearby places
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {AMENITY_CATEGORIES.map((id) => {
          const active = category === id;
          const color = CATEGORY_COLORS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className="rounded-xl border px-2 py-2 text-left transition"
              style={{
                borderColor: active ? color : '#E5E7EB',
                backgroundColor: active ? `${color}14` : '#fff',
              }}
            >
              <span className="block text-xs font-semibold text-gray-900">
                {CATEGORY_LABELS[id]}
              </span>
              <span className="mt-0.5 block text-[11px] text-gray-500">
                {counts[id]} places
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading nearby places…
        </p>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {CATEGORY_LABELS[category]}
          </h3>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                No {CATEGORY_LABELS[category].toLowerCase()} places yet. Add one manually.
              </p>
              <div className="mt-3">{addButton}</div>
            </div>
          ) : (
            <ul className="space-y-4">
              {filtered.map((place, index) => {
                const pinCoords = resolvedPin(place);
                const mapsHref = pinCoords
                  ? canonicalGoogleMapsUrl(pinCoords.latitude, pinCoords.longitude)
                  : null;
                return (
                  <li
                    key={place.id}
                    className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {CATEGORY_LABELS[category]} {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removePlace(place.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-end">
                      <FormField label="Name" htmlFor={`nearby-name-${place.id}`}>
                        <Input
                          id={`nearby-name-${place.id}`}
                          value={place.name}
                          onChange={(e) => updateDraft(place.id, { name: e.target.value })}
                          placeholder={`${CATEGORY_LABELS[category]} name`}
                        />
                      </FormField>
                      <FormField
                        label="Pin"
                        htmlFor={`nearby-pin-${place.id}`}
                      >
                        <Input
                          id={`nearby-pin-${place.id}`}
                          value={place.pin}
                          onChange={(e) => updateDraft(place.id, { pin: e.target.value })}
                          placeholder="15.162397, 120.590607"
                        />
                      </FormField>
                      <div className="sm:pb-px">
                        {mapsHref ? (
                          <a
                            href={mapsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-[38px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50 sm:w-auto"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View on map
                          </a>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-[38px] w-full sm:w-auto"
                            isDisabled
                          >
                            View on map
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Pin accepts coordinates like 15.162, 120.591 or a Google Maps share link.
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {filtered.length > 0 ? addButton : null}
        </div>
      )}
    </div>
  );
});

BuildingNearbyPlacesPanel.displayName = 'BuildingNearbyPlacesPanel';

export default BuildingNearbyPlacesPanel;
