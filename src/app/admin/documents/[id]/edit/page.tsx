import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getDocumentById, getDocumentCategories } from '@/lib/api/documents';
import { DOCUMENT_TYPES } from '@/types/document';
import EditDocumentForm from '@/components/features/EditDocumentForm';

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
      <div className="min-h-screen bg-gray-50">
        <EditDocumentForm 
          document={document}
          categories={categories}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading document:', error);
    redirect('/admin/documents');
  }
} 