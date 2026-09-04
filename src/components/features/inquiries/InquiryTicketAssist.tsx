'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  FileCheck2,
  FileText,
  Save,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type {
  PipelineBackgroundCheckStatus,
  PipelineBoard,
  PipelineCard,
  PipelineViewingStatus,
} from '@/types/database';
import { OpportunityDocumentsPanel } from '@/components/features/tasks/OpportunityDocumentsPanel';
import {
  amountsFromLeasePackage,
  LeasePackageSelect,
  LeasePackageSummary,
  useLeasePackageTemplates,
  type LeasePackageTemplate,
} from '@/components/features/leasing/LeasePackageFields';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';
import { PAYMENT_METHOD_SELECT_OPTIONS } from '@/lib/constants/payment-methods';
import {
  composeInquiryNotes,
  parseInquirySubmission,
} from '@/lib/inquiries';
import { computeLeaseEndDate, todayLocalISO } from '@/lib/lease-dates';
import { cn } from '@/lib/utils';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Select,
  Textarea,
} from '@/components/ui';

type AssistStep =
  | 'property'
  | 'schedule'
  | 'documents'
  | 'screening'
  | 'payment'
  | 'lease';

interface AssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
}

interface BuildingOption {
  id: string;
  name: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
  monthlyRate: number;
  buildingId: string;
}

interface InquiryTicketAssistProps {
  card: PipelineCard;
  board: PipelineBoard;
  assignees: AssigneeOption[];
  onClose: () => void;
  onSaved: (card?: PipelineCard) => void;
  onOpenFullRecord: () => void;
}

const STEPS: Array<{
  id: AssistStep;
  label: string;
  icon: typeof Building2;
}> = [
  { id: 'property', label: 'Property', icon: Building2 },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'screening', label: 'Screening', icon: ShieldCheck },
  { id: 'payment', label: 'Payment', icon: Wallet },
  { id: 'lease', label: 'Lease', icon: FileCheck2 },
];

function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultStep(card: PipelineCard): AssistStep {
  const slug = card.stageSlug || '';
  if (slug === 'viewing_scheduled' || slug === 'viewing_done') return 'schedule';
  if (slug === 'documents' || slug === 'application') return 'documents';
  if (slug === 'background_check') return 'screening';
  if (slug === 'payment') return 'payment';
  if (slug === 'awaiting_signature' || slug === 'lease_signed') return 'lease';
  if (card.buildingId && card.roomId) return 'schedule';
  return 'property';
}

function money(value: number): string {
  return value.toLocaleString('en-PH');
}

