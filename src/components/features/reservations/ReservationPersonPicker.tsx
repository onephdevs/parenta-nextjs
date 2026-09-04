'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, User } from 'lucide-react';
import type { DirectoryPerson, PersonBadge } from '@/lib/api/people';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import AddTenantButton from '@/components/features/tenants/AddTenantButton';
import { cn } from '@/lib/utils';

type AvailabilityFilter = 'all' | 'prospect' | 'past';

interface ReservationPersonPickerProps {
  value: string;
  onChange: (personId: string) => void;
  active?: boolean;
}

function isPlaceholderPerson(person: DirectoryPerson) {
  const name = `${person.firstName} ${person.lastName}`.trim();
  return /^tenant unit\s+\d+$/i.test(name);
}

function personName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`.trim() || 'Unnamed person';
}

function contactLine(person: DirectoryPerson) {
  return [person.email?.trim(), person.phone?.trim()].filter(Boolean).join(' · ');
}

function badgeLabel(badge: PersonBadge): string {
  if (badge === 'past') return 'Returning';
  if (badge === 'active') return 'Occupying a room';
  return 'Prospect';
}

function badgeTone(badge: PersonBadge): 'warning' | 'info' | 'success' {
  if (badge === 'past') return 'info';
  if (badge === 'active') return 'success';
  return 'warning';
}

export default function ReservationPersonPicker({
  value,
  onChange,
  active = true,
}: ReservationPersonPickerProps) {
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<DirectoryPerson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AvailabilityFilter>('all');

  const loadPeople = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/people?badge=unassigned&limit=500', {
        credentials: 'include',
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.details || result.error || 'Failed to load people');
      }
      const rows: DirectoryPerson[] = Array.isArray(result.data?.people)
        ? result.data.people
        : [];
      setPeople(rows.filter((person) => !isPlaceholderPerson(person)));
    } catch (err) {
      setPeople([]);
      setError(err instanceof Error ? err.message : 'Failed to load people');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    setQuery('');
    setFilter('all');
    void loadPeople();
  }, [active, loadPeople]);

  useEffect(() => {
    if (!value) {
      setSelectedPerson(null);
      return;
    }
    const fromList = people.find((person) => person.id === value);
    if (fromList) {
      setSelectedPerson(fromList);
      return;
    }
    let cancelled = false;
    const loadSelected = async () => {
      try {
        const response = await fetch(`/api/people/${value}`, { credentials: 'include' });
        const result = await response.json();
        if (cancelled || !result.success || !result.data) return;
        setSelectedPerson(result.data as DirectoryPerson);
      } catch {
        if (!cancelled) setSelectedPerson(null);
      }
    };
    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [value, people]);

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return people.filter((person) => {
      if (filter !== 'all' && person.badge !== filter) return false;
      if (!needle) return true;
      const haystack = [
        person.firstName,
        person.lastName,
        person.email,
        person.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [people, query, filter]);

  const handleCreated = (personId: string) => {
    void loadPeople();
    onChange(personId);
  };

  const addPersonButton = (
    <AddTenantButton
      label="Add person"
      variant="outline"
      omitHousing
      redirectAfterCreate={false}
      refreshOnCreated={false}
      onCreated={handleCreated}
      renderTrigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add person
        </button>
      )}
    />
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Hold the room for someone who is not living here yet. Current occupants are hidden.
      </p>

      {selectedPerson && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">
              {personName(selectedPerson)}
            </p>
            <p className="truncate text-xs text-gray-500">
              {contactLine(selectedPerson) || 'No email or phone on file'}
            </p>
          </div>
          <Badge tone={badgeTone(selectedPerson.badge)} variant="dot">
            {badgeLabel(selectedPerson.badge)}
          </Badge>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          id="reservation-person-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, or phone"
          className="flex-1"
          autoComplete="off"
        />
        {addPersonButton}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: 'all', label: 'Available' },
            { id: 'prospect', label: 'Prospects' },
            { id: 'past', label: 'Returning' },
          ] as const
        ).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              filter === chip.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-gray-500">Loading people…</p>
      ) : filteredPeople.length === 0 ? (
        <EmptyState
          icon={<User className="h-8 w-8" />}
          className="py-8"
          title={query.trim() ? 'No matching person' : 'No one available to hold a room'}
          description={
            query.trim()
              ? 'They are not in the list yet. Add them as a person — do not assign a room.'
              : 'Add the walk-in as a person, then come back and select them.'
          }
          action={addPersonButton}
        />
      ) : (
        <div
          role="listbox"
          aria-label="People available to hold this room"
          className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200"
        >
          {filteredPeople.map((person) => {
            const selected = person.id === value;
            const contact = contactLine(person);
            return (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(person.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50',
                  selected && 'bg-gray-50'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    selected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-transparent'
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {personName(person)}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {contact || 'No email or phone on file'}
                  </span>
                </span>
                <Badge tone={badgeTone(person.badge)} variant="dot">
                  {badgeLabel(person.badge)}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
