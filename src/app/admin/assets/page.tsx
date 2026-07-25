'use client';

import React from 'react';
import { AssetsDashboard } from '@/components/features/AssetsDashboard';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AssetsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Assets"
        description="Manage property assets, track assignments, and monitor financial performance"
      />

      <AssetsDashboard />
    </div>
  );
}
