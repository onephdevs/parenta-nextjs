'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { StatCard } from '@/components/ui/StatCard';
import { FormField } from '@/components/forms/FormField';

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

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Meter Readings Dashboard</h2>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Add Reading
            </Button>
          </div>
          <p className="text-sm text-gray-900">
            Track and manage utility meter readings across all properties.
          </p>
        </CardHeader>
        {error && (
          <div className="px-6 pb-4">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Readings" value={readings.length} />
        <StatCard title="Unique Meters" value={uniqueMeters} />
        <StatCard title="This Month" value={monthCount} />
        <StatCard title="Buildings" value={buildings.length} />
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Add Meter Reading</h3>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Building" htmlFor="meter-building" required>
                <Select
                  id="meter-building"
                  required
                  value={form.buildingId}
                  onChange={(e) => setForm((f) => ({ ...f, buildingId: e.target.value }))}
                >
                  <option value="">Select building</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
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

              <div className="md:col-span-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={saving}>
                  Save Reading
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card padding="none">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Meter Readings
          </h3>

          {readings.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No meter readings</h3>
              <p className="mt-1 text-sm text-gray-900">Get started by adding your first meter reading.</p>
              <div className="mt-6">
                <Button variant="primary" onClick={() => setShowForm(true)}>
                  Add Meter Reading
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-gray-700">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Building</th>
                    <th className="py-2 pr-4">Utility</th>
                    <th className="py-2 pr-4">Value</th>
                    <th className="py-2">Meter #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {readings.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4">{new Date(r.readingDate).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{r.building_name || r.buildingId}</td>
                      <td className="py-2 pr-4 capitalize">{r.utilityType}</td>
                      <td className="py-2 pr-4">{Number(r.readingValue).toLocaleString()}</td>
                      <td className="py-2">{r.meterNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}



