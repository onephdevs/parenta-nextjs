'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Lock, Mail, User, Shield, ImagePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/hooks/useNotifications';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { getImageUrl } from '@/lib/format/image-url';
import { cn } from '@/lib/utils';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';

interface TenantAccountPanelProps {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export function TenantAccountPanel({
  email,
  firstName,
  lastName,
}: TenantAccountPanelProps) {
  const { data: session } = useSession();
  const { isPreview } = useTenantPortalGate();
  const theme = useTenantTheme();
  const { showSuccess, showError } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const displayEmail = email || session?.user?.email || '';
  const displayFirst = firstName || session?.user?.firstName || '';
  const displayLast = lastName || session?.user?.lastName || '';
  const displayName = [displayFirst, displayLast].filter(Boolean).join(' ') || 'Tenant';
  const initials = `${displayFirst.charAt(0) || ''}${displayLast.charAt(0) || ''}`.toUpperCase() || 'T';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (!cancelled && data.success && data.data?.avatarUrl) {
          setAvatarUrl(getImageUrl(String(data.data.avatarUrl)));
        }
      } catch {
        // ignore — avatar is optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatarFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAvatarFile = async (file: File) => {
    if (isPreview) {
      showError('Photo upload is disabled in preview mode');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo');
      }
      setAvatarUrl(getImageUrl(data.data.avatarUrl));
      showSuccess('Profile photo updated');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPreview) {
      showError('Password cannot be changed while previewing as a tenant');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError('New password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to change password');
      }

      showSuccess('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={cn(theme.formPanel, 'p-4 sm:p-6')}>
        <div className="mb-4 flex items-center gap-2">
          <Shield className={cn('h-5 w-5', theme.iconInfo)} strokeWidth={1.75} />
          <h2 className={theme.sectionTitle}>Account</h2>
        </div>
        <p className={cn('mb-5', theme.muted)}>
          Sign-in details and profile photo for your tenant portal.
        </p>

        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover ring-2 ring-emerald-500/30"
                onError={() => setAvatarUrl('')}
              />
            ) : (
              <div
                className={cn(
                  'flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold',
                  theme.mode === 'dark'
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'bg-emerald-100 text-emerald-800'
                )}
              >
                {initials}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div className="absolute bottom-0 right-0 flex gap-1">
              <TakePhotoButton
                disabled={isUploadingPhoto || isPreview}
                onCapture={(file) => void uploadAvatarFile(file)}
                title="Take profile photo"
                description="Allow camera access if prompted, then capture."
                fileNamePrefix="profile"
                preferUserCamera
                renderTrigger={(open) => (
                  <button
                    type="button"
                    aria-label="Take profile photo"
                    disabled={isUploadingPhoto || isPreview}
                    onClick={open}
                    className={cn(
                      'rounded-full border p-2 shadow-sm transition disabled:opacity-50',
                      theme.mode === 'dark'
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    )}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              />
              <button
                type="button"
                aria-label="Choose profile photo from gallery"
                disabled={isUploadingPhoto || isPreview}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'rounded-full border p-2 shadow-sm transition disabled:opacity-50',
                  theme.mode === 'dark'
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                )}
              >
                <ImagePlus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <p className={cn('text-lg font-semibold', theme.shellHeader)}>{displayName}</p>
            <p className={theme.muted}>
              {isUploadingPhoto
                ? 'Uploading photo…'
                : 'JPEG, PNG, or WebP · max 2MB'}
            </p>
          </div>
        </div>

        <dl className="space-y-4">
          <div className="flex items-start gap-3">
            <User className={cn('mt-0.5 h-4 w-4 shrink-0', theme.shellMuted)} />
            <div>
              <dt className={theme.label}>Name</dt>
              <dd className={cn('mt-0.5', theme.listValue)}>{displayName}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className={cn('mt-0.5 h-4 w-4 shrink-0', theme.shellMuted)} />
            <div>
              <dt className={theme.label}>Email / username</dt>
              <dd className={cn('mt-0.5 break-all', theme.listValue)}>{displayEmail || '—'}</dd>
            </div>
          </div>
        </dl>

        <div className="mt-5">
          <Link href="/tenant/profile?section=personal">
            <Button variant="outline" size="sm" className={theme.outlineButton}>
              Edit personal info
            </Button>
          </Link>
        </div>
      </div>

      <div className={cn(theme.formPanel, 'p-4 sm:p-6')}>
        <div className="mb-4 flex items-center gap-2">
          <Lock className={cn('h-5 w-5', theme.iconPending)} strokeWidth={1.75} />
          <h2 className={theme.sectionTitle}>Change password</h2>
        </div>
        <p className={cn('mb-5', theme.muted)}>
          Choose a strong password you do not use elsewhere. Minimum 8 characters.
        </p>

        {isPreview ? (
          <p className={theme.muted}>Password changes are disabled in preview mode.</p>
        ) : (
          <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
            <FormField label="Current password" htmlFor="tenant-current-password">
              <Input
                id="tenant-current-password"
                type="password"
                autoComplete="current-password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                className={theme.input}
                required
              />
            </FormField>

            <FormField label="New password" htmlFor="tenant-new-password">
              <Input
                id="tenant-new-password"
                type="password"
                autoComplete="new-password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                className={theme.input}
                minLength={8}
                required
              />
            </FormField>

            <FormField label="Confirm new password" htmlFor="tenant-confirm-password">
              <Input
                id="tenant-confirm-password"
                type="password"
                autoComplete="new-password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                className={theme.input}
                minLength={8}
                required
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              className={theme.primaryButton}
            >
              {isSaving ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
