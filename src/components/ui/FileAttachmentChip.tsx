'use client';

import { Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileAttachmentChipProps {
  fileName: string;
  href?: string | null;
  onDownload?: () => void;
  className?: string;
}

export function FileAttachmentChip({
  fileName,
  href,
  onDownload,
  className,
}: FileAttachmentChipProps) {
  const truncated =
    fileName.length > 28 ? `${fileName.slice(0, 24)}…${fileName.slice(-6)}` : fileName;

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5',
        className
      )}
    >
      <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
      <span className="truncate text-xs font-medium text-gray-800" title={fileName}>
        {truncated}
      </span>
      {href || onDownload ? (
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
          >
            Download
          </a>
        ) : (
          <button
            type="button"
            onClick={onDownload}
            className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
          >
            Download
          </button>
        )
      ) : (
        <span className="flex-shrink-0 text-xs text-gray-400">No file</span>
      )}
    </div>
  );
}
