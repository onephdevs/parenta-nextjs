import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAssetById } from '@/lib/api/assets';
import AssetTrackingView from '@/components/features/AssetTrackingView';
import AssetTrackQuickActions from '@/components/features/AssetTrackQuickActions';
import pool from '@/lib/db';

interface AssetTrackingPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scan?: string; location?: string }>;
}

export default async function AssetTrackingPage({ params, searchParams }: AssetTrackingPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const assetId = resolvedParams.id;
  const shouldRecordScan = resolvedSearchParams.scan === 'true';
  const location = resolvedSearchParams.location;

  const dbAsset = await getAssetById(assetId);
  if (!dbAsset) {
    notFound();
  }

  // Resolve building name for display
  let buildingName: string | undefined;
  if (dbAsset.buildingId) {
    const buildingResult = await pool.query(
      `SELECT name FROM buildings WHERE id = $1 LIMIT 1`,
      [dbAsset.buildingId]
    );
    buildingName = buildingResult.rows[0]?.name;
  }

  const asset = {
    id: dbAsset.id,
    assetName: dbAsset.assetName,
    assetType: dbAsset.assetType,
    brand: dbAsset.brand,
    model: dbAsset.model,
    serialNumber: dbAsset.serialNumber,
    assetStatus: dbAsset.assetStatus,
    assetCondition: dbAsset.assetCondition,
    currentValue: dbAsset.currentValue,
    buildingName: buildingName || dbAsset.assignedRoom || 'Unassigned',
    location: dbAsset.assignedRoom
      ? `Room ${dbAsset.assignedRoom}${dbAsset.assignedTenant ? ` — ${dbAsset.assignedTenant}` : ''}`
      : undefined,
    lastMaintenanceDate: dbAsset.lastMaintenanceDate,
    nextMaintenanceDate: dbAsset.nextMaintenanceDate,
    installedDate: dbAsset.purchaseDate,
    warrantyExpiry: dbAsset.warrantyExpiry,
    qrCodeGenerated: Boolean(dbAsset.qrCodeGenerated ?? dbAsset.qrCode),
    trackingEnabled: dbAsset.trackingEnabled ?? true,
  };

  if (shouldRecordScan) {
    try {
      const noteLine = `[${new Date().toISOString()}] QR scan${location ? ` at ${location}` : ''}`;
      const notes = dbAsset.notes ? `${dbAsset.notes}\n${noteLine}` : noteLine;
      await pool.query(
        `UPDATE assets SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [notes, assetId]
      );
    } catch (error) {
      console.error('Failed to record asset scan:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-600 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Asset Tracking</h1>
                <p className="text-sm text-gray-900">Property Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/admin/assets" className="text-sm text-purple-700 hover:text-purple-900">
                Admin Assets
              </Link>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Tracked Asset
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {shouldRecordScan && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Asset Scan Recorded Successfully
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Asset &quot;{asset.assetName}&quot; has been scanned at {new Date().toLocaleString()}.
                    {location && ` Location: ${location}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <AssetTrackingView asset={asset} />

        <AssetTrackQuickActions
          assetId={asset.id}
          assetName={asset.assetName}
          buildingId={dbAsset.buildingId}
        />

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Asset Tracking Notice</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This asset is tracked for inventory and maintenance purposes.
                  Scanning this QR code helps us maintain accurate location and usage records.
                  For questions or issues, please contact the property management office.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
