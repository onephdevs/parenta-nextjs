'use client';

import { Badge, BadgeTone } from '@/components/ui/Badge';
import { formatAmenityLabel, normalizeAmenities } from '@/lib/format/amenities';
import { cn } from '@/lib/utils';

interface AmenityBadgesProps {
  amenities: unknown;
  emptyLabel?: string;
  className?: string;
  /** When true, show muted empty placeholder instead of rendering nothing */
  showEmpty?: boolean;
  maxVisible?: number;
  tone?: BadgeTone;
}

export function AmenityBadges({
  amenities,
  emptyLabel = 'No amenities listed',
  className,
  showEmpty = true,
  maxVisible = 8,
  tone = 'purple',
}: AmenityBadgesProps) {
  const items = normalizeAmenities(amenities);

  if (items.length === 0) {
    if (!showEmpty) return null;
    return <p className={cn('text-sm text-gray-400 italic', className)}>{emptyLabel}</p>;
  }

  const visible = items.slice(0, maxVisible);
  const remaining = items.length - visible.length;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visible.map((amenity) => (
        <Badge key={amenity} tone={tone} size="sm">
          {formatAmenityLabel(amenity)}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge tone="neutral" size="sm">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
