'use client';

import React, { useState, useEffect } from 'react';
import { Building, Settings, Calculator, FileText, Info, Layers } from 'lucide-react';
import AllocationRulesConfig from './AllocationRulesConfig';
import CostAllocationCalculator from './CostAllocationCalculator';
import TenantUtilityBills from './TenantUtilityBills';
import { useNotifications } from '@/hooks/useNotifications';
import { Building as BuildingType } from '@/types/database';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { FormField } from '@/components/forms/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';

export default function CostAllocationDashboard() {
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { showError } = useNotifications();

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuildingId && buildings.length > 0) {
      const building = buildings.find(b => b.id === selectedBuildingId);
      setSelectedBuilding(building || null);
    }
  }, [selectedBuildingId, buildings]);

  const fetchBuildings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/buildings');
      const data = await response.json();

      if (data.success) {
        setBuildings(data.data.buildings);
        if (data.data.buildings.length > 0) {
          setSelectedBuildingId(data.data.buildings[0].id);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch buildings');
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      showError('Failed to load buildings');
    } finally {
      setIsLoading(false);
    }
  };

  const [buildingSearch, setBuildingSearch] = useState('');

  const filteredBuildings = buildings.filter((building) => {
    if (!buildingSearch.trim()) return true;
    const term = buildingSearch.toLowerCase();
    return (
      (building.name || '').toLowerCase().includes(term) ||
      (building.addressLine1 || '').toLowerCase().includes(term)
    );
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'rules', label: 'Allocation Rules', icon: Settings },
    { id: 'calculator', label: 'Cost Calculator', icon: Calculator },
    { id: 'bills', label: 'Tenant Bills', icon: FileText }
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Cost Allocation"
        description="Configure allocation rules, calculate costs, and manage tenant utility bills"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Buildings"
          value={buildings.length}
          footer="properties available"
          icon={<Building className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Selected units"
          value={selectedBuilding?.totalUnits ?? 0}
          footer={selectedBuilding?.name || 'choose a building'}
          icon={<Layers className="h-8 w-8 text-slate-600" />}
        />
        <ListSummaryCard
          title="Floors"
          value={selectedBuilding?.totalFloors ?? 0}
          footer="in selected building"
          icon={<Building className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Active tab"
          value={tabs.find((t) => t.id === activeTab)?.label || 'Overview'}
          footer="allocation workspace"
          icon={<Settings className="h-8 w-8 text-amber-600" />}
        />
      </div>

      <FilterBar
        columns={4}
        collapsible
        activeCount={buildingSearch.trim() ? 1 : 0}
        search={
          <SearchInput
            id="building-search"
            value={buildingSearch}
            onChange={(e) => setBuildingSearch(e.target.value)}
            placeholder="Building name or address..."
            aria-label="Search buildings"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            {selectedBuilding
              ? `${selectedBuilding.name} · ${selectedBuilding.totalUnits ?? 0} units`
              : 'Select a building to continue'}
          </p>
        }
      >
        <FormField label="Building" htmlFor="building-select">
          <Select
            id="building-select"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
          >
            <option value="">Choose a building</option>
            {filteredBuildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name} - {building.addressLine1}
              </option>
            ))}
          </Select>
        </FormField>
      </FilterBar>

      {buildings.length === 0 && !isLoading && (
        <Alert variant="info">
          No buildings found. Please create a building first to set up cost allocation.
        </Alert>
      )}

      <div className="space-y-6">
        {selectedBuilding ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabList>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Tab key={tab.id} value={tab.id}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </span>
                  </Tab>
                );
              })}
            </TabList>

            <TabPanel value="overview">
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">How Cost Allocation Works</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Settings className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="font-semibold mb-2 text-gray-900">1. Configure Rules</h4>
                      <p className="text-sm text-gray-900">
                        Set up allocation methods for each utility type (equal split, usage-based, room size, or custom)
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Calculator className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className="font-semibold mb-2 text-gray-900">2. Calculate Costs</h4>
                      <p className="text-sm text-gray-900">
                        Select a utility bill and automatically calculate how costs should be split among tenants
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <h4 className="font-semibold mb-2 text-gray-900">3. Generate Bills</h4>
                      <p className="text-sm text-gray-900">
                        Create individual tenant utility bills with detailed cost breakdowns and track payment status
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h5 className="font-medium mb-3 text-gray-900">Allocation Methods</h5>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium text-blue-800">Equal Split</div>
                          <div className="text-sm text-blue-700">
                            Divides utility costs equally among all active tenants
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium text-green-800">Usage-Based</div>
                          <div className="text-sm text-green-700">
                            Allocates costs based on actual meter readings and consumption
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium text-purple-800">Room Size</div>
                          <div className="text-sm text-purple-700">
                            Allocates costs proportionally based on room square footage
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium text-orange-800">Custom Rules</div>
                          <div className="text-sm text-orange-700">
                            Uses predefined custom percentages for specific allocation scenarios
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Alert variant="info" className="mt-6" title="Common Area Costs:">
                    You can configure a percentage of each utility bill to cover shared spaces
                    (hallways, lobby, etc.) which will be split equally among all tenants.
                  </Alert>
                </div>
              </Card>
            </TabPanel>

            <TabPanel value="rules">
              <AllocationRulesConfig
                buildingId={selectedBuilding.id}
                buildingName={selectedBuilding.name}
              />
            </TabPanel>

            <TabPanel value="calculator">
              <CostAllocationCalculator
                buildingId={selectedBuilding.id}
                buildingName={selectedBuilding.name}
              />
            </TabPanel>

            <TabPanel value="bills">
              <TenantUtilityBills buildingId={selectedBuilding.id} />
            </TabPanel>
          </Tabs>
        ) : (
          !isLoading && (
            <Card>
              <EmptyState
                icon={<Building className="h-12 w-12 text-gray-400" />}
                title="Select a Building"
                description="Choose a building to configure cost allocation rules and manage tenant utility bills."
              />
            </Card>
          )
        )}
      </div>
    </div>
  );
}
