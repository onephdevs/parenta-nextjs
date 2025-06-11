'use client';

import React from 'react';
import { AssetsDashboard } from '@/components/features/AssetsDashboard';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default function AssetsPage() {
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Asset Management' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="mt-2 text-gray-600">
            Manage property assets, track assignments, and monitor financial performance
          </p>
        </div>
        
        <AssetsDashboard />
      </main>
    </div>
  );
} 