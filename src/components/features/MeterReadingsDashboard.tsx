'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { Building2, Calendar, Gauge, Zap } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';

interface MeterReading {
  id: string;
  buildingId: string;
  roomId?: string;
  utilityType: string;
  meterNumber?: string;
  readingDate: string;
  readingValue: number;
  previousReading?: number;
  usageCalculated?: number;
  notes?: string;
  building_name?: string;
  room_number?: string;
}

interface BuildingOption {
  id: string;
  name: string;
}

export default function MeterReadingsDashboard() {
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    buildingId: '',
    utilityType: 'electricity',
    readingDate: new Date().toISOString().slice(0, 10),
    readingValue: '',
    meterNumber: '',
    notes: '',
  });

  const loadReadings = async () => {
    setLoading(true);
    setError('');
    try {
      const [readingsRes, buildingsRes] = await Promise.all([
        fetch('/api/meter-readings?limit=50'),
        fetch('/api/buildings'),
      ]);
      const readingsData = await readingsRes.json();
      const buildingsData = await buildingsRes.json();

      if (!readingsRes.ok || !readingsData.success) {
        throw new Error(readingsData.error || 'Failed to load meter readings');
      }

      setReadings(readingsData.data || []);

      const list =
        buildingsData.data?.buildings ||
        buildingsData.data ||
        buildingsData.buildings ||
        [];
      setBuildings(
        (Array.isArray(list) ? list : []).map((b: { id: string; name: string }) => ({
          id: b.id,
          name: b.name,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meter readings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadings();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/meter-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: form.buildingId,
          utilityType: form.utilityType,
          readingDate: form.readingDate,
          readingValue: Number(form.readingValue),
          meterNumber: form.meterNumber || undefined,
          notes: form.notes || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create reading');
      }
      setShowForm(false);
      setForm({
        buildingId: '',
        utilityType: 'electricity',
        readingDate: new Date().toISOString().slice(0, 10),
        readingValue: '',
        meterNumber: '',
        notes: '',
      });
      await loadReadings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reading');
    } finally {
      setSaving(false);
    }
  };

  const monthCount = readings.filter((r) => {
    const d = new Date(r.readingDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const uniqueMeters = new Set(
    readings.map((r) => `${r.buildingId}-${r.utilityType}-${r.meterNumber || 'default'}`)
  ).size;

  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [utilityFilter, setUtilityFilter] = useState('');

  const filteredReadings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return readings.filter((r) => {
      const matchesSearch =
        !term ||
        (r.building_name || '').toLowerCase().includes(term) ||
        (r.meterNumber || '').toLowerCase().includes(term) ||
        (r.utilityType || '').toLowerCase().includes(term);
      const matchesBuilding = !buildingFilter || r.buildingId === buildingFilter;
      const matchesUtility = !utilityFilter || r.utilityType === utilityFilter;
      return matchesSearch && matchesBuilding && matchesUtility;
    });
  }, [readings, searchTerm, buildingFilter, utilityFilter]);

  const utilityTone = (type: string) => {
    const key = type.toLowerCase();
    if (key === 'electricity') return 'warning' as const;
    if (key === 'water') return 'info' as const;
    if (key === 'gas') return 'danger' as const;
    return 'neutral' as const;
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-3/4 rounded bg-gray-200" />
          <div className="space-y-3">
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-4 w-4/6 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total Readings"
          value={readings.length}
          footer="all recorded readings"
          icon={<Gauge className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Unique Meters"
          value={uniqueMeters}
          footer="meters tracked"
          icon={<Zap className="h-8 w-8 text-amber-500" />}
        />
        <ListSummaryCard
          title="This Month"
          value={monthCount}
          footer="readings this month"
          icon={<Calendar className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Buildings"
          value={buildings.length}
          footer="properties with meters"
          icon={<Building2 className="h-8 w-8 text-slate-600" />}
        />
      </div>

      <FilterBar
        columns={3}
        collapsible
        activeCount={[buildingFilter, utilityFilter].filter(Boolean).length}
        search={
          <SearchInput
            id="meter-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Building, meter, utility..."
            aria-label="Search meter readings"
          />
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Showing {filteredReadings.length} of {readings.length} readings
            </p>
            <Button onClick={() => setShowForm(true)}>Add Reading</Button>
          </div>
        }
      >
        <FormField label="Building" htmlFor="meter-building-filter">
          <Select
            id="meter-building-filter"
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
          >
            <option value="">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Utility" htmlFor="meter-utility-filter">
          <Select
            id="meter-utility-filter"
            value={utilityFilter}
            onChange={(e) => setUtilityFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water</option>
            <option value="gas">Gas</option>
            <option value="internet">Internet</option>
            <option value="other">Other</option>
          </Select>
        </FormField>
      </FilterBar>

      {showForm && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Add Meter Reading</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Building" htmlFor="meter-building" required>
              <Select
                id="meter-building"
                required
                value={form.buildingId}
                onChange={(e) => setForm((f) => ({ ...f, buildingId: e.target.value }))}
              >
                <option value="">Select building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Utility Type" htmlFor="meter-utility-type">
              <Select
                id="meter-utility-type"
                value={form.utilityType}
                onChange={(e) => setForm((f) => ({ ...f, utilityType: e.target.value }))}
              >
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="gas">Gas</option>
                <option value="internet">Internet</option>
                <option value="other">Other</option>
              </Select>
            </FormField>

            <FormField label="Reading Date" htmlFor="meter-reading-date" required>
              <Input
                id="meter-reading-date"
                type="date"
                required
                value={form.readingDate}
                onChange={(e) => setForm((f) => ({ ...f, readingDate: e.target.value }))}
              />
            </FormField>

            <FormField label="Reading Value" htmlFor="meter-reading-value" required>
              <Input
                id="meter-reading-value"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.readingValue}
                onChange={(e) => setForm((f) => ({ ...f, readingValue: e.target.value }))}
              />
            </FormField>

            <FormField label="Meter Number (optional)" htmlFor="meter-number">
              <Input
                id="meter-number"
                type="text"
                value={form.meterNumber}
                onChange={(e) => setForm((f) => ({ ...f, meterNumber: e.target.value }))}
              />
            </FormField>

            <FormField label="Notes (optional)" htmlFor="meter-notes">
              <Textarea
                id="meter-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={1}
              />
            </FormField>

            <div className="flex justify-end gap-3 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={saving}>
                Save Reading
              </Button>
            </div>
          </form>
        </div>
      )}

      <TableCard title="Meter readings" description="Recent consumption readings across properties.">
        {filteredReadings.length === 0 ? (
          <EmptyState
            title="No meter readings"
            description="Get started by adding your first meter reading."
            action={<Button onClick={() => setShowForm(true)}>Add Meter Reading</Button>}
          />
        ) : (
          filteredReadings.map((r) => (
            <WorkItemRow
              key={r.id}
              title={r.building_name || r.buildingId}
              subtitle={r.meterNumber ? `Meter ${r.meterNumber}` : r.room_number ? `Room ${r.room_number}` : null}
              badges={[
                {
                  key: 'utility',
                  label: r.utilityType,
                  tone: utilityTone(r.utilityType),
                },
              ]}
              date={formatShortDate(r.readingDate)}
              metaLabel={Number(r.readingValue).toLocaleString()}
              metaDetail={r.usageCalculated != null ? `+${Number(r.usageCalculated).toLocaleString()}` : null}
              dotTone={utilityTone(r.utilityType)}
            />
          ))
        )}
      </TableCard>
    </div>
  );
}

