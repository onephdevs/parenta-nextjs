'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDialog } from '@/hooks/useAppDialog';

interface DeleteExpenseButtonProps {
  expenseId: string | number;
}

export default function DeleteExpenseButton({ expenseId }: DeleteExpenseButtonProps) {
  const router = useRouter();
  const { confirm, alert, dialog } = useAppDialog();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete expense?',
      message: 'Delete this expense? This cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        await alert({
          title: 'Delete failed',
          message: data.error || data.details || 'Failed to delete expense',
          variant: 'danger',
        });
        return;
      }
      router.push('/admin/financial/expenses');
      router.refresh();
    } catch (e) {
      await alert({
        title: 'Delete failed',
        message: e instanceof Error ? e.message : 'Failed to delete expense',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {dialog}
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        {loading ? 'Deleting...' : 'Delete'}
      </button>
    </>
  );
}
