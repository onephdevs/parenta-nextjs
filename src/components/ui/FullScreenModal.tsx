'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primaryButton?: React.ReactNode;
  secondaryButton?: React.ReactNode;
  actionButtons?: React.ReactNode;
}

/**
 * Full-viewport admin form modal that sits beside the desktop sidebar
 * (does not slide under it). On mobile it covers the full screen.
 * Portaled to document.body so overflow/transform ancestors cannot clip it.
 */
export default function FullScreenModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  primaryButton,
  secondaryButton,
  actionButtons,
}: FullScreenModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden">
      {/* Dim overlay — only over the main content area on desktop */}
      <div
        className="pointer-events-auto absolute inset-0 bg-gray-900/50 lg:left-[var(--admin-sidebar-width,16rem)]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: full viewport height; inset past sidebar on lg+ */}
      <div className="pointer-events-auto absolute inset-y-0 bottom-0 left-0 right-0 flex h-[100dvh] max-h-[100dvh] flex-col bg-white text-gray-900 shadow-xl lg:left-[var(--admin-sidebar-width,16rem)]">
        {/* Header */}
        <div className="z-10 flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-900"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="mt-1 truncate text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              {actionButtons ? (
                actionButtons
              ) : (
                <>
                  {secondaryButton}
                  {primaryButton}
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 transition-colors hover:text-gray-900"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl p-6 pb-10 text-gray-900">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
