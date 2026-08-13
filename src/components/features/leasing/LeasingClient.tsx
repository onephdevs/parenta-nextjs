'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, MoreVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';
import type { LeasePackageTemplate } from '@/lib/lease-package-templates-shared';
import {
  formatAdvanceLabel,
  formatDepositLabel,
  formatGraceLabel,
  formatPenaltyFeeLabel,
  formatPenaltyTypeLabel,
  formatTermLabel,
} from '@/lib/lease-package-templates-shared';

interface LeasingClientProps {
  initialTemplates: LeasePackageTemplate[];
}

export default function LeasingClient({ initialTemplates }: LeasingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showNotification, showError } = useNotifications();
  const [templates, setTemplates] = useState(initialTemplates);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeasePackageTemplate | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  useEffect(() => {
    const created = searchParams.get('created') === '1';
    const updated = searchParams.get('updated') === '1';
    if (!created && !updated) return;
    if (created) {
      showNotification({
        type: 'success',
        title: 'Successfully created!',
        message: 'New lease template has been created and is now available for use.',
      });
    } else {
      showNotification({
        type: 'success',
        title: 'Successfully updated!',
        message: 'Changes applied to all tenants using the updated template.',
      });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('created');
    url.searchParams.delete('updated');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, [searchParams, showNotification]);

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuId]);

  const refresh = async () => {
    const res = await fetch('/api/lease-package-templates', { credentials: 'include' });
    const json = await res.json();
    if (res.ok && json.success) setTemplates(json.data || []);
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/lease-package-templates/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (res.status === 409 || json.code === 'TEMPLATE_IN_USE') {
        setDeleteTarget(null);
        setBlockedMessage(
          json.error ||
            'This lease template is currently assigned to active tenants. Please update or remove tenants from this template before deleting.'
        );
        setBlockedOpen(true);
        return;
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete');
      }
      setDeleteTarget(null);
      showNotification({
        type: 'success',
        title: 'Successfully deleted!',
        message: 'The selected lease template has been successfully removed.',
      });
      await refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-6 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leasing</h1>
          <Link href="/admin/leasing/new">
            <Button className="h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold hover:bg-black">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Lease Template
            </Button>
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3.5">Template Name</th>
                  <th className="px-5 py-3.5">Lease Term</th>
                  <th className="px-5 py-3.5">Deposit Period</th>
                  <th className="px-5 py-3.5">Advance Period</th>
                  <th className="px-5 py-3.5">Grace Period</th>
                  <th className="px-5 py-3.5">Penalty Type</th>
                  <th className="px-5 py-3.5">Penalty Fee</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                      No lease templates yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-4 font-semibold text-gray-900">{t.name}</td>
                      <td className="px-5 py-4 text-gray-700">{formatTermLabel(t.termMonths)}</td>
                      <td className="px-5 py-4 text-gray-700">
                        {formatDepositLabel(t.depositMonths)}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {formatAdvanceLabel(t.advanceMonths)}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {formatGraceLabel(t.gracePeriodDays)}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {formatPenaltyTypeLabel(t.penaltyType)}
                      </td>
                      <td className="px-5 py-4 font-medium tabular-nums text-gray-900">
                        {formatPenaltyFeeLabel(t.penaltyType, t.penaltyFee)}
                      </td>
                      <td className="relative px-5 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Template actions"
                          onClick={() => setMenuId((id) => (id === t.id ? null : t.id))}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === t.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-5 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                          >
                            <Link
                              href={`/admin/leasing/${t.id}/edit`}
                              className="block px-3.5 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
                              onClick={() => setMenuId(null)}
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="block w-full px-3.5 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setMenuId(null);
                                setDeleteTarget(t);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">Confirm Deletion</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Deleting this lease template will permanently remove it from your records. This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-gray-300 px-4 font-semibold"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-lg bg-red-600 px-4 font-semibold text-white hover:bg-red-700"
                onClick={() => void confirmDelete()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {blockedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <button
                type="button"
                onClick={() => setBlockedOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">Unable to Delete</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{blockedMessage}</p>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                className="h-10 rounded-lg bg-red-600 px-4 font-semibold text-white hover:bg-red-700"
                onClick={() => setBlockedOpen(false)}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