export function InquiryTicketAssist({
  card,
  board,
  assignees,
  onClose,
  onSaved,
  onOpenFullRecord,
}: InquiryTicketAssistProps) {
  const { showNotification } = useNotifications();
  const { packages, loading: packagesLoading } = useLeasePackageTemplates();
  const stages = board.stages || [];
  const submission = useMemo(() => parseInquirySubmission(card), [card]);
  const leased = Boolean(card.assignmentId);
  const todayISO = todayLocalISO();

  const [step, setStep] = useState<AssistStep>(() => defaultStep(card));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [generatingLease, setGeneratingLease] = useState(false);

  const [stageId, setStageId] = useState(card.stageId);
  const [assignedTo, setAssignedTo] = useState(card.assignedTo || '');
  const [officeNotes, setOfficeNotes] = useState(submission.officeNotes);
  const [email, setEmail] = useState(card.contactEmail || '');
  const [phone, setPhone] = useState(card.contactPhone || '');
  const [buildingId, setBuildingId] = useState(card.buildingId || '');
  const [roomId, setRoomId] = useState(card.roomId || '');
  const [amount, setAmount] = useState(
    card.amount != null && Number.isFinite(Number(card.amount)) ? String(card.amount) : ''
  );
  const [viewingAt, setViewingAt] = useState(toDatetimeLocal(card.viewingAt));
  const [viewingStatus, setViewingStatus] = useState<PipelineViewingStatus | ''>(
    card.viewingStatus || ''
  );
  const [backgroundCheckStatus, setBackgroundCheckStatus] =
    useState<PipelineBackgroundCheckStatus>(card.backgroundCheckStatus || 'not_started');
  const [backgroundCheckNotes, setBackgroundCheckNotes] = useState(
    card.backgroundCheckNotes || ''
  );
  const [leasePackageTemplateId, setLeasePackageTemplateId] = useState(
    card.leasePackageTemplateId || ''
  );
  const [leaseStartDate, setLeaseStartDate] = useState(toDateInput(card.leaseStartDate));
  const [leaseEndDate, setLeaseEndDate] = useState(toDateInput(card.leaseEndDate));
  const [moveInDate, setMoveInDate] = useState(
    toDateInput(card.moveInDate) || toDateInput(card.leaseStartDate)
  );
  const [depositAmount, setDepositAmount] = useState(
    card.depositAmount != null ? String(card.depositAmount) : ''
  );
  const [advanceAmount, setAdvanceAmount] = useState(
    card.advanceAmount != null ? String(card.advanceAmount) : ''
  );
  const [moveInPaymentStatus, setMoveInPaymentStatus] = useState<'unpaid' | 'paid'>(
    card.moveInPaymentStatus === 'paid' ? 'paid' : 'unpaid'
  );
  const [moveInPaymentDate, setMoveInPaymentDate] = useState(
    toDateInput(card.moveInPaidAt) || todayISO
  );
  const [moveInPaymentMethod, setMoveInPaymentMethod] = useState(
    card.moveInPaymentMethod || 'cash'
  );

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  useEffect(() => {
    void fetch('/api/buildings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setBuildings(
            (json.data?.buildings || []).map((row: { id: string; name: string }) => ({
              id: row.id,
              name: row.name,
            }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!buildingId) {
      setRooms([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams({
        buildingId,
        roomStatus: 'vacant',
        excludePipelineHeld: '1',
        excludeCardId: card.id,
      });
      const res = await fetch(`/api/rooms?${params.toString()}`);
      const json = await res.json();
      if (cancelled || !json.success) return;
      const list: RoomOption[] = (json.data || []).map(
        (row: { id: string; roomNumber: string; monthlyRate: number; buildingId: string }) => ({
          id: row.id,
          roomNumber: row.roomNumber,
          monthlyRate: Number(row.monthlyRate),
          buildingId: row.buildingId,
        })
      );
      if (card.roomId && card.buildingId === buildingId && !list.some((row) => row.id === card.roomId)) {
        list.unshift({
          id: card.roomId,
          roomNumber: `${card.roomNumber || 'Current'} (current)`,
          monthlyRate: Number(card.amount || 0),
          buildingId,
        });
      }
      setRooms(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [buildingId, card.amount, card.buildingId, card.id, card.roomId, card.roomNumber]);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === leasePackageTemplateId) || null,
    [leasePackageTemplateId, packages]
  );
  const monthlyRent = Number(amount) || rooms.find((row) => row.id === roomId)?.monthlyRate || 0;
  const deposit = Number(depositAmount) || 0;
  const advance = Number(advanceAmount) || 0;
  const expectedTotal = deposit + advance;
  const paymentDone = leased || moveInPaymentStatus === 'paid';

  const applyPackage = (pkg: LeasePackageTemplate | null) => {
    if (!pkg) return;
    const amounts = amountsFromLeasePackage(pkg, monthlyRent);
    if (monthlyRent > 0) {
      setDepositAmount(amounts.depositAmount > 0 ? String(amounts.depositAmount) : '');
      setAdvanceAmount(amounts.advanceAmount > 0 ? String(amounts.advanceAmount) : '');
    }
    if (pkg.termMonths == null) {
      setLeaseEndDate('');
    } else if (leaseStartDate) {
      setLeaseEndDate(computeLeaseEndDate(leaseStartDate, pkg.termMonths));
    }
  };

  const patchCard = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/pipeline/cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || json.details || 'Failed to save ticket');
    }
    return json.data?.card as PipelineCard | undefined;
  };

  const buildUpdateBody = (): Record<string, unknown> => ({
    action: 'update',
    contactEmail: email.trim() || null,
    contactPhone: phone.trim() || null,
    buildingId: buildingId || null,
    roomId: roomId || null,
    amount: amount ? Number(amount) : null,
    notes: composeInquiryNotes({ ...submission, officeNotes }),
    assignedTo: assignedTo || null,
    viewingAt: viewingAt ? new Date(viewingAt).toISOString() : null,
    viewingStatus: viewingStatus || null,
    backgroundCheckStatus,
    backgroundCheckNotes: backgroundCheckNotes.trim() || null,
    leasePackageTemplateId: leasePackageTemplateId || null,
    leaseStartDate: leaseStartDate || null,
    leaseEndDate: selectedPackage?.termMonths == null ? null : leaseEndDate || null,
    moveInDate: moveInDate || leaseStartDate || null,
    depositAmount: deposit > 0 ? deposit : null,
    advanceAmount: advance > 0 ? advance : null,
    moveInPaymentStatus,
    moveInPaidAt:
      moveInPaymentStatus === 'paid' && moveInPaymentDate
        ? new Date(`${moveInPaymentDate}T12:00:00`).toISOString()
        : undefined,
    moveInPaymentMethod,
  });

  const submitSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (stageId && stageId !== card.stageId) {
        await patchCard({ action: 'move', stageId });
      }
      const updated = await patchCard(buildUpdateBody());
      showNotification({ type: 'success', title: 'Saved', message: 'Inquiry ticket updated' });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const markPaid = async () => {
    if (!buildingId || !roomId) {
      setStep('property');
      setError('Select building and room before recording payment');
      return;
    }
    if (!leasePackageTemplateId) {
      setError('Select a lease template before recording payment');
      return;
    }
    if (expectedTotal <= 0) {
      setError('Enter deposit and advance amounts greater than zero');
      return;
    }
    setSavingPayment(true);
    setError(null);
    try {
      const updated = await patchCard({
        ...buildUpdateBody(),
        moveInPaymentStatus: 'paid',
        moveInPaidAt: new Date(`${moveInPaymentDate || todayISO}T12:00:00`).toISOString(),
      });
      setMoveInPaymentStatus('paid');
      showNotification({
        type: 'success',
        title: 'Payment received',
        message: 'Move-in payment recorded on this ticket',
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark payment received');
    } finally {
      setSavingPayment(false);
    }
  };

  const generateLease = async () => {
    if (!email.trim()) {
      setStep('property');
      setError('Email is required to generate a lease');
      return;
    }
    if (!buildingId || !roomId) {
      setStep('property');
      setError('Select building and room before generating a lease');
      return;
    }
    if (moveInPaymentStatus !== 'paid') {
      setStep('payment');
      setError('Mark payment received before generating a lease');
      return;
    }
    if (!leasePackageTemplateId) {
      setError('Select a lease template before generating a lease');
      return;
    }
    if (!leaseStartDate) {
      setError('Lease start date is required');
      return;
    }
    setGeneratingLease(true);
    setError(null);
    try {
      const updated = await patchCard({
        ...buildUpdateBody(),
        contactFirstName: card.contactFirstName,
        contactLastName: card.contactLastName,
        moveInPaymentStatus: 'paid',
        leaseStatus: 'generated',
        generateLease: true,
      });
      showNotification({
        type: 'success',
        title: 'Lease generated',
        message: 'Tenant, room assignment, and lease were created from this ticket',
        duration: 10000,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate lease');
    } finally {
      setGeneratingLease(false);
    }
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 sm:p-5">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
          {STEPS.map((item) => {
            const Icon = item.icon;
            const active = step === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={cn(
                  'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium',
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Stage" htmlFor="ticket-stage">
              <Select
                id="ticket-stage"
                value={stageId}
                onChange={(event) => setStageId(event.target.value)}
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Assigned to" htmlFor="ticket-assigned">
              <Select
                id="ticket-assigned"
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
              >
                <option value="">Unassigned</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.firstName} ${user.lastName}`.trim() || user.initials}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {error ? (
            <Alert variant="danger" title="Could not continue" className="mb-4">
              {error}
            </Alert>
          ) : null}

          {step === 'property' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Email" htmlFor="ticket-email" hint="Required to generate a lease">
                <Input
                  id="ticket-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </FormField>
              <FormField label="Phone" htmlFor="ticket-phone">
                <Input
                  id="ticket-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </FormField>
              <FormField label="Building" htmlFor="ticket-building">
                <Select
                  id="ticket-building"
                  value={buildingId}
                  disabled={leased}
                  onChange={(event) => {
                    setBuildingId(event.target.value);
                    setRoomId('');
                  }}
                >
                  <option value="">Select building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Room" htmlFor="ticket-room">
                <Select
                  id="ticket-room"
                  value={roomId}
                  disabled={leased || !buildingId}
                  onChange={(event) => {
                    const next = event.target.value;
                    setRoomId(next);
                    const room = rooms.find((row) => row.id === next);
                    if (room?.monthlyRate) setAmount(String(room.monthlyRate));
                  }}
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomNumber} — ₱{money(room.monthlyRate)}/mo
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Monthly rent (₱)" htmlFor="ticket-rent" className="sm:col-span-2">
                <Input
                  id="ticket-rent"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  disabled={leased}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </FormField>
            </div>
          )}

          {step === 'schedule' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Viewing date & time"
                htmlFor="ticket-viewing"
                hint="Saving a viewing date moves this ticket to Viewing scheduled"
              >
                <Input
                  id="ticket-viewing"
                  type="datetime-local"
                  value={viewingAt}
                  onChange={(event) => setViewingAt(event.target.value)}
                />
              </FormField>
              <FormField label="Viewing status" htmlFor="ticket-viewing-status">
                <Select
                  id="ticket-viewing-status"
                  value={viewingStatus}
                  onChange={(event) =>
                    setViewingStatus(event.target.value as PipelineViewingStatus | '')
                  }
                >
                  <option value="">Not set</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="no_show">No-show</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormField>
            </div>
          )}

          {step === 'documents' && (
            <OpportunityDocumentsPanel
              cardId={card.id}
              buildingId={buildingId || undefined}
              roomId={roomId || undefined}
            />
          )}

          {step === 'screening' && (
            <div className="grid grid-cols-1 gap-4">
              <FormField label="ID verification / screening" htmlFor="ticket-screening">
                <Select
                  id="ticket-screening"
                  value={backgroundCheckStatus}
                  onChange={(event) =>
                    setBackgroundCheckStatus(
                      event.target.value as PipelineBackgroundCheckStatus
                    )
                  }
                >
                  <option value="not_started">Not started</option>
                  <option value="pending">Approval pending</option>
                  <option value="approved">Approved</option>
                  <option value="failed">Failed / declined</option>
                </Select>
              </FormField>
              <FormField label="Screening notes" htmlFor="ticket-screening-notes">
                <Textarea
                  id="ticket-screening-notes"
                  rows={4}
                  value={backgroundCheckNotes}
                  onChange={(event) => setBackgroundCheckNotes(event.target.value)}
                  placeholder="ID received / awaiting employer verification…"
                />
              </FormField>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              {!buildingId || !roomId ? (
                <Alert variant="warning" title="Property needed">
                  Select a building and room under Property first.
                </Alert>
              ) : null}
              {paymentDone ? (
                <Alert variant="success" title="Move-in payment confirmed">
                  Total ₱{money(expectedTotal)} · Deposit ₱{money(deposit)} · Advance ₱
                  {money(advance)}
                </Alert>
              ) : null}
              <FormField label="Lease template" htmlFor="ticket-pay-package" required>
                <LeasePackageSelect
                  id="ticket-pay-package"
                  value={leasePackageTemplateId}
                  packages={packages}
                  loading={packagesLoading}
                  disabled={leased}
                  onChange={(id, pkg) => {
                    setLeasePackageTemplateId(id);
                    applyPackage(pkg);
                  }}
                />
              </FormField>
              {selectedPackage ? <LeasePackageSummary template={selectedPackage} /> : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Deposit (₱)" htmlFor="ticket-deposit">
                  <Input
                    id="ticket-deposit"
                    type="number"
                    min={0}
                    step="0.01"
                    value={depositAmount}
                    disabled={leased || paymentDone}
                    onChange={(event) => setDepositAmount(event.target.value)}
                  />
                </FormField>
                <FormField label="Advance rent (₱)" htmlFor="ticket-advance">
                  <Input
                    id="ticket-advance"
                    type="number"
                    min={0}
                    step="0.01"
                    value={advanceAmount}
                    disabled={leased || paymentDone}
                    onChange={(event) => setAdvanceAmount(event.target.value)}
                  />
                </FormField>
                <FormField label="Payment date" htmlFor="ticket-pay-date">
                  <Input
                    id="ticket-pay-date"
                    type="date"
                    value={moveInPaymentDate}
                    disabled={leased || paymentDone}
                    onChange={(event) => setMoveInPaymentDate(event.target.value)}
                  />
                </FormField>
                <FormField label="Method" htmlFor="ticket-pay-method">
                  <Select
                    id="ticket-pay-method"
                    value={moveInPaymentMethod}
                    disabled={leased || paymentDone}
                    onChange={(event) => setMoveInPaymentMethod(event.target.value)}
                  >
                    {PAYMENT_METHOD_SELECT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
              {!leased && (
                <Checkbox
                  id="ticket-payment-received"
                  checked={moveInPaymentStatus === 'paid'}
                  isDisabled={savingPayment || paymentDone}
                  onChange={(event) => {
                    if (event.target.checked) void markPaid();
                  }}
                  label={<span className="font-medium text-gray-900">Payment received</span>}
                />
              )}
            </div>
          )}

          {step === 'lease' && (
            <div className="space-y-4">
              {leased ? (
                <Alert variant="success" title="Lease generated">
                  This ticket is linked to a tenant and lease.
                  <span className="mt-2 flex flex-wrap gap-3">
                    {card.assignmentId ? (
                      <Link
                        href={`/admin/leasing/${card.assignmentId}`}
                        className="font-medium underline"
                      >
                        Open lease
                      </Link>
                    ) : null}
                    {card.tenantId ? (
                      <Link
                        href={`/admin/tenants/${card.tenantId}`}
                        className="font-medium underline"
                      >
                        Open tenant
                      </Link>
                    ) : null}
                  </span>
                </Alert>
              ) : !paymentDone ? (
                <Alert variant="warning" title="Payment first">
                  Mark Payment received before Generate lease.
                </Alert>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Lease start date" htmlFor="ticket-lease-start" required>
                  <Input
                    id="ticket-lease-start"
                    type="date"
                    min={todayISO}
                    value={leaseStartDate}
                    disabled={leased}
                    onChange={(event) => {
                      const start = event.target.value;
                      setLeaseStartDate(start);
                      setMoveInDate((prev) => (!prev || prev === leaseStartDate ? start : prev));
                      if (selectedPackage?.termMonths) {
                        setLeaseEndDate(computeLeaseEndDate(start, selectedPackage.termMonths));
                      }
                    }}
                  />
                </FormField>
                <FormField label="Lease template" htmlFor="ticket-lease-package" required>
                  <LeasePackageSelect
                    id="ticket-lease-package"
                    value={leasePackageTemplateId}
                    packages={packages}
                    loading={packagesLoading}
                    disabled={leased}
                    onChange={(id, pkg) => {
                      setLeasePackageTemplateId(id);
                      applyPackage(pkg);
                    }}
                  />
                </FormField>
                <FormField
                  label="Lease end date"
                  htmlFor="ticket-lease-end"
                  hint={
                    selectedPackage?.termMonths == null
                      ? 'Open-ended — no end date'
                      : 'From the selected template'
                  }
                >
                  <Input
                    id="ticket-lease-end"
                    type="date"
                    value={leaseEndDate}
                    disabled
                    readOnly
                  />
                </FormField>
                <FormField label="Move-in date" htmlFor="ticket-move-in">
                  <Input
                    id="ticket-move-in"
                    type="date"
                    min={leaseStartDate || todayISO}
                    value={moveInDate}
                    disabled={leased}
                    onChange={(event) => setMoveInDate(event.target.value)}
                  />
                </FormField>
              </div>
              {selectedPackage ? <LeasePackageSummary template={selectedPackage} /> : null}
              {!leased && (
                <Button
                  type="button"
                  onClick={() => void generateLease()}
                  isLoading={generatingLease}
                  isDisabled={generatingLease || !paymentDone}
                >
                  {generatingLease ? 'Generating…' : 'Generate lease'}
                </Button>
              )}
            </div>
          )}

          <FormField
            label="Office notes"
            htmlFor="ticket-notes"
            className="mt-4"
            hint="Internal follow-up. The message they sent is in the header above."
          >
            <Textarea
              id="ticket-notes"
              value={officeNotes}
              onChange={(event) => setOfficeNotes(event.target.value)}
              rows={4}
              placeholder="Call back Thursday, send viewing confirmation…"
            />
          </FormField>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onOpenFullRecord}>
            Edit full record
          </Button>
          <Link
            href={`/admin/tasks?board=onboarding&card=${encodeURIComponent(card.id)}`}
            className="inline-flex"
          >
            <Button type="button" variant="outline">
              Open on board
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-shrink-0 justify-end gap-2 border-t border-gray-200 bg-white px-5 py-3 sm:px-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          leftIcon={<Save className="h-4 w-4" />}
          onClick={() => void submitSave()}
          isLoading={isSaving}
          isDisabled={isSaving || generatingLease || savingPayment}
        >
          Save Changes
        </Button>
      </div>
    </>
  );
}
