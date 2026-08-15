'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Upload } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/forms/FormField';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { InvoiceStatusBadge } from '@/components/domain/StatusBadges';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import { PAYMENT_METHOD_SELECT_OPTIONS } from '@/lib/constants/payment-methods';
import { cn } from '@/lib/utils';

interface ProcessInvoice {
  id: string;
  invoiceNumber: string;
  dueDate: string | null;
  typeLabel: string;
  amountDue: number;
  status: string;
}

interface RecentPayment {
  id: string;
  amount: number;
  paymentDate: string;
  receiptNumber: string;
}

interface ProcessTenant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  buildingName?: string | null;
  roomNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  leaseTermMonths?: number | null;
}

interface ProcessPaymentClientProps {
  initialTenantId?: string;
  initialInvoiceId?: string;
  initialAmount?: string;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function paymentTypeFromInvoiceLabel(typeLabel?: string | null): string {
  const label = (typeLabel || '').toLowerCase();
  if (label.includes('util')) return 'utility';
  if (label.includes('deposit')) return 'deposit';
  if (label.includes('advance')) return 'advance';
  if (label.includes('penalt')) return 'late_fee';
  return 'rent';
}

export default function ProcessPaymentClient({
  initialTenantId = '',
  initialInvoiceId = '',
  initialAmount = '',
}: ProcessPaymentClientProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();

  const [loading, setLoading] = useState(Boolean(initialTenantId));
  const [tenant, setTenant] = useState<ProcessTenant | null>(null);
  const [invoices, setInvoices] = useState<ProcessInvoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId);
  const [orNumber, setOrNumber] = useState('');
  const [orDate, setOrDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [amountReceived, setAmountReceived] = useState(initialAmount);
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [emailReceipt, setEmailReceipt] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewingReceipt, setPreviewingReceipt] = useState(false);
  const [tenantPickerId, setTenantPickerId] = useState(initialTenantId);
  const [pickerBuildingId, setPickerBuildingId] = useState('');
  const [pickerRoomId, setPickerRoomId] = useState('');
  const [buildingOptions, setBuildingOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [roomOptions, setRoomOptions] = useState<
    Array<{ id: string; roomNumber: string; roomStatus?: string }>
  >([]);
  const [tenantOptions, setTenantOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [loadingPickerTenants, setLoadingPickerTenants] = useState(false);

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => inv.id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId]
  );

  const inferredPaymentType = paymentTypeFromInvoiceLabel(
    selectedInvoice?.typeLabel
  );

