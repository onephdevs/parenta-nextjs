'use client';

import { useCallback, useMemo, useState } from 'react';
import ConfirmDialog, {
  type ConfirmDialogMode,
  type ConfirmDialogVariant,
} from '@/components/ui/ConfirmDialog';

interface DialogRequest {
  mode: ConfirmDialogMode;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  promptDefaultValue?: string;
  promptPlaceholder?: string;
  resolve: (value: boolean | string | null) => void;
}

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
};

type AlertOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  variant?: ConfirmDialogVariant;
};

type PromptOptions = {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
};

/**
 * Promise-based replacement for window.alert / confirm / prompt.
 * Render `{dialog}` once in the component tree.
 */
export function useAppDialog() {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  const closeWith = useCallback((value: boolean | string | null) => {
    setRequest((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setRequest({
        mode: 'confirm',
        title: opts.title || 'Please confirm',
        message: opts.message,
        confirmText: opts.confirmText,
        cancelText: opts.cancelText,
        variant: opts.variant || 'danger',
        resolve: (value) => resolve(Boolean(value)),
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<void>((resolve) => {
      setRequest({
        mode: 'alert',
        title: opts.title || 'Notice',
        message: opts.message,
        confirmText: opts.confirmText || 'OK',
        variant: opts.variant || 'info',
        resolve: () => resolve(),
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<string | null>((resolve) => {
      setRequest({
        mode: 'prompt',
        title: opts.title || 'Input required',
        message: opts.message,
        confirmText: opts.confirmText || 'Save',
        cancelText: opts.cancelText || 'Cancel',
        variant: 'info',
        promptDefaultValue: opts.defaultValue || '',
        promptPlaceholder: opts.placeholder || '',
        resolve: (value) => resolve(typeof value === 'string' ? value : null),
      });
    });
  }, []);

  const dialog = useMemo(() => {
    if (!request) return null;
    return (
      <ConfirmDialog
        isOpen
        mode={request.mode}
        title={request.title}
        message={request.message}
        confirmText={request.confirmText}
        cancelText={request.cancelText}
        variant={request.variant}
        promptDefaultValue={request.promptDefaultValue}
        promptPlaceholder={request.promptPlaceholder}
        onClose={() => closeWith(request.mode === 'prompt' ? null : false)}
        onConfirm={(value) => {
          if (request.mode === 'prompt') {
            closeWith(value ?? '');
          } else {
            closeWith(true);
          }
        }}
      />
    );
  }, [request, closeWith]);

  return { confirm, alert, prompt, dialog };
}
