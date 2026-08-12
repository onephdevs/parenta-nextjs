'use client';

import { useState } from 'react';
import { PhilippinePeso, Zap } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import RoomUtilityBillForm from '@/components/features/bills/RoomUtilityBillForm';
import ExpenseForm from '@/components/features/ExpenseForm';

type CreateKind = 'utility' | 'expense';

interface CreateBillExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateBillExpenseModal({
  isOpen,
  onClose,
  onCreated,
}: CreateBillExpenseModalProps) {
  const [kind, setKind] = useState<CreateKind | null>(null);

  const handleClose = () => {
    setKind(null);
    onClose();
  };

  const handleCreated = () => {
    setKind(null);
    onCreated?.();
    onClose();
  };

  if (!isOpen) return null;

  if (kind === 'utility') {
    return (
      <RoomUtilityBillForm
        mode="modal"
        isOpen
        onCancel={handleClose}
        onSuccess={handleCreated}
      />
    );
  }

  if (kind === 'expense') {
    return (
      <ExpenseForm mode="modal" isOpen onCancel={handleClose} onSuccess={handleCreated} />
    );
  }

  return (
    <Dialog
      isOpen
      onClose={handleClose}
      title="Create bill or expense"
      description="Same forms as Bills & expenses — saving adds a card on the Building Electricity, Water and Expense board"
      size="sm"
    >
      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-auto justify-start gap-3 px-4 py-3 text-left"
          leftIcon={<Zap className="h-5 w-5 text-amber-600" />}
          onClick={() => setKind('utility')}
        >
          <span>
            <span className="block font-semibold text-gray-900">Utility bill</span>
            <span className="block text-xs font-normal text-gray-500">
              Electricity or water for a unit or building
            </span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto justify-start gap-3 px-4 py-3 text-left"
          leftIcon={<PhilippinePeso className="h-5 w-5 text-slate-600" />}
          onClick={() => setKind('expense')}
        >
          <span>
            <span className="block font-semibold text-gray-900">Expense</span>
            <span className="block text-xs font-normal text-gray-500">
              Maintenance, garbage, supplies, and other costs
            </span>
          </span>
        </Button>
      </div>
    </Dialog>
  );
}
