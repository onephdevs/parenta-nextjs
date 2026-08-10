'use client';

import { Heart, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MaintenanceReactionCounts {
  like: number;
  heart: number;
  myReaction: 'like' | 'heart' | null;
}

interface MaintenanceReactionBarProps {
  updateId: string;
  reactions: MaintenanceReactionCounts;
  disabled?: boolean;
  onToggle: (updateId: string, reaction: 'like' | 'heart') => void;
  className?: string;
}

export function MaintenanceReactionBar({
  updateId,
  reactions,
  disabled,
  onToggle,
  className,
}: MaintenanceReactionBarProps) {
  return (
    <div className={cn('mt-2 flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(updateId, 'like')}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition',
          reactions.myReaction === 'like'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        aria-pressed={reactions.myReaction === 'like'}
        aria-label="Like"
      >
        <ThumbsUp
          className={cn(
            'h-3.5 w-3.5',
            reactions.myReaction === 'like' && 'fill-current'
          )}
        />
        {reactions.like > 0 ? reactions.like : 'Like'}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(updateId, 'heart')}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition',
          reactions.myReaction === 'heart'
            ? 'border-rose-300 bg-rose-50 text-rose-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        aria-pressed={reactions.myReaction === 'heart'}
        aria-label="Heart"
      >
        <Heart
          className={cn(
            'h-3.5 w-3.5',
            reactions.myReaction === 'heart' && 'fill-current'
          )}
        />
        {reactions.heart > 0 ? reactions.heart : 'Heart'}
      </button>
    </div>
  );
}
