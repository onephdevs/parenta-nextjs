'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FileText, CheckCircle2, PenLine } from 'lucide-react';

interface SigningState {
  documentId: string;
  documentName: string;
  downloadUrl: string;
  legalName?: string;
  tenantName?: string;
  signatureMethod: 'typed_name' | 'drawn' | 'upload';
  requireWitness: boolean;
  tenantSigned: boolean;
  landlordSigned: boolean;
  witnessSigned: boolean;
  signatures: Array<{
    id: string;
    signerRole: string;
    signerName: string;
    typedName: string | null;
    signedAt: string;
    ipAddress: string | null;
  }>;
}

interface LeaseSignPanelProps {
  /** Admin signing for a tenant */
  tenantId?: string;
  /** When true, use tenant self-service API */
  asTenant?: boolean;
  onSigned?: () => void;
}

export default function LeaseSignPanel({
  tenantId,
  asTenant = false,
  onSigned,
}: LeaseSignPanelProps) {
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<SigningState | null>(null);
  const [typedName, setTypedName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [adminRole, setAdminRole] = useState<'landlord' | 'witness'>('landlord');

  const endpoint = asTenant
    ? '/api/tenant/agreement/sign'
    : tenantId
      ? `/api/tenants/${tenantId}/agreement/sign`
      : null;

  const load = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load');
      setState(data.data);
      if (data.data?.legalName) setTypedName(data.data.legalName);
      if (data.data?.tenantName && asTenant) setTypedName(data.data.tenantName);
    } catch (err) {
      console.error(err);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint, asTenant]);

  useEffect(() => {
    void load();
  }, [load]);

  const alreadySigned = asTenant
    ? Boolean(state?.tenantSigned)
    : adminRole === 'witness'
      ? Boolean(state?.witnessSigned)
      : Boolean(state?.landlordSigned);

  const handleSign = async () => {
    if (!endpoint || !state) return;
    if (!accepted) {
      showNotification({
        type: 'warning',
        title: 'Confirm required',
        message: 'Please confirm you agree to the lease terms',
      });
      return;
    }
    if (!typedName.trim() || typedName.trim().length < 3) {
      showNotification({
        type: 'warning',
        title: 'Name required',
        message: 'Type your full legal name to sign',
      });
      return;
    }

    setSubmitting(true);
    showNotification({
      type: 'loading',
      title: 'Signing',
      message: 'Recording your signature…',
    });

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          typedName: typedName.trim(),
          acceptTerms: true,
          signatureMethod: state.signatureMethod || 'typed_name',
          ...(asTenant ? {} : { role: adminRole }),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Sign failed');

      showNotification({
        type: 'success',
        title: 'Signed',
        message: data.message || 'Signature recorded',
      });
      setAccepted(false);
      await load();
      onSigned?.();
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Sign failed',
        message: err instanceof Error ? err.message : 'Could not record signature',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        Loading signing status…
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
        No lease agreement available to sign yet. Generate or upload one first.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{state.documentName}</p>
            <p className="text-xs text-gray-500">
              {state.tenantSigned ? 'Tenant signed' : 'Awaiting tenant'} ·{' '}
              {state.landlordSigned ? 'Landlord signed' : 'Awaiting landlord'}
              {state.requireWitness
                ? ` · ${state.witnessSigned ? 'Witness signed' : 'Awaiting witness'}`
                : ''}
            </p>
          </div>
        </div>
        <a
          href={state.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-medium text-blue-700 hover:underline"
        >
          View lease
        </a>
      </div>

      {state.signatures.length > 0 && (
        <ul className="space-y-2 rounded-md bg-gray-50 p-3">
          {state.signatures.map((s) => (
            <li key={s.id} className="flex items-start gap-2 text-xs text-gray-700">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                <span className="font-medium capitalize">{s.signerRole}</span>:{' '}
                <span
                  style={{
                    fontFamily: '"Segoe Script", "Bradley Hand", cursive',
                    fontSize: '1rem',
                  }}
                >
                  {s.typedName || s.signerName}
                </span>
                <span className="mt-0.5 block text-gray-500">
                  {new Date(s.signedAt).toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                  {s.ipAddress ? ` · IP ${s.ipAddress}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {alreadySigned ? (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Your signature is on file for this lease.
        </div>
      ) : (
        <div className="space-y-3 border-t border-gray-100 pt-3">
          {!asTenant && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdminRole('landlord')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  adminRole === 'landlord'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Sign as landlord
              </button>
              {state.requireWitness && (
                <button
                  type="button"
                  onClick={() => setAdminRole('witness')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    adminRole === 'witness'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Sign as witness
                </button>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Type your full legal name
            </label>
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Full legal name"
            />
            {typedName.trim().length >= 3 && (
              <p
                className="mt-2 text-2xl text-gray-900"
                style={{
                  fontFamily: '"Segoe Script", "Bradley Hand", cursive',
                }}
              >
                {typedName}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              I have read the lease agreement and agree to be bound by its terms. This typed name
              is my electronic signature (IP and browser may be recorded for verification).
            </span>
          </label>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void handleSign()}
            isLoading={submitting}
            leftIcon={<PenLine className="h-4 w-4" />}
          >
            Sign lease
          </Button>
        </div>
      )}
    </div>
  );
}
