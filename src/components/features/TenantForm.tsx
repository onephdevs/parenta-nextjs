'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

/** Assign API enforces this floor when no building deposit config exists */
const MINIMUM_DEPOSIT_AMOUNT = 3000;

const DRAFT_STORAGE_KEY = 'parenta:tenant-form-draft';
const DIRTY_FLAG_KEY = 'parenta:tenant-form-dirty';

interface Building {
  id: string;
  name: string;
}

interface Room {
  id: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  monthlyRate: number;
  roomStatus: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
}

interface TenantFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  moveInDate?: string;
  previousAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employmentStatus?: 'employed' | 'unemployed' | 'student' | 'retired' | 'other' | '';
  employerName?: string;
  monthlyIncome?: number;
  buildingId?: string;
  roomId?: string;
  monthlyRent?: number;
  depositMonths: number;
  advanceMonths: number;
  /**
   * Duration preset: 1–24 = months, 0 = custom (use customLeaseMonths), -1 = open-ended.
   */
  leaseDurationMonths: number;
  /** Used when leaseDurationMonths === 0 (Custom). */
  customLeaseMonths?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  notes?: string;
}

type FormErrors = Record<string, string>;

const STEPS = [
  { id: 1, title: 'Personal', description: 'Identity & emergency contact' },
  { id: 2, title: 'Employment', description: 'Work & financial info' },
  { id: 3, title: 'Housing', description: 'Room, rent & lease' },
] as const;

const STEP_FIELDS: Record<number, string[]> = {
  1: ['firstName', 'lastName', 'email', 'phone', 'emergencyContactPhone'],
  2: ['monthlyIncome'],
  3: ['monthlyRent', 'depositMonths', 'advanceMonths', 'leaseStartDate', 'customLeaseMonths'],
};

const INITIAL_FORM_DATA: TenantFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  moveInDate: '',
  previousAddress: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  employmentStatus: '',
  employerName: '',
  monthlyIncome: undefined,
  buildingId: '',
  roomId: '',
  monthlyRent: undefined,
  depositMonths: 1,
  advanceMonths: 1,
  leaseDurationMonths: 12,
  customLeaseMonths: undefined,
  leaseStartDate: '',
  leaseEndDate: '',
  notes: '',
};

const LEASE_DURATION_PRESETS = [1, 3, 6, 12, 18, 24] as const;

