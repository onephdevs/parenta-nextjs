'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  CircleX,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import SectionedFormShell, {
  type SectionedFormSection,
} from '@/components/ui/SectionedFormShell';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type {
  PipelineBackgroundCheckStatus,
  PipelineBoard,
  PipelineBoardSlug,
  PipelineCard,
  PipelineLeaseStatus,
} from '@/types/database';
import {
  LEASE_DURATION_PRESETS,
  computeLeaseEndDate,
  getEffectiveLeaseMonths,
  todayLocalISO,
} from '@/lib/lease-dates';
import { OpportunityTagsField } from './OpportunityTagsField';
import { OpportunityDocumentsPanel } from './OpportunityDocumentsPanel';
import { OpportunityHistoryPanel } from './OpportunityHistoryPanel';

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

interface AddOpportunityModalProps {
  isOpen: boolean;
  board: PipelineBoard;
  /** All pipelines — used to move a card to another board */
  boards?: PipelineBoard[];
  /** When set, modal opens in edit mode with this card prefilled */
  card?: PipelineCard | null;
  onClose: () => void;
  onCreated: () => void;
  onSaved?: () => void;
  /** Called after moving to another board (receives that board's slug) */
  onMoved?: (boardSlug: string) => void;
}

type FormSection =
  | 'contact'
  | 'property'
  | 'schedule'
  | 'documents'
  | 'screening'
  | 'payment'
  | 'lease'
  | 'status'
  | 'tags'
  | 'notes'
  | 'history';

function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const onboardingSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'contact',
    label: 'Contact',
    icon: <User className="h-4 w-4" />,
    title: 'Contact information',
  },
  {
    id: 'property',
    label: 'Property',
    icon: <Building2 className="h-4 w-4" />,
    title: 'Building and room',
    subtitle: 'Unit of interest and expected rent.',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Viewing & source',
    subtitle: 'Optional viewing time and lead source.',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: <FileText className="h-4 w-4" />,
    title: 'Prospect documents',
    subtitle: 'ID, income proof, and other application files.',
  },
  {
    id: 'screening',
    label: 'Screening',
    icon: <ShieldCheck className="h-4 w-4" />,
    title: 'Background / credit check',
    subtitle: 'Track screening status before generating a lease.',
  },
  {
    id: 'payment',
    label: 'Payment',
    icon: <Wallet className="h-4 w-4" />,
    title: 'Payment details',
    subtitle: 'Enter any deposit/advance amounts, then confirm payment received.',
  },
  {
    id: 'lease',
    label: 'Lease',
    icon: <FileCheck2 className="h-4 w-4" />,
    title: 'Lease information',
    subtitle: 'Set dates, then Generate lease after payment is marked paid.',
  },
  {
    id: 'status',
    label: 'Status',
    icon: <CircleX className="h-4 w-4" />,
    title: 'Outcome & board',
    subtitle: 'Mark as lost, or move this opportunity to another pipeline.',
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: <Tag className="h-4 w-4" />,
    title: 'Tags',
    subtitle: 'Label this opportunity so you can monitor follow-ups.',
  },
];

const paymentsSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'contact',
    label: 'Tenant',
    icon: <User className="h-4 w-4" />,
    title: 'Tenant contact',
    subtitle: 'Who owes rent — confirm phone/email before you chase payment.',
  },
  {
    id: 'property',
    label: 'Lease',
    icon: <Building2 className="h-4 w-4" />,
    title: 'Unit & rent',
    subtitle: 'Building, room, and monthly amount for this follow-up.',
  },
  {
    id: 'schedule',
    label: 'Due date',
    icon: <Calendar className="h-4 w-4" />,
    title: 'When payment is due',
    subtitle: 'Set due / next action so you know when to remind or escalate.',
  },
  {
    id: 'notes',
    label: 'Follow-up',
    icon: <Wallet className="h-4 w-4" />,
    title: 'Follow-up notes',
    subtitle: 'What you said, promised, or need to do next (call, SMS, visit).',
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: <Tag className="h-4 w-4" />,
    title: 'Tags',
    subtitle: 'e.g. Partial paid, Promise-to-pay, Hard to reach.',
  },
];

const genericSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'contact',
    label: 'Basics',
    icon: <User className="h-4 w-4" />,
    title: 'Tenant information',
    subtitle: 'Name and contact details for this opportunity.',
  },
  {
    id: 'property',
    label: 'Property',
    icon: <Building2 className="h-4 w-4" />,
    title: 'Building & amount',
    subtitle: 'Link a building and tracked amount.',
  },
  {
    id: 'schedule',
    label: 'Due date',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Due date',
    subtitle: 'When this needs attention.',
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: <Tag className="h-4 w-4" />,
    title: 'Tags',
    subtitle: 'Label this opportunity so you can monitor follow-ups.',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText className="h-4 w-4" />,
    title: 'Notes',
    subtitle: 'Follow-up context.',
  },
];

const boardMoveSection: SectionedFormSection<FormSection> = {
  id: 'status',
  label: 'Board',
  icon: <CircleX className="h-4 w-4" />,
  title: 'Move to another board',
  subtitle: 'Send this card to a different pipeline.',
};

const historySection: SectionedFormSection<FormSection> = {
  id: 'history',
  label: 'History',
  icon: <History className="h-4 w-4" />,
  title: 'Opportunity history',
  subtitle: 'What changed on this card — assignments, stage moves, and updates.',
};

function sectionsForBoard(
  board: PipelineBoard,
  isEditing: boolean
): SectionedFormSection<FormSection>[] {
  if (board.slug === 'onboarding') {
    const base = isEditing
      ? onboardingSections
      : onboardingSections.filter(
          (s) =>
            s.id !== 'documents' &&
            s.id !== 'screening' &&
            s.id !== 'payment' &&
            s.id !== 'lease'
        );
    return isEditing ? [...base, historySection] : base;
  }

  const base = board.slug === 'payments' ? paymentsSections : genericSections;
  if (!isEditing) return base;

  const withBoardMove = (() => {
    const tagsIdx = base.findIndex((s) => s.id === 'tags');
    if (tagsIdx < 0) return [...base, boardMoveSection];
    return [...base.slice(0, tagsIdx), boardMoveSection, ...base.slice(tagsIdx)];
  })();

  return [...withBoardMove, historySection];
}

