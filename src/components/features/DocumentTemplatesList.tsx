'use client';

import { useMemo, useState } from 'react';
import {
  EmptyState,
  FilterBar,
  SearchInput,
  Select,
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { formatShortDate } from '@/lib/utils';

interface DocumentTemplatesListProps {
  templates: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    version: number;
    isSystem: boolean;
    updatedAt: string;
  }>;
}

export default function DocumentTemplatesList({ templates }: DocumentTemplatesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesSearch =
        !term ||
        t.name.toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term);
      const matchesStatus = !statusFilter || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [templates, searchTerm, statusFilter]);

  return (
    <>
      <FilterBar
        columns={4}
        collapsible
        activeCount={statusFilter ? 1 : 0}
        search={
          <SearchInput
            id="doc-template-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Template name..."
            aria-label="Search document templates"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            Showing {filtered.length} of {templates.length} templates
          </p>
        }
      >
        <FormField label="Status" htmlFor="doc-template-status">
          <Select
            id="doc-template-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        </FormField>
      </FilterBar>

      <TableCard
        title="Lease templates"
        description="Open a template from the View button."
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="No lease templates yet"
            description="Create one in Lease Designer."
          />
        ) : (
          filtered.map((template) => {
            const published = template.status === 'published';
            return (
              <WorkItemRow
                key={template.id}
                href={`/admin/documents/lease-designer?templateId=${encodeURIComponent(template.id)}`}
                title={template.name}
                subtitle={template.description}
                badges={[
                  {
                    key: 'status',
                    label: template.status,
                    tone: published ? 'success' : 'neutral',
                  },
                  { key: 'version', label: `v${template.version}`, tone: 'info' },
                  ...(template.isSystem
                    ? [{ key: 'system', label: 'System', tone: 'neutral' as const }]
                    : []),
                ]}
                date={formatShortDate(template.updatedAt)}
                metaLabel={published ? 'Published' : 'Draft'}
                metaTone={published ? 'muted' : 'default'}
                dotTone={published ? 'success' : 'neutral'}
              />
            );
          })
        )}
      </TableCard>
    </>
  );
}