function todayLocalISO(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** End date = start + N months − 1 day (e.g. Aug 17 + 6 mo → Feb 16). */
function computeLeaseEndDate(startIso: string, months: number): string {
  if (!startIso || months <= 0) return '';
  const [year, month, day] = startIso.split('-').map(Number);
  if (!year || !month || !day) return '';

  const end = new Date(year, month - 1, day);
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() - 1);

  const yy = end.getFullYear();
  const mm = String(end.getMonth() + 1).padStart(2, '0');
  const dd = String(end.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function getEffectiveLeaseMonths(data: Pick<TenantFormData, 'leaseDurationMonths' | 'customLeaseMonths'>): number {
  if (data.leaseDurationMonths === -1) return 0; // open-ended
  if (data.leaseDurationMonths === 0) return Number(data.customLeaseMonths) || 0;
  return Number(data.leaseDurationMonths) || 0;
}

function applyLeaseEndDate(
  data: TenantFormData,
  startOverride?: string
): string {
  const start = startOverride ?? data.leaseStartDate ?? '';
  const months = getEffectiveLeaseMonths(data);
  if (!start || months <= 0) return '';
  return computeLeaseEndDate(start, months);
}

function getFieldError(name: string, data: TenantFormData): string {
  switch (name) {
    case 'firstName':
      return !data.firstName.trim() ? 'First name is required' : '';
    case 'lastName':
      return !data.lastName.trim() ? 'Last name is required' : '';
    case 'email':
      if (!data.email.trim()) return 'Email is required';
      if (!/\S+@\S+\.\S+/.test(data.email)) return 'Email is invalid';
      return '';
    case 'phone':
      if (data.phone && !/^\+?[\d\s\-\(\)]+$/.test(data.phone)) {
        return 'Phone number is invalid';
      }
      return '';
    case 'emergencyContactPhone':
      if (data.emergencyContactPhone && !/^\+?[\d\s\-\(\)]+$/.test(data.emergencyContactPhone)) {
        return 'Emergency contact phone is invalid';
      }
      return '';
    case 'monthlyIncome':
      if (data.monthlyIncome != null && data.monthlyIncome < 0) {
        return 'Monthly income cannot be negative';
      }
      return '';
    case 'monthlyRent':
      if (data.monthlyRent != null && data.monthlyRent < 0) {
        return 'Monthly rent cannot be negative';
      }
      if (data.roomId && (!data.monthlyRent || data.monthlyRent <= 0)) {
        return 'Monthly rent is required when assigning a room';
      }
      return '';
    case 'depositMonths':
      if (data.depositMonths == null || Number.isNaN(Number(data.depositMonths))) {
        return 'Deposit months is required';
      }
      if (data.depositMonths < 0) return 'Deposit months cannot be negative';
      return '';
    case 'advanceMonths':
      if (data.advanceMonths == null || Number.isNaN(Number(data.advanceMonths))) {
        return 'Advance months is required';
      }
      if (data.advanceMonths < 0) return 'Advance months cannot be negative';
      return '';
    case 'leaseStartDate':
      if (data.roomId && !data.leaseStartDate) {
        return 'Lease start date is required when assigning a room';
      }
      if (data.leaseStartDate && data.leaseStartDate < todayLocalISO()) {
        return 'Lease start date cannot be in the past';
      }
      return '';
    case 'moveInDate':
      if (data.moveInDate && data.leaseStartDate && data.moveInDate < data.leaseStartDate) {
        return 'Move-in date cannot be earlier than lease start date';
      }
      if (
        data.leaseDurationMonths !== -1 &&
        data.moveInDate &&
        data.leaseEndDate &&
        data.moveInDate > data.leaseEndDate
      ) {
        return 'Move-in date cannot be later than lease end date';
      }
      return '';
    case 'customLeaseMonths':
      if (data.leaseDurationMonths === 0) {
        if (data.customLeaseMonths == null || Number(data.customLeaseMonths) <= 0) {
          return 'Enter how many months for the custom lease duration';
        }
      }
      return '';
    default:
      return '';
  }
}

function SectionCard({
  title,
  description,
  optional,
  children,
}: {
  title: string;
  description?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {optional && (
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Optional
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function TenantForm() {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [overrideMonthlyRent, setOverrideMonthlyRent] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const skipNextDraftSave = useRef(false);
  const [credentialsModal, setCredentialsModal] = useState<{
    tenantId: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Restore draft once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        formData?: TenantFormData;
        overrideMonthlyRent?: boolean;
        step?: number;
      };
      if (!parsed.formData) return;
      skipNextDraftSave.current = true;
      setFormData({ ...INITIAL_FORM_DATA, ...parsed.formData });
      setOverrideMonthlyRent(Boolean(parsed.overrideMonthlyRent));
      if (parsed.step && parsed.step >= 1 && parsed.step <= 3) setStep(parsed.step);
      setIsDirty(true);
      setDraftRestored(true);
      sessionStorage.setItem(DIRTY_FLAG_KEY, '1');
    } catch (error) {
      console.warn('Could not restore tenant form draft:', error);
    }
  }, []);

  // Autosave draft
  useEffect(() => {
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    if (!isDirty || submitted) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ formData, overrideMonthlyRent, step, savedAt: Date.now() })
        );
        sessionStorage.setItem(DIRTY_FLAG_KEY, '1');
      } catch (error) {
        console.warn('Could not save tenant form draft:', error);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [formData, overrideMonthlyRent, step, isDirty, submitted]);

  // Browser leave / refresh guard
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty || submitted) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, submitted]);

  // Clear dirty flag on unmount after successful submit
  useEffect(() => {
    return () => {
      if (submitted) {
        sessionStorage.removeItem(DIRTY_FLAG_KEY);
      }
    };
  }, [submitted]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(DIRTY_FLAG_KEY);
    setDraftRestored(false);
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    sessionStorage.setItem(DIRTY_FLAG_KEY, '1');
  }, []);

  const confirmLeave = useCallback(async () => {
    if (!isDirty || submitted) return true;
    return confirm({
      title: 'Unsaved changes',
      message: 'You have unsaved changes. Leave this page and discard the draft in progress?',
      confirmText: 'Leave',
      variant: 'warning',
    });
  }, [isDirty, submitted, confirm]);

  // Load buildings and rooms
  useEffect(() => {
    const loadData = async () => {
      try {
        const [buildingsRes, roomsRes] = await Promise.all([
          fetch('/api/buildings'),
          fetch('/api/rooms'),
        ]);

        if (buildingsRes.ok) {
          const buildingsData = await buildingsRes.json();
          const buildingsList =
            buildingsData.data?.buildings || buildingsData.buildings || buildingsData.data || [];
          if (Array.isArray(buildingsList)) {
            setBuildings(buildingsList);
          } else {
            console.error('Invalid buildings data format:', buildingsList);
            setBuildings([]);
          }
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          const roomsList = roomsData.data || roomsData.rooms || [];
          if (Array.isArray(roomsList)) {
            setRooms(roomsList);
            setFilteredRooms(roomsList.filter((r: Room) => r.roomStatus === 'vacant'));
          } else {
            console.error('Invalid rooms data format:', roomsList);
            setRooms([]);
            setFilteredRooms([]);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Filter rooms when building is selected (property first, then room)
  useEffect(() => {
    if (formData.buildingId) {
      const filtered = rooms.filter(
        (r) => r.buildingId === formData.buildingId && r.roomStatus === 'vacant'
      );
      setFilteredRooms(filtered);

      if (formData.roomId && !filtered.find((r) => r.id === formData.roomId)) {
        setFormData((prev) => ({ ...prev, roomId: '' }));
      }
    } else {
      setFilteredRooms([]);
      if (formData.roomId) {
        setFormData((prev) => ({ ...prev, roomId: '' }));
      }
    }
  }, [formData.buildingId, rooms, formData.roomId]);

  // Auto-fill monthly rent when room is selected (only if override is not checked)
  useEffect(() => {
    if (formData.roomId && !overrideMonthlyRent) {
      const selectedRoom = rooms.find((r) => r.id === formData.roomId);
      if (selectedRoom && selectedRoom.monthlyRate != null) {
        setFormData((prev) => ({
          ...prev,
          monthlyRent: Number(selectedRoom.monthlyRate),
        }));
      }
    } else if (!formData.roomId && !overrideMonthlyRent) {
      setFormData((prev) => ({ ...prev, monthlyRent: undefined }));
    }
  }, [formData.roomId, rooms, overrideMonthlyRent]);

  const computedDeposit = (formData.monthlyRent || 0) * formData.depositMonths;
  const computedAdvance = (formData.monthlyRent || 0) * formData.advanceMonths;
  const effectiveDeposit =
    formData.roomId && computedDeposit < MINIMUM_DEPOSIT_AMOUNT
      ? MINIMUM_DEPOSIT_AMOUNT
      : computedDeposit;
  const depositRaisedToMinimum =
    Boolean(formData.roomId) && computedDeposit < MINIMUM_DEPOSIT_AMOUNT;
  const hasRentForTotal = Boolean(formData.monthlyRent && formData.monthlyRent > 0);
  const rentLocked = !overrideMonthlyRent && Boolean(formData.roomId);
  const rentDisabled = !overrideMonthlyRent && !formData.roomId;
  const todayISO = todayLocalISO();
  const effectiveLeaseMonths = getEffectiveLeaseMonths(formData);
  const isCustomDuration = formData.leaseDurationMonths === 0;
  const isOpenEndedLease = formData.leaseDurationMonths === -1;
  const leaseEndDateLocked = effectiveLeaseMonths > 0;

  const collectErrors = useCallback((fields?: string[]): FormErrors => {
    const names =
      fields ??
      Object.keys(STEP_FIELDS).flatMap((k) => STEP_FIELDS[Number(k)]);
    const next: FormErrors = {};
    for (const name of names) {
      const message = getFieldError(name, formData);
      if (message) next[name] = message;
    }
    return next;
  }, [formData]);

  const validateForm = (): boolean => {
    const newErrors = collectErrors();
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep = (stepNumber: number): boolean => {
    const newErrors = collectErrors(STEP_FIELDS[stepNumber]);
    setErrors((prev) => {
      const cleared = { ...prev };
      for (const field of STEP_FIELDS[stepNumber]) {
        delete cleared[field];
      }
      return { ...cleared, ...newErrors };
    });
    return Object.keys(newErrors).length === 0;
  };

  /** Returns true if email is free to use; sets errors.email when taken. */
  const ensureEmailAvailable = async (email: string): Promise<boolean> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/\S+@\S+\.\S+/.test(normalized)) {
      return false;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch(
        `/api/tenants/check-email?email=${encodeURIComponent(normalized)}`
      );
      const result = await response.json();

      if (!result.success) {
        setErrors((prev) => ({
          ...prev,
          email: result.error || 'Could not verify email',
        }));
        return false;
      }

      if (!result.data?.available) {
        setErrors((prev) => ({
          ...prev,
          email: 'This email is already in use. Choose a different email to continue.',
        }));
        return false;
      }

      setErrors((prev) => {
        if (!prev.email) return prev;
        const next = { ...prev };
        delete next.email;
        return next;
      });
      return true;
    } catch {
      setErrors((prev) => ({
        ...prev,
        email: 'Could not verify email. Please try again.',
      }));
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const focusFirstError = (errorMap: FormErrors) => {
    const order = [
      ...STEP_FIELDS[1],
      ...STEP_FIELDS[2],
      ...STEP_FIELDS[3],
    ];
    const first = order.find((name) => errorMap[name]);
    if (!first) return;

    let targetStep = 1;
    if (STEP_FIELDS[2].includes(first)) targetStep = 2;
    if (STEP_FIELDS[3].includes(first)) targetStep = 3;
    setStep(targetStep);

    window.setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const el = document.getElementById(first);
      el?.focus();
    }, 50);
  };

  const handleBlur = async (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    if (!name) return;
    const message = getFieldError(name, formData);
    setErrors((prev) => {
      if (!message) {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: message };
    });

    if (name === 'email' && !message && formData.email.trim()) {
      await ensureEmailAvailable(formData.email);
    }
  };

  const goBack = () => {
    setStep((s) => Math.max(1, s - 1));
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goNext = async (): Promise<boolean> => {
    if (!validateStep(step)) {
      focusFirstError(collectErrors(STEP_FIELDS[step]));
      return false;
    }

    if (step === 1) {
      const emailOk = await ensureEmailAvailable(formData.email);
      if (!emailOk) {
        focusFirstError({ email: 'This email is already in use.' });
        return false;
      }
    }

    setStep((s) => Math.min(3, s + 1));
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enter / implicit form submit must never create until the final step.
    // On earlier steps, treat submit as "Continue".
    if (step < 3) {
      await goNext();
      return;
    }

    const allErrors = collectErrors();
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      focusFirstError(allErrors);
      return;
    }

    const emailOk = await ensureEmailAvailable(formData.email);
    if (!emailOk) {
      focusFirstError({ email: 'This email is already in use.' });
      return;
    }

    setLoading(true);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Creating tenant...',
      message: formData.roomId
        ? 'Creating tenant profile and assigning room...'
        : 'Please wait while we create the tenant profile.',
    });

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          employmentStatus: formData.employmentStatus || null,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
          moveInDate: formData.moveInDate ? new Date(formData.moveInDate) : null,
          leaseStartDate: formData.leaseStartDate ? new Date(formData.leaseStartDate) : null,
          leaseEndDate: formData.leaseEndDate ? new Date(formData.leaseEndDate) : null,
          monthlyIncome: formData.monthlyIncome || null,
          monthlyRent: formData.monthlyRent || null,
          depositMonths: formData.depositMonths,
          advanceMonths: formData.advanceMonths,
          buildingId: formData.buildingId || null,
          roomId: formData.roomId || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.details || result.error || 'Failed to create tenant');
      }

      const tenantId = result.data.id;
      const temporaryPassword = result.data.temporaryPassword as string | undefined;

      if (formData.roomId) {
        updateNotification(loadingNotificationId, {
          type: 'loading',
          title: 'Assigning room...',
          message: 'Generating invoices automatically...',
        });

        const monthlyRate = Number(formData.monthlyRent) || 0;
        const depositFromMonths = monthlyRate * formData.depositMonths;
        const depositPaid = Math.max(depositFromMonths, MINIMUM_DEPOSIT_AMOUNT);
        const advanceAmount = monthlyRate * formData.advanceMonths;

        const assignResponse = await fetch(`/api/rooms/${formData.roomId}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId: tenantId,
            startDate: formData.leaseStartDate || new Date().toISOString().slice(0, 10),
            endDate: formData.leaseEndDate || null,
            monthlyRate,
            depositPaid,
            advanceAmount,
          }),
        });

        const assignResult = await assignResponse.json();

        if (!assignResult.success) {
          throw new Error(
            assignResult.details ||
              assignResult.error ||
              'Tenant was created but room assignment failed'
          );
        }

        const invoiceDetails = assignResult.invoiceDetails;
        let detailMessage = `${formData.firstName} ${formData.lastName} has been added successfully.`;

        if (invoiceDetails && invoiceDetails.totalInvoices > 0) {
          const formatCurrency = (amount: number) =>
            new Intl.NumberFormat('en-PH', {
              style: 'currency',
              currency: 'PHP',
            }).format(amount || 0);

          const firstNo = invoiceDetails.firstInvoiceNumber;
          const lastNo = invoiceDetails.lastInvoiceNumber;
          const rangeLabel =
            firstNo && lastNo
              ? firstNo === lastNo
                ? firstNo
                : `${firstNo} → ${lastNo}`
              : null;

          detailMessage += `\n\n✅ Auto-Invoicing Complete:`;
          detailMessage += `\n📄 ${invoiceDetails.totalInvoices} monthly rent invoice${invoiceDetails.totalInvoices === 1 ? '' : 's'} (one per lease month)`;
          detailMessage += `\n💰 Total amount: ${formatCurrency(Number(invoiceDetails.totalAmount) || 0)}`;
          if (rangeLabel) {
            detailMessage += `\n📊 Invoice range: ${rangeLabel}`;
          }
        }

        updateNotification(loadingNotificationId, {
          type: 'success',
          title: 'Tenant Created & Room Assigned!',
          message: detailMessage,
        });
      } else {
        updateNotification(loadingNotificationId, {
          type: 'success',
          title: 'Tenant created successfully!',
          message: `${formData.firstName} ${formData.lastName} has been added. You can assign a room later.`,
        });
      }

      setSubmitted(true);
      setIsDirty(false);
      clearDraft();

      if (temporaryPassword) {
        setPasswordCopied(false);
        setCredentialsModal({
          tenantId,
          email: formData.email,
          temporaryPassword,
        });
      } else {
        setTimeout(() => {
          router.push(`/admin/tenants/${tenantId}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      const message = error instanceof Error ? error.message : 'An error occurred';
      updateNotification(loadingNotificationId, {
        type: 'error',
        title:
          message.toLowerCase().includes('assign') || message.toLowerCase().includes('deposit')
            ? 'Room assignment failed'
            : 'Failed to create tenant',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const optionalNumberFields = ['monthlyIncome', 'monthlyRent', 'customLeaseMonths'];
    const selectNumberFields = ['leaseDurationMonths'];
    const numValue = value === '' ? undefined : Number(value);
    const isOptionalNumber = type === 'number' && optionalNumberFields.includes(name);

    setFormData((prev) => {
      let fieldValue: string | number | undefined;
      if (type === 'number') {
        if (isOptionalNumber) {
          if (value === '') {
            fieldValue = undefined;
          } else if (Number.isNaN(numValue)) {
            fieldValue = prev[name as keyof TenantFormData] as number | undefined;
          } else {
            fieldValue = numValue;
          }
        } else {
          fieldValue = value === '' ? 0 : Number(value);
        }
      } else if (selectNumberFields.includes(name)) {
        fieldValue = value === '' ? 0 : Number(value);
      } else {
        fieldValue = value;
      }

      const next: TenantFormData = {
        ...prev,
        [name]: fieldValue,
      };

      // Switching to Custom: seed months input from previous preset when empty
      if (name === 'leaseDurationMonths' && Number(fieldValue) === 0) {
        if (prev.customLeaseMonths == null || prev.customLeaseMonths <= 0) {
          const previousPreset = Number(prev.leaseDurationMonths);
          next.customLeaseMonths =
            previousPreset > 0 ? previousPreset : 12;
        }
      }

      if (name === 'leaseStartDate') {
        const start = String(fieldValue ?? '');
        const previousStart = prev.leaseStartDate || '';
        // Auto-fill move-in when empty or still matching the previous start
        if (!prev.moveInDate || prev.moveInDate === previousStart) {
          next.moveInDate = start;
        } else if (start && prev.moveInDate && prev.moveInDate < start) {
          // Move-in cannot be before lease start
          next.moveInDate = start;
        }
      }

      if (
        name === 'leaseStartDate' ||
        name === 'leaseDurationMonths' ||
        name === 'customLeaseMonths'
      ) {
        next.leaseEndDate = applyLeaseEndDate(next);
        // Keep move-in inside the lease window after end date recalculates
        if (
          next.leaseEndDate &&
          next.moveInDate &&
          next.moveInDate > next.leaseEndDate
        ) {
          next.moveInDate = next.leaseEndDate;
        }
      }

      return next;
    });
    markDirty();

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleCancel = async () => {
    if (!(await confirmLeave())) return;
    clearDraft();
    setIsDirty(false);
    router.push('/admin/tenants');
  };

  const handleBackLink = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!(await confirmLeave())) return;
    clearDraft();
    setIsDirty(false);
    router.push('/admin/tenants');
  };

  const handleCopyTemporaryPassword = async () => {
    if (!credentialsModal?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(credentialsModal.temporaryPassword);
      setPasswordCopied(true);
    } catch {
      // Fallback for older browsers / denied clipboard permission
      const textarea = document.createElement('textarea');
      textarea.value = credentialsModal.temporaryPassword;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setPasswordCopied(true);
    }
  };

  const handleCredentialsModalContinue = () => {
    if (!credentialsModal) return;
    const { tenantId } = credentialsModal;
    setCredentialsModal(null);
    router.push(`/admin/tenants/${tenantId}`);
  };

  return (
    <div ref={formTopRef} className="text-gray-900">
      {dialog}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 mb-6 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/admin/tenants"
            onClick={handleBackLink}
            className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Tenants
          </Link>
          <p className="text-xs text-gray-500">
            Step {step} of {STEPS.length}
            {isDirty && !submitted ? ' · Draft saved locally' : ''}
          </p>
        </div>

        <nav aria-label="Form progress" className="flex gap-2">
          {STEPS.map((s) => {
            const active = s.id === step;
            const complete = s.id < step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={async () => {
                  if (s.id < step) {
                    setStep(s.id);
                    return;
                  }
                  if (s.id > step) {
                    for (let i = step; i < s.id; i += 1) {
                      if (!validateStep(i)) {
                        focusFirstError(collectErrors(STEP_FIELDS[i]));
                        return;
                      }
                      if (i === 1) {
                        const emailOk = await ensureEmailAvailable(formData.email);
                        if (!emailOk) {
                          focusFirstError({ email: 'This email is already in use.' });
                          return;
                        }
                      }
                    }
                    setStep(s.id);
                  }
                }}
                className={cn(
                  'min-w-0 flex-1 rounded-md border px-2 py-2 text-left transition',
                  active && 'border-purple-500 bg-purple-50',
                  complete && !active && 'border-green-200 bg-green-50',
                  !active && !complete && 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                )}
              >
                <div className="text-xs font-semibold text-gray-900">
                  {s.id}. {s.title}
                </div>
                <div className="mt-0.5 hidden text-[11px] text-gray-600 sm:block">
                  {s.description}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {draftRestored && (
        <Alert
          variant="info"
          title="Draft restored"
          className="mb-4"
          onDismiss={() => setDraftRestored(false)}
        >
          Your previous unsaved entries were restored from this browser.{' '}
          <button
            type="button"
            className="font-medium underline"
            onClick={async () => {
              if (
                !(await confirm({
                  title: 'Clear draft?',
                  message: 'Clear the saved draft and start over?',
                  confirmText: 'Clear draft',
                  variant: 'danger',
                }))
              )
                return;
              clearDraft();
              skipNextDraftSave.current = true;
              setFormData(INITIAL_FORM_DATA);
              setOverrideMonthlyRent(false);
              setErrors({});
              setStep(1);
              setIsDirty(false);
            }}
          >
            Discard draft
          </button>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {step === 1 && (
          <>
            <SectionCard
              title="Personal Information"
              description="Required identity details for the tenant account. Fields marked * are required."
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField label="First Name" htmlFor="firstName" required error={errors.firstName}>
                  <Input
                    type="text"
                    name="firstName"
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    isInvalid={Boolean(errors.firstName)}
                    autoComplete="given-name"
                  />
                </FormField>

                <FormField label="Last Name" htmlFor="lastName" required error={errors.lastName}>
                  <Input
                    type="text"
                    name="lastName"
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    isInvalid={Boolean(errors.lastName)}
                    autoComplete="family-name"
                  />
                </FormField>

                <FormField label="Email" htmlFor="email" required error={errors.email}>
                  <Input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    isInvalid={Boolean(errors.email)}
                    autoComplete="email"
                  />
                </FormField>

                <FormField label="Phone" htmlFor="phone" error={errors.phone}>
                  <Input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    isInvalid={Boolean(errors.phone)}
                    autoComplete="tel"
                  />
                </FormField>

                <FormField label="Date of Birth" htmlFor="dateOfBirth">
                  <Input
                    type="date"
                    name="dateOfBirth"
                    id="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    min="1900-01-01"
                    max={new Date().toISOString().split('T')[0]}
                    style={{ colorScheme: 'light' }}
                  />
                </FormField>

                <FormField label="Previous Address" htmlFor="previousAddress">
                  <Input
                    type="text"
                    name="previousAddress"
                    id="previousAddress"
                    value={formData.previousAddress}
                    onChange={handleInputChange}
                  />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard
              title="Emergency Contact"
              description="Optional contact in case of emergencies."
              optional
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <FormField label="Contact Name" htmlFor="emergencyContactName">
                  <Input
                    type="text"
                    name="emergencyContactName"
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                  />
                </FormField>

                <FormField
                  label="Contact Phone"
                  htmlFor="emergencyContactPhone"
                  error={errors.emergencyContactPhone}
                >
                  <Input
                    type="tel"
                    name="emergencyContactPhone"
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    isInvalid={Boolean(errors.emergencyContactPhone)}
                  />
                </FormField>

                <FormField label="Relationship" htmlFor="emergencyContactRelationship">
                  <Input
                    type="text"
                    name="emergencyContactRelationship"
                    id="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={handleInputChange}
                    placeholder="e.g., Parent, Spouse, Friend"
                  />
                </FormField>
              </div>
            </SectionCard>
          </>
        )}

        {step === 2 && (
          <SectionCard
            title="Employment & Financial Information"
            description="Optional background used for screening and records."
            optional
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField label="Employment Status" htmlFor="employmentStatus">
                <Select
                  name="employmentStatus"
                  id="employmentStatus"
                  value={formData.employmentStatus || ''}
                  onChange={handleInputChange}
                >
                  <option value="">Select status</option>
                  <option value="employed">Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                  <option value="other">Other</option>
                </Select>
              </FormField>

              <FormField label="Employer Name" htmlFor="employerName">
                <Input
                  type="text"
                  name="employerName"
                  id="employerName"
                  value={formData.employerName}
                  onChange={handleInputChange}
                />
              </FormField>

              <FormField
                label="Monthly Income (₱)"
                htmlFor="monthlyIncome"
                error={errors.monthlyIncome}
              >
                <Input
                  type="number"
                  name="monthlyIncome"
                  id="monthlyIncome"
                  min={0}
                  step={0.01}
                  value={formData.monthlyIncome ?? ''}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  isInvalid={Boolean(errors.monthlyIncome)}
                />
              </FormField>
            </div>
          </SectionCard>
        )}

        {step === 3 && (
          <>
            <SectionCard
              title="Property & Room Assignment"
              description="Optional — assign now to auto-generate invoices, or do it later from the tenant page."
              optional
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  label="Property"
                  htmlFor="buildingId"
                  hint="Select a property to filter available rooms"
                >
                  <Select
                    name="buildingId"
                    id="buildingId"
                    value={formData.buildingId}
                    onChange={handleInputChange}
                    isDisabled={!Array.isArray(buildings) || buildings.length === 0}
                  >
                    <option value="">
                      {Array.isArray(buildings) && buildings.length === 0
                        ? 'Loading properties...'
                        : 'Select a property'}
                    </option>
                    {Array.isArray(buildings) &&
                      buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.name}
                        </option>
                      ))}
                  </Select>
                </FormField>

                <FormField
                  label="Room"
                  htmlFor="roomId"
                  hint={
                    !formData.buildingId
                      ? 'Select a property first'
                      : formData.roomId
                        ? 'Invoices will be auto-generated after tenant creation'
                        : 'You can assign a room later from the tenant detail page'
                  }
                >
                  <Select
                    name="roomId"
                    id="roomId"
                    value={formData.roomId}
                    onChange={handleInputChange}
                    isDisabled={!formData.buildingId || !filteredRooms.length}
                    className={
                      !formData.buildingId || !filteredRooms.length
                        ? 'bg-gray-50 text-gray-400'
                        : undefined
                    }
                  >
                    <option value="">
                      {!formData.buildingId
                        ? 'Select a property first'
                        : !filteredRooms.length
                          ? 'No available rooms in this property'
                          : 'Select a room'}
                    </option>
                    {filteredRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber} (₱
                        {Number(room.monthlyRate).toLocaleString()}/month)
                      </option>
                    ))}
                  </Select>
                </FormField>

                {formData.roomId && (
                  <div className="sm:col-span-2 rounded-md border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-sm font-medium text-gray-900">Auto-invoicing enabled</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Creating this tenant with a room will generate the advance invoice and monthly
                      invoices for the lease period (pending status).
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Rent & Payment Details"
              description="Defaults below match common 1-month deposit + 1-month advance practice."
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  label="Monthly Rent (₱)"
                  htmlFor="monthlyRent"
                  required={Boolean(formData.roomId)}
                  error={errors.monthlyRent}
                  hint={
                    rentDisabled
                      ? "Check 'Override monthly rent' to enter a custom rate, or select a room to use its rate."
                      : rentLocked
                        ? "Using the selected room's rate. Check 'Override monthly rent' to set a custom amount."
                        : 'Enter amount in Philippine Pesos'
                  }
                  className="sm:col-span-2 lg:col-span-3"
                >
                  <Checkbox
                    id="overrideMonthlyRent"
                    checked={overrideMonthlyRent}
                    onChange={(e) => {
                      setOverrideMonthlyRent(e.target.checked);
                      markDirty();
                      if (!e.target.checked && formData.roomId) {
                        const selectedRoom = rooms.find((r) => r.id === formData.roomId);
                        if (selectedRoom) {
                          setFormData((prev) => ({
                            ...prev,
                            monthlyRent: Number(selectedRoom.monthlyRate),
                          }));
                        }
                      }
                    }}
                    label="Override monthly rent"
                    className="mb-2"
                  />
                  <Input
                    type="number"
                    name="monthlyRent"
                    id="monthlyRent"
                    min={0}
                    step={1}
                    value={formData.monthlyRent ?? ''}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    isDisabled={rentDisabled || rentLocked}
                    isInvalid={Boolean(errors.monthlyRent)}
                    placeholder={rentDisabled ? 'Select a room or enable override' : 'e.g., 5000'}
                    className={
                      rentDisabled || rentLocked
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : undefined
                    }
                  />
                </FormField>

                <FormField
                  label="Deposit Months"
                  htmlFor="depositMonths"
                  required
                  error={errors.depositMonths}
                  hint={
                    hasRentForTotal
                      ? `Deposit: ₱${computedDeposit.toLocaleString()}`
                      : 'Enter any number of months (default 1)'
                  }
                >
                  <Input
                    type="number"
                    name="depositMonths"
                    id="depositMonths"
                    min={0}
                    step={0.5}
                    value={formData.depositMonths}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    isInvalid={Boolean(errors.depositMonths)}
                    placeholder="e.g., 1"
                  />
                  {depositRaisedToMinimum && (
                    <p className="mt-1 text-xs text-amber-700">
                      Building minimum of ₱{MINIMUM_DEPOSIT_AMOUNT.toLocaleString()} will be charged
                      on assign
                    </p>
                  )}
                </FormField>

                <FormField
                  label="Advance Months"
                  htmlFor="advanceMonths"
                  required
                  error={errors.advanceMonths}
                  hint={
                    hasRentForTotal
                      ? `Advance: ₱${computedAdvance.toLocaleString()}`
                      : 'Enter any number of months (default 1)'
                  }
                >
                  <Input
                    type="number"
                    name="advanceMonths"
                    id="advanceMonths"
                    min={0}
                    step={0.5}
                    value={formData.advanceMonths}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    isInvalid={Boolean(errors.advanceMonths)}
                    placeholder="e.g., 1"
                  />
                </FormField>

                <div className="flex flex-col justify-center rounded-md border border-gray-200 bg-gray-50 p-4">
                  {hasRentForTotal ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          Total Initial Payment
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ₱{(effectiveDeposit + computedAdvance).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        (₱{(formData.monthlyRent || 0).toLocaleString()} × {formData.depositMonths}{' '}
                        month{formData.depositMonths !== 1 ? 's' : ''} deposit
                        {depositRaisedToMinimum
                          ? ` → ₱${MINIMUM_DEPOSIT_AMOUNT.toLocaleString()} min`
                          : ''}
                        ) + (₱{(formData.monthlyRent || 0).toLocaleString()} ×{' '}
                        {formData.advanceMonths} month{formData.advanceMonths !== 1 ? 's' : ''}{' '}
                        advance)
                      </p>
                      {depositRaisedToMinimum && (
                        <p className="mt-2 text-xs text-amber-800">
                          Room rent × deposit months is below the ₱
                          {MINIMUM_DEPOSIT_AMOUNT.toLocaleString()} building minimum. Create Tenant
                          will charge ₱{MINIMUM_DEPOSIT_AMOUNT.toLocaleString()} deposit so
                          assignment can proceed.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Enter rent details to see total initial payment.
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Lease Information"
              description={
                formData.roomId
                  ? 'Pick start date and duration — end date updates automatically.'
                  : 'Optional until a room is assigned. End date updates from start + duration.'
              }
              optional={!formData.roomId}
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  label="Lease Start Date"
                  htmlFor="leaseStartDate"
                  required={Boolean(formData.roomId)}
                  error={errors.leaseStartDate}
                  hint="Cannot be earlier than today"
                >
                  <Input
                    type="date"
                    name="leaseStartDate"
                    id="leaseStartDate"
                    value={formData.leaseStartDate}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    min={todayISO}
                    max="2099-12-31"
                    isInvalid={Boolean(errors.leaseStartDate)}
                    style={{ colorScheme: 'light' }}
                  />
                </FormField>

                <FormField
                  label="Lease Duration"
                  htmlFor="leaseDurationMonths"
                  required={Boolean(formData.roomId)}
                  hint={
                    isCustomDuration
                      ? 'Enter the month count in the field that appears below'
                      : 'Presets auto-set the end date. Choose Custom for other lengths.'
                  }
                >
                  <Select
                    name="leaseDurationMonths"
                    id="leaseDurationMonths"
                    value={formData.leaseDurationMonths}
                    onChange={handleInputChange}
                  >
                    {LEASE_DURATION_PRESETS.map((months) => (
                      <option key={months} value={months}>
                        {months} month{months !== 1 ? 's' : ''}
                        {months === 12 ? ' (default)' : ''}
                      </option>
                    ))}
                    <option value="0">Custom</option>
                    <option value="-1">Open-ended</option>
                  </Select>
                </FormField>

                {isCustomDuration ? (
                  <FormField
                    label="Custom Duration (months)"
                    htmlFor="customLeaseMonths"
                    required
                    error={errors.customLeaseMonths}
                    hint="End date updates from start + this many months"
                  >
                    <Input
                      type="number"
                      name="customLeaseMonths"
                      id="customLeaseMonths"
                      min={1}
                      step={1}
                      value={formData.customLeaseMonths ?? ''}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      isInvalid={Boolean(errors.customLeaseMonths)}
                      placeholder="e.g., 9"
                    />
                  </FormField>
                ) : null}

                <FormField
                  label="Lease End Date"
                  htmlFor="leaseEndDate"
                  required={Boolean(formData.roomId) && !isOpenEndedLease}
                  hint={
                    isOpenEndedLease
                      ? 'Open-ended — no end date'
                      : leaseEndDateLocked && formData.leaseEndDate
                        ? `Auto-set for ${effectiveLeaseMonths} month${
                            effectiveLeaseMonths !== 1 ? 's' : ''
                          } from start`
                        : isCustomDuration
                          ? 'Enter custom months above to calculate end date'
                          : 'Select a start date to calculate end date'
                  }
                >
                  <Input
                    type="date"
                    name="leaseEndDate"
                    id="leaseEndDate"
                    value={formData.leaseEndDate}
                    onChange={handleInputChange}
                    min={formData.leaseStartDate || todayISO}
                    max="2099-12-31"
                    isDisabled={leaseEndDateLocked || isOpenEndedLease}
                    className={
                      leaseEndDateLocked || isOpenEndedLease
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : undefined
                    }
                    style={{ colorScheme: 'light' }}
                  />
                </FormField>

                <FormField
                  label="Move In Date"
                  htmlFor="moveInDate"
                  error={errors.moveInDate}
                  hint={
                    formData.leaseStartDate
                      ? isOpenEndedLease
                        ? 'From lease start onward'
                        : formData.leaseEndDate
                          ? 'Between lease start and end date'
                          : 'On or after lease start date'
                      : 'Defaults to lease start date; you can change it'
                  }
                >
                  <Input
                    type="date"
                    name="moveInDate"
                    id="moveInDate"
                    value={formData.moveInDate}
                    onChange={handleInputChange}
                    min={formData.leaseStartDate || todayISO}
                    max={
                      isOpenEndedLease
                        ? '2099-12-31'
                        : formData.leaseEndDate || '2099-12-31'
                    }
                    isInvalid={Boolean(errors.moveInDate)}
                    style={{ colorScheme: 'light' }}
                  />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Additional Information" optional>
              <FormField label="Notes" htmlFor="notes">
                <Textarea
                  name="notes"
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Any additional notes about this tenant..."
                />
              </FormField>
            </SectionCard>
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={handleCancel} isDisabled={loading}>
            Cancel
          </Button>

          <div className="flex gap-3">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack} isDisabled={loading}>
                Previous
              </Button>
            )}
            {step < 3 ? (
              <Button type="submit" isDisabled={loading || checkingEmail} isLoading={checkingEmail}>
                {checkingEmail ? 'Checking email...' : 'Continue'}
              </Button>
            ) : (
              <Button type="submit" isLoading={loading || checkingEmail}>
                {loading ? 'Creating...' : 'Create Tenant'}
              </Button>
            )}
          </div>
        </div>
      </form>

      <Dialog
        isOpen={Boolean(credentialsModal)}
        onClose={handleCredentialsModalContinue}
        title="Tenant account created"
        description="Save these login details before continuing."
        size="sm"
        footer={
          <Button type="button" onClick={handleCredentialsModalContinue}>
            Continue to tenant
          </Button>
        }
      >
        {credentialsModal && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</p>
              <p className="mt-1 break-all text-sm font-medium text-gray-900">
                {credentialsModal.email}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Temporary password
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">
                  {credentialsModal.temporaryPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyTemporaryPassword}
                  className="shrink-0"
                >
                  {passwordCopied ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Alert variant="warning" title="Shown once">
              Copy this password now — it will not be shown again.
            </Alert>
          </div>
        )}
      </Dialog>
    </div>
  );
}
