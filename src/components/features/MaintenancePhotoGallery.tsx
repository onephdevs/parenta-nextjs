'use client';

import { Camera, ImageIcon } from 'lucide-react';

export interface MaintenancePhotoItem {
  id: string;
  fileName?: string;
  url: string;
  mimeType?: string;
}

interface MaintenancePhotoGalleryProps {
  photos: MaintenancePhotoItem[];
  emptyLabel?: string;
  className?: string;
}

export function MaintenancePhotoGallery({
  photos,
  emptyLabel,
  className,
}: MaintenancePhotoGalleryProps) {
  if (!photos.length) {
    if (!emptyLabel) return null;
    return (
      <p className="flex items-center gap-1.5 text-sm text-gray-500">
        <ImageIcon className="h-4 w-4" />
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
        <Camera className="h-3.5 w-3.5" />
        Photos ({photos.length})
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.id}>
            <a
              href={photo.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-lg border border-gray-200 bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              title={photo.fileName || 'Issue photo'}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.fileName || 'Maintenance issue photo'}
                className="h-28 w-full object-cover transition group-hover:opacity-90"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
