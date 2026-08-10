'use client';

import { useState, type ReactNode } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';
import {
  CameraCaptureDialog,
  supportsGetUserMedia,
} from '@/components/features/CameraCaptureDialog';

export interface TakePhotoButtonProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  className?: string;
  title?: string;
  description?: string;
  fileNamePrefix?: string;
  preferUserCamera?: boolean;
  /** Optional custom trigger; receives open() */
  renderTrigger?: (open: () => void) => ReactNode;
}

/** Opens in-app camera (getUserMedia) and returns a captured JPEG via onCapture. */
export function TakePhotoButton({
  onCapture,
  disabled = false,
  label = 'Take photo',
  size = 'sm',
  variant = 'outline',
  className,
  title = 'Take photo',
  description = 'Allow camera access if prompted, then capture.',
  fileNamePrefix = 'photo',
  preferUserCamera = false,
  renderTrigger,
}: TakePhotoButtonProps) {
  const { showError } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    if (!supportsGetUserMedia()) {
      showError(
        'This browser cannot open the camera. Use Choose file, or try Chrome/Safari on your phone.'
      );
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(handleOpen)
      ) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          isDisabled={disabled}
          leftIcon={<Camera className="h-4 w-4" />}
          onClick={handleOpen}
        >
          {label}
        </Button>
      )}
      <CameraCaptureDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onCapture={onCapture}
        title={title}
        description={description}
        fileNamePrefix={fileNamePrefix}
        preferUserCamera={preferUserCamera}
      />
    </>
  );
}
