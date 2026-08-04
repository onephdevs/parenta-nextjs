'use client';

import { useEffect, useState } from 'react';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface AddressRegionOption {
  id: string;
  name: string;
}

interface AddressCityOption {
  id: string;
  name: string;
}

interface BuildingLocationFieldsProps {
  addressLine1: string;
  addressLine2: string;
  city: string;
  /** Stored in buildings.state — shown as Region in the UI */
  state: string;
  postalCode: string;
  country: string;
  onChange: (fields: Partial<{
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>) => void;
  disabled?: boolean;
}

export default function BuildingLocationFields({
  addressLine1,
  addressLine2,
  city,
  state,
  postalCode,
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
      <FormField label="Address line 1" htmlFor="addressLine1" required>
        <Input
          id="addressLine1"
          name="addressLine1"
          required
          disabled={disabled}
          value={addressLine1}
          onChange={(e) => onChange({ addressLine1: e.target.value })}
          placeholder="Enter street address"
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
            {/* Keep existing city visible if not in list (legacy free-text values) */}
            {city && !cities.some((c) => c.name === city) && (
              <option value={city}>{city}</option>
            )}
          </Select>
        </FormField>

        <FormField label="Postal code" htmlFor="postalCode" required>
          <Input
            id="postalCode"
            name="postalCode"
            required
            disabled={disabled}
            value={postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            placeholder="Postal code"
          />
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
    </div>
  );
}
