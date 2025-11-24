'use client';

import Skeleton from './Skeleton';

interface SkeletonListProps {
  items?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  className?: string;
}

export default function SkeletonList({ 
  items = 5, 
  showAvatar = false,
  showActions = false,
  className = '' 
}: SkeletonListProps) {
  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <ul className="divide-y divide-gray-200">
        {Array.from({ length: items }).map((_, i) => (
          <li key={i} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {showAvatar && (
                  <Skeleton width={40} height={40} rounded="full" />
                )}
                <div className="flex-1 space-y-2">
                  <Skeleton height={16} width="40%" />
                  <Skeleton height={14} width="60%" />
                </div>
              </div>
              {showActions && (
                <div className="flex items-center space-x-2">
                  <Skeleton height={32} width={80} />
                  <Skeleton height={32} width={80} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

