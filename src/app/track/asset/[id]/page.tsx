import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import AssetTrackingView from '@/components/features/AssetTrackingView';

interface AssetTrackingPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scan?: string; location?: string }>;
}

// Mock asset data for demonstration
const mockAssetData = {
  '1': {
    id: '1',
    assetName: 'HVAC Unit #1',
    assetType: 'HVAC System',
    brand: 'Carrier',
    model: 'X-Series 2024',
    serialNumber: 'CAR-2024-001',
    assetStatus: 'assigned',
    assetCondition: 'good',
    currentValue: 15000,
    buildingName: 'Sunset Apartments',
    location: 'Rooftop - Building A',
    lastMaintenanceDate: new Date('2024-01-15'),
    nextMaintenanceDate: new Date('2024-04-15'),
    installedDate: new Date('2023-06-01'),
    warrantyExpiry: new Date('2025-06-01'),
    qrCodeGenerated: true,
    trackingEnabled: true,
  },
  '2': {
    id: '2',
    assetName: 'Washer/Dryer Unit',
    assetType: 'Appliance',
    brand: 'LG',
    model: 'WM5000HVA',
    serialNumber: 'LG-WD-2024-042',
    assetStatus: 'assigned',
    assetCondition: 'excellent',
    currentValue: 1200,
    buildingName: 'Downtown Lofts',
    location: 'Unit 3B - Laundry Room',
    lastMaintenanceDate: new Date('2024-02-01'),
    nextMaintenanceDate: new Date('2024-08-01'),
    installedDate: new Date('2024-01-10'),
    warrantyExpiry: new Date('2026-01-10'),
    qrCodeGenerated: true,
    trackingEnabled: true,
  },
};

export default async function AssetTrackingPage({ params, searchParams }: AssetTrackingPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const assetId = resolvedParams.id;
  const shouldRecordScan = resolvedSearchParams.scan === 'true';
  const location = resolvedSearchParams.location;

  // Get asset data (in production, this would be from database)
  const asset = mockAssetData[assetId as keyof typeof mockAssetData];

  if (!asset) {
    notFound();
  }

  // Record scan if requested
  if (shouldRecordScan) {
    try {
      const scanParams = new URLSearchParams({ assetId, action: 'scan' });
      if (location) scanParams.append('location', location);
      
      await fetch(`${process.env.NEXTAUTH_URL}/api/assets/qr-code?${scanParams}`, {
        method: 'GET',
      });
    } catch (error) {
      console.error('Failed to record asset scan:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Tracked Asset
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Scan Success Message */}
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
                    Asset "{asset.assetName}" has been scanned at {new Date().toLocaleString()}.
                    {location && ` Location: ${location}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Asset Information */}
        <AssetTrackingView asset={asset} />

        {/* Additional Actions */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white hover:bg-gray-50">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Report Issue
              </button>
              <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white hover:bg-gray-50">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Request Maintenance
              </button>
              <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white hover:bg-gray-50">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Update Location
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Asset Tracking Notice
              </h3>
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