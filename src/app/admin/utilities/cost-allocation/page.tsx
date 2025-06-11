import React from 'react';
import { Metadata } from 'next';
import CostAllocationDashboard from '../../../../components/features/cost-allocation/CostAllocationDashboard';

export const metadata: Metadata = {
  title: 'Cost Allocation | Property Management',
  description: 'Manage utility cost allocation and tenant billing',
};

export default function CostAllocationPage() {
  return <CostAllocationDashboard />;
} 