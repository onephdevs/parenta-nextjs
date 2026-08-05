'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Zap,
  Droplets,
  FileText,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategory,
  UTILITY_TYPE_LABELS,
  normalizeExpenseCategory,
} from '@/lib/constants/bills-expenses';

interface Building {
  id: string;
  name: string;
}

interface UtilityBillRow {
  id: string;
  buildingName?: string;
  roomNumber?: string;
  roomId?: string;
  utilityType: 'electricity' | 'water' | string;
  amount: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  billStatus: string;
  allocationMethod?: string;
}

interface ExpenseRow {
  id: string;
  description: string;
  category: string;
  amount: number;
  expenseDate: string;
  buildingName?: string;
  roomNumber?: string;
  buildingId?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', { month: 'short' })} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function roomUnitLabel(bill: UtilityBillRow) {
  const building = bill.buildingName || 'Building';
  if (bill.roomNumber) return `${building} · ${bill.roomNumber}`;
  return `${building} · Common Area`;
}

function expenseLocationLabel(exp: ExpenseRow) {
  if (!exp.buildingName && !exp.buildingId) return 'All buildings';
  if (exp.buildingName && exp.roomNumber) {
    return `${exp.buildingName} · ${exp.roomNumber}`;
  }
  if (exp.buildingName) return `${exp.buildingName} (building-wide)`;
  return 'All buildings';
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'paid') {
    return (
      <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
        Paid
      </span>
    );
  }
  if (s === 'overdue') {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
      Pending
    </span>
  );
}

export default function BillsExpensesPage() {
  const { showNotification } = useNotifications();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [bills, setBills] = useState<UtilityBillRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [buildingFilter, setBuildingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBuildings = useCallback(async () => {
    try {
      const response = await fetch('/api/buildings');
      if (!response.ok) return;
      const data = await response.json();
      let list: Building[] = [];
      if (data.success && data.data?.buildings) list = data.data.buildings;
      else if (data.success && Array.isArray(data.data)) list = data.data;
      else if (Array.isArray(data.buildings)) list = data.buildings;
      else if (Array.isArray(data)) list = data;
      setBuildings(
        list.map((b: Building & { building_name?: string }) => ({
          id: String(b.id),
          name: b.name || b.building_name || 'Building',
        }))
      );
    } catch {
      setBuildings([]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const billParams = new URLSearchParams({ limit: '100' });
      if (buildingFilter) billParams.set('buildingId', buildingFilter);
      if (typeFilter) billParams.set('utilityType', typeFilter);
      if (statusFilter) billParams.set('billStatus', statusFilter);

      const expParams = new URLSearchParams({ limit: '100' });
      if (buildingFilter) expParams.set('buildingId', buildingFilter);

      const [billsRes, expRes] = await Promise.all([
        fetch(`/api/utility-bills/room?${billParams}`),
        fetch(`/api/expenses?${expParams}`),
      ]);

      if (billsRes.ok) {
        const data = await billsRes.json();
        const rows = data.success ? data.data?.bills || [] : data.bills || [];
        setBills(
          rows.map((b: Record<string, unknown>) => ({
            id: String(b.id),
            buildingName: (b.buildingName || b.building_name) as string | undefined,
            roomNumber: (b.roomNumber || b.room_number) as string | undefined,
            roomId: (b.roomId || b.room_id) as string | undefined,
            utilityType: String(b.utilityType || b.utility_type || 'electricity'),
            amount: Number(b.amount) || 0,
            billingPeriodStart: String(
              b.billingPeriodStart || b.billing_period_start || ''
            ),
            billingPeriodEnd: String(
              b.billingPeriodEnd || b.billing_period_end || ''
            ),
            dueDate: String(b.dueDate || b.due_date || ''),
            billStatus: String(b.billStatus || b.bill_status || 'pending'),
            allocationMethod: b.allocationMethod as string | undefined,
          }))
        );
      } else {
        setBills([]);
      }

      if (expRes.ok) {
        const data = await expRes.json();
        const rows = data.success
          ? data.data?.expenses || []
          : data.expenses || [];
        setExpenses(
          rows.map((e: Record<string, unknown>) => ({
            id: String(e.id),
            description: String(e.description || ''),
            category: String(e.category || e.expenseCategory || 'other'),
            amount: Number(e.amount) || 0,
            expenseDate: String(e.expenseDate || e.expense_date || ''),
            buildingName: (e.buildingName || e.building_name) as string | undefined,
            roomNumber: (e.roomNumber || e.room_number) as string | undefined,
            buildingId: (e.buildingId || e.building_id) as string | undefined,
          }))
        );
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error(error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load bills and expenses',
      });
    } finally {
      setIsLoading(false);
    }
  }, [buildingFilter, typeFilter, statusFilter, showNotification]);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryLabel = (raw: string) => {
    const cat = normalizeExpenseCategory(raw);
    return EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] || raw;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Utility Bills */}
        <section className="mb-14">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Utility Bills
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Per-unit electric &amp; water billing.
              </p>
            </div>
            <Link
              href="/admin/bills-expenses/utility-bills/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add utility bill
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              <option value="">All buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              <option value="">All types</option>
              <option value="electricity">Electric</option>
              <option value="water">Water</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <Link
              href="/admin/bills-expenses/reports"
              className="ml-auto inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
            >
              <FileText className="h-4 w-4" />
              Reports
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Room / Unit</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                      No utility bills yet.{' '}
                      <Link
                        href="/admin/bills-expenses/utility-bills/new"
                        className="font-medium text-gray-900 underline"
                      >
                        Add one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="text-sm text-gray-900">
                      <td className="px-4 py-3.5 font-medium">
                        {roomUnitLabel(bill)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5">
                          {bill.utilityType === 'water' ? (
                            <Droplets className="h-3.5 w-3.5 text-sky-500" />
                          ) : (
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          {UTILITY_TYPE_LABELS[
                            bill.utilityType as 'electricity' | 'water'
                          ] || bill.utilityType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {formatPeriod(
                          bill.billingPeriodStart,
                          bill.billingPeriodEnd
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                        {formatCurrency(bill.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {bill.dueDate ? formatDate(bill.dueDate) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={bill.billStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Expenses */}
        <section>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                Expenses
              </h2>
            </div>
            <Link
              href="/admin/financial/expenses/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Record expense
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Building / Unit</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                      No expenses yet.{' '}
                      <Link
                        href="/admin/financial/expenses/new"
                        className="font-medium text-gray-900 underline"
                      >
                        Record one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="text-sm text-gray-900">
                      <td className="px-4 py-3.5 font-medium">
                        {exp.description}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {categoryLabel(exp.category)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {expenseLocationLabel(exp)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {exp.expenseDate ? formatDate(exp.expenseDate) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                        {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
