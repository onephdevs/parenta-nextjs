'use client';

import React from 'react';
import { AssetsDashboard } from '@/components/features/AssetsDashboard';

export default function AssetsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Assets
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage property assets, track assignments, and monitor financial performance
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AssetsDashboard />
      </main>
    </div>
  );
} 