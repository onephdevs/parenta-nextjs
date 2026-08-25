import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { listLeaseTemplates } from '@/lib/api/lease-templates';
import { Button, ListSummaryCard, PageHeader } from '@/components/ui';
import DocumentTemplatesList from '@/components/features/DocumentTemplatesList';

export const metadata: Metadata = {
  title: 'Lease Templates | Property Management',
  description: 'Lease templates managed in Lease Designer',
};

export default async function DocumentTemplatesPage() {
  let templates: Awaited<ReturnType<typeof listLeaseTemplates>> = [];
  try {
    templates = await listLeaseTemplates();
  } catch (err) {
    console.error('Failed to load lease templates:', err);
  }

  const published = templates.filter((t) => t.status === 'published').length;
  const drafts = templates.filter((t) => t.status === 'draft').length;
  const systemCount = templates.filter((t) => t.isSystem).length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Lease templates"
        description="Templates are managed in Lease Designer — this list stays in sync with that editor."
        actions={
          <Link href="/admin/documents/lease-designer">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Open Lease Designer</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total templates"
          value={templates.length}
          footer="all templates"
          icon={<FileText className="h-8 w-8 text-gray-700" />}
        />
        <ListSummaryCard
          title="Published"
          value={published}
          footer="published templates"
          icon={<FileText className="h-8 w-8 text-gray-700" />}
        />
        <ListSummaryCard
          title="Drafts"
          value={drafts}
          footer="draft templates"
          icon={<FileText className="h-8 w-8 text-gray-700" />}
        />
        <ListSummaryCard
          title="System templates"
          value={systemCount}
          footer="built-in templates"
          icon={<FileText className="h-8 w-8 text-gray-700" />}
        />
      </div>

      <DocumentTemplatesList
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          status: t.status,
          version: t.version,
          isSystem: t.isSystem,
          updatedAt: t.updatedAt,
        }))}
      />
    </div>
  );
}
