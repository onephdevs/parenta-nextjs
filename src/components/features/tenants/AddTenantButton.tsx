'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/Button';
import TenantForm from '@/components/features/TenantForm';

export interface AddTenantButtonProps {
  buildingId?: string;
  roomId?: string;
  /** When true (or when both building + room are set), housing fields are locked. */
  lockHousing?: boolean;
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  leftIcon?: ReactNode;
  /** Extra content inside the default button (e.g. vacant badge). */
  children?: ReactNode;
  onCreated?: (tenantId: string) => void;
  /**
   * When true (default), go to the new tenant page after create.
   * Set false to stay in place (e.g. reservation “Add person”).
   */
  redirectAfterCreate?: boolean;
  /**
   * Soft-refresh current route after create. Ignored when redirecting to tenant.
   * Default false when redirecting; true only if redirectAfterCreate is false.
   */
  refreshOnCreated?: boolean;
  /**
   * Create a person record only — hide housing/lease so they are not assigned
   * a room (reservation holds the unit until convert).
   */
  omitHousing?: boolean;
  /**
   * Custom open trigger. Use for non-Button affordances (unit cards, text links).
   * When provided, the default Button is not rendered.
   */
  renderTrigger?: (open: () => void) => ReactNode;
}

/**
 * Canonical “Add Tenant” control — always opens TenantForm as a modal
 * instead of navigating to /admin/tenants/new.
 */
export default function AddTenantButton({
  buildingId,
  roomId,
  lockHousing,
  label = 'Add Tenant',
  variant = 'primary',
  size = 'md',
  className,
  leftIcon,
  children,
  onCreated,
  redirectAfterCreate = true,
  refreshOnCreated,
  omitHousing = false,
  renderTrigger,
}: AddTenantButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const housingLocked =
    lockHousing ?? Boolean(buildingId && roomId);
  const shouldRefresh =
    refreshOnCreated ?? redirectAfterCreate === false;

  const handleCreated = (tenantId: string) => {
    setOpen(false);
    onCreated?.(tenantId);
    if (shouldRefresh) {
      router.refresh();
    }
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          leftIcon={leftIcon ?? <Plus className="h-4 w-4" />}
          onClick={() => setOpen(true)}
        >
          {label}
          {children}
        </Button>
      )}

      <TenantForm
        mode="modal"
        isOpen={open}
        onClose={() => setOpen(false)}
        initialBuildingId={buildingId}
        initialRoomId={roomId}
        lockHousing={housingLocked}
        omitHousing={omitHousing}
        redirectAfterCreate={redirectAfterCreate}
        onCreated={handleCreated}
      />
    </>
  );
}
