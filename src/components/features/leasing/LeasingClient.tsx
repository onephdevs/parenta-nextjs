'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  FileText,
  Home,
  MoreVertical,
  Plus,
  X,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  FilterBar,
  ListSummaryCard,
  PageHeader,
  SearchInput,
  Select,
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';
import type { LeasePackageTemplate } from '@/lib/lease-package-templates-shared';
import {
  formatAdvanceLabel,
  formatDepositLabel,
  formatTermLabel,
} from '@/lib/lease-package-templates-shared';
import { formatShortDate } from '@/lib/utils';

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
    router.replace('/admin/lease-templates', { scroll: false });
  }, [searchParams, showNotification, router]);

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');

  const filteredTemplates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesSearch = !term || t.name.toLowerCase().includes(term);
      const units = t.appliedUnitCount || 0;
      const matchesApplied =
        !appliedFilter ||
        (appliedFilter === 'applied' ? units > 0 : units === 0);
      return matchesSearch && matchesApplied;
    });
  }, [templates, searchTerm, appliedFilter]);

  const unused = templates.filter((t) => !(t.appliedUnitCount || 0)).length;

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
        title="Lease templates"
        description="Create lease packages and see which buildings and units they apply to."
        actions={
          <Link href="/admin/lease-templates/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Create Lease Template</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        <ListSummaryCard
          title="Unused"
          value={unused}
          footer="not assigned to a unit"
          icon={<AlertTriangle className="h-8 w-8 text-amber-600" />}
        />
      </div>

      <FilterBar
        columns={4}
        collapsible
        activeCount={appliedFilter ? 1 : 0}
        search={
          <SearchInput
            id="template-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Template name..."
            aria-label="Search lease templates"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            Showing {filteredTemplates.length} of {templates.length} templates
          </p>
        }
      >
        <FormField label="Applied" htmlFor="template-applied">
          <Select
            id="template-applied"
            value={appliedFilter}
            onChange={(e) => setAppliedFilter(e.target.value)}
          >
            <option value="">All templates</option>
            <option value="applied">Assigned to units</option>
            <option value="unused">Unused</option>
          </Select>
        </FormField>
      </FilterBar>

      <TableCard
        title="Lease templates"
        description="Preview terms and see assigned units from the View page."
      >
        {filteredTemplates.length === 0 ? (
          <EmptyState
            title="No lease templates yet"
            description="Create one to get started."
          />
        ) : (
          filteredTemplates.map((t) => {
            const units = t.appliedUnitCount || 0;
            return (
              <WorkItemRow
                key={t.id}
                className="relative"
                href={`/admin/lease-templates/${t.id}`}
                title={t.name}
                subtitle={formatTermLabel(t.termMonths)}
                badges={[
                  units > 0
                    ? {
                        key: 'applied',
                        label: `${units} ${units === 1 ? 'unit' : 'units'}`,
                        tone: 'success' as const,
                      }
                    : { key: 'applied', label: 'Unused', tone: 'neutral' as const },
                  { key: 'deposit', label: formatDepositLabel(t.depositMonths), tone: 'purple' as const },
                  { key: 'advance', label: formatAdvanceLabel(t.advanceMonths), tone: 'info' as const },
                ]}
                date={formatShortDate(t.updatedAt)}
                metaLabel={units > 0 ? 'Applied' : 'Unused'}
                metaTone={units > 0 ? 'muted' : 'default'}
                dotTone={units > 0 ? 'success' : 'neutral'}
                actions={
                  <>
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
                        className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-left shadow-lg"
                      >
                        <Link
                          href={`/admin/lease-templates/${t.id}`}
                          className="block px-3.5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                          onClick={() => setMenuId(null)}
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/lease-templates/${t.id}/edit`}
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
                  </>
                }
              />
            );
          })
        )}
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
