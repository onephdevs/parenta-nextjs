'use client';

import React, { useState, useEffect } from 'react';
import { Building, Settings, Calculator, FileText, Info } from 'lucide-react';
import AllocationRulesConfig from './AllocationRulesConfig';
import CostAllocationCalculator from './CostAllocationCalculator';
import TenantUtilityBills from './TenantUtilityBills';
import { useNotifications } from '../../../hooks/useNotifications';
import { Building as BuildingType } from '../../../types/database';

export default function CostAllocationDashboard() {
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { addNotification } = useNotifications();

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
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load buildings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'rules', label: 'Allocation Rules', icon: Settings },
    { id: 'calculator', label: 'Cost Calculator', icon: Calculator },
    { id: 'bills', label: 'Tenant Bills', icon: FileText }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Cost Allocation System</h1>
            <p className="text-gray-600">
              Configure allocation rules, calculate costs, and manage tenant utility bills
            </p>
          </div>
        </div>

        {/* Building Selection */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Building className="h-5 w-5 text-gray-700" />
            Select Building
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a building</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>
                    {building.name} - {building.address}
                  </option>
                ))}
              </select>
            </div>
            {selectedBuilding && (
              <div className="text-sm text-gray-600">
                {selectedBuilding.totalUnits} units • {selectedBuilding.totalFloors} floors
              </div>
            )}
          </div>

          {buildings.length === 0 && !isLoading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800">
                  No buildings found. Please create a building first to set up cost allocation.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        {selectedBuilding ? (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow border p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">How Cost Allocation Works</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Settings className="h-6 w-6 text-blue-600" />
                        </div>
                        <h4 className="font-semibold mb-2 text-gray-900">1. Configure Rules</h4>
                        <p className="text-sm text-gray-600">
                          Set up allocation methods for each utility type (equal split, usage-based, room size, or custom)
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Calculator className="h-6 w-6 text-green-600" />
                        </div>
                        <h4 className="font-semibold mb-2 text-gray-900">2. Calculate Costs</h4>
                        <p className="text-sm text-gray-600">
                          Select a utility bill and automatically calculate how costs should be split among tenants
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <h4 className="font-semibold mb-2 text-gray-900">3. Generate Bills</h4>
                        <p className="text-sm text-gray-600">
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

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-800 font-medium">Common Area Costs:</span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">
                        You can configure a percentage of each utility bill to cover shared spaces 
                        (hallways, lobby, etc.) which will be split equally among all tenants.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rules' && (
              <AllocationRulesConfig 
                buildingId={selectedBuilding.id} 
                buildingName={selectedBuilding.name} 
              />
            )}

            {activeTab === 'calculator' && (
              <CostAllocationCalculator 
                buildingId={selectedBuilding.id} 
                buildingName={selectedBuilding.name} 
              />
            )}

            {activeTab === 'bills' && (
              <TenantUtilityBills buildingId={selectedBuilding.id} />
            )}
          </div>
        ) : (
          !isLoading && (
            <div className="bg-white rounded-lg shadow border p-8 text-center">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Building</h3>
              <p className="text-gray-600">
                Choose a building to configure cost allocation rules and manage tenant utility bills.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
} 