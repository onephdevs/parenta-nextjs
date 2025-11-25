import { Suspense } from 'react';
import UtilitiesDashboard from '../../components/features/UtilitiesDashboard';

export default function UtilitiesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Utilities Management</h1>
        <p className="text-gray-900 mt-2">
          Manage utility bills, track consumption, and monitor provider relationships across all your properties.
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow border">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg shadow border p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      }>
        <UtilitiesDashboard />
      </Suspense>
    </div>
  );
} 