'use client';

import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface SectionedFormSection<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
}

interface SectionedFormShellBaseProps<T extends string> {
  /** Short label in the left nav header, e.g. "Edit building" */
  eyebrow: string;
  /** Entity name under the eyebrow */
  entityLabel?: string;
  sections: SectionedFormSection<T>[];
  activeSection: T;
  onSectionChange: (id: T) => void;
  children: ReactNode;
  /** Shown in the content header; defaults to active section title/label */
  sectionTitle?: string;
  sectionSubtitle?: string;
  /** Left-nav footer (e.g. Delete) */
  navFooter?: ReactNode;
  /** Extra actions beside Cancel / primary (desktop header) */
  headerExtra?: ReactNode;
  cancelLabel?: string;
  onCancel: () => void;
  primaryLabel: string;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  /** form id for the primary submit button */
  formId?: string;
  /** Or custom primary click when not using form submit */
  onPrimary?: () => void;
  primaryType?: 'submit' | 'button';
  errorBanner?: ReactNode;
  className?: string;
}

export interface SectionedFormModalProps<T extends string>
  extends SectionedFormShellBaseProps<T> {
  mode?: 'modal';
  isOpen: boolean;
}

/** Centered dialog — same sectioned chrome, not fullscreen */
export interface SectionedFormDialogProps<T extends string>
  extends SectionedFormShellBaseProps<T> {
  mode: 'dialog';
  isOpen: boolean;
}

export interface SectionedFormPageProps<T extends string>
  extends SectionedFormShellBaseProps<T> {
  mode: 'page';
  isOpen?: never;
}

export type SectionedFormShellProps<T extends string> =
  | SectionedFormModalProps<T>
  | SectionedFormDialogProps<T>
  | SectionedFormPageProps<T>;

function SectionedFormLayout<T extends string>({
  eyebrow,
  entityLabel,
  sections,
  activeSection,
  onSectionChange,
  children,
  sectionTitle,
  sectionSubtitle,
  navFooter,
  headerExtra,
  cancelLabel = 'Cancel',
  onCancel,
  primaryLabel,
  primaryLoading,
  primaryDisabled,
  formId,
  onPrimary,
  primaryType = 'submit',
  errorBanner,
  className,
  fillViewport,
  compact,
}: SectionedFormShellBaseProps<T> & { fillViewport?: boolean; compact?: boolean }) {
  const activeMeta = sections.find((s) => s.id === activeSection);
  const title = sectionTitle ?? activeMeta?.title ?? activeMeta?.label ?? '';
  const subtitle = sectionSubtitle ?? activeMeta?.subtitle;

  return (
    <div
      className={cn(
        'flex bg-white text-gray-900',
        fillViewport
          ? 'h-[100dvh] max-h-[100dvh]'
          : compact
            ? 'h-full max-h-full overflow-hidden rounded-xl'
            : 'min-h-[calc(100vh-4rem)]',
        className
      )}
    >
      <aside
        className={cn(
          'hidden flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50 md:flex',
          compact ? 'w-44' : 'w-56'
        )}
      >
        <div className={cn('border-b border-gray-200', compact ? 'px-4 py-4' : 'px-5 py-5')}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            {eyebrow}
          </p>
          {entityLabel && (
            <p className="mt-1 truncate text-sm font-medium text-gray-900">{entityLabel}</p>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sections.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-white hover:text-gray-900'
                )}
              >
                {item.icon && (
                  <span className={active ? 'text-blue-600' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            );
          })}
        </nav>

        {navFooter && <div className="border-t border-gray-200 p-3">{navFooter}</div>}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            'flex flex-shrink-0 items-start justify-between gap-4 border-b border-gray-200',
            compact ? 'px-4 py-3 sm:px-5' : 'px-5 py-4 sm:px-8'
          )}
        >
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md p-1 text-gray-400 hover:text-gray-900"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                {eyebrow}
              </p>
            </div>
            <h2 className={cn('font-semibold text-gray-900', compact ? 'text-lg' : 'text-xl')}>
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
            {headerExtra}
            <Button type="button" variant="outline" onClick={onCancel} isDisabled={primaryLoading}>
              {cancelLabel}
            </Button>
            <Button
              type={primaryType}
              form={formId}
              variant="primary"
              isLoading={primaryLoading}
              isDisabled={primaryDisabled}
              onClick={primaryType === 'button' ? onPrimary : undefined}
            >
              {primaryLoading ? 'Saving...' : primaryLabel}
            </Button>
            <button
              type="button"
              onClick={onCancel}
              className="hidden rounded-md p-1 text-gray-400 hover:text-gray-900 md:inline-flex"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50 px-3 py-2 md:hidden">
          {sections.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto bg-white',
            compact ? 'px-4 py-5 sm:px-5' : 'px-5 py-6 sm:px-8'
          )}
        >
          {errorBanner}
          <div className={compact ? 'max-w-none' : 'max-w-2xl'}>{children}</div>
          {navFooter && (
            <div className="mt-8 max-w-2xl border-t border-gray-200 pt-4 md:hidden">
              {navFooter}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Shared CRUD form chrome: left section nav + content header with Cancel/Save.
 * - mode="modal" (default): portaled fullscreen panel beside admin sidebar
 * - mode="dialog": centered floating panel (not fullscreen)
 * - mode="page": fills the admin main content area (no portal)
 */
export default function SectionedFormShell<T extends string>(
  props: SectionedFormShellProps<T>
) {
  const mode = props.mode ?? 'modal';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mode !== 'modal' && mode !== 'dialog') return;
    const isOpen = 'isOpen' in props && props.isOpen;
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mode, props]);

  if (mode === 'page') {
    return <SectionedFormLayout {...props} fillViewport={false} />;
  }

  const isOpen = 'isOpen' in props && props.isOpen;
  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  if (mode === 'dialog') {
    return createPortal(
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:pl-64">
        <div
          className="pointer-events-auto absolute inset-0 bg-gray-900/50 lg:left-64"
          onClick={props.onCancel}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto relative z-10 flex h-[min(720px,90dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
        >
          <SectionedFormLayout {...props} compact />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden">
      <div
        className="pointer-events-auto absolute inset-0 bg-gray-900/50 lg:left-64"
        onClick={props.onCancel}
        aria-hidden="true"
      />
      <div className="pointer-events-auto absolute inset-y-0 left-0 right-0 shadow-xl lg:left-64">
        <SectionedFormLayout {...props} fillViewport />
      </div>
    </div>,
    document.body
  );
}

/** Small card wrapper used inside section bodies (e.g. deposit groups). */
export function SectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
      {title && <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>}
      {children}
    </div>
  );
}
