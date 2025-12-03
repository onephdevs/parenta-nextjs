'use client';

import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface AdminFullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primaryButton?: React.ReactNode;
  secondaryButton?: React.ReactNode;
  actionButtons?: React.ReactNode;
}

export default function AdminFullScreenModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  primaryButton,
  secondaryButton,
  actionButtons,
}: AdminFullScreenModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay that covers everything */}
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
      
      {/* Modal content - positioned to respect sidebar (256px on desktop when open) */}
      <div className="absolute inset-y-0 right-0 left-0 lg:left-64 bg-white text-gray-900 flex flex-col shadow-xl z-50">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-900 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            {actionButtons ? (
              <>
                {actionButtons}
                {/* Close X button */}
                <button
                  onClick={onClose}
                  className="ml-4 text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {secondaryButton}
                {primaryButton}
                {/* Close X button */}
                <button
                  onClick={onClose}
                  className="ml-4 text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
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

