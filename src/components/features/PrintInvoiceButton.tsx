'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface PrintInvoiceButtonProps {
  className?: string;
}

export default function PrintInvoiceButton({ className }: PrintInvoiceButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(className)}
      onClick={() => window.print()}
      leftIcon={
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
      }
    >
      Print Invoice
    </Button>
  );
}
