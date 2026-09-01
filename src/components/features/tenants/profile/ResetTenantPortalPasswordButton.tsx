'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  Input,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';

interface ResetTenantPortalPasswordButtonProps {
  tenantId: string;
  tenantName: string;
  email: string;
  hasPortalLogin: boolean;
  onPortalLoginCreated?: () => void;
}

type Mode = 'generate' | 'manual';

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export function ResetTenantPortalPasswordButton({
  tenantId,
  tenantName,
  email,
  hasPortalLogin,
  onPortalLoginCreated,
}: ResetTenantPortalPasswordButtonProps) {
  const { showNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('generate');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(Boolean(email));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    temporaryPassword: string;
    emailSent: boolean;
    emailedTo: string | null;
    createdNewLogin: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const hasEmail = Boolean(email?.trim());
  const buttonLabel = hasPortalLogin ? 'Reset password' : 'Set portal password';

  const resetForm = () => {
    setMode('generate');
    setPassword('');
    setConfirmPassword('');
    setSendEmail(hasEmail);
    setResult(null);
    setCopied(false);
  };

  const handleOpen = () => {
    resetForm();
    setOpen(true);
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (mode === 'manual') {
      if (password !== confirmPassword) {
        showNotification({
          type: 'error',
          title: 'Validation',
          message: 'Passwords do not match',
        });
        return;
      }
      if (password.length < 8) {
        showNotification({
          type: 'error',
          title: 'Validation',
          message: 'Password must be at least 8 characters',
        });
        return;
      }
    }

    if (sendEmail && !hasEmail) {
      showNotification({
        type: 'error',
        title: 'No email',
        message: 'Add an email on the tenant profile before sending the password.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: mode === 'manual' ? password : undefined,
          sendEmail,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.details || data.error || 'Failed to update password');
      }

      setResult({
        temporaryPassword: data.data.temporaryPassword,
        emailSent: Boolean(data.data.emailSent),
        emailedTo: data.data.emailedTo ?? null,
        createdNewLogin: Boolean(data.data.createdNewLogin),
      });
      if (data.data.createdNewLogin) {
        onPortalLoginCreated?.();
      }

      showNotification({
        type: 'success',
        title: data.data.createdNewLogin ? 'Portal login created' : 'Password updated',
        message: data.data.emailSent
          ? `We emailed the password to ${data.data.emailedTo}.`
          : 'Copy the password below and give it to the tenant.',
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Could not update password',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.temporaryPassword) return;
    await copyText(result.temporaryPassword);
    setCopied(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleOpen}
        className="inline-flex items-center"
      >
        <KeyRound className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog
        isOpen={open}
        onClose={handleClose}
        title={hasPortalLogin ? 'Reset portal password' : 'Set portal password'}
        description={
          result
            ? 'Copy this password now — it will not be shown again.'
            : `Update the tenant portal password for ${tenantName}. You can generate one and email it, or type a password yourself.`
        }
        size="sm"
        footer={
          result ? (
            <div className="flex justify-end">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={submitting} isLoading={submitting}>
                {submitting ? 'Saving…' : hasPortalLogin ? 'Update password' : 'Create login'}
              </Button>
            </div>
          )
        }
      >
        {result ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {result.createdNewLogin ? 'Portal login' : 'New password'}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">
                  {result.temporaryPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopy()}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            {result.emailSent ? (
              <Alert variant="success" title="Emailed">
                Sent to {result.emailedTo}.
              </Alert>
            ) : sendEmail ? (
              <Alert variant="warning" title="Email not sent">
                Copy this password and give it to the tenant.
              </Alert>
            ) : (
              <Alert variant="warning" title="Shown once">
                Copy this password now — it will not be shown again.
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-900">Password</legend>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="tenant-password-mode"
                  checked={mode === 'generate'}
                  onChange={() => setMode('generate')}
                  className="mt-0.5"
                />
                <span>
                  Generate a temporary password
                  <span className="mt-0.5 block text-xs text-gray-500">
                    We create a random password. You can email it or copy it here.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="tenant-password-mode"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                  className="mt-0.5"
                />
                <span>
                  Set a password from the office
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Type the password you want this tenant to use.
                  </span>
                </span>
              </label>
            </fieldset>

            {mode === 'manual' && (
              <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                <FormField
                  label="New password"
                  htmlFor="tenant-reset-password"
                  required
                  hint="At least 8 characters."
                >
                  <Input
                    id="tenant-reset-password"
                    type="password"
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormField>
                <FormField label="Confirm password" htmlFor="tenant-reset-confirm" required>
                  <Input
                    id="tenant-reset-confirm"
                    type="password"
                    value={confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </FormField>
              </div>
            )}

            <Checkbox
              checked={sendEmail}
              disabled={!hasEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              label={
                hasEmail
                  ? `Email the new password to ${email}`
                  : 'Email the new password (add an email on the profile first)'
              }
            />
          </div>
        )}
      </Dialog>
    </>
  );
}
