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
      <div className="h-screen w-screen bg-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-1">
              {actionButtons ? (
                <div className="flex-1 flex items-center">
                  {actionButtons}
                </div>
              ) : (
                <>
                  {secondaryButton}
                  {primaryButton}
                </>
              )}
            </div>
            {/* Close X button */}
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 