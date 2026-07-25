'use client';

import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dim overlay — only over the main content area on desktop */}
      <div
        className="absolute inset-0 lg:left-64 bg-gray-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: full width on mobile, inset past sidebar (w-64) on lg+ */}
      <div className="absolute inset-y-0 right-0 left-0 lg:left-64 bg-white text-gray-900 flex flex-col shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 truncate">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-600 mt-1 truncate">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
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
                className="text-gray-400 hover:text-gray-900 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 text-gray-900">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
