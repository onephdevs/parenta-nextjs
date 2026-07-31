'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  loginHref?: string;
}

export function RegistrationSuccessModal({
  isOpen,
  onClose,
  loginHref = '/auth/tenant/signin',
}: RegistrationSuccessModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-success-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white px-8 pb-8 pt-6 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-6 flex justify-center pt-2">
          <Image
            src="/brand/vector.png"
            alt=""
            width={220}
            height={190}
            className="h-auto w-[220px] object-contain"
            priority
          />
        </div>

        <h2
          id="registration-success-title"
          className="text-center text-2xl font-bold text-gray-900"
        >
          Your form has been submitted!
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-gray-600">
          Your information has been successfully received and is now being forwarded to the
          administrator for activation. An email will be sent to you once the account is approved.
        </p>

        <div className="mt-8">
          <Link
            href={loginHref}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#2EC4B6] px-4 py-3.5 text-base font-semibold text-white transition hover:bg-[#26b3a6]"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
