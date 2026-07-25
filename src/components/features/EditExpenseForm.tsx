'use client';

import { useRouter } from 'next/navigation';
import ExpenseForm from '@/components/features/ExpenseForm';

interface ExpenseLike {
  id: string | number;
  buildingId?: string | number;
  roomId?: string | number;
  amount: number;
  category: string;
  description: string;
  vendorName?: string;
  vendor?: string;
  expenseDate: string | Date;
  notes?: string;
}

export default function EditExpenseForm({ expense }: { expense: ExpenseLike }) {
  const router = useRouter();

  const expenseDate =
    typeof expense.expenseDate === 'string'
      ? expense.expenseDate.slice(0, 10)
      : new Date(expense.expenseDate).toISOString().slice(0, 10);

  return (
    <ExpenseForm
      initialData={{
        buildingId: expense.buildingId != null ? String(expense.buildingId) : '',
        roomId: expense.roomId != null ? String(expense.roomId) : '',
        amount: String(expense.amount ?? ''),
        category: expense.category || 'maintenance',
        description: expense.description || '',
        vendor: expense.vendorName || expense.vendor || '',
        expenseDate,
        notes: expense.notes || '',
      }}
      onSubmit={async (data) => {
        const res = await fetch(`/api/expenses/${expense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buildingId: data.buildingId || null,
            roomId: data.roomId || null,
            amount: parseFloat(data.amount),
            category: data.category,
            description: data.description,
            vendorName: data.vendor,
            expenseDate: data.expenseDate,
            notes: data.notes,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.success === false) {
          throw new Error(result.details || result.error || 'Failed to update expense');
        }
        router.push(`/admin/financial/expenses/${expense.id}`);
        router.refresh();
      }}
      onCancel={() => router.push(`/admin/financial/expenses/${expense.id}`)}
    />
  );
}
