'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconStyles = {
    danger: { icon: 'text-red-600', iconBg: 'bg-red-100' },
    warning: { icon: 'text-yellow-600', iconBg: 'bg-yellow-100' },
    info: { icon: 'text-blue-600', iconBg: 'bg-blue-100' },
  } as const;

  const confirmVariant = variant === 'info' ? 'primary' : variant === 'warning' ? 'primary' : 'danger';
  const styles = iconStyles[variant];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <IconButton label="Close" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </IconButton>
          </div>

          <div className="sm:flex sm:items-start">
            <div
              className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}
            >
              <AlertTriangle className={`h-6 w-6 ${styles.icon}`} />
            </div>

            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-base font-semibold leading-6 text-gray-900">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600">{message}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            <Button
              type="button"
              variant={confirmVariant}
              className="w-full sm:w-auto"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmText}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full sm:mt-0 sm:w-auto"
              onClick={onClose}
              isDisabled={isLoading}
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
