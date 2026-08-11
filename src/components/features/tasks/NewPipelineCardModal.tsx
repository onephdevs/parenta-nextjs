'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  CircleX,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  Wallet,
  Wrench,
} from 'lucide-react';
import SectionedFormShell, {
  type SectionedFormSection,
  type SectionNavStatus,
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
import { PaymentFollowUpPanel } from './PaymentFollowUpPanel';
import { ExpenseFollowUpPanel } from './ExpenseFollowUpPanel';
import { MaintenanceFollowUpPanel } from './MaintenanceFollowUpPanel';
import {
  contactDisplayName,
  vendorContactPersonName,
  type Contact,
} from '@/lib/constants/contacts';
import {
  formatPaymentNotesForPeople,
  preserveLedgerTagOnSave,
} from '@/lib/format-payment-notes';
import {
  formatPaymentMethodLabel,
  PAYMENT_METHOD_SELECT_OPTIONS,
} from '@/lib/constants/payment-methods';

const CUSTOM_VENDOR_VALUE = '__custom__';

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
  /** Called after a successful save. Pass the updated card so the board can refresh immediately. */
  onSaved?: (updatedCard?: PipelineCard) => void;
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
    subtitle: 'Set deposit and advance from rent, then mark payment received.',
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
    id: 'payment',
    label: 'Payment',
    icon: <Wallet className="h-4 w-4" />,
    title: 'Payment & invoice',
    subtitle: 'See what the payment is for, transaction ID, receipts, and attachments.',
  },
  {
    id: 'notes',
    label: 'Follow-up',
    icon: <FileText className="h-4 w-4" />,
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

const expensesSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'contact',
    label: 'Vendor',
    icon: <User className="h-4 w-4" />,
    title: 'Vendor / provider',
    subtitle: 'Who to pay — utility provider or expense vendor.',
  },
  {
    id: 'property',
    label: 'Property',
    icon: <Building2 className="h-4 w-4" />,
    title: 'Building & amount',
    subtitle: 'Which property this bill belongs to and how much.',
  },
  {
    id: 'schedule',
    label: 'Due date',
    icon: <Calendar className="h-4 w-4" />,
    title: 'When payment is due',
    subtitle: 'Bill due date and next follow-up for approval / payment.',
  },
  {
    id: 'payment',
    label: 'Expense',
    icon: <Wallet className="h-4 w-4" />,
    title: 'Bill & expense details',
    subtitle: 'See what this is for, paid status, receipts, and attachments.',
  },
  {
    id: 'notes',
    label: 'Follow-up',
    icon: <FileText className="h-4 w-4" />,
    title: 'Follow-up notes',
    subtitle: 'Approval notes, payment schedule, or vendor follow-ups.',
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: <Tag className="h-4 w-4" />,
    title: 'Tags',
    subtitle: 'e.g. Utility, Electric, Recurring.',
  },
];

const maintenanceSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'payment',
    label: 'Request',
    icon: <Wrench className="h-4 w-4" />,
    title: 'Maintenance request',
    subtitle: 'Issue details, photos, status, and priority.',
  },
  {
    id: 'contact',
    label: 'Tenant',
    icon: <User className="h-4 w-4" />,
    title: 'Tenant contact',
    subtitle: 'Who reported the issue and how to reach them.',
  },
  {
    id: 'property',
    label: 'Location',
    icon: <Building2 className="h-4 w-4" />,
    title: 'Building & unit',
    subtitle: 'Where the work needs to happen.',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Visit / due date',
    subtitle: 'When this should be attended to.',
  },
  {
    id: 'notes',
    label: 'Follow-up',
    icon: <FileText className="h-4 w-4" />,
    title: 'Follow-up notes',
    subtitle: 'Technician notes or next steps for this card.',
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: <Tag className="h-4 w-4" />,
    title: 'Tags',
    subtitle: 'e.g. Parts ordered, Vendor scheduled, Waiting on tenant.',
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

type OnboardingSectionMeta = {
  status: SectionNavStatus;
  statusHint?: string;
};

/** Side-nav colors for onboarding win path: done / ready / blocked. */
function computeOnboardingSectionMeta(input: {
  firstName: string;
  lastName: string;
  buildingId: string;
  roomId: string;
  viewingAt: string;
  documentCount?: number;
  backgroundCheckStatus: string;
  moveInPaymentStatus: 'unpaid' | 'paid';
  assignmentId?: string | null;
  leaseStartDate: string;
  isEditing: boolean;
}): Partial<Record<FormSection, OnboardingSectionMeta>> {
  const hasContact = Boolean(input.firstName.trim() || input.lastName.trim());
  const hasProperty = Boolean(input.buildingId && input.roomId);
  const paymentDone =
    Boolean(input.assignmentId) || input.moveInPaymentStatus === 'paid';
  const leaseDone = Boolean(input.assignmentId);
  const screeningDone =
    Boolean(input.backgroundCheckStatus) &&
    input.backgroundCheckStatus !== 'not_started';
  const docsDone = (input.documentCount || 0) > 0;

  const meta: Partial<Record<FormSection, OnboardingSectionMeta>> = {
    contact: hasContact
      ? { status: 'done', statusHint: 'Contact details saved' }
      : { status: 'ready', statusHint: 'Add prospect name to continue' },
    property: hasProperty
      ? { status: 'done', statusHint: 'Building and room selected' }
      : {
          status: 'ready',
          statusHint: 'Select building and room for deposit/lease',
        },
    schedule: input.viewingAt
      ? { status: 'done', statusHint: 'Viewing scheduled' }
      : { status: 'optional', statusHint: 'Optional viewing date' },
    status: { status: 'optional', statusHint: 'Mark lost or move boards' },
    tags: { status: 'optional', statusHint: 'Optional labels' },
    history: { status: 'optional', statusHint: 'Change log' },
  };

  if (!input.isEditing) return meta;

  meta.documents = docsDone
    ? { status: 'done', statusHint: 'Documents uploaded' }
    : {
        status: 'ready',
        statusHint: 'Optional — upload ID / income docs when ready',
      };

  meta.screening = screeningDone
    ? { status: 'done', statusHint: 'Screening in progress or complete' }
    : {
        status: hasContact ? 'ready' : 'blocked',
        statusHint: hasContact
          ? 'Update background / credit check status'
          : 'Add contact first',
      };

  if (paymentDone) {
    meta.payment = {
      status: 'done',
      statusHint: 'Move-in payment received',
    };
  } else if (!hasProperty) {
    meta.payment = {
      status: 'blocked',
      statusHint: 'Select building and room under Property first',
    };
  } else {
    meta.payment = {
      status: 'ready',
      statusHint: 'Record deposit/advance and mark Payment received',
    };
  }

  if (leaseDone) {
    meta.lease = {
      status: 'done',
      statusHint: 'Lease generated — tenant created',
    };
  } else if (!paymentDone) {
    meta.lease = {
      status: 'blocked',
      statusHint: 'Mark Payment received before Generate lease',
    };
  } else {
    meta.lease = {
      status: 'ready',
      statusHint: input.leaseStartDate
        ? 'Ready to Generate lease'
        : 'Set lease dates, then Generate lease',
    };
  }

  return meta;
}

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

  const base =
    board.slug === 'payments'
      ? paymentsSections
      : board.slug === 'expenses'
        ? expensesSections
        : board.slug === 'maintenance'
          ? maintenanceSections
          : genericSections;
  if (!isEditing) {
    // Detail panels need an existing card id
    if (
      board.slug === 'payments' ||
      board.slug === 'expenses' ||
      board.slug === 'maintenance'
    ) {
      return base.filter((s) => s.id !== 'payment');
    }
    return base;
  }

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
  const isExpenses = board.slug === 'expenses';
  const isMaintenance = board.slug === 'maintenance';
  const baseSections = sectionsForBoard(board, isEditing);

  const [activeSection, setActiveSection] = useState<FormSection>('contact');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorContact, setNewVendorContact] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [savingVendor, setSavingVendor] = useState(false);
  const [vendorFormError, setVendorFormError] = useState<string | null>(null);
  /** Raw notes from DB (may include [ledger:…] tags) — preserved on save */
  const [notesRaw, setNotesRaw] = useState('');

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
  const [depositMonths, setDepositMonths] = useState(1);
  const [advanceMonths, setAdvanceMonths] = useState(1);
  /** When true, admin edited Total/Deposit — don't overwrite until months recalc */
  const [moveInAmountsManual, setMoveInAmountsManual] = useState(false);
  const [requiredDeposit, setRequiredDeposit] = useState(0);
  const [requiredAdvance, setRequiredAdvance] = useState(0);
  const [requiredUtility, setRequiredUtility] = useState(0);
  const [feeChecklistReady, setFeeChecklistReady] = useState(false);
  const [moveInPaymentType, setMoveInPaymentType] = useState('rent');
  const [moveInPaymentDate, setMoveInPaymentDate] = useState(() => todayLocalISO());
  const [moveInPaymentStatus, setMoveInPaymentStatus] = useState<'unpaid' | 'paid'>(
    'unpaid'
  );
  const [moveInPaymentMethod, setMoveInPaymentMethod] = useState('cash');
  const [moveInTransactionId, setMoveInTransactionId] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const moveInAmountsManualRef = useRef(false);
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
    setActiveSection(
      board.slug === 'maintenance' && card?.id ? 'payment' : 'contact'
    );
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
      setNotesRaw(card.notes || '');
      setNotes(formatPaymentNotesForPeople(card.notes || ''));
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
      const hasSavedMoveIn =
        (savedDeposit != null && savedDeposit > 0) ||
        (savedAdvance != null && savedAdvance > 0);
      setDepositAmount(savedDeposit != null && savedDeposit > 0 ? String(savedDeposit) : '');
      setMoveInTotalPaid(
        hasSavedMoveIn ? String((savedDeposit || 0) + (savedAdvance || 0)) : ''
      );
      setMoveInAmountsManual(hasSavedMoveIn);
      moveInAmountsManualRef.current = hasSavedMoveIn;
      {
        const rentHint =
          card.amount != null && Number(card.amount) > 0 ? Number(card.amount) : 0;
        if (rentHint > 0) {
          const dMonths =
            savedDeposit != null && savedDeposit > 0
              ? Math.max(0, Math.round(savedDeposit / rentHint))
              : 1;
          const aMonths =
            savedAdvance != null && savedAdvance > 0
              ? Math.max(0, Math.round(savedAdvance / rentHint))
              : 1;
          setDepositMonths(dMonths);
          setAdvanceMonths(aMonths);
        } else {
          setDepositMonths(1);
          setAdvanceMonths(1);
        }
      }
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
      setNotesRaw('');
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
      setDepositMonths(1);
      setAdvanceMonths(1);
      setMoveInAmountsManual(false);
      moveInAmountsManualRef.current = false;
      setMoveInPaymentStatus('unpaid');
      setMoveInPaymentMethod('cash');
      setMoveInTransactionId('');
      setMoveInPaymentType('rent');
      setMoveInPaymentDate(todayLocalISO());
    }
    setSelectedVendorId('');
    setShowAddVendor(false);
    setNewVendorName('');
    setNewVendorContact('');
    setNewVendorEmail('');
    setNewVendorPhone('');
    setVendorFormError(null);
    // Re-init only when the modal opens or the card identity changes — not when
    // the parent refreshes the same card after Payment received (that was wiping paid).
  }, [isOpen, board.id, card?.id]);

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
    if (!isOpen || !isExpenses) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/contacts?role=VENDOR');
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setVendors(json.data as Contact[]);
        }
      } catch {
        if (!cancelled) setVendors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isExpenses]);

  useEffect(() => {
    if (!isExpenses || !isOpen) return;
    const name = firstName.trim().toLowerCase();
    if (!name) {
      setSelectedVendorId('');
      return;
    }
    const match = vendors.find((v) => v.firstName.trim().toLowerCase() === name);
    setSelectedVendorId(match ? match.id : CUSTOM_VENDOR_VALUE);
  }, [isExpenses, isOpen, firstName, vendors]);

  function applyVendor(vendor: Contact) {
    setSelectedVendorId(vendor.id);
    setFirstName(vendor.firstName);
    setLastName(vendorContactPersonName(vendor.lastName));
    setEmail(vendor.email || '');
    setPhone(vendor.phone || '');
    setShowAddVendor(false);
    setVendorFormError(null);
  }

  function handleVendorSelect(value: string) {
    if (!value) {
      setSelectedVendorId('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      return;
    }
    if (value === CUSTOM_VENDOR_VALUE) {
      setSelectedVendorId(CUSTOM_VENDOR_VALUE);
      return;
    }
    const vendor = vendors.find((v) => v.id === value);
    if (vendor) applyVendor(vendor);
  }

  async function handleCreateVendor() {
    const name = newVendorName.trim();
    if (!name) {
      setVendorFormError('Vendor / provider name is required');
      return;
    }
    setSavingVendor(true);
    setVendorFormError(null);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: name,
          lastName: newVendorContact.trim() || undefined,
          email: newVendorEmail.trim() || null,
          phone: newVendorPhone.trim() || null,
          roles: ['VENDOR'],
        }),
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Failed to create vendor');
      }
      const created = json.data as Contact;
      setVendors((prev) => {
        const without = prev.filter((v) => v.id !== created.id);
        return [...without, created].sort((a, b) =>
          contactDisplayName(a).localeCompare(contactDisplayName(b), undefined, {
            sensitivity: 'base',
          })
        );
      });
      applyVendor(created);
      setNewVendorName('');
      setNewVendorContact('');
      setNewVendorEmail('');
      setNewVendorPhone('');
      setShowAddVendor(false);
    } catch (err) {
      setVendorFormError(err instanceof Error ? err.message : 'Failed to create vendor');
    } finally {
      setSavingVendor(false);
    }
  }

  useEffect(() => {
    if (!buildingId) {
      setRooms([]);
      if (!isEditing) setRoomId('');
      return;
    }
    void (async () => {
      try {
        // Onboarding: vacant rooms only, and hide units already paid/held by other opportunities.
        const params = new URLSearchParams({ buildingId });
        if (isOnboarding) {
          params.set('roomStatus', 'vacant');
          params.set('excludePipelineHeld', '1');
          if (card?.id) {
            params.set('excludeCardId', card.id);
          }
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
    // roomId intentionally omitted — only reload when building / card context changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, isEditing, isOnboarding, card?.id]);

  useEffect(() => {
    if (!roomId || rooms.length === 0) return;
    // Fill opportunity value from room rent when empty (create + edit)
    setAmount((current) => {
      if (current.trim()) return current;
      const room = rooms.find((r) => r.id === roomId);
      return room ? String(room.monthlyRate) : current;
    });
  }, [roomId, rooms]);

  // Keep Total / Deposit in sync with room rent × selected months (unpaid only)
  useEffect(() => {
    if (!isOpen || !isOnboarding) return;
    if (card?.assignmentId || moveInPaymentStatus === 'paid') return;
    if (moveInAmountsManualRef.current) return;
    fillMoveInAmountsFromRent(depositMonths, advanceMonths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    isOnboarding,
    roomId,
    amount,
    rooms,
    depositMonths,
    advanceMonths,
    card?.assignmentId,
    card?.amount,
    moveInPaymentStatus,
    requiredUtility,
    activeSection,
  ]);

  // Load building deposit config → fee checklist (Balibago 2+1+util / Villasol 1+1+util)
  useEffect(() => {
    if (!isOpen || !isOnboarding || !buildingId) {
      setFeeChecklistReady(false);
      setRequiredDeposit(0);
      setRequiredAdvance(0);
      setRequiredUtility(0);
      return;
    }
    const rent = getMonthlyRentForPayment();
    if (rent <= 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const [calcRes, cfgRes] = await Promise.all([
          fetch(
            `/api/building-deposit-config/${encodeURIComponent(buildingId)}?action=calculate&monthlyRate=${rent}`
          ),
          fetch(
            `/api/building-deposit-config/${encodeURIComponent(buildingId)}`
          ),
        ]);
        const calcJson = await calcRes.json();
        const cfgJson = await cfgRes.json();
        if (cancelled) return;

        if (calcJson.success && calcJson.data) {
          setRequiredDeposit(Number(calcJson.data.requiredDeposit) || 0);
          setRequiredAdvance(Number(calcJson.data.requiredAdvance) || 0);
          setRequiredUtility(Number(calcJson.data.utilityDeposit) || 0);
          setFeeChecklistReady(true);
        }

        const cfg =
          cfgJson?.data ||
          cfgJson?.config ||
          (cfgJson?.success ? cfgJson.data : null);
        if (cfg && moveInPaymentStatus !== 'paid' && !card?.assignmentId) {
          const depMo = Math.max(0, Math.round(Number(cfg.depositMonths) || 1));
          const advMo = Math.max(0, Math.round(Number(cfg.advanceMonths) || 1));
          setDepositMonths(depMo);
          setAdvanceMonths(advMo);
          if (!moveInAmountsManualRef.current) {
            fillMoveInAmountsFromRent(depMo, advMo, rent);
          }
        } else if (!moveInAmountsManualRef.current) {
          fillMoveInAmountsFromRent(depositMonths, advanceMonths, rent);
        }
      } catch {
        if (!cancelled) setFeeChecklistReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isOnboarding, buildingId, roomId, amount, rooms]);

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

  function getMonthlyRentForPayment(overrideAmount?: string): number {
    const amountSource =
      overrideAmount !== undefined ? overrideAmount : amount;
    if (amountSource.trim() !== '') {
      const n = Number(amountSource);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const room = rooms.find((r) => r.id === roomId);
    const rate = room ? Number(room.monthlyRate) : 0;
    if (Number.isFinite(rate) && rate > 0) return rate;
    const cardAmount = card?.amount != null ? Number(card.amount) : 0;
    return Number.isFinite(cardAmount) && cardAmount > 0 ? cardAmount : 0;
  }

  function fillMoveInAmountsFromRent(
    nextDepositMonths: number,
    nextAdvanceMonths: number,
    rentOverride?: number
  ) {
    const rent =
      rentOverride != null && rentOverride > 0
        ? rentOverride
        : getMonthlyRentForPayment();
    if (rent <= 0) return false;
    const deposit = Math.round(rent * nextDepositMonths * 100) / 100;
    const advance = Math.round(rent * nextAdvanceMonths * 100) / 100;
    const utility = Math.max(0, requiredUtility);
    const total = Math.round((deposit + advance + utility) * 100) / 100;
    setDepositAmount(deposit > 0 ? String(deposit) : '');
    setMoveInTotalPaid(total > 0 ? String(total) : '');
    return true;
  }

  function applyMoveInMonths(nextDepositMonths: number, nextAdvanceMonths: number) {
    setDepositMonths(nextDepositMonths);
    setAdvanceMonths(nextAdvanceMonths);
    setMoveInAmountsManual(false);
    moveInAmountsManualRef.current = false;
    if (!fillMoveInAmountsFromRent(nextDepositMonths, nextAdvanceMonths)) {
      setError('Select a room (or enter monthly rent under Property) to calculate amounts');
      return;
    }
    setError(null);
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

    let { total, deposit, advance } = getMoveInSplit(overrides);
    if (total <= 0) {
      const rent = getMonthlyRentForPayment();
      if (rent > 0) {
        const nextDeposit = Math.round(rent * depositMonths * 100) / 100;
        const nextAdvance = Math.round(rent * advanceMonths * 100) / 100;
        const utility = Math.max(0, requiredUtility);
        total = Math.round((nextDeposit + nextAdvance + utility) * 100) / 100;
        deposit = nextDeposit;
        advance = nextAdvance;
        setDepositAmount(nextDeposit > 0 ? String(nextDeposit) : '');
        setMoveInTotalPaid(total > 0 ? String(total) : '');
      }
    }
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
    setMoveInPaymentStatus('paid');
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
      onSaved?.(json.data?.card as PipelineCard | undefined);
    } catch (err) {
      setMoveInPaymentStatus('unpaid');
      setError(err instanceof Error ? err.message : 'Failed to mark payment as paid');
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleMarkMoveInUnpaid() {
    if (!card?.id) return;
    setSavingPayment(true);
    setError(null);
    const previousStatus = moveInPaymentStatus;
    setMoveInPaymentStatus('unpaid');
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
      onSaved?.(json.data?.card as PipelineCard | undefined);
    } catch (err) {
      setMoveInPaymentStatus(previousStatus);
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
          leaseStatus: 'generated',
          generateLease: true,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || json.details || 'Failed to generate lease');
      }
      setLeaseStatus('generated');
      onSaved?.(json.data?.card as PipelineCard | undefined);
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

      if (isExpenses && !firstName.trim()) {
        setActiveSection('contact');
        throw new Error('Vendor / provider name is required');
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
          notes: preserveLedgerTagOnSave(notes, notesRaw) || null,
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
        onSaved?.(json.data?.card as PipelineCard | undefined);
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

  const sections = useMemo(() => {
    if (!isOnboarding) return baseSections;
    const meta = computeOnboardingSectionMeta({
      firstName,
      lastName,
      buildingId,
      roomId,
      viewingAt,
      documentCount: card?.documentCount,
      backgroundCheckStatus,
      moveInPaymentStatus,
      assignmentId: card?.assignmentId,
      leaseStartDate,
      isEditing,
    });
    return baseSections.map((section) => {
      const info = meta[section.id];
      if (!info) return section;
      return {
        ...section,
        status: info.status,
        statusHint: info.statusHint,
      };
    });
  }, [
    baseSections,
    isOnboarding,
    firstName,
    lastName,
    buildingId,
    roomId,
    viewingAt,
    card?.documentCount,
    card?.assignmentId,
    backgroundCheckStatus,
    moveInPaymentStatus,
    leaseStartDate,
    isEditing,
  ]);

  const entityLabel = isMaintenance
    ? title.trim() ||
      (firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : isEditing
          ? 'Maintenance request'
          : 'New request')
    : firstName || lastName
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
            : isExpenses
              ? 'Expense follow-up'
              : isMaintenance
                ? 'Maintenance request'
                : 'Edit opportunity'
          : isPayments
            ? 'Add payment follow-up'
            : isExpenses
              ? 'Add expense follow-up'
              : isMaintenance
                ? 'Add maintenance follow-up'
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
            className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            <span>Delete</span>
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
                      const rate = room ? Number(room.monthlyRate) : 0;
                      setAmount(room ? String(room.monthlyRate) : '');
                      if (
                        isOnboarding &&
                        !card?.assignmentId &&
                        moveInPaymentStatus !== 'paid' &&
                        rate > 0
                      ) {
                        setMoveInAmountsManual(false);
                        moveInAmountsManualRef.current = false;
                        fillMoveInAmountsFromRent(depositMonths, advanceMonths, rate);
                      }
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
                    onChange={(e) => {
                      const next = e.target.value;
                      setAmount(next);
                      if (
                        isOnboarding &&
                        !card?.assignmentId &&
                        moveInPaymentStatus !== 'paid' &&
                        !moveInAmountsManualRef.current
                      ) {
                        const rate = Number(next);
                        if (Number.isFinite(rate) && rate > 0) {
                          fillMoveInAmountsFromRent(depositMonths, advanceMonths, rate);
                        }
                      }
                    }}
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

            {activeSection === 'payment' && isOnboarding && (
              <div className="space-y-5">
                {!buildingId || !roomId ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Select a building and room under Property first.
                  </div>
                ) : null}

                {(card?.assignmentId || moveInPaymentStatus === 'paid') && (
                  <Alert variant="success" title="Move-in payment confirmed">
                    <p className="mt-1">
                      Total ₱{Number(moveInTotalPaid || 0).toLocaleString('en-PH')}
                      {' · '}
                      Deposit ₱{Number(depositAmount || 0).toLocaleString('en-PH')}
                      {' · '}
                      To invoices ₱
                      {getMoveInSplit().advance.toLocaleString('en-PH')}
                      {moveInPaymentMethod
                        ? ` · ${formatPaymentMethodLabel(moveInPaymentMethod)}`
                        : ''}
                    </p>
                    {!card?.assignmentId && (
                      <button
                        type="button"
                        className="mt-3 text-sm font-medium text-green-800 underline"
                        onClick={() => void handleMarkMoveInUnpaid()}
                        disabled={savingPayment}
                      >
                        Mark as unpaid again
                      </button>
                    )}
                  </Alert>
                )}

                <div className="grid grid-cols-6 gap-5">
                  {feeChecklistReady && (
                    <div className="col-span-6 rounded-lg border border-teal-200 bg-teal-50/60 p-4">
                      <p className="text-sm font-medium text-gray-900">
                        Onboarding fee checklist (from property deposit rules)
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-800">
                        <li className="flex justify-between gap-3">
                          <span>
                            Security deposit
                            {depositMonths > 0 ? ` (${depositMonths} mo)` : ''}
                          </span>
                          <span className="font-semibold tabular-nums">
                            ₱{requiredDeposit.toLocaleString('en-PH')}
                          </span>
                        </li>
                        <li className="flex justify-between gap-3">
                          <span>
                            Advance rent
                            {advanceMonths > 0 ? ` (${advanceMonths} mo)` : ''}
                          </span>
                          <span className="font-semibold tabular-nums">
                            ₱{requiredAdvance.toLocaleString('en-PH')}
                          </span>
                        </li>
                        <li className="flex justify-between gap-3">
                          <span>Utility deposit</span>
                          <span className="font-semibold tabular-nums">
                            ₱{requiredUtility.toLocaleString('en-PH')}
                          </span>
                        </li>
                        <li className="flex justify-between gap-3 border-t border-teal-200 pt-2 font-medium">
                          <span>Expected total</span>
                          <span className="tabular-nums">
                            ₱
                            {(
                              requiredDeposit +
                              requiredAdvance +
                              requiredUtility
                            ).toLocaleString('en-PH')}
                          </span>
                        </li>
                      </ul>
                      {moveInPaymentStatus === 'paid' && (
                        <p className="mt-2 text-xs font-medium text-emerald-800">
                          Marked paid on this opportunity
                        </p>
                      )}
                    </div>
                  )}

                  {!card?.assignmentId && moveInPaymentStatus !== 'paid' && (
                    <div className="col-span-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          Calculate from monthly rent
                        </p>
                        {getMonthlyRentForPayment() > 0 ? (
                          <p className="text-xs text-gray-600">
                            ₱{getMonthlyRentForPayment().toLocaleString('en-PH')}/mo
                          </p>
                        ) : (
                          <p className="text-xs text-amber-700">
                            Set room or monthly rent under Property
                          </p>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Deposit months" htmlFor="opp-deposit-months">
                          <Select
                            id="opp-deposit-months"
                            value={String(depositMonths)}
                            disabled={savingPayment}
                            onChange={(e) => {
                              applyMoveInMonths(Number(e.target.value), advanceMonths);
                            }}
                          >
                            {[0, 1, 2, 3, 4, 5, 6].map((m) => {
                              const rent = getMonthlyRentForPayment();
                              const priced =
                                rent > 0
                                  ? ` — ₱${(rent * m).toLocaleString('en-PH')}`
                                  : '';
                              return (
                                <option key={`dep-${m}`} value={m}>
                                  {m === 0
                                    ? '0 months'
                                    : `${m} month${m === 1 ? '' : 's'}${priced}`}
                                </option>
                              );
                            })}
                          </Select>
                        </FormField>
                        <FormField label="Advance months" htmlFor="opp-advance-months">
                          <Select
                            id="opp-advance-months"
                            value={String(advanceMonths)}
                            disabled={savingPayment}
                            onChange={(e) => {
                              applyMoveInMonths(depositMonths, Number(e.target.value));
                            }}
                          >
                            {[0, 1, 2, 3, 4, 5, 6].map((m) => {
                              const rent = getMonthlyRentForPayment();
                              const priced =
                                rent > 0
                                  ? ` — ₱${(rent * m).toLocaleString('en-PH')}`
                                  : '';
                              return (
                                <option key={`adv-${m}`} value={m}>
                                  {m === 0
                                    ? '0 months'
                                    : `${m} month${m === 1 ? '' : 's'}${priced}`}
                                </option>
                              );
                            })}
                          </Select>
                        </FormField>
                      </div>
                      {moveInAmountsManual && getMonthlyRentForPayment() > 0 && (
                        <button
                          type="button"
                          className="mt-3 text-xs font-medium text-blue-700 underline"
                          onClick={() => applyMoveInMonths(depositMonths, advanceMonths)}
                        >
                          Reset to calculated amounts
                        </button>
                      )}
                    </div>
                  )}

                  <FormField
                    label="Total Amount Paid"
                    htmlFor="opp-total-paid"
                    required
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
                        onChange={(e) => {
                          setMoveInAmountsManual(true);
                          moveInAmountsManualRef.current = true;
                          setMoveInTotalPaid(e.target.value);
                        }}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Deposit Amount"
                    htmlFor="opp-deposit"
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
                        onChange={(e) => {
                          setMoveInAmountsManual(true);
                          moveInAmountsManualRef.current = true;
                          setDepositAmount(e.target.value);
                        }}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </FormField>

                  {(parseFloat(moveInTotalPaid) || 0) > 0 && (
                    <div className="col-span-6 grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <div>
                        Deposit
                        {depositMonths > 0 ? ` (${depositMonths} mo)` : ''}:{' '}
                        <span className="font-semibold">
                          ₱{getMoveInSplit().deposit.toLocaleString('en-PH')}
                        </span>
                      </div>
                      <div>
                        Advance
                        {advanceMonths > 0 ? ` (${advanceMonths} mo)` : ''}:{' '}
                        <span className="font-semibold">
                          ₱{getMoveInSplit().advance.toLocaleString('en-PH')}
                        </span>
                      </div>
                      {requiredUtility > 0 && (
                        <div className="col-span-2 text-xs text-gray-600">
                          Utility deposit included in total:{' '}
                          <span className="font-semibold">
                            ₱{requiredUtility.toLocaleString('en-PH')}
                          </span>
                          {getMoveInSplit().total >=
                            getMoveInSplit().deposit + requiredUtility && (
                            <span>
                              {' '}
                              · Advance share after deposit+utility ≈ ₱
                              {Math.max(
                                0,
                                getMoveInSplit().total -
                                  getMoveInSplit().deposit -
                                  requiredUtility
                              ).toLocaleString('en-PH')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
                      {PAYMENT_METHOD_SELECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
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
                      placeholder="Optional"
                    />
                  </FormField>
                </div>

                {!card?.assignmentId && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <Checkbox
                      id="opp-payment-received"
                      checked={moveInPaymentStatus === 'paid'}
                      disabled={savingPayment}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.target.checked) {
                          void handleMarkMoveInPaid();
                        } else {
                          void handleMarkMoveInUnpaid();
                        }
                      }}
                      onClick={(e) => {
                        // Avoid accidental form submit / label quirks inside the opportunity form.
                        e.stopPropagation();
                      }}
                      label={
                        <span className="font-medium text-gray-900">Payment received</span>
                      }
                    />
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
                          Mark <strong>Payment received</strong> first to unlock Generate lease.
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
                          contacts: their email / temporary password{' '}
                          <span className="font-mono text-gray-800">tenant123</span>. On first
                          portal login they must change the password and confirm name, email, and
                          phone.
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
                  hint="Optional tracking before you generate. Generate lease sets this to Lease prepared."
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
                    <option value="signed">Signed</option>
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
                  <li>
                    Open Payment to see the invoice, transaction IDs, receipts, and attachments.
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

            {isExpenses && isEditing && activeSection === 'contact' && (
              <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                <p className="font-medium">How to use Expenses cards</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-violet-800">
                  <li>
                    Open Expense to see the utility bill or vendor expense, paid status, and
                    attachments.
                  </li>
                  <li>Drag across stages as you verify, approve, schedule, and pay.</li>
                  <li>
                    Mark paid here or in Financial — the board syncs from utility bills and
                    expenses.
                  </li>
                </ol>
              </div>
            )}

            {activeSection === 'contact' && (
              <>
                {isExpenses ? (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <FormField
                        label="Vendor / provider"
                        htmlFor="opp-vendor-select"
                        required
                        className="min-w-0 flex-1"
                      >
                        <Select
                          id="opp-vendor-select"
                          required={!firstName.trim()}
                          value={selectedVendorId}
                          onChange={(e) => handleVendorSelect(e.target.value)}
                        >
                          <option value="">Select a vendor…</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {contactDisplayName(v)}
                            </option>
                          ))}
                          <option value={CUSTOM_VENDOR_VALUE}>Other (type manually)</option>
                        </Select>
                      </FormField>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={() => {
                          setShowAddVendor((open) => !open);
                          setVendorFormError(null);
                        }}
                      >
                        Add vendor
                      </Button>
                    </div>

                    {showAddVendor && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                        <p className="text-sm font-medium text-gray-900">
                          New vendor / provider
                        </p>
                        <FormField
                          label="Company / provider name"
                          htmlFor="new-vendor-name"
                          required
                        >
                          <Input
                            id="new-vendor-name"
                            value={newVendorName}
                            onChange={(e) => setNewVendorName(e.target.value)}
                            placeholder="e.g. Angeles Electric Corp."
                          />
                        </FormField>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <FormField
                            label="Contact name (optional)"
                            htmlFor="new-vendor-contact"
                          >
                            <Input
                              id="new-vendor-contact"
                              value={newVendorContact}
                              onChange={(e) => setNewVendorContact(e.target.value)}
                              placeholder="Optional"
                            />
                          </FormField>
                          <FormField label="Phone" htmlFor="new-vendor-phone">
                            <Input
                              id="new-vendor-phone"
                              value={newVendorPhone}
                              onChange={(e) => setNewVendorPhone(e.target.value)}
                              placeholder="+63…"
                            />
                          </FormField>
                        </div>
                        <FormField label="Email" htmlFor="new-vendor-email">
                          <Input
                            id="new-vendor-email"
                            type="email"
                            value={newVendorEmail}
                            onChange={(e) => setNewVendorEmail(e.target.value)}
                            placeholder="billing@provider.com"
                          />
                        </FormField>
                        {vendorFormError && (
                          <p className="text-sm text-red-600">{vendorFormError}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            isLoading={savingVendor}
                            onClick={() => void handleCreateVendor()}
                          >
                            Save vendor
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={savingVendor}
                            onClick={() => {
                              setShowAddVendor(false);
                              setVendorFormError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {(selectedVendorId === CUSTOM_VENDOR_VALUE ||
                      (!selectedVendorId && Boolean(firstName))) && (
                      <FormField
                        label="Vendor / provider name"
                        htmlFor="opp-first-name"
                        required
                      >
                        <Input
                          id="opp-first-name"
                          required
                          value={firstName}
                          onChange={(e) => {
                            setSelectedVendorId(CUSTOM_VENDOR_VALUE);
                            setFirstName(e.target.value);
                          }}
                          placeholder="Meralco / Cleaning Co."
                        />
                      </FormField>
                    )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <FormField
                        label="Contact name (optional)"
                        htmlFor="opp-last-name"
                      >
                        <Input
                          id="opp-last-name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Optional"
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
                    <FormField label="Email" htmlFor="opp-email">
                      <Input
                        id="opp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="maria@email.com"
                      />
                    </FormField>
                  </>
                ) : (
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
                {isExpenses && (
                  <FormField label="Room (optional)" htmlFor="opp-room-expenses">
                    <Select
                      id="opp-room-expenses"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      disabled={!buildingId}
                    >
                      <option value="">Building-wide / none</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomNumber}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
                {isMaintenance && (
                  <FormField label="Room / unit" htmlFor="opp-room-maintenance">
                    <Select
                      id="opp-room-maintenance"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      disabled={!buildingId}
                    >
                      <option value="">Select room</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomNumber}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
                {!isMaintenance && (
                <FormField
                  label={isPayments ? 'Monthly rent (₱)' : isExpenses ? 'Bill amount (₱)' : 'Amount (₱)'}
                  htmlFor="opp-amount"
                  hint={
                    isPayments
                      ? 'Rent you are following up on this cycle.'
                      : isExpenses
                        ? 'Amount due for this utility bill or vendor expense.'
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
                )}
              </>
            )}

            {activeSection === 'schedule' && (
              <>
                <FormField
                  label={
                    isPayments
                      ? 'Rent due'
                      : isExpenses
                        ? 'Bill due'
                        : isMaintenance
                          ? 'Scheduled / due'
                          : 'Due'
                  }
                  htmlFor="opp-due"
                  hint={
                    isPayments
                      ? 'When this month’s rent should be paid. Drag the card to Due when that day arrives.'
                      : isExpenses
                        ? 'When this bill should be paid.'
                        : isMaintenance
                          ? 'Optional target date for the repair visit.'
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

            {activeSection === 'payment' && isPayments && card?.id && (
              <PaymentFollowUpPanel
                cardId={card.id}
                tenantId={card.tenantId}
                invoiceId={card.invoiceId}
                buildingId={buildingId || undefined}
                roomId={roomId || undefined}
                balanceAmount={card.amount}
              />
            )}

            {activeSection === 'payment' && isExpenses && card?.id && (
              <ExpenseFollowUpPanel
                cardId={card.id}
                expenseId={card.expenseId}
                utilityBillId={card.utilityBillId}
                buildingId={buildingId || undefined}
                roomId={roomId || undefined}
                amount={card.amount}
                source={card.source || source}
              />
            )}

            {activeSection === 'payment' && isMaintenance && card?.id && (
              <MaintenanceFollowUpPanel
                cardId={card.id}
                maintenanceRequestId={card.maintenanceRequestId}
                buildingId={buildingId || undefined}
                roomId={roomId || undefined}
                onUpdated={onSaved}
              />
            )}

            {activeSection === 'notes' && (
              <FormField
                label={
                  isPayments || isExpenses || isMaintenance
                    ? 'Follow-up notes'
                    : 'Notes'
                }
                htmlFor="opp-notes"
                hint={
                  isExpenses
                    ? 'Approval notes, payment schedule, or vendor follow-ups. Billing period is shown in plain language when available.'
                    : isPayments
                      ? 'Example: Called 8/4 — promised to pay Friday. Reminder SMS sent.'
                      : isMaintenance
                        ? 'Card-level follow-up (tenant description lives under Request).'
                        : undefined
                }
              >
                <Textarea
                  id="opp-notes"
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isPayments
                      ? 'Log calls, promises, partial payments…'
                      : isExpenses
                        ? 'e.g. Waiting on Angeles Electric confirmation…'
                        : isMaintenance
                          ? 'e.g. Vendor confirmed visit tomorrow…'
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

