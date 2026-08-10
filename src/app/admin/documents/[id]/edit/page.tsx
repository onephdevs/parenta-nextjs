import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getDocumentById, getDocumentCategories } from '@/lib/api/documents';
import EditDocumentForm from '@/components/features/EditDocumentForm';
import { EntityNotesPanel } from '@/components/features/notes/EntityNotesModal';

interface EditDocumentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditDocumentPage({ params }: EditDocumentPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { id } = await params;

  try {
    const [document, categories] = await Promise.all([
      getDocumentById(id),
      getDocumentCategories(),
    ]);

    if (!document) {
      redirect('/admin/documents');
    }

    return (
      <div className="min-h-0 flex-1 space-y-6 bg-white p-6">
        <EditDocumentForm document={document} categories={categories} />
        <EntityNotesPanel
          entityType="document"
          entityId={String(document.id)}
          entityLabel={document.documentName || document.fileName || 'Document'}
          title="Document notes"
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading document:', error);
    redirect('/admin/documents');
  }
}