export function AddOpportunityModal({
  isOpen,
  board,
  boards = [],
  card = null,
  onClose,
  onCreated,
  onSaved,
  onMoved,
}: AddOpportunityModalProps) {
  const isEditing = Boolean(card?.id);
  const isOnboarding = board.slug === 'onboarding';
  const isPayments = board.slug === 'payments';
  const sections = sectionsForBoard(board, isEditing);

  const [activeSection, setActiveSection] = useState<FormSection>('contact');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');
  const [viewingAt, setViewingAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [markAsLost, setMarkAsLost] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [backgroundCheckStatus, setBackgroundCheckStatus] =
    useState<PipelineBackgroundCheckStatus>('not_started');
  const [backgroundCheckNotes, setBackgroundCheckNotes] = useState('');
  const [leaseStatus, setLeaseStatus] = useState<PipelineLeaseStatus>('not_started');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [leaseDurationMonths, setLeaseDurationMonths] = useState(12);
  const [customLeaseMonths, setCustomLeaseMonths] = useState<number | ''>('');
  const [generatingLease, setGeneratingLease] = useState(false);
  const [moveInTotalPaid, setMoveInTotalPaid] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [moveInPaymentType, setMoveInPaymentType] = useState('rent');
  const [moveInPaymentDate, setMoveInPaymentDate] = useState(() => todayLocalISO());
  const [moveInPaymentStatus, setMoveInPaymentStatus] = useState<'unpaid' | 'paid'>(
    'unpaid'
  );
  const [moveInPaymentMethod, setMoveInPaymentMethod] = useState('cash');
  const [moveInTransactionId, setMoveInTransactionId] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [moveBoardId, setMoveBoardId] = useState('');
  const [moveStageId, setMoveStageId] = useState('');
  const [movingBoard, setMovingBoard] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const todayISO = todayLocalISO();
  const isCustomDuration = leaseDurationMonths === 0;
  const isOpenEndedLease = leaseDurationMonths === -1;
  const effectiveLeaseMonths = getEffectiveLeaseMonths(
    leaseDurationMonths,
    customLeaseMonths === '' ? null : Number(customLeaseMonths)
  );

  useEffect(() => {
    if (!isOpen) return;
    setActiveSection('contact');
    setError(null);
    setMoveBoardId('');
    setMoveStageId('');
    setMoveError(null);

    if (card) {
      setFirstName(card.contactFirstName || '');
      setLastName(card.contactLastName || '');
      setEmail(card.contactEmail || '');
      setPhone(card.contactPhone || '');
      setBuildingId(card.buildingId || '');
      setRoomId(card.roomId || '');
      setSource(card.source || 'Walk-in');
      setAmount(card.amount != null ? String(card.amount) : '');
      setNotes(card.notes || '');
      setTitle(card.title || '');
      setViewingAt(toDatetimeLocal(card.viewingAt));
      setDueAt(toDatetimeLocal(card.dueAt));
      setNextActionAt(toDatetimeLocal(card.nextActionAt));
      setTags(card.tags || []);
      setMarkAsLost(
        card.cardStatus === 'lost' ||
          card.stageSlug === 'lost' ||
          (card.tags || []).some((t) => t.toLowerCase() === 'lost')
      );
      setLostReason(card.lostReason || '');
      setBackgroundCheckStatus(card.backgroundCheckStatus || 'not_started');
      setBackgroundCheckNotes(card.backgroundCheckNotes || '');
      setLeaseStatus(card.leaseStatus || 'not_started');
      setLeaseStartDate(card.leaseStartDate?.slice(0, 10) || '');
      setLeaseEndDate(card.leaseEndDate?.slice(0, 10) || '');
      setMoveInDate(card.moveInDate?.slice(0, 10) || card.leaseStartDate?.slice(0, 10) || '');
      setLeaseDurationMonths(12);
      setCustomLeaseMonths('');
      const savedDeposit = card.depositAmount != null ? Number(card.depositAmount) : null;
      const savedAdvance = card.advanceAmount != null ? Number(card.advanceAmount) : null;
      setDepositAmount(savedDeposit != null && savedDeposit > 0 ? String(savedDeposit) : '');
      setMoveInTotalPaid(
        savedDeposit != null || savedAdvance != null
          ? String((savedDeposit || 0) + (savedAdvance || 0) || '')
          : ''
      );
      setMoveInPaymentStatus(card.moveInPaymentStatus === 'paid' ? 'paid' : 'unpaid');
      setMoveInPaymentMethod(card.moveInPaymentMethod || 'cash');
      setMoveInTransactionId(card.moveInPaymentNotes || '');
      setMoveInPaymentType('rent');
      setMoveInPaymentDate(
        card.moveInPaidAt
          ? card.moveInPaidAt.slice(0, 10)
          : todayLocalISO()
      );
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setBuildingId('');
      setRoomId('');
      setSource('Walk-in');
      setAmount('');
      setNotes('');
      setTitle('');
      setViewingAt('');
      setDueAt('');
      setNextActionAt('');
      setTags([]);
      setMarkAsLost(false);
      setLostReason('');
      setBackgroundCheckStatus('not_started');
      setBackgroundCheckNotes('');
      setLeaseStatus('not_started');
      setLeaseStartDate('');
      setLeaseEndDate('');
      setMoveInDate('');
      setLeaseDurationMonths(12);
      setCustomLeaseMonths('');
      setMoveInTotalPaid('');
      setDepositAmount('');
      setMoveInPaymentStatus('unpaid');
      setMoveInPaymentMethod('cash');
      setMoveInTransactionId('');
      setMoveInPaymentType('rent');
      setMoveInPaymentDate(todayLocalISO());
    }
  }, [isOpen, board.id, card]);

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      try {
        const res = await fetch('/api/buildings');
        const json = await res.json();
        if (json.success) {
          setBuildings(
            (json.data?.buildings || []).map((b: { id: string; name: string }) => ({
              id: b.id,
              name: b.name,
            }))
          );
        }
      } catch {
        // optional for non-onboarding
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!buildingId) {
      setRooms([]);
      if (!isEditing) setRoomId('');
      return;
    }
    void (async () => {
      try {
        // Onboarding opportunities: only offer vacant rooms (no active tenant).
        // Keep the card's current room in the list when editing so saves still work.
        const params = new URLSearchParams({ buildingId });
        if (isOnboarding) {
          params.set('roomStatus', 'vacant');
        }
        const res = await fetch(`/api/rooms?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          const list: RoomOption[] = (json.data || []).map(
            (r: {
              id: string;
              roomNumber: string;
              monthlyRate: number;
              buildingId: string;
            }) => ({
              id: r.id,
              roomNumber: r.roomNumber,
              monthlyRate: Number(r.monthlyRate),
              buildingId: r.buildingId,
            })
          );

          const selectedId = roomId || card?.roomId || '';
          if (
            isOnboarding &&
            selectedId &&
            !list.some((r) => r.id === selectedId)
          ) {
            const detailRes = await fetch(`/api/rooms/${selectedId}`);
            const detailJson = await detailRes.json();
            const current = detailJson?.data;
            if (detailJson.success && current && current.buildingId === buildingId) {
              list.unshift({
                id: current.id,
                roomNumber: `${current.roomNumber} (current)`,
                monthlyRate: Number(current.monthlyRate),
                buildingId: current.buildingId,
              });
            }
          }

          setRooms(list);
          if (selectedId && !list.some((r) => r.id === selectedId)) {
            setRoomId('');
          }
        }
      } catch {
        setRooms([]);
      }
    })();
    // roomId/card intentionally omitted from deps — only reload when building changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, isEditing, isOnboarding]);

  useEffect(() => {
    if (!roomId || rooms.length === 0) return;
    // Fill opportunity value from room rent when empty (create + edit)
    setAmount((current) => {
      if (current.trim()) return current;
      const room = rooms.find((r) => r.id === roomId);
      return room ? String(room.monthlyRate) : current;
    });
  }, [roomId, rooms]);

  async function handleMoveToBoard() {
    if (!card?.id || !moveBoardId) return;
    setMovingBoard(true);
    setMoveError(null);
    try {
      const res = await fetch(`/api/pipeline/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_to_board',
          boardId: moveBoardId,
          stageId: moveStageId || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || json.details || 'Failed to move card');
      }
      const targetSlug =
        (json.data?.card?.boardSlug as string | undefined) ||
        boards.find((b) => b.id === moveBoardId)?.slug ||
        board.slug;
      onMoved?.(targetSlug);
      onClose();
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Failed to move card');
    } finally {
      setMovingBoard(false);
    }
  }

  function applyDurationToEnd(start: string, duration: number, custom: number | '') {
    const months = getEffectiveLeaseMonths(duration, custom === '' ? null : Number(custom));
    if (!start || months <= 0) return '';
    return computeLeaseEndDate(start, months);
  }

  function getMoveInSplit(overrides?: { total?: string; deposit?: string }) {
    const total = Number(overrides?.total ?? moveInTotalPaid);
    const deposit = Number(overrides?.deposit ?? depositAmount);
    const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
    const safeDeposit =
      Number.isFinite(deposit) && deposit > 0
        ? Math.min(deposit, safeTotal)
        : 0;
    const advance = Math.max(0, safeTotal - safeDeposit);
    return { total: safeTotal, deposit: safeDeposit, advance };
  }

  function buildMoveInPaymentNotes() {
    const parts: string[] = [];
    if (moveInPaymentType && moveInPaymentType !== 'rent') {
      parts.push(`Type: ${moveInPaymentType}`);
    }
    if (moveInTransactionId.trim()) {
      parts.push(moveInTransactionId.trim());
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  async function handleMarkMoveInPaid(overrides?: {
    total?: string;
    deposit?: string;
  }) {
    if (!card?.id) return;
    setError(null);

    const { total, deposit, advance } = getMoveInSplit(overrides);
    if (total <= 0) {
      setError('Enter a total amount paid greater than zero');
      return;
    }
    if (deposit > total) {
      setError('Deposit amount cannot exceed total amount paid');
      return;
    }
    if (!buildingId || !roomId) {
      setActiveSection('property');
      setError('Select building and room before recording payment');
      return;
    }
    if (!moveInPaymentDate) {
      setError('Payment date is required');
      return;
    }

    setMoveInTotalPaid(String(total));
    setDepositAmount(String(deposit));

    setSavingPayment(true);
    try {
      const res = await fetch(`/api/pipeline/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          buildingId,
          roomId,
          amount: amount.trim() !== '' ? Number(amount) : undefined,
          depositAmount: deposit,
          advanceAmount: advance,
          moveInPaymentStatus: 'paid',
          moveInPaidAt: new Date(`${moveInPaymentDate}T12:00:00`).toISOString(),
          moveInPaymentMethod,
          moveInPaymentNotes: buildMoveInPaymentNotes(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to mark payment as paid');
      }
      setMoveInPaymentStatus('paid');
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark payment as paid');
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleMarkMoveInUnpaid() {
    if (!card?.id) return;
    setSavingPayment(true);
    setError(null);
    const { deposit, advance } = getMoveInSplit();
    try {
      const res = await fetch(`/api/pipeline/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          depositAmount: deposit > 0 ? deposit : null,
          advanceAmount: advance > 0 ? advance : null,
          moveInPaymentStatus: 'unpaid',
          moveInPaymentMethod,
          moveInPaymentNotes: buildMoveInPaymentNotes(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to update payment status');
      }
      setMoveInPaymentStatus('unpaid');
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status');
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleGenerateLease() {
    if (!card?.id) return;
    setError(null);

    if (!email.trim()) {
      setActiveSection('contact');
      setError('Email is required to generate a lease');
      return;
    }
    if (!buildingId || !roomId) {
      setActiveSection('property');
      setError('Select building and room before generating a lease');
      return;
    }
    if (moveInPaymentStatus !== 'paid') {
      setActiveSection('payment');
      setError('Confirm payment under Payment before generating a lease');
      return;
    }
    if (!leaseStartDate) {
      setError('Lease start date is required');
      return;
    }
    if (!isOpenEndedLease && !leaseEndDate) {
      setError('Lease end date is required (or choose Open-ended)');
      return;
    }

    setGeneratingLease(true);
    try {
      const room = rooms.find((r) => r.id === roomId);
      const rentAmount =
        amount.trim() !== ''
          ? Number(amount)
          : room
            ? Number(room.monthlyRate)
            : null;

      const { deposit, advance } = getMoveInSplit();

      const res = await fetch(`/api/pipeline/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          contactFirstName: firstName.trim(),
          contactLastName: lastName.trim(),
          contactEmail: email.trim(),
          contactPhone: phone.trim() || null,
          buildingId,
          roomId,
          amount: rentAmount,
          depositAmount: deposit,
          advanceAmount: advance,
          moveInPaymentStatus: 'paid',
          moveInPaidAt: moveInPaymentDate
            ? new Date(`${moveInPaymentDate}T12:00:00`).toISOString()
            : undefined,
          moveInPaymentMethod,
          moveInPaymentNotes: buildMoveInPaymentNotes(),
          leaseStartDate,
          leaseEndDate: isOpenEndedLease ? null : leaseEndDate || null,
          moveInDate: moveInDate || leaseStartDate,
          leaseStatus: 'signed',
          generateLease: true,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || json.details || 'Failed to generate lease');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate lease');
    } finally {
      setGeneratingLease(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isOnboarding || board.slug === 'payments') {
        if (!firstName.trim() || !lastName.trim()) {
          setActiveSection('contact');
          throw new Error('First and last name are required');
        }
      }

      if (roomId && !buildingId) {
        setActiveSection('property');
        throw new Error('Select a building for the room');
      }

      if (markAsLost && !lostReason.trim()) {
        setActiveSection('status');
        throw new Error('Please add remarks explaining why this opportunity is lost');
      }

      if (isEditing && card) {
        const updateBody: Record<string, unknown> = {
          action: 'update',
          contactFirstName: firstName.trim(),
          contactLastName: lastName.trim(),
          contactEmail: email.trim() || null,
          contactPhone: phone.trim() || null,
          buildingId: buildingId || null,
          roomId: roomId || null,
          amount: amount ? Number(amount) : null,
          source: source || null,
          tags,
          notes: notes.trim() || null,
          viewingAt: viewingAt ? new Date(viewingAt).toISOString() : null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
          lostReason: markAsLost ? lostReason.trim() : lostReason.trim() || null,
          markAsLost,
          backgroundCheckStatus,
          backgroundCheckNotes: backgroundCheckNotes.trim() || null,
          leaseStatus,
          leaseStartDate: leaseStartDate || null,
          leaseEndDate: isOpenEndedLease ? null : leaseEndDate || null,
          moveInDate: moveInDate || leaseStartDate || null,
          depositAmount: depositAmount.trim() !== '' ? Number(depositAmount) : null,
          advanceAmount: (() => {
            const { advance } = getMoveInSplit();
            return moveInTotalPaid.trim() !== '' ? advance : null;
          })(),
          moveInPaymentStatus,
          moveInPaidAt:
            moveInPaymentStatus === 'paid' && moveInPaymentDate
              ? new Date(`${moveInPaymentDate}T12:00:00`).toISOString()
              : undefined,
          moveInPaymentMethod,
          moveInPaymentNotes: buildMoveInPaymentNotes(),
          title:
            title.trim() ||
            `${firstName.trim()} ${lastName.trim()}`.trim() ||
            card.title,
        };

        const res = await fetch(`/api/pipeline/cards/${card.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || json.details || 'Failed to save opportunity');
        }
        onSaved?.();
        onClose();
        return;
      }

      const body: Record<string, unknown> = {
        boardSlug: board.slug as PipelineBoardSlug,
        notes: notes || undefined,
        amount: amount ? Number(amount) : undefined,
        tags: tags.length > 0 ? tags : undefined,
      };

      if (isOnboarding) {
        Object.assign(body, {
          contactFirstName: firstName.trim(),
          contactLastName: lastName.trim(),
          contactEmail: email.trim() || undefined,
          contactPhone: phone.trim() || undefined,
          buildingId: buildingId || undefined,
          roomId: roomId || undefined,
          source: source || undefined,
          viewingAt: viewingAt ? new Date(viewingAt).toISOString() : undefined,
          stageSlug: markAsLost
            ? 'lost'
            : viewingAt
              ? 'viewing_scheduled'
              : 'new_inquiry',
          tags: markAsLost
            ? [...tags.filter((t) => t.toLowerCase() !== 'lost'), 'Lost']
            : tags.length > 0
              ? tags
              : undefined,
          lostReason: markAsLost ? lostReason.trim() : undefined,
        });
      } else if (board.slug === 'expenses' || board.slug === 'payments') {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        Object.assign(body, {
          title: title.trim() || fullName,
          contactFirstName: firstName.trim(),
          contactLastName: lastName.trim(),
          contactEmail: email.trim() || undefined,
          contactPhone: phone.trim() || undefined,
          buildingId: buildingId || undefined,
          roomId: roomId || undefined,
          amount: amount ? Number(amount) : undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : undefined,
          notes: notes.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        });
      } else {
        Object.assign(body, {
          title: title.trim() || `${firstName} ${lastName}`.trim() || 'Untitled',
          contactFirstName: firstName.trim() || undefined,
          contactLastName: lastName.trim() || undefined,
          contactEmail: email.trim() || undefined,
          contactPhone: phone.trim() || undefined,
        });
      }

      const res = await fetch('/api/pipeline/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || json.details || 'Failed to create opportunity');
      }
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? 'Failed to save opportunity'
            : 'Failed to create opportunity'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!card?.id) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/cards/${card.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to delete opportunity');
      }
      setShowDeleteConfirm(false);
      onSaved?.();
      onCreated();
      onClose();
    } catch (err) {
      setShowDeleteConfirm(false);
      setError(err instanceof Error ? err.message : 'Failed to delete opportunity');
    } finally {
      setIsDeleting(false);
    }
  }

  const entityLabel =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : title.trim() || (isEditing ? 'Opportunity' : 'New opportunity');

  return (
    <>
    <SectionedFormShell
      mode="dialog"
      isOpen={isOpen}
      onCancel={onClose}
      eyebrow={
        isEditing
          ? isPayments
            ? 'Payment follow-up'
            : 'Edit opportunity'
          : isPayments
            ? 'Add payment follow-up'
            : 'Add opportunity'
      }
      entityLabel={entityLabel}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      formId="add-opportunity-form"
      primaryLabel={isEditing ? 'Save changes' : 'Create opportunity'}
      primaryLoading={submitting}
      primaryDisabled={isDeleting}
      errorBanner={error ? <FormErrorBanner message={error} className="mb-6" /> : null}
      navFooter={
        isEditing ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting || submitting}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete opportunity
          </button>
        ) : undefined
      }
    >
      <form id="add-opportunity-form" onSubmit={handleSubmit} className="space-y-5">
        {isOnboarding ? (
          <>
            {activeSection === 'contact' && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField label="First name" htmlFor="opp-first-name" required>
                    <Input
                      id="opp-first-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Maria"
                    />
                  </FormField>
                  <FormField label="Last name" htmlFor="opp-last-name" required>
                    <Input
                      id="opp-last-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Lopez"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField label="Email" htmlFor="opp-email">
                    <Input
                      id="opp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maria@email.com"
                    />
                  </FormField>
                  <FormField label="Phone" htmlFor="opp-phone">
                    <Input
                      id="opp-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63…"
                    />
                  </FormField>
                </div>
                <FormField
                  label="Which unit are you interested in?"
                  htmlFor="opp-interested-building"
                  hint="Captured from the website inquiry form. Pick a specific room later under Property."
                >
                  <Select
                    id="opp-interested-building"
                    value={buildingId}
                    onChange={(e) => {
                      setBuildingId(e.target.value);
                      setRoomId('');
                    }}
                  >
                    <option value="">Not sure yet / general inquiry</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Message" htmlFor="opp-message">
                  <Textarea
                    id="opp-message"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Move-in timeline, preferred unit size, questions…"
                  />
                </FormField>
              </>
            )}

            {activeSection === 'property' && (
              <>
                <FormField
                  label="Building"
                  htmlFor="opp-building"
                  hint="Interest from the website form lands here. Room can wait until you're ready to assign one."
                >
                  <Select
                    id="opp-building"
                    value={buildingId}
                    onChange={(e) => {
                      setBuildingId(e.target.value);
                      setRoomId('');
                    }}
                  >
                    <option value="">Not sure yet / general inquiry</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  label="Room"
                  htmlFor="opp-room"
                  hint="Optional until lease generation — required before generating a lease."
                >
                  <Select
                    id="opp-room"
                    value={roomId}
                    onChange={(e) => {
                      const nextRoomId = e.target.value;
                      setRoomId(nextRoomId);
                      const room = rooms.find((r) => r.id === nextRoomId);
                      // Opportunity value = monthly rent for the selected unit
                      setAmount(room ? String(room.monthlyRate) : '');
                    }}
                    disabled={!buildingId}
                  >
                    <option value="">Select room</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} — ₱{r.monthlyRate.toLocaleString('en-PH')}/mo
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  label="Monthly rent (₱)"
                  htmlFor="opp-amount"
                  hint="Used as the opportunity value. Defaults to the room rate."
                >
                  <Input
                    id="opp-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </FormField>
              </>
            )}

            {activeSection === 'schedule' && (
              <>
                <FormField label="Source" htmlFor="opp-source">
                  <Select
                    id="opp-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option>Walk-in</option>
                    <option>FB Ad</option>
                    <option>Referral</option>
                    <option>Website</option>
                    <option>Other</option>
                  </Select>
                </FormField>
                <FormField
                  label="Viewing"
                  htmlFor="opp-viewing"
                  hint="Saving with a viewing date moves this card to Viewing scheduled and adds viewing tags."
                >
                  <Input
                    id="opp-viewing"
                    type="datetime-local"
                    value={viewingAt}
                    onChange={(e) => setViewingAt(e.target.value)}
                  />
                </FormField>
              </>
            )}

            {activeSection === 'documents' && card?.id && (
              <OpportunityDocumentsPanel
                cardId={card.id}
                buildingId={buildingId || undefined}
                roomId={roomId || undefined}
                onUploaded={async (doc) => {
                  const stageSlug =
                    doc.documentType === 'lease'
                      ? 'awaiting_signature'
                      : 'application';
                  const stage = board.stages.find((s) => s.slug === stageSlug);
                  if (stage && stage.id !== card.stageId) {
                    await fetch(`/api/pipeline/cards/${card.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'move',
                        stageId: stage.id,
                        note:
                          doc.documentType === 'lease'
                            ? 'Lease document uploaded'
                            : 'Application documents uploaded',
                      }),
                    });
                  }
                  if (doc.documentType === 'lease') {
                    setLeaseStatus((prev) =>
                      prev === 'not_started' || prev === 'generated'
                        ? 'awaiting_signature'
                        : prev
                    );
                    await fetch(`/api/pipeline/cards/${card.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'update',
                        leaseStatus: 'awaiting_signature',
                      }),
                    });
                  }
                }}
              />
            )}

            {activeSection === 'screening' && (
              <div className="space-y-5">
                <FormField label="Background / credit check" htmlFor="opp-bg-status">
                  <Select
                    id="opp-bg-status"
                    value={backgroundCheckStatus}
                    onChange={(e) =>
                      setBackgroundCheckStatus(e.target.value as PipelineBackgroundCheckStatus)
                    }
                  >
                    <option value="not_started">Not started</option>
                    <option value="pending">Approval pending</option>
                    <option value="approved">Approved</option>
                    <option value="failed">Failed / declined</option>
                  </Select>
                </FormField>
                <FormField
                  label="Screening notes"
                  htmlFor="opp-bg-notes"
                  hint="Reference number, agency, or reason for hold."
                >
                  <Textarea
                    id="opp-bg-notes"
                    rows={3}
                    value={backgroundCheckNotes}
                    onChange={(e) => setBackgroundCheckNotes(e.target.value)}
                    placeholder="Credit check submitted to… / pending employer verify…"
                  />
                </FormField>
              </div>
            )}

            {activeSection === 'payment' && (
              <div className="space-y-5">
                {!buildingId || !roomId ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Select a building and room under Property first so amounts can default from
                    monthly rent.
                  </div>
                ) : null}

                {card?.assignmentId || moveInPaymentStatus === 'paid' ? (
                  <Alert variant="success" title="Move-in payment confirmed">
                    <p className="mt-1">
                      Total ₱{Number(moveInTotalPaid || 0).toLocaleString('en-PH')}
                      {' · '}
                      Deposit ₱{Number(depositAmount || 0).toLocaleString('en-PH')}
                      {' · '}
                      To invoices ₱
                      {getMoveInSplit().advance.toLocaleString('en-PH')}
                      {moveInPaymentMethod ? ` · ${moveInPaymentMethod.replace(/_/g, ' ')}` : ''}
                    </p>
                    {!card?.assignmentId && (
                      <button
                        type="button"
                        className="mt-3 text-sm font-medium text-green-800 underline"
                        onClick={() => void handleMarkMoveInUnpaid()}
                        disabled={savingPayment}
                      >
                        Uncheck / mark as unpaid again
                      </button>
                    )}
                  </Alert>
                ) : (
                  <Alert variant="warning" title="Payment required before Generate lease">
                    Enter payment details below, then check &quot;Payment received&quot; to confirm.
                    Deposit goes to the deposit ledger; the remainder applies as advance to
                    invoices.
                  </Alert>
                )}

                <div className="grid grid-cols-6 gap-5">
                  <FormField
                    label="Total Amount Paid"
                    htmlFor="opp-total-paid"
                    required
                    hint="Total amount received from tenant"
                    className="col-span-6 sm:col-span-3"
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-medium text-gray-900">
                        ₱
                      </span>
                      <Input
                        id="opp-total-paid"
                        type="number"
                        min={0}
                        step="0.01"
                        value={moveInTotalPaid === '0' ? '' : moveInTotalPaid}
                        disabled={Boolean(card?.assignmentId)}
                        onChange={(e) => setMoveInTotalPaid(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Deposit Amount"
                    htmlFor="opp-deposit"
                    hint="Amount to add to deposit ledger (remainder goes to invoices)"
                    className="col-span-6 sm:col-span-3"
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-medium text-gray-900">
                        ₱
                      </span>
                      <Input
                        id="opp-deposit"
                        type="number"
                        min={0}
                        step="0.01"
                        value={depositAmount === '0' ? '' : depositAmount}
                        disabled={Boolean(card?.assignmentId)}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </FormField>

                  {(parseFloat(moveInTotalPaid) || 0) > 0 && (
                    <Alert variant="info" title="Payment Breakdown" className="col-span-6">
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span>To Deposit Ledger:</span>
                          <span className="ml-2 font-semibold">
                            ₱{getMoveInSplit().deposit.toLocaleString('en-PH')}
                          </span>
                        </div>
                        <div>
                          <span>To Invoice Payment:</span>
                          <span className="ml-2 font-semibold">
                            ₱{getMoveInSplit().advance.toLocaleString('en-PH')}
                          </span>
                        </div>
                      </div>
                    </Alert>
                  )}

                  <FormField
                    label="Payment Type"
                    htmlFor="opp-pay-type"
                    required
                    className="col-span-6 sm:col-span-3"
                  >
                    <Select
                      id="opp-pay-type"
                      value={moveInPaymentType}
                      disabled={Boolean(card?.assignmentId)}
                      onChange={(e) => setMoveInPaymentType(e.target.value)}
                    >
                      <option value="rent">Rent</option>
                      <option value="deposit">Deposit</option>
                      <option value="advance">Advance</option>
                      <option value="fee">Fee</option>
                      <option value="utilities">Utilities</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormField>

                  <FormField
                    label="Payment Date"
                    htmlFor="opp-pay-date"
                    required
                    className="col-span-6 sm:col-span-3"
                  >
                    <Input
                      id="opp-pay-date"
                      type="date"
                      value={moveInPaymentDate}
                      disabled={Boolean(card?.assignmentId)}
                      onChange={(e) => setMoveInPaymentDate(e.target.value)}
                      min="2000-01-01"
                      max={todayISO}
                      style={{ colorScheme: 'light' }}
                    />
                  </FormField>

                  <FormField
                    label="Payment Method"
                    htmlFor="opp-pay-method"
                    required
                    className="col-span-6 sm:col-span-3"
                  >
                    <Select
                      id="opp-pay-method"
                      value={moveInPaymentMethod}
                      disabled={Boolean(card?.assignmentId)}
                      onChange={(e) => setMoveInPaymentMethod(e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="online">Online Payment</option>
                    </Select>
                  </FormField>

                  <FormField
                    label="Transaction ID"
                    htmlFor="opp-txn-id"
                    className="col-span-6 sm:col-span-3"
                  >
                    <Input
                      id="opp-txn-id"
                      value={moveInTransactionId}
                      disabled={Boolean(card?.assignmentId)}
                      onChange={(e) => setMoveInTransactionId(e.target.value)}
                      placeholder="Optional transaction reference"
                    />
                  </FormField>
                </div>

                {!card?.assignmentId && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <Checkbox
                        id="opp-payment-received"
                        checked={moveInPaymentStatus === 'paid'}
                        disabled={savingPayment}
                        onChange={(e) => {
                          if (e.target.checked) {
                            void handleMarkMoveInPaid();
                          } else {
                            void handleMarkMoveInUnpaid();
                          }
                        }}
                        label={
                          <span className="font-medium text-gray-900">
                            Payment received — confirm as paid
                          </span>
                        }
                      />
                      <p className="mt-2 text-xs text-gray-600">
                        Enter any amounts above (admin sets the price), then check this to unlock
                        Generate lease.
                      </p>
                    </div>

                    {moveInPaymentStatus !== 'paid' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const monthly =
                            amount.trim() !== ''
                              ? Number(amount)
                              : rooms.find((r) => r.id === roomId)?.monthlyRate;
                          if (monthly) {
                            setMoveInTotalPaid(String(monthly * 2));
                            setDepositAmount(String(monthly));
                          }
                        }}
                      >
                        Suggest 1 month deposit + 1 month advance from rent
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'lease' && (
              <div className="space-y-5">
                {!buildingId || !roomId ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Select a building and room under Property first. Generate lease needs a unit to assign.
                  </div>
                ) : null}

                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Lease information</h3>
                  <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField
                      label="Lease Start Date"
                      htmlFor="opp-lease-start"
                      required
                      hint="Cannot be earlier than today"
                    >
                      <Input
                        id="opp-lease-start"
                        type="date"
                        value={leaseStartDate}
                        min={todayISO}
                        disabled={Boolean(card?.assignmentId)}
                        onChange={(e) => {
                          const start = e.target.value;
                          setLeaseStartDate(start);
                          setMoveInDate((prev) => (!prev || prev === leaseStartDate ? start : prev));
                          if (!isOpenEndedLease) {
                            setLeaseEndDate(
                              applyDurationToEnd(start, leaseDurationMonths, customLeaseMonths)
                            );
                          }
                        }}
                        style={{ colorScheme: 'light' }}
                      />
                    </FormField>

                    <FormField
                      label="Lease Duration"
                      htmlFor="opp-lease-duration"
                      hint="Presets auto-set the end date. Choose Custom for other lengths."
                    >
                      <Select
                        id="opp-lease-duration"
                        value={leaseDurationMonths}
                        disabled={Boolean(card?.assignmentId)}
                        onChange={(e) => {
                          const duration = Number(e.target.value);
                          setLeaseDurationMonths(duration);
                          if (duration === -1) {
                            setLeaseEndDate('');
                            return;
                          }
                          if (duration !== 0) {
                            setLeaseEndDate(
                              applyDurationToEnd(leaseStartDate, duration, customLeaseMonths)
                            );
                          }
                        }}
                      >
                        {LEASE_DURATION_PRESETS.map((months) => (
                          <option key={months} value={months}>
                            {months} month{months !== 1 ? 's' : ''}
                            {months === 12 ? ' (default)' : ''}
                          </option>
                        ))}
                        <option value={0}>Custom</option>
                        <option value={-1}>Open-ended</option>
                      </Select>
                    </FormField>

                    {isCustomDuration ? (
                      <FormField
                        label="Custom Duration (months)"
                        htmlFor="opp-lease-custom-months"
                        required
                        hint="End date updates from start + this many months"
                      >
                        <Input
                          id="opp-lease-custom-months"
                          type="number"
                          min={1}
                          step={1}
                          value={customLeaseMonths}
                          disabled={Boolean(card?.assignmentId)}
                          onChange={(e) => {
                            const custom =
                              e.target.value === '' ? '' : Number(e.target.value);
                            setCustomLeaseMonths(custom);
                            setLeaseEndDate(
                              applyDurationToEnd(leaseStartDate, 0, custom)
                            );
                          }}
                          placeholder="e.g., 9"
                        />
                      </FormField>
                    ) : null}

                    <FormField
                      label="Lease End Date"
                      htmlFor="opp-lease-end"
                      hint={
                        isOpenEndedLease
                          ? 'Open-ended — no end date'
                          : leaseEndDate && effectiveLeaseMonths > 0
                            ? `Auto-set for ${effectiveLeaseMonths} month${
                                effectiveLeaseMonths !== 1 ? 's' : ''
                              } from start`
                            : 'Select a start date to calculate end date'
                      }
                    >
                      <Input
                        id="opp-lease-end"
                        type="date"
                        value={leaseEndDate}
                        disabled
                        readOnly
                        style={{ colorScheme: 'light' }}
                      />
                    </FormField>

                    <FormField
                      label="Move In Date"
                      htmlFor="opp-move-in"
                      hint="Defaults to lease start date; you can change it."
                    >
                      <Input
                        id="opp-move-in"
                        type="date"
                        value={moveInDate}
                        min={leaseStartDate || todayISO}
                        max={isOpenEndedLease ? undefined : leaseEndDate || undefined}
                        disabled={Boolean(card?.assignmentId)}
                        onChange={(e) => setMoveInDate(e.target.value)}
                        style={{ colorScheme: 'light' }}
                      />
                    </FormField>
                  </div>
                </div>

                {card?.assignmentId ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <p className="font-medium">Lease generated — tenant & lease created</p>
                    <p className="mt-1 text-emerald-800">
                      This opportunity is linked to Lease management.
                    </p>
                    <a
                      href={`/admin/lease-management/${card.assignmentId}`}
                      className="mt-2 inline-block font-medium text-emerald-700 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open lease
                    </a>
                    {card.tenantId && (
                      <a
                        href={`/admin/tenants/${card.tenantId}`}
                        className="ml-4 inline-block font-medium text-emerald-700 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open tenant
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                    {moveInPaymentStatus !== 'paid' ? (
                      <>
                        <p className="text-sm text-amber-900">
                          Payment required first. Open the <strong>Payment</strong> section, enter
                          payment details, then check &quot;Payment received&quot;. After that,
                          Generate lease will be available.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveSection('payment')}
                        >
                          Go to Payment
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">
                          Generate lease creates the tenant, assigns the room, posts the paid
                          deposit/advance to the portal, and schedules rent invoices. Login for new
                          contacts: their email / password{' '}
                          <span className="font-mono text-gray-800">tenant123</span>.
                        </p>
                        <Button
                          type="button"
                          onClick={() => void handleGenerateLease()}
                          isDisabled={generatingLease || !buildingId || !roomId}
                          isLoading={generatingLease}
                        >
                          {generatingLease ? 'Generating…' : 'Generate lease'}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <FormField
                  label="Pipeline lease status"
                  htmlFor="opp-lease-status"
                  hint="Optional tracking before you generate. Generate lease sets this to signed."
                >
                  <Select
                    id="opp-lease-status"
                    value={leaseStatus}
                    onChange={(e) => setLeaseStatus(e.target.value as PipelineLeaseStatus)}
                    disabled={Boolean(card?.assignmentId)}
                  >
                    <option value="not_started">Not started</option>
                    <option value="generated">Lease prepared</option>
                    <option value="awaiting_signature">Awaiting signature</option>
                    <option value="signed">Signed / generated</option>
                  </Select>
                </FormField>
              </div>
            )}

            {activeSection === 'status' && (
              <div className="space-y-5">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Checkbox
                    id="opp-mark-lost"
                    checked={markAsLost}
                    onChange={(e) => setMarkAsLost(e.target.checked)}
                    label={
                      <span className="font-medium text-gray-900">
                        Mark as lost
                      </span>
                    }
                  />
                </div>

                {markAsLost && (
                  <FormField
                    label="Lost remarks"
                    htmlFor="opp-lost-reason"
                    required
                    hint="What happened? e.g. Didn’t like the unit, budget too high, chose another building."
                  >
                    <Textarea
                      id="opp-lost-reason"
                      required={markAsLost}
                      rows={4}
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      placeholder="Prospect didn’t like the unit layout / price…"
                    />
                  </FormField>
                )}

                {isEditing && card && (
                  <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Move to another board</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Send this card to a different pipeline (e.g. Onboarding → Payments after Won).
                      </p>
                    </div>
                    <FormField label="Pipeline" htmlFor="opp-move-board">
                      <Select
                        id="opp-move-board"
                        value={moveBoardId}
                        onChange={(e) => {
                          setMoveBoardId(e.target.value);
                          setMoveStageId('');
                        }}
                      >
                        <option value="">Select board</option>
                        {boards
                          .filter((b) => b.id !== board.id)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                      </Select>
                    </FormField>
                    <FormField label="Stage" htmlFor="opp-move-stage">
                      <Select
                        id="opp-move-stage"
                        value={moveStageId}
                        onChange={(e) => setMoveStageId(e.target.value)}
                        disabled={!moveBoardId}
                      >
                        <option value="">First open stage (default)</option>
                        {(boards.find((b) => b.id === moveBoardId)?.stages || []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    {moveError && (
                      <p className="text-sm text-red-600">{moveError}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleMoveToBoard()}
                      isDisabled={!moveBoardId || movingBoard}
                      isLoading={movingBoard}
                    >
                      {movingBoard ? 'Moving…' : 'Move card'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'tags' && (
              <OpportunityTagsField
                boardSlug={board.slug}
                tags={tags}
                onChange={setTags}
              />
            )}

            {activeSection === 'history' && card?.id && (
              <OpportunityHistoryPanel cardId={card.id} />
            )}
          </>
        ) : (
          <>
            {isPayments && isEditing && activeSection === 'contact' && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                <p className="font-medium">How to use Payments cards</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-indigo-800">
                  <li>
                    Drag the card across stages: Upcoming → Due → Reminder sent → Overdue → Paid
                    → Refund (or Escalation).
                  </li>
                  <li>Set the due date, then log what you did in Follow-up notes.</li>
                  <li>Record the actual money in Payments / Financial — this board tracks chase work.</li>
                </ol>
                {card?.tenantId && (
                  <a
                    href={`/admin/tenants/${card.tenantId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 underline"
                  >
                    Open tenant profile
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}

            {activeSection === 'contact' && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField label="First name" htmlFor="opp-first-name" required>
                    <Input
                      id="opp-first-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Maria"
                    />
                  </FormField>
                  <FormField label="Last name" htmlFor="opp-last-name" required>
                    <Input
                      id="opp-last-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Lopez"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField label="Email" htmlFor="opp-email">
                    <Input
                      id="opp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maria@email.com"
                    />
                  </FormField>
                  <FormField label="Phone" htmlFor="opp-phone">
                    <Input
                      id="opp-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63…"
                    />
                  </FormField>
                </div>
              </>
            )}

            {activeSection === 'property' && (
              <>
                <FormField label="Building" htmlFor="opp-building">
                  <Select
                    id="opp-building"
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                  >
                    <option value="">Optional</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                {isPayments && (
                  <FormField label="Room" htmlFor="opp-room-payments">
                    <Select
                      id="opp-room-payments"
                      value={roomId}
                      onChange={(e) => {
                        const nextRoomId = e.target.value;
                        setRoomId(nextRoomId);
                        const room = rooms.find((r) => r.id === nextRoomId);
                        if (room) setAmount(String(room.monthlyRate));
                      }}
                      disabled={!buildingId}
                    >
                      <option value="">Select room</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomNumber} — ₱{r.monthlyRate.toLocaleString('en-PH')}/mo
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
                <FormField
                  label={isPayments ? 'Monthly rent (₱)' : 'Amount (₱)'}
                  htmlFor="opp-amount"
                  hint={
                    isPayments
                      ? 'Rent you are following up on this cycle.'
                      : undefined
                  }
                >
                  <Input
                    id="opp-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </FormField>
              </>
            )}

            {activeSection === 'schedule' && (
              <>
                <FormField
                  label={isPayments ? 'Rent due' : 'Due'}
                  htmlFor="opp-due"
                  hint={
                    isPayments
                      ? 'When this month’s rent should be paid. Drag the card to Due when that day arrives.'
                      : undefined
                  }
                >
                  <Input
                    id="opp-due"
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                  />
                </FormField>
                {isPayments && (
                  <FormField
                    label="Next follow-up"
                    htmlFor="opp-next-action"
                    hint="When you plan to call / message again."
                  >
                    <Input
                      id="opp-next-action"
                      type="datetime-local"
                      value={nextActionAt}
                      onChange={(e) => setNextActionAt(e.target.value)}
                    />
                  </FormField>
                )}
              </>
            )}

            {activeSection === 'notes' && (
              <FormField
                label={isPayments ? 'Follow-up notes' : 'Notes'}
                htmlFor="opp-notes-generic"
                hint={
                  isPayments
                    ? 'Example: Called 8/4 — promised to pay Friday. Reminder SMS sent.'
                    : undefined
                }
              >
                <Textarea
                  id="opp-notes-generic"
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isPayments
                      ? 'Log calls, promises, partial payments…'
                      : 'Follow-up context'
                  }
                />
              </FormField>
            )}

            {activeSection === 'status' && isEditing && card && (
              <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Move to another board</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Send this card to a different pipeline.
                  </p>
                </div>
                <FormField label="Pipeline" htmlFor="opp-move-board-generic">
                  <Select
                    id="opp-move-board-generic"
                    value={moveBoardId}
                    onChange={(e) => {
                      setMoveBoardId(e.target.value);
                      setMoveStageId('');
                    }}
                  >
                    <option value="">Select board</option>
                    {boards
                      .filter((b) => b.id !== board.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </Select>
                </FormField>
                <FormField label="Stage" htmlFor="opp-move-stage-generic">
                  <Select
                    id="opp-move-stage-generic"
                    value={moveStageId}
                    onChange={(e) => setMoveStageId(e.target.value)}
                    disabled={!moveBoardId}
                  >
                    <option value="">First open stage (default)</option>
                    {(boards.find((b) => b.id === moveBoardId)?.stages || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                {moveError && <p className="text-sm text-red-600">{moveError}</p>}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleMoveToBoard()}
                  isDisabled={!moveBoardId || movingBoard}
                  isLoading={movingBoard}
                >
                  {movingBoard ? 'Moving…' : 'Move card'}
                </Button>
              </div>
            )}

            {activeSection === 'tags' && (
              <OpportunityTagsField
                boardSlug={board.slug}
                tags={tags}
                onChange={setTags}
              />
            )}

            {activeSection === 'notes' && (
              <FormField label="Notes" htmlFor="opp-notes">
                <Textarea
                  id="opp-notes"
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>
            )}

            {activeSection === 'history' && card?.id && (
              <OpportunityHistoryPanel cardId={card.id} />
            )}
          </>
        )}
      </form>
    </SectionedFormShell>

    <ConfirmDialog
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={handleDelete}
      title="Delete opportunity"
      message={`Delete "${entityLabel}"? This cannot be undone. Linked documents will be unlinked, not removed.`}
      confirmText="Delete opportunity"
      cancelText="Cancel"
      variant="danger"
      isLoading={isDeleting}
    />
    </>
  );
}

/** @deprecated Use AddOpportunityModal */
export const NewPipelineCardModal = AddOpportunityModal;
