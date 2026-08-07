import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Pencil, Plus } from 'lucide-react';
import { listLeaseTemplates } from '@/lib/api/lease-templates';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';

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

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total templates"
          value={templates.length}
          footer="all templates"
          icon={<FileText className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Published"
          value={published}
          footer="published templates"
          icon={<FileText className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Drafts"
          value={drafts}
          footer="draft templates"
          icon={<FileText className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="System templates"
          value={systemCount}
          footer="built-in templates"
          icon={<FileText className="h-8 w-8 text-slate-600" />}
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {templates.length === 0 ? (
          <EmptyState
            title="No lease templates yet"
            description="Create your first template in Lease Designer."
            action={
              <Link href="/admin/documents/lease-designer">
                <Button leftIcon={<Plus className="h-4 w-4" />}>Open Lease Designer</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      {template.description && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                          {template.description}
                        </div>
                      )}
                      {template.isSystem && (
                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          System
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          template.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {template.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      v{template.version}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {new Date(template.updatedAt).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <Link
                        href={`/admin/documents/lease-designer?templateId=${encodeURIComponent(template.id)}`}
                        className="inline-flex text-gray-500 hover:text-gray-900"
                        title="Edit"
                      >
                        <Pencil className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
