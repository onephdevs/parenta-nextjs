'use client';

import { useState } from 'react';
import { Building } from '@/types/database';
import BuildingCard from './BuildingCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Building2, LayoutGrid, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuildingsListProps {
  buildings: Building[];
}

export default function BuildingsList({ buildings }: BuildingsListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'units' | 'year'>('name');

  const filteredBuildings = buildings.filter(
    (building) =>
      building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedBuildings = [...filteredBuildings].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'units':
        return (b.totalUnits || 0) - (a.totalUnits || 0);
      case 'year':
        return (b.yearBuilt || 0) - (a.yearBuilt || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Search buildings by name, city, or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'units' | 'year')}
              className="w-auto min-w-[10rem]"
            >
              <option value="name">Sort by Name</option>
              <option value="units">Sort by Units</option>
              <option value="year">Sort by Year Built</option>
            </Select>

            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={cn(
                  'inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-l-md border',
                  viewMode === 'grid'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={cn(
                  'inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b',
                  viewMode === 'list'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {sortedBuildings.length} of {buildings.length} buildings
        </div>
      </Card>

      {sortedBuildings.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Building2 className="h-12 w-12" />}
            title="No buildings found"
            description={
              searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding your first building.'
            }
          />
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {sortedBuildings.map((building) => (
            <BuildingCard key={building.id} building={building} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
}
