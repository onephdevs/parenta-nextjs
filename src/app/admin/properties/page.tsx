import { Suspense } from 'react';
import { getBuildingsForPropertiesPage } from '@/lib/api/properties';
import PropertiesMasterDetail from '@/components/features/properties/PropertiesMasterDetail';
import { Alert } from '@/components/ui/Alert';
import AppLoader from '@/components/ui/AppLoader';

export const revalidate = 60;

interface PropertiesPageProps {
  searchParams: Promise<{ buildingId?: string; page?: string }>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const params = await searchParams;
  let buildings = await getBuildingsForPropertiesPage().catch((err) => {
    console.error('Error fetching buildings:', err);
    return null;
  });

  if (buildings === null) {
    return (
      <div className="p-6">
        <Alert variant="danger" title="Error Loading Properties">
          Failed to load properties. Please try again.
        </Alert>
      </div>
    );
  }

  const initialBuildingId =
    params.buildingId && buildings.some((b) => b.id === params.buildingId)
      ? params.buildingId
      : buildings[0]?.id || null;

  return (
    <Suspense
      fallback={
        <AppLoader
          variant="inline"
          label="Loading…"
          className="h-[calc(100vh-4rem)]"
        />
      }
    >
      <PropertiesMasterDetail
        initialBuildings={buildings}
        initialBuildingId={initialBuildingId}
      />
    </Suspense>
  );
}
