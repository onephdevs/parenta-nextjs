'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';
export type ConfirmDialogMode = 'confirm' | 'alert' | 'prompt';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value?: string) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  mode?: ConfirmDialogMode;
  isLoading?: boolean;
  promptDefaultValue?: string;
  promptPlaceholder?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  variant = 'danger',
  mode = 'confirm',
  isLoading = false,
  promptDefaultValue = '',
  promptPlaceholder = '',
}: ConfirmDialogProps) {
  const [promptValue, setPromptValue] = React.useState(promptDefaultValue);

  React.useEffect(() => {
    if (isOpen) {
      setPromptValue(promptDefaultValue);
    }
  }, [isOpen, promptDefaultValue]);

  if (!isOpen) return null;

  const iconStyles = {
    danger: { icon: 'text-red-600', iconBg: 'bg-red-100', Icon: AlertTriangle },
    warning: { icon: 'text-yellow-600', iconBg: 'bg-yellow-100', Icon: AlertTriangle },
    info: { icon: 'text-blue-600', iconBg: 'bg-blue-100', Icon: Info },
    success: { icon: 'text-green-600', iconBg: 'bg-green-100', Icon: CheckCircle2 },
  } as const;

  const styles = iconStyles[variant];
  const Icon = styles.Icon;
  const isAlert = mode === 'alert';
  const isPrompt = mode === 'prompt';
  const resolvedConfirmText =
    confirmText || (isAlert ? 'OK' : isPrompt ? 'Save' : 'Confirm');
  const confirmVariant =
    variant === 'danger' ? 'danger' : variant === 'success' ? 'primary' : 'primary';

  const handleConfirm = () => {
    if (isPrompt) {
      onConfirm(promptValue);
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500/75 transition-opacity"
          onClick={() => !isLoading && onClose()}
          aria-hidden="true"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
        >
          <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <IconButton label="Close" variant="ghost" onClick={onClose} disabled={isLoading}>
              <X className="h-5 w-5" />
            </IconButton>
          </div>

          <div className="sm:flex sm:items-start">
            <div
              className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}
            >
              <Icon className={`h-6 w-6 ${styles.icon}`} />
            </div>

            <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3
                id="confirm-dialog-title"
                className="text-base font-semibold leading-6 text-gray-900"
              >
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{message}</p>
              </div>
              {isPrompt && (
                <div className="mt-4 text-left">
                  <Input
                    autoFocus
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder={promptPlaceholder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirm();
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            <Button
              type="button"
              variant={confirmVariant}
              className="w-full sm:w-auto"
              onClick={handleConfirm}
              isLoading={isLoading}
            >
              {resolvedConfirmText}
            </Button>

            {!isAlert && (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full sm:mt-0 sm:w-auto"
                onClick={onClose}
                isDisabled={isLoading}
              >
                {cancelText}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
