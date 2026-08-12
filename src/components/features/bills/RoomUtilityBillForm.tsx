'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell, { SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { Home, Zap, Calendar, DollarSign, Settings, FileText } from 'lucide-react';
import {
  ALLOCATION_METHOD_LABELS,
  AllocationMethod,
} from '@/lib/constants/bills-expenses';
import {
  formatPaymentNotesForPeople,
  preserveLedgerTagOnSave,
} from '@/lib/format-payment-notes';
import {
  contactDisplayName,
  inferContactUtilityTypes,
  type Contact,
} from '@/lib/constants/contacts';

const OTHER_PROVIDER_VALUE = '__other__';

interface Building {
  id: string;
  name: string;
}

interface Room {
  id: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  floorNumber?: number | null;
}

interface UtilityUnitGroupOption {
  id: string;
  name: string;
  utilityType: string | null;
  memberCount: number;
}

interface RoomUtilityBillFormData {
  scope: 'unit' | 'building';
  buildingId: string;
  roomId: string;
  utilityType: 'electricity' | 'water';
  amount: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  providerName: string;
  providerAccountNumber: string;
  meterReadingPrevious: string;
  meterReadingCurrent: string;
  usageUnit: string;
  allocationMethod: AllocationMethod;
  distributeAcrossUnits: boolean;
  floorNumber: string;
  utilityUnitGroupId: string;
  billStatus: 'pending' | 'paid' | 'overdue';
  notes: string;
}

interface RoomUtilityBillFormProps {
  initialData?: Partial<RoomUtilityBillFormData>;
  onSubmit?: (data: RoomUtilityBillFormData) => Promise<void>;
  onCancel?: () => void;
  /** Called after a successful default create (not used when onSubmit is provided) */
  onSuccess?: () => void;
  mode?: 'page' | 'modal' | 'dialog';
  isOpen?: boolean;
  headerExtra?: ReactNode;
}

type FormSection = 'room' | 'type' | 'period' | 'amount' | 'status' | 'notes';

const formSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'room',
    label: 'Location',
    icon: <Home className="h-4 w-4" />,
    title: 'Bill Location',
    subtitle: 'Unit-specific or building-wide (common area)',
  },
  {
    id: 'type',
    label: 'Utility',
    icon: <Zap className="h-4 w-4" />,
    title: 'Utility Information',
    subtitle: 'Type, allocation, and provider',
  },
  {
    id: 'period',
    label: 'Period',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Billing Dates',
    subtitle: 'Billing period and due date',
  },
  {
    id: 'amount',
    label: 'Amount',
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Bill Amount',
    subtitle: 'Cost and optional meter readings',
  },
  {
    id: 'status',
    label: 'Status',
    icon: <Settings className="h-4 w-4" />,
    title: 'Bill Status',
    subtitle: 'Payment status',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText className="h-4 w-4" />,
    title: 'Additional Notes',
    subtitle: 'Optional details',
  },
];

