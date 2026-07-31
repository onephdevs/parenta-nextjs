import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getDocuments, getDocumentStats, getDocumentCategories } from '@/lib/api/documents';
import DocumentsList from '@/components/features/DocumentsList';
import DocumentUpload from '@/components/features/DocumentUpload';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, FileText, HardDrive, Tags } from 'lucide-react';

// Enable ISR (Incremental Static Regeneration) with 60 second revalidation
export const revalidate = 60;

interface DocumentsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    categoryId?: string;
    documentType?: string;
    buildingId?: string;
    roomId?: string;
    tenantId?: string;
    accessLevel?: string;
    hasExpiry?: string;
    isExpired?: string;
  }>;
}

async function getDocumentsData(searchParams: Record<string, string | undefined>) {
  try {
    const page = parseInt(searchParams.page || '1');
    const filters = {
      search: searchParams.search,
      categoryId: searchParams.categoryId,
      documentType: searchParams.documentType,
      buildingId: searchParams.buildingId,
      roomId: searchParams.roomId,
      tenantId: searchParams.tenantId,
      accessLevel: searchParams.accessLevel,
      hasExpiry: searchParams.hasExpiry === 'true' ? true : searchParams.hasExpiry === 'false' ? false : undefined,
      isExpired: searchParams.isExpired === 'true' ? true : searchParams.isExpired === 'false' ? false : undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    );

    const [documentsResult, stats, categories] = await Promise.all([
      getDocuments(cleanFilters, page, 20),
      getDocumentStats(),
      getDocumentCategories(),
    ]);

    return {
      documents: documentsResult.documents,
      total: documentsResult.total,
      page: documentsResult.page,
      limit: documentsResult.limit,
      stats,
      categories,
    };
  } catch (error) {
    console.error('Error fetching documents data:', error);
    return {
      documents: [],
      total: 0,
      page: 1,
      limit: 20,
      stats: {
        totalDocuments: 0,
        documentsThisMonth: 0,
        documentsByType: {},
        documentsByCategory: {},
        expiringDocuments: 0,
        storageUsed: 0,
      },
      categories: [],
    };
  }
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const resolvedSearchParams = await searchParams;
  const { documents, total, page, limit, stats, categories } = await getDocumentsData(resolvedSearchParams);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Documents"
        description="Manage and organize all property-related documents"
        actions={
          <>
            <DocumentUpload />
            <Link href="/admin/documents/categories">
              <Button variant="outline" leftIcon={<Tags className="h-4 w-4" />}>
                Manage Categories
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value={stats.totalDocuments}
          subtitle={`${stats.documentsThisMonth} added this month`}
          tone="blue"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Storage Used"
          value={formatFileSize(stats.storageUsed)}
          subtitle="Across all documents"
          tone="green"
          icon={<HardDrive className="h-5 w-5" />}
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiringDocuments}
          subtitle="Within 30 days"
          tone="yellow"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Categories"
          value={categories.length}
          subtitle="Document categories"
          tone="purple"
          icon={<Tags className="h-5 w-5" />}
        />
      </div>

        {/* Documents List */}
      <DocumentsList
        documents={documents}
        categories={categories}
        searchParams={resolvedSearchParams}
        totalPages={totalPages}
        currentPage={page}
      />
    </div>
  );
} 