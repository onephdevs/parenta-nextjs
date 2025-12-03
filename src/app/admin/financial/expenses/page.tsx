import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getExpenses, getExpenseSummary } from '@/lib/api/expenses';
import { getAllBuildings } from '@/lib/api/buildings';

interface SearchParams {
  page?: string;
  search?: string;
  category?: string;
  building?: string;
  vendor?: string;
}

interface ExpensesPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const page = parseInt(params.page || '1');
  const search = params.search || '';
  const category = params.category || '';
  const buildingId = params.building || '';
  const vendor = params.vendor || '';

  // Build filters
  const filters: Record<string, unknown> = {};
  if (category) filters.category = category;
  if (buildingId) filters.buildingId = parseInt(buildingId);
  if (vendor) filters.vendor = vendor;
  if (search) filters.search = search;

  // Fetch data with error handling
  let expensesData, buildings, summary;
  
  try {
    const [expensesResult, buildingsData, summaryResult] = await Promise.all([
      getExpenses(filters, page, 20),
      getAllBuildings({ limit: 1000 }), // Get all buildings for dropdown
      getExpenseSummary()
    ]);
    
    expensesData = expensesResult;
    buildings = buildingsData.buildings; // Extract buildings array from paginated response
    summary = summaryResult;
  } catch (error) {
    console.error('Error loading expenses:', error);
    // Return empty data if there's an error
    expensesData = {
      expenses: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    };
    buildings = [];
    summary = {
      totalExpenses: 0,
      totalAmount: 0,
      monthlyAmount: 0,
      monthlyExpenses: 0,
      categoryBreakdown: [],
      monthlyTrend: []
    };
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      case 'utilities':
        return 'bg-blue-100 text-blue-800';
      case 'supplies':
        return 'bg-green-100 text-green-800';
      case 'services':
        return 'bg-purple-100 text-purple-800';
      case 'insurance':
        return 'bg-yellow-100 text-yellow-800';
      case 'taxes':
        return 'bg-orange-100 text-orange-800';
      case 'other':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'maintenance':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'utilities':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'supplies':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'services':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const totalPages = Math.ceil(expensesData.total / 20);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/financial"
                className="text-gray-900 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/admin/financial/expenses/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Record Expense
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Total Expenses</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.totalAmount)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">{summary.totalExpenses} expenses</span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4h-8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v13a2 2 0 002 2h4a2 2 0 002-2V7H8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">This Month</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.monthlyAmount)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">{summary.monthlyExpenses} expenses</span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Top Category</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 
                        ? summary.categoryBreakdown[0].category 
                        : 'N/A'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">
                  {summary.categoryBreakdown && summary.categoryBreakdown.length} categories
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Average Expense</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {summary.totalExpenses > 0 
                        ? formatCurrency(summary.totalAmount / summary.totalExpenses)
                        : formatCurrency(0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">per expense</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-900 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  name="search"
                  id="search"
                  defaultValue={search}
                  placeholder="Search expenses..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  id="category"
                  defaultValue={category}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                >
                  <option value="">All Categories</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="utilities">Utilities</option>
                  <option value="supplies">Supplies</option>
                  <option value="services">Services</option>
                  <option value="insurance">Insurance</option>
                  <option value="taxes">Taxes</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="building" className="block text-sm font-medium text-gray-900 mb-1">
                  Building
                </label>
                <select
                  name="building"
                  id="building"
                  defaultValue={buildingId}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                >
                  <option value="">All Buildings</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="vendor" className="block text-sm font-medium text-gray-900 mb-1">
                  Vendor
                </label>
                <input
                  type="text"
                  name="vendor"
                  id="vendor"
                  defaultValue={vendor}
                  placeholder="Filter by vendor..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Filter
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Expenses ({expensesData.total})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-900">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, expensesData.total)} of {expensesData.total} expenses
            </p>
          </div>

          {expensesData.expenses.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
              <p className="mt-1 text-sm text-gray-900">Get started by recording a new expense.</p>
              <div className="mt-6">
                <Link
                  href="/admin/financial/expenses/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Record Expense
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {expensesData.expenses.map((expense) => (
                <li key={expense.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            {getCategoryIcon(expense.category)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {expense.description}
                            </p>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeClass(expense.category)}`}>
                              {expense.category}
                            </span>
                            <span className="ml-2 text-lg font-semibold text-gray-900">
                              {formatCurrency(expense.amount)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-900">
                            {expense.vendor && (
                              <>
                                <p>{expense.vendor}</p>
                                <span className="mx-2">•</span>
                              </>
                            )}
                            {expense.buildingName && (
                              <>
                                <p>{expense.buildingName}</p>
                                {expense.roomNumber && <span> {expense.roomNumber}</span>}
                                <span className="mx-2">•</span>
                              </>
                            )}
                            <p>{formatDate(expense.expenseDate)}</p>
                          </div>
                          {expense.notes && (
                            <p className="mt-1 text-sm text-gray-900">{expense.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/financial/expenses/${expense.id}`}
                          className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              {page > 1 && (
                <Link
                  href={`?page=${page - 1}&search=${search}&category=${category}&building=${buildingId}&vendor=${vendor}`}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?page=${page + 1}&search=${search}&category=${category}&building=${buildingId}&vendor=${vendor}`}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-900">
                  Showing <span className="font-medium">{((page - 1) * 20) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * 20, expensesData.total)}</span> of{' '}
                  <span className="font-medium">{expensesData.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {page > 1 && (
                    <Link
                      href={`?page=${page - 1}&search=${search}&category=${category}&building=${buildingId}&vendor=${vendor}`}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  )}
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Link
                        key={pageNum}
                        href={`?page=${pageNum}&search=${search}&category=${category}&building=${buildingId}&vendor=${vendor}`}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === page
                            ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}

                  {page < totalPages && (
                    <Link
                      href={`?page=${page + 1}&search=${search}&category=${category}&building=${buildingId}&vendor=${vendor}`}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 