'use client';

import { useEffect, useRef, useState } from 'react';
import { Ban, Camera, ImagePlus, Pencil, RefreshCw, SquarePen } from 'lucide-react';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import { useNotifications } from '@/hooks/useNotifications';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { cn } from '@/lib/utils';
import type { TenantProfileData } from './types';
import { derivePersonBadge, formatProfileDate, formatUnitDisplay, fullName } from './utils';

export interface TenantSummaryCardProps {
  tenant: TenantProfileData;
  onManageLease?: (action: 'edit' | 'renew' | 'terminate') => void;
  onTenantUpdated?: (patch: Partial<TenantProfileData>) => void;
  className?: string;
}

export function TenantSummaryCard({
  tenant,
  onManageLease,
  onTenantUpdated,
  className,
}: TenantSummaryCardProps) {
  const { showNotification, updateNotification } = useNotifications();
  const name = fullName(tenant.firstName, tenant.lastName);
  const badge = derivePersonBadge(tenant);
  const assignment = tenant.currentAssignment;
  const [balance, setBalance] = useState<number | null>(null);
  const [deposits, setDeposits] = useState<number | null>(
    assignment?.depositPaid ?? tenant.securityDeposit ?? null
  );
  const [photoUrl, setPhotoUrl] = useState(tenant.profilePictureUrl || null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoMenuRef = useRef<HTMLDivElement>(null);
  const openCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setPhotoUrl(tenant.profilePictureUrl || null);
  }, [tenant.profilePictureUrl]);

  useEffect(() => {
    if (!photoMenuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!photoMenuRef.current?.contains(e.target as Node)) setPhotoMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhotoMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [photoMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [invRes, depRes] = await Promise.all([
          fetch(`/api/invoices?tenantId=${encodeURIComponent(tenant.id)}`, {
            credentials: 'include',
          }),
          fetch(`/api/deposit-ledger/${encodeURIComponent(tenant.id)}?type=balance`, {
            credentials: 'include',
          }),
        ]);

        if (invRes.ok) {
          const data = await invRes.json();
          const raw = Array.isArray(data.invoices)
            ? data.invoices
            : Array.isArray(data.data)
              ? data.data
              : Array.isArray(data.data?.invoices)
                ? data.data.invoices
                : [];
          const outstanding = raw.reduce((sum: number, inv: Record<string, unknown>) => {
            const status = String(inv.status ?? inv.invoice_status ?? '').toLowerCase();
            if (status === 'paid' || status === 'cancelled' || status === 'void') return sum;
            const due = Number(
              inv.balanceDue ??
                inv.remainingAmount ??
                inv.balance_due ??
                inv.totalAmount ??
                inv.amount ??
                0
            );
            return sum + (Number.isFinite(due) ? due : 0);
          }, 0);
          if (!cancelled) setBalance(outstanding);
        }

        if (depRes.ok) {
          const response = await depRes.json();
          const dep =
            typeof response.data === 'number'
              ? response.data
              : Number(response.data?.balance ?? response.balance ?? 0);
          if (!cancelled && Number.isFinite(dep)) setDeposits(dep);
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant.id]);

  const uploadPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification({
        type: 'error',
        title: 'Invalid file',
        message: 'Please select an image file',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File too large',
        message: 'Image must be less than 5MB',
      });
      return;
    }

    setUploadingPhoto(true);
    setPhotoMenuOpen(false);
    const loadingId = showNotification({
      type: 'loading',
      title: 'Uploading photo…',
      message: 'Updating profile picture',
    });

    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/tenants/${tenant.id}/profile-picture`, {
        method: 'POST',
        body,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.details || json.error || 'Upload failed');
      }
      const url = String(json.data?.url || '');
      if (url) {
        setPhotoUrl(url);
        onTenantUpdated?.({ profilePictureUrl: url });
      }
      updateNotification(loadingId, {
        type: 'success',
        title: 'Photo updated',
        message: 'Profile picture saved',
      });
    } catch (e) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Upload failed',
        message: e instanceof Error ? e.message : 'Could not upload photo',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const leaseStart = assignment?.startDate || tenant.leaseStartDate || null;
  const leaseEnd = assignment?.endDate || tenant.leaseEndDate || null;
  const activeLeaseId = assignment?.id;

  return (
    <aside
      className={cn(
        'flex h-fit flex-col overflow-visible rounded-2xl border border-gray-200 bg-white p-6',
        className
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar
            name={name}
            src={photoUrl}
            size="lg"
            className="h-[88px] w-[88px] text-2xl"
          />
          {uploadingPhoto ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : null}

          <div ref={photoMenuRef} className="absolute -bottom-1 -right-1">
            <button
              type="button"
              aria-label="Edit profile photo"
              aria-haspopup="menu"
              aria-expanded={photoMenuOpen}
              disabled={uploadingPhoto}
              onClick={() => setPhotoMenuOpen((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            {photoMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1.5 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-left shadow-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                  onClick={() => {
                    setPhotoMenuOpen(false);
                    openCameraRef.current?.();
                  }}
                >
                  <Camera className="h-4 w-4 text-gray-500" />
                  Take photo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                  onClick={() => {
                    setPhotoMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <ImagePlus className="h-4 w-4 text-gray-500" />
                  Upload
                </button>
              </div>
            ) : null}
          </div>

          {/* Keep mounted so camera dialog is not destroyed when the menu closes */}
          <TakePhotoButton
            disabled={uploadingPhoto}
            onCapture={(file) => void uploadPhoto(file)}
            title="Take profile photo"
            description="Allow camera access if prompted, then capture."
            fileNamePrefix="profile"
            preferUserCamera
            renderTrigger={(open) => {
              openCameraRef.current = open;
              return null;
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPhoto(file);
              e.target.value = '';
            }}
          />
        </div>

        <h2 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">{name}</h2>
        <div className="mt-2">
          <StatusBadge
            status={badge}
            tone="neutral"
            className="[&>span]:rounded-md [&>span]:!bg-white [&>span]:!font-medium [&>span]:!text-gray-900 [&>span]:ring-1 [&>span]:ring-gray-900"
          />
        </div>
        {assignment ? (
          <div className="mt-4">
            <p className="text-base font-semibold text-gray-900">
              {formatUnitDisplay(assignment.roomNumber)}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">{assignment.buildingName}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No active unit</p>
        )}
      </div>

      <div className="my-6 border-t border-gray-200" />

      <div>
        <h3 className="text-base font-semibold text-gray-900">Balance Overview</h3>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Current Balance</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-gray-900">
              {balance == null ? '…' : formatCurrency(balance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Deposits</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-gray-900">
              {deposits == null ? '…' : formatCurrency(deposits)}
            </p>
          </div>
        </div>
      </div>

      <div className="my-5 border-t border-gray-200" />

      <div>
        <h3 className="text-base font-semibold text-gray-900">Lease Duration</h3>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Start Date</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatProfileDate(leaseStart)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">End Date</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatProfileDate(leaseEnd)}
            </p>
          </div>
        </div>
      </div>

      <div className="my-5 border-t border-gray-200" />

      <div className="relative z-10 grid grid-cols-1 gap-2.5 overflow-visible sm:grid-cols-2">
        <ActionDropdown
          label="Lease"
          trigger="outline"
          items={[
            {
              id: 'edit',
              label: 'Edit',
              icon: <SquarePen className="h-4 w-4 shrink-0 text-gray-500" />,
              href: activeLeaseId
                ? `/admin/tenants/${tenant.id}/leases/${activeLeaseId}/edit`
                : `/admin/tenants/${tenant.id}/edit`,
              onSelect: () => onManageLease?.('edit'),
            },
            {
              id: 'renew',
              label: 'Renew',
              icon: <RefreshCw className="h-4 w-4 shrink-0 text-emerald-600" />,
              href: activeLeaseId
                ? `/admin/tenants/${tenant.id}/leases/${activeLeaseId}/renew`
                : undefined,
              disabled: !activeLeaseId,
              onSelect: () => onManageLease?.('renew'),
            },
            {
              id: 'terminate',
              label: 'Terminate',
              icon: <Ban className="h-4 w-4 shrink-0 text-red-500" />,
              href: activeLeaseId
                ? `/admin/lease-management/${activeLeaseId}?action=terminate`
                : undefined,
              disabled: !activeLeaseId,
              onSelect: () => onManageLease?.('terminate'),
            },
          ]}
        />
        <ActionDropdown
          label="Pay"
          trigger="solid"
          align="right"
          items={[
            {
              id: 'regular',
              label: 'Regular Payment',
              href: `/admin/financial/payments/new?tenantId=${tenant.id}&type=rent`,
            },
            {
              id: 'deposit',
              label: 'Voluntary Deposit',
              href: `/admin/financial/payments/new?tenantId=${tenant.id}&type=deposit`,
            },
            {
              id: 'advance',
              label: 'Advance Payment',
              href: `/admin/financial/payments/new?tenantId=${tenant.id}&type=advance`,
            },
          ]}
        />
      </div>
    </aside>
  );
}