export default function RoomUtilityBillForm({
  initialData,
  onSubmit,
  onCancel,
  onSuccess,
  mode = 'page',
  isOpen = true,
  headerExtra,
}: RoomUtilityBillFormProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<FormSection>('room');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [unitGroups, setUnitGroups] = useState<UtilityUnitGroupOption[]>([]);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [providerIsOther, setProviderIsOther] = useState(false);

  const [formData, setFormData] = useState<RoomUtilityBillFormData>({
    scope: initialData?.scope || 'unit',
    buildingId: initialData?.buildingId || '',
    roomId: initialData?.roomId || '',
    utilityType: initialData?.utilityType || 'electricity',
    amount: initialData?.amount || '',
    billingPeriodStart:
      initialData?.billingPeriodStart || new Date().toISOString().split('T')[0],
    billingPeriodEnd:
      initialData?.billingPeriodEnd || new Date().toISOString().split('T')[0],
    dueDate: initialData?.dueDate || new Date().toISOString().split('T')[0],
    providerName: initialData?.providerName || '',
    providerAccountNumber: initialData?.providerAccountNumber || '',
    meterReadingPrevious: initialData?.meterReadingPrevious || '',
    meterReadingCurrent: initialData?.meterReadingCurrent || '',
    usageUnit: initialData?.usageUnit || 'kWh',
    allocationMethod: initialData?.allocationMethod || 'SUBMETERED',
    distributeAcrossUnits: initialData?.distributeAcrossUnits ?? true,
    floorNumber: initialData?.floorNumber || '',
    utilityUnitGroupId: initialData?.utilityUnitGroupId || '',
    billStatus: initialData?.billStatus || 'pending',
    notes: formatPaymentNotesForPeople(initialData?.notes || ''),
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof RoomUtilityBillFormData, string>>
  >({});

  useEffect(() => {
    const load = async () => {
      try {
        const [bRes, rRes, vRes] = await Promise.all([
          fetch('/api/buildings'),
          fetch('/api/rooms'),
          fetch('/api/contacts?role=VENDOR'),
        ]);

        if (bRes.ok) {
          const data = await bRes.json();
          let list: Building[] = [];
          if (data.success && data.data?.buildings) list = data.data.buildings;
          else if (data.success && Array.isArray(data.data)) list = data.data;
          else if (Array.isArray(data.buildings)) list = data.buildings;
          setBuildings(
            list.map((b: Building & { building_name?: string }) => ({
              id: String(b.id),
              name: b.name || b.building_name || 'Building',
            }))
          );
        }

        if (rRes.ok) {
          const data = await rRes.json();
          let list: unknown[] = [];
          if (data.success && Array.isArray(data.data)) list = data.data;
          else if (Array.isArray(data.rooms)) list = data.rooms;
          else if (Array.isArray(data)) list = data;
          setRooms(
            list.map((room) => {
              const r = room as Record<string, unknown>;
              return {
                id: String(r.id),
                roomNumber: String(r.roomNumber || r.room_number || ''),
                buildingId: String(r.buildingId || r.building_id || ''),
                buildingName: String(
                  r.buildingName || r.building_name || 'Unknown Building'
                ),
                floorNumber:
                  r.floorNumber != null || r.floor_number != null
                    ? Number(r.floorNumber ?? r.floor_number)
                    : null,
              };
            })
          );
        }

        if (vRes.ok) {
          const data = await vRes.json();
          if (data.success && Array.isArray(data.data)) {
            setVendors(data.data as Contact[]);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, []);

  const vendorsForType = useMemo(() => {
    return vendors.filter((v) => {
      const types = v.utilityTypes?.length
        ? v.utilityTypes
        : inferContactUtilityTypes(v);
      return types.includes(formData.utilityType);
    });
  }, [vendors, formData.utilityType]);

  const selectedVendorId = useMemo(() => {
    if (providerIsOther) return OTHER_PROVIDER_VALUE;
    const match = vendorsForType.find(
      (v) => contactDisplayName(v) === formData.providerName.trim()
    );
    return match?.id || '';
  }, [providerIsOther, vendorsForType, formData.providerName]);

  useEffect(() => {
    if (providerIsOther || vendorsForType.length === 0) return;
    const names = vendorsForType.map((v) => contactDisplayName(v));
    const nextName = names[0] || '';
    setFormData((prev) => {
      if (names.includes(prev.providerName.trim())) return prev;
      if (prev.providerName === nextName) return prev;
      return { ...prev, providerName: nextName };
    });
  }, [formData.utilityType, vendorsForType, providerIsOther]);

  const filteredRooms = useMemo(() => {
    if (!formData.buildingId) return rooms;
    return rooms.filter((r) => r.buildingId === formData.buildingId);
  }, [rooms, formData.buildingId]);

  useEffect(() => {
    if (!formData.buildingId || formData.scope !== 'building') {
      setUnitGroups([]);
      return;
    }
    let cancelled = false;
    const loadGroups = async () => {
      try {
        const res = await fetch(
          `/api/utility-unit-groups?buildingId=${encodeURIComponent(formData.buildingId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data.data) ? data.data : [];
        setUnitGroups(
          list.map((g: Record<string, unknown>) => ({
            id: String(g.id),
            name: String(g.name),
            utilityType: g.utilityType ? String(g.utilityType) : null,
            memberCount: Number(g.memberCount) || 0,
          }))
        );
      } catch {
        if (!cancelled) setUnitGroups([]);
      }
    };
    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [formData.buildingId, formData.scope]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RoomUtilityBillFormData, string>> = {};

    if (formData.scope === 'unit' && !formData.roomId) {
      newErrors.roomId = 'Select a unit, or switch to building-wide';
    }
    if (formData.scope === 'building' && !formData.buildingId) {
      newErrors.buildingId = 'Building is required for building-wide bills';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.billingPeriodStart) {
      newErrors.billingPeriodStart = 'Start date is required';
    }
    if (!formData.billingPeriodEnd) {
      newErrors.billingPeriodEnd = 'End date is required';
    }
    if (
      formData.billingPeriodStart &&
      formData.billingPeriodEnd &&
      new Date(formData.billingPeriodEnd) < new Date(formData.billingPeriodStart)
    ) {
      newErrors.billingPeriodEnd = 'End date must be on or after start date';
    }
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the form errors',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        const selectedRoom = rooms.find((r) => r.id === formData.roomId);
        const buildingId =
          formData.scope === 'unit'
            ? selectedRoom?.buildingId || formData.buildingId
            : formData.buildingId;

        const response = await fetch('/api/utility-bills/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: formData.scope === 'unit' ? formData.roomId : null,
            buildingId,
            utilityType: formData.utilityType,
            amount: parseFloat(formData.amount),
            billingPeriodStart: formData.billingPeriodStart,
            billingPeriodEnd: formData.billingPeriodEnd,
            dueDate: formData.dueDate,
            providerName: formData.providerName || undefined,
            providerAccountNumber: formData.providerAccountNumber || undefined,
            meterReadingPrevious: formData.meterReadingPrevious
              ? parseFloat(formData.meterReadingPrevious)
              : undefined,
            meterReadingCurrent: formData.meterReadingCurrent
              ? parseFloat(formData.meterReadingCurrent)
              : undefined,
            usageUnit:
              formData.usageUnit ||
              (formData.utilityType === 'electricity' ? 'kWh' : 'm³'),
            allocationMethod: formData.allocationMethod,
            distributeAcrossUnits: formData.distributeAcrossUnits,
            floorNumber: formData.utilityUnitGroupId
              ? undefined
              : formData.floorNumber || undefined,
            utilityUnitGroupId: formData.utilityUnitGroupId || undefined,
            billStatus: formData.billStatus,
            notes: preserveLedgerTagOnSave(formData.notes || '', initialData?.notes) || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create utility bill');
        }

        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Utility bill created successfully',
        });
        if (onSuccess) onSuccess();
        else router.push('/admin/bills-expenses/utility-bills');
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to create utility bill',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof RoomUtilityBillFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'scope') {
        if (value === 'unit') {
          next.allocationMethod = 'SUBMETERED';
        } else {
          next.roomId = '';
          next.allocationMethod =
            prev.allocationMethod === 'SUBMETERED' ||
            prev.allocationMethod === 'per_unit_metered'
              ? 'SHARED_MANUAL'
              : prev.allocationMethod;
        }
      }
      if (field === 'utilityType' && typeof value === 'string') {
        next.usageUnit = value === 'electricity' ? 'kWh' : 'm³';
        setProviderIsOther(false);
      }
      if (field === 'buildingId') {
        next.roomId = '';
        next.utilityUnitGroupId = '';
        next.floorNumber = '';
      }
      if (field === 'utilityUnitGroupId' && value) {
        next.floorNumber = '';
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else router.push('/admin/bills-expenses/utility-bills');
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'room':
        return (
          <div className="space-y-6">
            <FormField label="Scope" htmlFor="scope">
              <Select
                id="scope"
                value={formData.scope}
                onChange={(e) =>
                  handleInputChange('scope', e.target.value as 'unit' | 'building')
                }
              >
                <option value="unit">Specific unit / room</option>
                <option value="building">Building-wide (common area)</option>
              </Select>
            </FormField>

            <FormField
              label="Building"
              htmlFor="buildingId"
              required={formData.scope === 'building'}
              error={errors.buildingId}
            >
              <Select
                id="buildingId"
                value={formData.buildingId}
                onChange={(e) => handleInputChange('buildingId', e.target.value)}
                isInvalid={Boolean(errors.buildingId)}
              >
                <option value="">Select building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {formData.scope === 'unit' && (
              <FormField
                label="Unit / Room"
                htmlFor="roomId"
                required
                error={errors.roomId}
                hint={
                  formData.buildingId
                    ? undefined
                    : 'Optionally filter by building above'
                }
              >
                <Select
                  id="roomId"
                  value={formData.roomId}
                  onChange={(e) => handleInputChange('roomId', e.target.value)}
                  isInvalid={Boolean(errors.roomId)}
                >
                  <option value="">Select unit</option>
                  {filteredRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.buildingName} · {room.roomNumber}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>
        );

      case 'type':
        return (
          <div className="space-y-6">
            <FormField label="Utility Type" htmlFor="utilityType" required>
              <Select
                id="utilityType"
                value={formData.utilityType}
                onChange={(e) => handleInputChange('utilityType', e.target.value)}
              >
                <option value="electricity">Electric</option>
                <option value="water">Water</option>
              </Select>
            </FormField>

            <FormField label="Allocation method" htmlFor="allocationMethod">
              <Select
                id="allocationMethod"
                value={formData.allocationMethod}
                onChange={(e) =>
                  handleInputChange('allocationMethod', e.target.value)
                }
              >
                {(
                  Object.entries(ALLOCATION_METHOD_LABELS) as [
                    AllocationMethod,
                    string,
                  ][]
                )
                  .filter(([key]) => {
                    // Prefer canonical Phase 1 methods in the picker
                    const canonical = [
                      'SUBMETERED',
                      'SHARED_MANUAL',
                      'NOT_APPLICABLE',
                    ];
                    if (!canonical.includes(key)) return false;
                    if (formData.scope === 'unit') {
                      return key === 'SUBMETERED' || key === 'NOT_APPLICABLE';
                    }
                    return true;
                  })
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </Select>
            </FormField>

            {formData.scope === 'building' &&
              (formData.allocationMethod === 'SHARED_MANUAL' ||
                formData.allocationMethod === 'split_evenly') && (
                <div className="space-y-3">
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={formData.distributeAcrossUnits}
                      onChange={(e) =>
                        handleInputChange('distributeAcrossUnits', e.target.checked)
                      }
                    />
                    <span>
                      Equal-split across units (creates a per-room share; vacant
                      rooms are owner-absorbed)
                    </span>
                  </label>
                  {formData.distributeAcrossUnits && (
                    <>
                      <FormField
                        label="Unit group (preferred)"
                        htmlFor="utilityUnitGroupId"
                        hint={
                          unitGroups.length === 0
                            ? 'Create named groups under Bills & Expenses → Unit groups'
                            : 'Overrides floor filter when selected'
                        }
                      >
                        <Select
                          id="utilityUnitGroupId"
                          value={formData.utilityUnitGroupId}
                          onChange={(e) =>
                            handleInputChange('utilityUnitGroupId', e.target.value)
                          }
                        >
                          <option value="">None — use floor / all units</option>
                          {unitGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                              {g.memberCount > 0 ? ` (${g.memberCount} units)` : ''}
                              {g.utilityType ? ` · ${g.utilityType}` : ''}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      {!formData.utilityUnitGroupId && (
                        <FormField
                          label="Floor filter (optional)"
                          htmlFor="floorNumber"
                          hint="e.g. 3 for Balibago 3rd-floor shared water — leave blank for all units"
                        >
                          <Select
                            id="floorNumber"
                            value={formData.floorNumber}
                            onChange={(e) =>
                              handleInputChange('floorNumber', e.target.value)
                            }
                          >
                            <option value="">All floors</option>
                            {Array.from(
                              new Set(
                                filteredRooms
                                  .map((r) => r.floorNumber)
                                  .filter(
                                    (f): f is number => f != null && !Number.isNaN(f)
                                  )
                              )
                            )
                              .sort((a, b) => a - b)
                              .map((f) => (
                                <option key={f} value={String(f)}>
                                  Floor {f}
                                  {f === 3 ? ' (shared water preset)' : ''}
                                </option>
                              ))}
                          </Select>
                        </FormField>
                      )}
                    </>
                  )}
                </div>
              )}

            <FormField
              label="Provider / vendor"
              htmlFor="providerName"
              hint={
                formData.utilityType === 'electricity'
                  ? 'Electric vendors from your contacts'
                  : 'Water vendors from your contacts'
              }
            >
              <Select
                id="providerName"
                value={selectedVendorId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setProviderIsOther(false);
                    handleInputChange('providerName', '');
                    return;
                  }
                  if (value === OTHER_PROVIDER_VALUE) {
                    setProviderIsOther(true);
                    handleInputChange('providerName', '');
                    return;
                  }
                  const vendor = vendorsForType.find((v) => v.id === value);
                  setProviderIsOther(false);
                  handleInputChange(
                    'providerName',
                    vendor ? contactDisplayName(vendor) : ''
                  );
                }}
              >
                <option value="">Select provider</option>
                {vendorsForType.map((v) => (
                  <option key={v.id} value={v.id}>
                    {contactDisplayName(v)}
                  </option>
                ))}
                <option value={OTHER_PROVIDER_VALUE}>Other (type a name)</option>
              </Select>
            </FormField>

            {providerIsOther && (
              <FormField
                label="Provider name"
                htmlFor="providerNameCustom"
                hint="Saved on this bill only — not added to vendors"
              >
                <Input
                  type="text"
                  id="providerNameCustom"
                  value={formData.providerName}
                  onChange={(e) => handleInputChange('providerName', e.target.value)}
                  placeholder={
                    formData.utilityType === 'electricity'
                      ? 'e.g. Meralco'
                      : 'e.g. Maynilad'
                  }
                />
              </FormField>
            )}

            <FormField label="Account Number" htmlFor="providerAccountNumber">
              <Input
                type="text"
                id="providerAccountNumber"
                value={formData.providerAccountNumber}
                onChange={(e) =>
                  handleInputChange('providerAccountNumber', e.target.value)
                }
                placeholder="Optional"
              />
            </FormField>
          </div>
        );

      case 'period':
        return (
          <div className="space-y-6">
            <FormField
              label="Billing Period Start"
              htmlFor="billingPeriodStart"
              required
              error={errors.billingPeriodStart}
            >
              <Input
                type="date"
                id="billingPeriodStart"
                value={formData.billingPeriodStart}
                onChange={(e) =>
                  handleInputChange('billingPeriodStart', e.target.value)
                }
                isInvalid={Boolean(errors.billingPeriodStart)}
                style={{ colorScheme: 'light' }}
              />
            </FormField>
            <FormField
              label="Billing Period End"
              htmlFor="billingPeriodEnd"
              required
              error={errors.billingPeriodEnd}
            >
              <Input
                type="date"
                id="billingPeriodEnd"
                value={formData.billingPeriodEnd}
                onChange={(e) =>
                  handleInputChange('billingPeriodEnd', e.target.value)
                }
                isInvalid={Boolean(errors.billingPeriodEnd)}
                style={{ colorScheme: 'light' }}
              />
            </FormField>
            <FormField
              label="Due Date"
              htmlFor="dueDate"
              required
              error={errors.dueDate}
            >
              <Input
                type="date"
                id="dueDate"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                isInvalid={Boolean(errors.dueDate)}
                style={{ colorScheme: 'light' }}
              />
            </FormField>
          </div>
        );

      case 'amount':
        return (
          <div className="space-y-6">
            <FormField
              label="Amount"
              htmlFor="amount"
              required
              error={errors.amount}
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-900">
                  ₱
                </span>
                <Input
                  type="number"
                  id="amount"
                  className="pl-7"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  isInvalid={Boolean(errors.amount)}
                />
              </div>
            </FormField>

            {(formData.allocationMethod === 'SUBMETERED' ||
              formData.allocationMethod === 'per_unit_metered') && (
              <>
                <FormField
                  label="Previous meter reading"
                  htmlFor="meterReadingPrevious"
                >
                  <Input
                    type="number"
                    id="meterReadingPrevious"
                    value={formData.meterReadingPrevious}
                    onChange={(e) =>
                      handleInputChange('meterReadingPrevious', e.target.value)
                    }
                    step="0.01"
                    min={0}
                    placeholder="Optional"
                  />
                </FormField>
                <FormField
                  label="Current meter reading"
                  htmlFor="meterReadingCurrent"
                >
                  <Input
                    type="number"
                    id="meterReadingCurrent"
                    value={formData.meterReadingCurrent}
                    onChange={(e) =>
                      handleInputChange('meterReadingCurrent', e.target.value)
                    }
                    step="0.01"
                    min={0}
                    placeholder="Optional"
                  />
                </FormField>
                <FormField label="Usage unit" htmlFor="usageUnit">
                  <Input
                    type="text"
                    id="usageUnit"
                    value={formData.usageUnit}
                    onChange={(e) => handleInputChange('usageUnit', e.target.value)}
                    placeholder={
                      formData.utilityType === 'electricity' ? 'kWh' : 'm³'
                    }
                  />
                </FormField>
              </>
            )}
          </div>
        );

      case 'status':
        return (
          <FormField label="Bill Status" htmlFor="billStatus">
            <Select
              id="billStatus"
              value={formData.billStatus}
              onChange={(e) => handleInputChange('billStatus', e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </Select>
          </FormField>
        );

      case 'notes':
        return (
          <FormField label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes"
            />
          </FormField>
        );

      default:
        return null;
    }
  };

  return mode === 'page' ? (
    <SectionedFormShell
      mode="page"
      onCancel={handleCancel}
      eyebrow="Utility Bill"
      entityLabel="New Utility Bill"
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      primaryLabel="Create Bill"
      primaryLoading={isLoading}
      formId="utility-bill-form"
      headerExtra={headerExtra}
    >
      <form id="utility-bill-form" onSubmit={handleSubmit} className="space-y-6">
        {renderSectionContent()}
      </form>
    </SectionedFormShell>
  ) : (
    <SectionedFormShell
      mode={mode}
      isOpen={isOpen}
      onCancel={handleCancel}
      eyebrow="Utility Bill"
      entityLabel="New Utility Bill"
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      primaryLabel="Create Bill"
      primaryLoading={isLoading}
      formId="utility-bill-form"
      headerExtra={headerExtra}
    >
      <form id="utility-bill-form" onSubmit={handleSubmit} className="space-y-6">
        {renderSectionContent()}
      </form>
    </SectionedFormShell>
  );
}