  const loadContext = useCallback(
    async (
      tenantId: string,
      preferInvoiceId?: string,
      paymentTypeHint = 'rent'
    ) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/payments/process-context?tenantId=${encodeURIComponent(tenantId)}&paymentType=${encodeURIComponent(paymentTypeHint)}`,
          { credentials: 'include' }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load payment context');
        }
        const data = json.data;
        setTenant(data.tenant);
        setInvoices(data.invoices || []);
        setRecentPayments(data.recentPayments || []);
        if (data.nextOrNumber) {
          setOrNumber(String(data.nextOrNumber));
        }

        const nextInvoiceId =
          preferInvoiceId &&
          data.invoices.some((inv: ProcessInvoice) => inv.id === preferInvoiceId)
            ? preferInvoiceId
            : data.invoices[0]?.id || '';
        setSelectedInvoiceId(nextInvoiceId);

        const chosen = data.invoices.find(
          (inv: ProcessInvoice) => inv.id === nextInvoiceId
        );
        if (chosen && (!initialAmount || preferInvoiceId === chosen.id)) {
          setAmountReceived(String(Number(chosen.amountDue).toFixed(2)));
        } else if (chosen && !amountReceived) {
          setAmountReceived(String(Number(chosen.amountDue).toFixed(2)));
        }
      } catch (err) {
        showNotification({
          type: 'error',
          title: 'Unable to load',
          message: err instanceof Error ? err.message : 'Failed to load tenant',
        });
      } finally {
        setLoading(false);
      }
    },
    [amountReceived, initialAmount, showNotification]
  );

  useEffect(() => {
    if (initialTenantId) {
      void loadContext(initialTenantId, initialInvoiceId);
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/buildings?limit=200', {
          credentials: 'include',
        });
        const json = await res.json();
        const list = Array.isArray(json.buildings)
          ? json.buildings
          : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.data?.buildings)
              ? json.data.buildings
              : [];
        setBuildingOptions(
          (Array.isArray(list) ? list : []).map(
            (b: { id: string; name?: string }) => ({
              id: String(b.id),
              name: String(b.name || 'Property'),
            })
          )
        );
      } catch {
        setBuildingOptions([]);
      }
    })();
  }, [initialInvoiceId, initialTenantId, loadContext]);

  useEffect(() => {
    if (initialTenantId) return;
    if (!pickerBuildingId) {
      setRoomOptions([]);
      setPickerRoomId('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/rooms?buildingId=${encodeURIComponent(pickerBuildingId)}&limit=500`,
          { credentials: 'include' }
        );
        const json = await res.json();
        const list = Array.isArray(json.rooms)
          ? json.rooms
          : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.data?.rooms)
              ? json.data.rooms
              : [];
        if (cancelled) return;
        setRoomOptions(
          (Array.isArray(list) ? list : []).map(
            (r: {
              id: string;
              roomNumber?: string;
              room_number?: string;
              roomStatus?: string;
              room_status?: string;
            }) => ({
              id: String(r.id),
              roomNumber: String(r.roomNumber || r.room_number || ''),
              roomStatus: String(r.roomStatus || r.room_status || ''),
            })
          )
        );
      } catch {
        if (!cancelled) setRoomOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialTenantId, pickerBuildingId]);

  useEffect(() => {
    if (initialTenantId) return;
    if (!pickerBuildingId) {
      setTenantOptions([]);
      setTenantPickerId('');
      setLoadingPickerTenants(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingPickerTenants(true);
      try {
        const params = new URLSearchParams({
          limit: '300',
          status: 'active',
          buildingId: pickerBuildingId,
        });
        if (pickerRoomId) params.set('roomId', pickerRoomId);
        const res = await fetch(`/api/tenants?${params.toString()}`, {
          credentials: 'include',
        });
        const json = await res.json();
        const rows = json.data?.tenants || json.data || json.tenants || [];
        if (cancelled) return;
        const options = (Array.isArray(rows) ? rows : []).map(
          (t: {
            id: string;
            firstName?: string;
            lastName?: string;
            first_name?: string;
            last_name?: string;
            currentRoomNumber?: string;
            current_room_number?: string;
            currentBuildingName?: string;
            current_building_name?: string;
          }) => {
            const name =
              `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim();
            const room = t.currentRoomNumber || t.current_room_number;
            const building = t.currentBuildingName || t.current_building_name;
            const place = [room, building].filter(Boolean).join(' · ');
            return {
              id: t.id,
              label: place ? `${name} · ${place}` : name,
            };
          }
        );
        setTenantOptions(options);
        if (pickerRoomId && options.length === 1) {
          setTenantPickerId(options[0].id);
        } else if (
          tenantPickerId &&
          !options.some((o: { id: string }) => o.id === tenantPickerId)
        ) {
          setTenantPickerId('');
        }
      } catch {
        if (!cancelled) setTenantOptions([]);
      } finally {
        if (!cancelled) setLoadingPickerTenants(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when housing filters change
  }, [initialTenantId, pickerBuildingId, pickerRoomId]);

  useEffect(() => {
    if (!selectedInvoice) return;
    if (!amountReceived || amountReceived === initialAmount) {
      setAmountReceived(String(Number(selectedInvoice.amountDue).toFixed(2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when invoice changes
  }, [selectedInvoiceId]);

  useEffect(() => {
    if (!tenant?.id || !selectedInvoice) return;
    let cancelled = false;
    (async () => {
      try {
        const type = paymentTypeFromInvoiceLabel(selectedInvoice.typeLabel);
        const res = await fetch(
          `/api/payments/process-context?tenantId=${encodeURIComponent(tenant.id)}&paymentType=${encodeURIComponent(type)}`,
          { credentials: 'include' }
        );
        const json = await res.json();
        if (!cancelled && json.success && json.data?.nextOrNumber) {
          setOrNumber(String(json.data.nextOrNumber));
        }
      } catch {
        /* keep existing OR preview */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedInvoice?.typeLabel, tenant?.id]);

  const reviewAmount = Number(amountReceived) || 0;
  const amountDue = selectedInvoice?.amountDue ?? 0;

  const canSubmit =
    Boolean(tenant?.id && selectedInvoiceId && paymentDate && reviewAmount > 0);

  const handlePreviewReceipt = async () => {
    if (!tenant?.id || reviewAmount <= 0) {
      showNotification({
        type: 'error',
        title: 'Missing details',
        message: 'Select a tenant and enter an amount to preview the receipt.',
      });
      return;
    }
    setPreviewingReceipt(true);
    try {
      const res = await fetch('/api/payments/preview-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: tenant.id,
          amount: reviewAmount,
          paymentMethod,
          paymentType: inferredPaymentType,
          paymentDate,
          orNumber: orNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to generate preview');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Preview failed',
        message: err instanceof Error ? err.message : 'Unable to preview receipt',
      });
    } finally {
      setPreviewingReceipt(false);
    }
  };

  const handleConfirm = async () => {
    if (!tenant || !selectedInvoiceId || !canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: tenant.id,
          amount: reviewAmount,
          paymentType: inferredPaymentType,
          paymentMethod,
          paymentDate,
          paymentStatus: 'completed',
          notes: notes.trim() || undefined,
          // Server allocates or-{type}-{######}-{YY} (same pattern as txn)
          orDate: orDate || undefined,
          invoiceId: selectedInvoiceId,
          autoAllocate: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.details || 'Failed to record payment');
      }

      const paymentId = String(json.data?.id || '');

      if (proofFile && paymentId) {
        const form = new FormData();
        form.append('file', proofFile);
        await fetch(`/api/payments/${paymentId}/receipt`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        }).catch(() => null);
      }

      if (emailReceipt && paymentId) {
        await fetch(`/api/payments/${paymentId}/email-receipt`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => null);
      }

      showNotification({
        type: 'success',
        title: 'Successfully recorded!',
        message: 'The payment has been processed and updated.',
      });
      setConfirmOpen(false);
      router.push(`/admin/financial/payments/${paymentId}`);
      router.refresh();
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Payment failed',
        message: err instanceof Error ? err.message : 'Unable to record payment',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!initialTenantId && !tenant) {
    return (
      <div className="mx-auto max-w-lg space-y-6 p-6">
        <Link
          href="/admin/financial/payments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Process Payment</h1>
        <p className="text-sm text-gray-500">
          Pick a property (and room) to narrow the tenant list quickly.
        </p>

        <FormField label="Property" htmlFor="property-pick" required>
          <Select
            id="property-pick"
            value={pickerBuildingId}
            onChange={(e) => {
              setPickerBuildingId(e.target.value);
              setPickerRoomId('');
              setTenantPickerId('');
            }}
          >
            <option value="">Select property…</option>
            {buildingOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Room"
          htmlFor="room-pick"
          hint={
            pickerBuildingId
              ? 'Optional — narrows to one unit'
              : 'Select a property first'
          }
        >
          <Select
            id="room-pick"
            value={pickerRoomId}
            disabled={!pickerBuildingId}
            onChange={(e) => {
              setPickerRoomId(e.target.value);
              setTenantPickerId('');
            }}
          >
            <option value="">All rooms in property</option>
            {roomOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomNumber}
                {r.roomStatus ? ` (${r.roomStatus})` : ''}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Tenant"
          htmlFor="tenant-pick"
          required
          hint={
            !pickerBuildingId
              ? 'Select a property to load tenants'
              : loadingPickerTenants
                ? 'Loading tenants…'
                : tenantOptions.length === 0
                  ? 'No active tenants found for this selection'
                  : `${tenantOptions.length} tenant${tenantOptions.length === 1 ? '' : 's'} found`
          }
        >
          <Select
            id="tenant-pick"
            value={tenantPickerId}
            disabled={!pickerBuildingId || loadingPickerTenants}
            onChange={(e) => setTenantPickerId(e.target.value)}
          >
            <option value="">
              {!pickerBuildingId
                ? 'Select property first…'
                : loadingPickerTenants
                  ? 'Loading…'
                  : 'Select tenant…'}
            </option>
            {tenantOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>

        <Button
          isDisabled={!tenantPickerId}
          onClick={() => {
            if (tenantPickerId) void loadContext(tenantPickerId);
          }}
        >
          Continue
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading payment details…</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/financial/payments"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Process Payment</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-8">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                1. Select invoice to pay
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Only one invoice can be selected for payment at a time.
              </p>
            </div>
            {invoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                No unpaid invoices for this tenant.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="w-10 px-4 py-3" />
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount Due</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Invoice No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((inv) => {
                      const checked = inv.id === selectedInvoiceId;
                      return (
                        <tr
                          key={inv.id}
                          className={cn(
                            'cursor-pointer hover:bg-gray-50/80',
                            checked && 'bg-blue-50/40'
                          )}
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setAmountReceived(String(Number(inv.amountDue).toFixed(2)));
                          }}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="radio"
                              name="invoice"
                              checked={checked}
                              onChange={() => {
                                setSelectedInvoiceId(inv.id);
                                setAmountReceived(String(Number(inv.amountDue).toFixed(2)));
                              }}
                              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {formatDate(inv.dueDate)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{inv.typeLabel}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatCurrency(inv.amountDue)}
                          </td>
                          <td className="px-4 py-3">
                            <InvoiceStatusBadge status={inv.status} />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/financial/invoices/${inv.id}`}
                              className="font-semibold text-indigo-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              #{inv.invoiceNumber}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                2. Enter payment details
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Input the payment amount and confirm payment method.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="OR No."
                    htmlFor="or-no"
                    hint="Auto-generated like txn ids (or-r-000001-26). Final number is assigned when you confirm."
                  >
                    <Input
                      id="or-no"
                      value={orNumber}
                      readOnly
                      className="font-mono bg-gray-50"
                      placeholder="or-r-000001-26"
                    />
                  </FormField>
                  <FormField label="OR Date" htmlFor="or-date">
                    <Input
                      id="or-date"
                      type="date"
                      value={orDate}
                      onChange={(e) => setOrDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Mode of Payment" htmlFor="pay-method" required>
                    <Select
                      id="pay-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {PAYMENT_METHOD_SELECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Payment Date" htmlFor="pay-date" required>
                    <Input
                      id="pay-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </FormField>
                </div>
                <FormField label="Amount Received" htmlFor="amount" required>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500">
                      ₱
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      min={0}
                      step="0.01"
                      className="pl-8 pr-14"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-medium text-gray-500">
                      PHP
                    </span>
                  </div>
                </FormField>
                <FormField label="Notes (optional)" htmlFor="notes">
                  <Textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="agreements on late payments"
                  />
                </FormField>
                <FormField label="Upload Proof of Payment (optional)" htmlFor="proof">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <TakePhotoButton
                        label="Take photo"
                        fileNamePrefix="payment-proof"
                        description="Allow camera access if prompted, then capture the proof of payment."
                        onCapture={(file) => setProofFile(file)}
                      />
                      <label htmlFor="proof">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<Upload className="h-4 w-4" />}
                          onClick={() =>
                            document.getElementById('proof')?.click()
                          }
                        >
                          Choose file
                        </Button>
                      </label>
                    </div>
                    <label
                      htmlFor="proof"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:border-gray-400 hover:bg-gray-100"
                    >
                      <Upload className="mb-2 h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-800">
                        {proofFile ? proofFile.name : 'Drop file or choose above'}
                      </span>
                      <span className="mt-1 text-xs text-gray-500">
                        JPG, PNG, PDF up to 25MB
                      </span>
                      <input
                        id="proof"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,.webp,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) =>
                          setProofFile(e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  </div>
                </FormField>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  Review Payment
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">OR No.</dt>
                    <dd className="font-medium text-gray-900">{orNumber || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">OR Date</dt>
                    <dd className="font-medium text-gray-900">
                      {formatDateLong(orDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Mode of Payment</dt>
                    <dd className="font-medium capitalize text-gray-900">
                      {paymentMethod.replace(/_/g, ' ')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Payment Date</dt>
                    <dd className="font-medium text-gray-900">
                      {formatDateLong(paymentDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-gray-200 pt-3">
                    <dt className="text-gray-500">Amount Due</dt>
                    <dd className="font-medium text-gray-900">
                      {formatCurrency(amountDue)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Amount Received</dt>
                    <dd className="font-semibold text-gray-900">
                      {formatCurrency(reviewAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Notes</dt>
                    <dd className="max-w-[60%] text-right font-medium text-gray-900">
                      {notes.trim() ? `“${notes.trim()}”` : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-4 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Checkbox
                checked={emailReceipt}
                onChange={(e) => setEmailReceipt(e.target.checked)}
                label="Send receipt to tenant via email"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Eye className="h-4 w-4" />}
                isDisabled={!tenant?.id || reviewAmount <= 0 || previewingReceipt}
                isLoading={previewingReceipt}
                onClick={() => void handlePreviewReceipt()}
              >
                Preview receipt
              </Button>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/financial/payments">
                <Button variant="outline">Back</Button>
              </Link>
              <Button
                isDisabled={!canSubmit}
                onClick={() => setConfirmOpen(true)}
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Tenant Information
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Tenant</dt>
                <dd className="font-medium text-gray-900">
                  {tenant?.firstName} {tenant?.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Property</dt>
                <dd className="font-medium text-gray-900">
                  {tenant?.buildingName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Unit</dt>
                <dd className="font-medium text-gray-900">
                  {tenant?.roomNumber ? `Unit ${tenant.roomNumber}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Start Date</dt>
                <dd className="font-medium text-gray-900">
                  {formatDateLong(tenant?.startDate)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">End Date</dt>
                <dd className="font-medium text-gray-900">
                  {formatDateLong(tenant?.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Lease Term</dt>
                <dd className="font-medium text-gray-900">
                  {tenant?.leaseTermMonths
                    ? `${tenant.leaseTermMonths} months`
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Recent Payments</h3>
              {tenant?.id && (
                <Link
                  href={`/admin/tenants/${tenant.id}?tab=financials`}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  See all
                </Link>
              )}
            </div>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-gray-500">No recent payments.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/financial/payments/${p.id}`}
                        className="truncate text-sm font-semibold text-indigo-600 hover:underline"
                      >
                        #{p.receiptNumber}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {formatDate(p.paymentDate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gray-900">
                      {formatCurrency(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          void handleConfirm();
        }}
        title="Confirm Payment"
        message="Would you like to confirm this payment? Please ensure that all details in the Review Payment section are correct before proceeding."
        confirmText="Yes, Confirm Payment"
        cancelText="Cancel"
        variant="warning"
        isLoading={submitting}
      />
    </div>
  );
}
