'use client';

import { useEffect, useMemo, useState } from 'react';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  formatLatLngPreview,
  isGoogleMapsShortUrl,
  parseGoogleMapsLocation,
} from '@/lib/maps/google-maps-location';

interface AddressRegionOption {
  id: string;
  name: string;
}

interface AddressCityOption {
  id: string;
  name: string;
}

interface BuildingLocationFieldsProps {
  googleMapsUrl: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  onChange: (fields: Partial<{
    googleMapsUrl: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
  }>) => void;
  disabled?: boolean;
}

export default function BuildingLocationFields({
  googleMapsUrl,
  addressLine1,
  addressLine2,
  city,
  state,
  country,
  onChange,
  disabled = false,
}: BuildingLocationFieldsProps) {
  const [regions, setRegions] = useState<AddressRegionOption[]>([]);
  const [cities, setCities] = useState<AddressCityOption[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const mapsPreview = useMemo(
    () => parseGoogleMapsLocation(googleMapsUrl),
    [googleMapsUrl]
  );
  const mapsIsShort = useMemo(
    () => isGoogleMapsShortUrl(googleMapsUrl),
    [googleMapsUrl]
  );
  const mapsValue = googleMapsUrl.trim();
  const mapsHint = !mapsValue
    ? 'Used as the pin for landing-page What’s nearby (schools, parks, commute). In Google Maps: Share → copy link, or paste lat, lng.'
    : mapsPreview
      ? `Pin for What’s nearby: ${formatLatLngPreview(mapsPreview.latitude, mapsPreview.longitude)}`
      : mapsIsShort
        ? 'Short Google Maps links are resolved to a pin when you save.'
        : 'Couldn’t find coordinates yet. Paste a Maps share link or 15.145, 120.588.';

  useEffect(() => {
    let cancelled = false;

    async function loadRegions() {
      setLoadingRegions(true);
      setLoadError(null);
      try {
        const response = await fetch('/api/addresses/regions?country=PH');
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to load regions');
        }
        if (cancelled) return;
        setRegions(result.data || []);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load regions');
        }
      } finally {
        if (!cancelled) setLoadingRegions(false);
      }
    }

    void loadRegions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!regions.length || !state) return;
    const match = regions.find((r) => r.name.toLowerCase() === state.toLowerCase());
    if (match && match.id !== selectedRegionId) {
      setSelectedRegionId(match.id);
    }
  }, [regions, state, selectedRegionId]);

  useEffect(() => {
    if (!selectedRegionId) {
      setCities([]);
      return;
    }

    let cancelled = false;

    async function loadCities() {
      setLoadingCities(true);
      try {
        const response = await fetch(
          `/api/addresses/cities?regionId=${encodeURIComponent(selectedRegionId)}`
        );
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to load cities');
        }
        if (cancelled) return;
        setCities(result.data || []);
      } catch (err) {
        if (!cancelled) {
          setCities([]);
          setLoadError(err instanceof Error ? err.message : 'Failed to load cities');
        }
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    }

    void loadCities();
    return () => {
      cancelled = true;
    };
  }, [selectedRegionId]);

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    const region = regions.find((r) => r.id === regionId);
    onChange({
      state: region?.name || '',
      city: '',
    });
  };

  const handleCityChange = (cityName: string) => {
    onChange({ city: cityName });
  };

  return (
    <div className="space-y-5">
      <FormField label="Address line 1" htmlFor="addressLine1">
        <Input
          id="addressLine1"
          name="addressLine1"
          disabled={disabled}
          value={addressLine1}
          onChange={(e) => onChange({ addressLine1: e.target.value })}
          placeholder="Street address (optional)"
        />
      </FormField>

      <FormField label="Address line 2" htmlFor="addressLine2">
        <Input
          id="addressLine2"
          name="addressLine2"
          disabled={disabled}
          value={addressLine2}
          onChange={(e) => onChange({ addressLine2: e.target.value })}
          placeholder="Apartment, suite, etc. (optional)"
        />
      </FormField>

      {loadError && (
        <p className="text-sm text-red-600">
          {loadError}. Run address seed if the location database is empty.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Region" htmlFor="region" required>
          <Select
            id="region"
            name="region"
            required
            disabled={disabled || loadingRegions}
            value={selectedRegionId}
            onChange={(e) => handleRegionChange(e.target.value)}
          >
            <option value="">
              {loadingRegions ? 'Loading regions...' : 'Select region'}
            </option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="City" htmlFor="city" required>
          <Select
            id="city"
            name="city"
            required
            disabled={disabled || !selectedRegionId || loadingCities}
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
          >
            <option value="">
              {!selectedRegionId
                ? 'Select region first'
                : loadingCities
                  ? 'Loading cities...'
                  : 'Select city'}
            </option>
            {cities.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
            {city && !cities.some((c) => c.name === city) && (
              <option value={city}>{city}</option>
            )}
          </Select>
        </FormField>
      </div>

      <FormField label="Country" htmlFor="country" required>
        <Select
          id="country"
          name="country"
          required
          disabled={disabled}
          value={country || 'Philippines'}
          onChange={(e) => onChange({ country: e.target.value })}
        >
          <option value="Philippines">Philippines</option>
        </Select>
      </FormField>

      <FormField
        label="Google Maps pin"
        htmlFor="googleMapsUrl"
        hint={mapsHint}
        error={
          mapsValue &&
          !mapsPreview &&
          !mapsIsShort &&
          (mapsValue.includes(',') || /https?:|maps\./i.test(mapsValue))
            ? 'Paste a Google Maps share link or coordinates like 15.145, 120.588'
            : undefined
        }
      >
        <Textarea
          id="googleMapsUrl"
          name="googleMapsUrl"
          rows={2}
          disabled={disabled}
          value={googleMapsUrl}
          onChange={(e) => onChange({ googleMapsUrl: e.target.value })}
          placeholder="https://maps.app.goo.gl/… or 15.145, 120.588"
        />
      </FormField>
    </div>
  );
}
