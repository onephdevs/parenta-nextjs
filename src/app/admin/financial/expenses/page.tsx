'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import Pagination from '@/components/ui/Pagination';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  formatReportCategoryLabel,
  type ExpenseCategory,
} from '@/lib/constants/bills-expenses';
import {
  formatPaymentNotesDisplay,
  formatPaymentNotesLabel,
} from '@/lib/format-payment-notes';
import {
  AlertCircle,
  Calendar,
  DollarSign,
  Eye,
  PhilippinePeso,
  Plus,
  Receipt,
  Search,
} from 'lucide-react';

const PAGE_SIZE = 20;

interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  description: string;
  vendor?: string;
  vendorName?: string;
  expenseDate: string;
  notes?: string;
  buildingName?: string;
  roomNumber?: string;
}

interface BuildingOption {
  id: string;
  name: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function categoryBadgeClass(category: string) {
  switch (category) {
    case 'cleaning':
      return 'bg-teal-100 text-teal-800';
    case 'maintenance':
      return 'bg-red-100 text-red-800';
    case 'repair':
      return 'bg-orange-100 text-orange-800';
    case 'upgrade':
      return 'bg-indigo-100 text-indigo-800';
    case 'garbage_collection':
      return 'bg-amber-100 text-amber-800';
    case 'other':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function ExpensesPage() {
  const { showNotification } = useNotifications();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const fetchBuildings = useCallback(async () => {
    try {
      const response = await fetch('/api/buildings');
      if (!response.ok) {
        setBuildings([]);
        return;
      }
      const data = await response.json();
      let list: BuildingOption[] = [];
      if (data.success && data.data?.buildings) {
        list = data.data.buildings;
      } else if (Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data.buildings)) {
        list = data.buildings;
      } else if (Array.isArray(data)) {
        list = data;
      }
      setBuildings(
        list.map((b) => ({
          id: String(b.id),
          name: b.name || 'Unknown',
        }))
      );
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setBuildings([]);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(currentPage));
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (categoryFilter) params.set('category', categoryFilter);
      if (buildingFilter) params.set('buildingId', buildingFilter);
      if (vendorFilter.trim()) params.set('vendor', vendorFilter.trim());
      if (dateFromFilter) params.set('dateFrom', dateFromFilter);
      if (dateToFilter) params.set('dateTo', dateToFilter);

      const response = await fetch(`/api/expenses?${params.toString()}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch expenses');
      }

      const rows: ExpenseRow[] = (data.expenses || []).map(
        (e: Record<string, unknown>) => ({
          id: String(e.id),
          category: String(e.category || 'other'),
          amount: Number(e.amount) || 0,
          description: String(e.description || ''),
          vendor: (e.vendor || e.vendorName || undefined) as string | undefined,
          vendorName: (e.vendorName || e.vendor || undefined) as string | undefined,
          expenseDate: e.expenseDate
            ? String(e.expenseDate)
            : new Date().toISOString(),
          notes: e.notes ? String(e.notes) : undefined,
          buildingName: e.buildingName ? String(e.buildingName) : undefined,
          roomNumber: e.roomNumber ? String(e.roomNumber) : undefined,
        })
      );

      setExpenses(rows);
      setTotalItems(Number(data.total) || rows.length);
      setTotalPages(Math.max(1, Number(data.totalPages) || 1));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
      setTotalItems(0);
      setTotalPages(1);
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to fetch expenses',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    searchTerm,
    categoryFilter,
    buildingFilter,
    vendorFilter,
    dateFromFilter,
    dateToFilter,
    currentPage,
  ]);

  useEffect(() => {
    void fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, buildingFilter, vendorFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchExpenses();
    }, searchTerm ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchExpenses, searchTerm]);

  const summary = useMemo(() => {
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = expenses.filter((e) => new Date(e.expenseDate) >= monthStart);
    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);
    }
    let topCategory = 'N/A';
    let topAmount = 0;
    for (const [cat, amount] of byCategory) {
      if (amount > topAmount) {
        topAmount = amount;
        topCategory = formatReportCategoryLabel(cat);
      }
    }
    return {
      total: totalItems,
      totalAmount,
      monthCount: thisMonth.length,
      monthAmount: thisMonth.reduce((sum, e) => sum + e.amount, 0),
      topCategory,
      average: expenses.length > 0 ? totalAmount / expenses.length : 0,
    };
  }, [expenses, totalItems]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Expenses"
        description="Track operating costs across properties"
        actions={
          <Link href="/admin/financial/expenses/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Record Expense</Button>
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total Amount"
          value={formatCurrency(summary.totalAmount)}
          footer={`${summary.total} expenses`}
          icon={<DollarSign className="h-8 w-8 text-red-600" />}
        />
        <ListSummaryCard
          title="This Month"
          value={formatCurrency(summary.monthAmount)}
          footer={`${summary.monthCount} on this page`}
          icon={<Calendar className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Top Category"
          value={summary.topCategory}
          footer="on this page"
          icon={<AlertCircle className="h-8 w-8 text-amber-600" />}
        />
        <ListSummaryCard
          title="Average"
          value={formatCurrency(summary.average)}
          footer="per expense on this page"
          icon={<PhilippinePeso className="h-8 w-8 text-green-600" />}
        />
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <FormField label="Search" htmlFor="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Description or vendor..."
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField label="Category" htmlFor="category">
            <Select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Building" htmlFor="building">
            <Select
              id="building"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            >
              <option value="">All Buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Vendor" htmlFor="vendor">
            <Input
              type="text"
              id="vendor"
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              placeholder="Filter by vendor..."
            />
          </FormField>

          <FormField label="From Date" htmlFor="dateFrom">
            <Input
              type="date"
              id="dateFrom"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
            />
          </FormField>

          <FormField label="To Date" htmlFor="dateTo">
            <Input
              type="date"
              id="dateTo"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />
          </FormField>
        </div>
      </Card>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {isLoading ? (
          <div className="p-8 text-center text-gray-900">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="mb-2 text-lg font-medium">No expenses found</p>
            <p className="mb-4 text-sm text-gray-600">Get started by recording a new expense</p>
            <Link href="/admin/financial/expenses/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Record Expense</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {expenses.map((expense) => {
                  const notesDisplay = formatPaymentNotesDisplay(expense.notes);
                  const descriptionLabel = formatPaymentNotesLabel(
                    expense.description,
                    expense.description || '—'
                  );
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {descriptionLabel}
                        </div>
                        {notesDisplay.label && notesDisplay.label !== descriptionLabel && (
                          <div className="mt-0.5 text-xs text-gray-500">{notesDisplay.label}</div>
                        )}
                        {notesDisplay.billingPeriodLabel && (
                          <div className="mt-0.5 text-xs text-gray-500">
                            Period: {notesDisplay.billingPeriodLabel}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryBadgeClass(expense.category)}`}
                        >
                          {formatReportCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {expense.buildingName ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {expense.buildingName}
                            </div>
                            {expense.roomNumber && (
                              <div className="text-sm text-gray-600">
                                Room {expense.roomNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {expense.vendorName || expense.vendor || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/admin/financial/expenses/${expense.id}`}
                          className="inline-flex text-gray-500 hover:text-gray-900"
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && expenses.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
