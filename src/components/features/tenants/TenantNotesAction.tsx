'use client';

import { AddNotesButton } from '@/components/features/notes/EntityNotesModal';

interface TenantNotesActionProps {
  tenantId: string;
  tenantName: string;
}

/** Header shortcut — full history lives in the Notes section on the page. */
export default function TenantNotesAction({
  tenantId,
  tenantName,
}: TenantNotesActionProps) {
  return (
    <AddNotesButton
      entityType="tenant"
      entityId={tenantId}
      entityLabel={tenantName}
      label="Add note"
      onSaved={() => {
        window.location.reload();
      }}
    />
  );
}
