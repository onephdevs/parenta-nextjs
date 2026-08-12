'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { CameraCaptureDialog } from '@/components/features/CameraCaptureDialog';
import { LightboxImage } from '@/components/ui/ImageLightbox';

const MAX_BYTES = 5 * 1024 * 1024;

export interface ReceiptImageFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
  /** Allow PDF from gallery (camera always captures images). Default true. */
  allowPdf?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  chooseFileLabel?: string;
}

/**
 * Receipt capture field:
 * - Take photo → opens in-app camera (getUserMedia + permission prompt)
 * - Choose file → gallery / screenshots / PDF
 */
export function ReceiptImageField({
  file,
  onChange,
  allowPdf = true,
  disabled = false,
  className,
  label = 'Receipt screenshot',
  required = true,
  chooseFileLabel = 'Choose file',
}: ReceiptImageFieldProps) {
  const { showNotification } = useNotifications();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!file) setPreview(null);
  }, [file]);

  const acceptGallery = allowPdf
    ? 'image/jpeg,image/png,image/webp,application/pdf'
    : 'image/jpeg,image/png,image/webp';

  const applyFile = (next: File) => {
    const isImage = next.type.startsWith('image/');
    const isPdf = next.type === 'application/pdf';
    if (!(isImage || (allowPdf && isPdf))) {
      showNotification({
        type: 'error',
        title: 'Invalid file',
        message: allowPdf
          ? 'Upload a JPEG, PNG, WEBP, or PDF of your receipt'
          : 'Upload a JPEG, PNG, or WEBP photo of your receipt',
      });
      return;
    }
    if (next.size > MAX_BYTES) {
      showNotification({
        type: 'error',
        title: 'File too large',
        message: 'Receipt must be under 5MB',
      });
      return;
    }

    onChange(next);
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(next);
    } else {
      setPreview(null);
    }
  };

  const clear = () => {
    onChange(null);
    setPreview(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const openCamera = () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showNotification({
        type: 'error',
        title: 'Camera unavailable',
        message:
          'This browser cannot open the camera. Use Choose file, or try Chrome/Safari on your phone.',
      });
      return;
    }
    setCameraOpen(true);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-900">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isDisabled={disabled}
            leftIcon={<Camera className="h-4 w-4" />}
            onClick={openCamera}
          >
            Take photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            isDisabled={disabled}
            leftIcon={<ImagePlus className="h-4 w-4" />}
            onClick={() => galleryInputRef.current?.click()}
          >
            {chooseFileLabel}
          </Button>
        </div>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept={acceptGallery}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.files?.[0];
          if (next) applyFile(next);
          e.target.value = '';
        }}
      />

      {file ? (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-600 shadow hover:text-gray-900 disabled:opacity-50"
            aria-label="Remove receipt"
          >
            <X className="h-4 w-4" />
          </button>
          {preview ? (
            <LightboxImage
              src={preview}
              alt="Receipt preview"
              title={file.name || 'Receipt'}
              wrapperClassName="mx-auto block max-w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 rounded-lg"
              className="mx-auto max-h-48 rounded-lg object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 pr-8 text-sm text-gray-700">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
          )}
          <p className="mt-2 text-center text-xs text-gray-500">
            {(file.size / 1024).toFixed(0)} KB · remove to retake or choose another
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
          Take a photo with your camera, or choose a screenshot / PDF (max 5MB)
        </p>
      )}

      <CameraCaptureDialog
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={applyFile}
        title="Take receipt photo"
        description="Allow camera access if prompted, then point at your receipt and capture."
        fileNamePrefix="receipt"
      />
    </div>
  );
}
