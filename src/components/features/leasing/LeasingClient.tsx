'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Eye,
  FileText,
  Home,
  MoreVertical,
  Plus,
  X,
} from 'lucide-react';
import {
  Button,
  ListSummaryCard,
  PageHeader,
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { useNotifications } from '@/hooks/useNotifications';
import type { LeasePackageTemplate } from '@/lib/lease-package-templates-shared';
import {
  formatAdvanceLabel,
  formatDepositLabel,
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
  const toastShownRef = useRef(false);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  useEffect(() => {
    const created = searchParams.get('created') === '1';
    const updated = searchParams.get('updated') === '1';
    if ((!created && !updated) || toastShownRef.current) return;
    toastShownRef.current = true;
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
    router.replace('/admin/leasing', { scroll: false });
  }, [searchParams, showNotification, router]);

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuId]);

  const stats = useMemo(() => {
    const units = templates.reduce((sum, t) => sum + (t.appliedUnitCount || 0), 0);
    const buildings = templates.reduce((sum, t) => sum + (t.appliedBuildingCount || 0), 0);
    return { templates: templates.length, units, buildings };
  }, [templates]);

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
    <div className="space-y-6 p-6">
      <PageHeader
        title="Leasing"
        description="Create lease packages and see which buildings and units they apply to."
        actions={
          <Link href="/admin/leasing/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Create Lease Template</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <ListSummaryCard
          title="Templates"
          value={stats.templates}
          footer="active lease packages"
          icon={<FileText className="h-8 w-8 text-gray-700" />}
        />
        <ListSummaryCard
          title="Units applied"
          value={stats.units}
          footer="current leases using a template"
          icon={<Home className="h-8 w-8 text-gray-700" />}
        />
        <ListSummaryCard
          title="Buildings"
          value={stats.buildings}
          footer="properties with these packages"
          icon={<Building2 className="h-8 w-8 text-gray-700" />}
        />
      </div>

      <TableCard
        title="Lease templates"
        description="Preview terms and see assigned units from the View page."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Lease term</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Advance</TableHead>
              <TableHead>Applied to</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableEmpty colSpan={6}>
                No lease templates yet. Create one to get started.
              </TableEmpty>
            ) : (
              templates.map((t) => {
                const units = t.appliedUnitCount || 0;
                const buildings = t.appliedBuildingCount || 0;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold text-gray-900">{t.name}</TableCell>
                    <TableCell>{formatTermLabel(t.termMonths)}</TableCell>
                    <TableCell>{formatDepositLabel(t.depositMonths)}</TableCell>
                    <TableCell>{formatAdvanceLabel(t.advanceMonths)}</TableCell>
                    <TableCell className="text-gray-700">
                      {units > 0
                        ? `${units} ${units === 1 ? 'unit' : 'units'} · ${buildings} ${
                            buildings === 1 ? 'building' : 'buildings'
                          }`
                        : 'Not assigned'}
                    </TableCell>
                    <TableCell className="relative text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Link href={`/admin/leasing/${t.id}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                          >
                            View
                          </Button>
                        </Link>
                        <button
                          type="button"
                          className="inline-flex rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Template actions"
                          onClick={() => setMenuId((id) => (id === t.id ? null : t.id))}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      {menuId === t.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-6 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-left shadow-lg"
                        >
                          <Link
                            href={`/admin/leasing/${t.id}`}
                            className="block px-3.5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                            onClick={() => setMenuId(null)}
                          >
                            View
                          </Link>
                          <Link
                            href={`/admin/leasing/${t.id}/edit`}
                            className="block px-3.5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableCard>

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
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
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
              <Button type="button" variant="danger" onClick={() => setBlockedOpen(false)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
