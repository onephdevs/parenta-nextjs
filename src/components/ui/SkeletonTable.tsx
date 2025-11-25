'use client';

import Skeleton from './Skeleton';

interface SkeletonTableProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  className?: string;
}

export default function SkeletonTable({ 
  columns = 5, 
  rows = 5,
  showHeader = true,
  className = '' 
}: SkeletonTableProps) {
  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {showHeader && (
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    <Skeleton height={16} width="80%" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    <Skeleton height={16} width={colIndex === 0 ? '60%' : '80%'} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

