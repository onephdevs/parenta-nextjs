'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  /** When set, uses buttons instead of URL links (client-side lists). */
  onPageChange?: (page: number) => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  createPageURL,
}: PaginationProps & { createPageURL?: (page: number) => string }) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    if (totalItems === 0) return null;
    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <p className="text-sm text-gray-900">
          Showing <span className="font-medium">{totalItems}</span> result
          {totalItems === 1 ? '' : 's'}
        </p>
      </div>
    );
  }

  if (totalPages <= 1) return null;

  const pages = getPageNumbers();

  const PageControl = ({
    page,
    children,
    className,
    disabled,
  }: {
    page: number;
    children: React.ReactNode;
    className: string;
    disabled?: boolean;
  }) => {
    if (disabled) {
      return <span className={className}>{children}</span>;
    }
    if (onPageChange) {
      return (
        <button type="button" onClick={() => onPageChange(page)} className={className}>
          {children}
        </button>
      );
    }
    if (createPageURL) {
      return (
        <Link href={createPageURL(page)} className={className}>
          {children}
        </Link>
      );
    }
    return <span className={className}>{children}</span>;
  };

  const prevClass =
    'relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50';
  const nextClass =
    'relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50';
  const disabledClass =
    'relative inline-flex cursor-not-allowed items-center border border-gray-300 bg-gray-50 px-2 py-2 text-sm font-medium text-gray-300';

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <PageControl
          page={currentPage - 1}
          disabled={currentPage <= 1}
          className={
            currentPage <= 1
              ? 'relative inline-flex cursor-not-allowed items-center rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400'
              : 'relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50'
          }
        >
          Previous
        </PageControl>
        <PageControl
          page={currentPage + 1}
          disabled={currentPage >= totalPages}
          className={
            currentPage >= totalPages
              ? 'relative ml-3 inline-flex cursor-not-allowed items-center rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400'
              : 'relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50'
          }
        >
          Next
        </PageControl>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-900">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </p>
        <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          <PageControl
            page={currentPage - 1}
            disabled={currentPage <= 1}
            className={currentPage <= 1 ? `${disabledClass} rounded-l-md` : prevClass}
          >
            <span className="sr-only">Previous</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </PageControl>

          {pages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900"
                >
                  ...
                </span>
              );
            }
            const pageNumber = page as number;
            const isCurrent = pageNumber === currentPage;
            return (
              <PageControl
                key={pageNumber}
                page={pageNumber}
                className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                  isCurrent
                    ? 'z-10 border-purple-500 bg-purple-50 text-purple-600'
                    : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                {pageNumber}
              </PageControl>
            );
          })}

          <PageControl
            page={currentPage + 1}
            disabled={currentPage >= totalPages}
            className={currentPage >= totalPages ? `${disabledClass} rounded-r-md` : nextClass}
          >
            <span className="sr-only">Next</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </PageControl>
        </nav>
      </div>
    </div>
  );
}

function PaginationLinks(props: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return <PaginationControls {...props} createPageURL={createPageURL} />;
}

export default function Pagination(props: PaginationProps) {
  // Controlled mode skips useSearchParams (avoids Suspense requirement on client lists)
  if (props.onPageChange) {
    return <PaginationControls {...props} />;
  }
  return <PaginationLinks {...props} />;
}
