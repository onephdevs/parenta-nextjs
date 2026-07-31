'use client';

import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';

export function TenantPreviewBanner() {
  const { isPreview, preview, exitPreview } = useTenantPortalGate();

  if (!isPreview) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 text-amber-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-start gap-2 text-sm">
          <Eye className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              Previewing tenant portal
              {preview.tenantLabel ? ` — ${preview.tenantLabel}` : ''}
            </p>
            <p className="text-amber-800">
              Read-only view of what this tenant sees when logged in. Actions like payments are
              disabled.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="flex-shrink-0 border-amber-300 bg-white"
          onClick={() => void exitPreview()}
        >
          <X className="mr-1.5 h-4 w-4" />
          Exit preview
        </Button>
      </div>
    </div>
  );
}
