'use client';

import Skeleton from './Skeleton';

interface SkeletonCardProps {
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
  className?: string;
}

export default function SkeletonCard({ 
  showHeader = true, 
  showFooter = false,
  lines = 3,
  className = '' 
}: SkeletonCardProps) {
  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      {showHeader && (
        <div className="mb-4">
          <Skeleton height={24} width="60%" className="mb-2" />
          <Skeleton height={16} width="40%" />
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            height={16} 
            width={i === lines - 1 ? '80%' : '100%'} 
          />
        ))}
      </div>

      {showFooter && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Skeleton height={32} width="120px" />
        </div>
      )}
    </div>
  );
}

