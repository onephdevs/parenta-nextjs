'use client';

import {
  ChangeEvent,
  DragEvent,
  ReactNode,
  RefObject,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileDropzoneProps {
  /** Called with selected/dropped files (never empty). */
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Mobile camera hint — use "environment" for rear camera (issue photos). */
  capture?: 'environment' | 'user';
  /** Primary line under the icon */
  label?: ReactNode;
  /** Secondary hint (types, size limits) */
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Optional external ref to the hidden file input */
  inputRef?: RefObject<HTMLInputElement | null>;
  children?: ReactNode;
}

/**
 * Presentational dashed drop shell. Feature components own validation + upload APIs.
 */
export function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  capture,
  label,
  hint,
  icon,
  className,
  inputRef,
  children,
}: FileDropzoneProps) {
  const generatedId = useId();
  const localRef = useRef<HTMLInputElement>(null);
  const fileInputRef = inputRef ?? localRef;
  const [isDragOver, setIsDragOver] = useState(false);

  const emitFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (disabled || !list) return;
      const files = Array.from(list);
      if (files.length === 0) return;
      onFiles(multiple ? files : files.slice(0, 1));
    },
    [disabled, multiple, onFiles]
  );

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    emitFiles(e.dataTransfer.files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    emitFiles(e.target.files);
    // Allow re-selecting the same file
    e.target.value = '';
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-labelledby={label ? `${generatedId}-label` : undefined}
      className={cn(
        'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2',
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
          : isDragOver
            ? 'border-gray-900 bg-gray-50'
            : 'cursor-pointer border-gray-300 hover:border-gray-400',
        className
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => {
        if (!disabled) fileInputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
    >
      {children ?? (
        <>
          {icon ?? (
            <Upload
              className={cn(
                'mx-auto mb-3 h-10 w-10',
                disabled ? 'text-gray-300' : 'text-gray-400'
              )}
              aria-hidden
            />
          )}
          {label && (
            <p
              id={`${generatedId}-label`}
              className={cn(
                'text-sm',
                disabled ? 'text-gray-400' : 'text-gray-700'
              )}
            >
              {label}
            </p>
          )}
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        capture={capture}
        onChange={onChange}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
