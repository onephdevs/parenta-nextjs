import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getDocuments, getDocumentStats, getDocumentCategories } from '@/lib/api/documents';
import { getAllBuildings } from '@/lib/api/buildings';
import { getAllTenants } from '@/lib/api/tenants';
import DocumentsList from '@/components/features/DocumentsList';
import AdminDocumentUpload from '@/components/features/AdminDocumentUpload';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, FileSignature, FileText, Link2Off, Tags } from 'lucide-react';

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
    isUnlinked?: string;
    status?: string;
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
      hasExpiry:
        searchParams.hasExpiry === 'true'
          ? true
          : searchParams.hasExpiry === 'false'
            ? false
            : undefined,
      isExpired:
        searchParams.isExpired === 'true'
          ? true
          : searchParams.isExpired === 'false'
            ? false
            : undefined,
      isUnlinked: searchParams.isUnlinked === 'true' ? true : undefined,
      status: searchParams.status as
        | 'signed'
        | 'on_file'
        | 'expiring_soon'
        | 'needs_review'
        | undefined,
    };

    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    );

    const [documentsResult, stats, categories, buildingsResult, tenantsResult] = await Promise.all([
      getDocuments(cleanFilters, page, 20),
      getDocumentStats(),
      getDocumentCategories(),
      getAllBuildings({ limit: 200 }),
      getAllTenants({ limit: 200 }),
    ]);

    return {
      documents: documentsResult.documents,
      total: documentsResult.total,
      page: documentsResult.page,
      limit: documentsResult.limit,
      stats,
      categories,
      buildings: buildingsResult.buildings.map((b) => ({ id: b.id, name: b.name })),
      tenants: tenantsResult.tenants.map((t) => ({
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
      })),
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
        unlinkedDocuments: 0,
        pendingSignature: 0,
        storageUsed: 0,
      },
      categories: [],
      buildings: [],
      tenants: [],
    };
  }
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const resolvedSearchParams = await searchParams;
  const { documents, total, page, limit, stats, categories, buildings, tenants } =
    await getDocumentsData(resolvedSearchParams);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Documents"
        description="Manage and organize all property-related documents"
        actions={
          <>
            <AdminDocumentUpload
              categories={categories}
              buildings={buildings}
              tenants={tenants}
            />
            <Link href="/admin/documents/categories">
              <Button variant="outline" leftIcon={<Tags className="h-4 w-4" />}>
                Manage Categories
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total documents"
          value={stats.totalDocuments}
          footer="all documents"
          icon={<FileText className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Pending signature"
          value={stats.pendingSignature}
          footer="awaiting signature"
          icon={<FileSignature className="h-8 w-8 text-slate-600" />}
        />
        <ListSummaryCard
          title="Expiring soon"
          value={stats.expiringDocuments}
          footer="documents expiring"
          icon={<AlertTriangle className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="Unlinked"
          value={stats.unlinkedDocuments}
          footer="not linked to a record"
          icon={<Link2Off className="h-8 w-8 text-red-600" />}
        />
      </div>

      <DocumentsList
        documents={documents}
        categories={categories}
        buildings={buildings}
        tenants={tenants}
        searchParams={resolvedSearchParams}
        totalPages={totalPages}
        currentPage={page}
        total={total}
      />
    </div>
  );
}
