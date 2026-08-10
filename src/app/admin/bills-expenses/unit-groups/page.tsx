'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { FormField } from '@/components/forms/FormField';
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@/components/ui';

interface Building {
  id: string;
  name: string;
}

interface Room {
  id: string;
  roomNumber: string;
  buildingId: string;
  floorNumber?: number | null;
}

interface UnitGroup {
  id: string;
  buildingId: string;
  buildingName?: string;
  name: string;
  utilityType: string | null;
  description: string | null;
  memberCount: number;
  roomIds: string[];
}

const emptyForm = {
  buildingId: '',
  name: '',
  utilityType: 'water',
  description: '',
  roomIds: [] as string[],
};

export default function UtilityUnitGroupsPage() {
  const { showNotification } = useNotifications();
  const [groups, setGroups] = useState<UnitGroup[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [buildingFilter, setBuildingFilter] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [gRes, bRes, rRes] = await Promise.all([
        fetch('/api/utility-unit-groups'),
        fetch('/api/buildings'),
        fetch('/api/rooms'),
      ]);

      if (gRes.ok) {
        const data = await gRes.json();
        setGroups(Array.isArray(data.data) ? data.data : []);
      }

      if (bRes.ok) {
        const data = await bRes.json();
        let list: Building[] = [];
        if (data.success && data.data?.buildings) list = data.data.buildings;
        else if (data.success && Array.isArray(data.data)) list = data.data;
        else if (Array.isArray(data.buildings)) list = data.buildings;
        setBuildings(
          list.map((b) => ({
            id: String(b.id),
            name: b.name || 'Building',
          }))
        );
      }

      if (rRes.ok) {
        const data = await rRes.json();
        let list: unknown[] = [];
        if (data.success && Array.isArray(data.data)) list = data.data;
        else if (Array.isArray(data.rooms)) list = data.rooms;
        setRooms(
          list.map((room) => {
            const r = room as Record<string, unknown>;
            return {
              id: String(r.id),
              roomNumber: String(r.roomNumber || r.room_number || ''),
              buildingId: String(r.buildingId || r.building_id || ''),
              floorNumber:
                r.floorNumber != null || r.floor_number != null
                  ? Number(r.floorNumber ?? r.floor_number)
                  : null,
            };
          })
        );
      }
    } catch (error) {
      console.error(error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load unit groups',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredGroups = useMemo(() => {
    if (!buildingFilter) return groups;
    return groups.filter((g) => g.buildingId === buildingFilter);
  }, [groups, buildingFilter]);

  const formRooms = useMemo(() => {
    if (!form.buildingId) return [];
    return rooms
      .filter((r) => r.buildingId === form.buildingId)
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  }, [rooms, form.buildingId]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = async (group: UnitGroup) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/utility-unit-groups/${group.id}`);
      if (!res.ok) throw new Error('Failed to load group');
      const data = await res.json();
      const g = data.data as UnitGroup;
      setEditingId(g.id);
      setForm({
        buildingId: g.buildingId,
        name: g.name,
        utilityType: g.utilityType || 'water',
        description: g.description || '',
        roomIds: g.roomIds || [],
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load group',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRoom = (roomId: string) => {
    setForm((prev) => {
      const has = prev.roomIds.includes(roomId);
      return {
        ...prev,
        roomIds: has
          ? prev.roomIds.filter((id) => id !== roomId)
          : [...prev.roomIds, roomId],
      };
    });
  };

  const selectFloor = (floor: number) => {
    const floorRoomIds = formRooms
      .filter((r) => r.floorNumber === floor)
      .map((r) => r.id);
    setForm((prev) => ({
      ...prev,
      roomIds: Array.from(new Set([...prev.roomIds, ...floorRoomIds])),
    }));
  };

  const handleSave = async () => {
    if (!form.buildingId || !form.name.trim()) {
      showNotification({
        type: 'error',
        title: 'Validation',
        message: 'Building and name are required',
      });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        buildingId: form.buildingId,
        name: form.name.trim(),
        utilityType: form.utilityType || null,
        description: form.description.trim() || null,
        roomIds: form.roomIds,
      };

      const res = await fetch(
        editingId
          ? `/api/utility-unit-groups/${editingId}`
          : '/api/utility-unit-groups',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            editingId
              ? {
                  name: payload.name,
                  utilityType: payload.utilityType,
                  description: payload.description,
                  roomIds: payload.roomIds,
                }
              : payload
          ),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }

      showNotification({
        type: 'success',
        title: 'Saved',
        message: editingId ? 'Unit group updated' : 'Unit group created',
      });
      resetForm();
      await load();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/utility-unit-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error('Failed to deactivate');
      showNotification({
        type: 'success',
        title: 'Deactivated',
        message: 'Unit group hidden from active list',
      });
      if (editingId === id) resetForm();
      await load();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to deactivate',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const floors = useMemo(
    () =>
      Array.from(
        new Set(
          formRooms
            .map((r) => r.floorNumber)
            .filter((f): f is number => f != null && !Number.isNaN(f))
        )
      ).sort((a, b) => a - b),
    [formRooms]
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Utility unit groups"
        description="Named sets of rooms for shared water/electric equal-split (e.g. Balibago 3rd-floor water)."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {editingId ? 'Edit group' : 'New group'}
          </h2>

          <FormField label="Building" htmlFor="buildingId" required>
            <Select
              id="buildingId"
              value={form.buildingId}
              disabled={Boolean(editingId)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  buildingId: e.target.value,
                  roomIds: [],
                }))
              }
            >
              <option value="">Select building</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Name" htmlFor="name" required>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Balibago 3rd floor water"
            />
          </FormField>

          <FormField label="Utility type" htmlFor="utilityType">
            <Select
              id="utilityType"
              value={form.utilityType}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, utilityType: e.target.value }))
              }
            >
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
              <option value="">Any / unspecified</option>
            </Select>
          </FormField>

          <FormField label="Description" htmlFor="description">
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              placeholder="Optional notes"
            />
          </FormField>

          {form.buildingId && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">
                  Members ({form.roomIds.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {floors.map((f) => (
                    <Button
                      key={f}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectFloor(f)}
                    >
                      Add floor {f}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto rounded border border-gray-100 p-2">
                {formRooms.length === 0 ? (
                  <p className="text-sm text-gray-500">No rooms in this building.</p>
                ) : (
                  formRooms.map((room) => (
                    <label
                      key={room.id}
                      className="flex items-center gap-2 py-1 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.roomIds.includes(room.id)}
                        onChange={() => toggleRoom(room.id)}
                      />
                      <span>
                        {room.roomNumber}
                        {room.floorNumber != null ? ` · Fl ${room.floorNumber}` : ''}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : editingId ? 'Update group' : 'Create group'}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Active groups</h2>
            <Select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="max-w-xs"
            >
              <option value="">All buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : filteredGroups.length === 0 ? (
            <EmptyState
              title="No unit groups yet"
              description="Create a named group for shared-floor water or other equal splits."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{g.name}</div>
                      {g.utilityType && (
                        <div className="text-xs text-gray-500">{g.utilityType}</div>
                      )}
                    </TableCell>
                    <TableCell>{g.buildingName || '—'}</TableCell>
                    <TableCell>{g.memberCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(g)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => deactivate(g.id)}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
