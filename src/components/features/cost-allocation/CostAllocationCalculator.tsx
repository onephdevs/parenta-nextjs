'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  DollarSign, 
  Users, 
  FileText, 
  CheckCircle, 
  Loader2,
  Send
} from 'lucide-react';
import { useNotifications } from '../../../hooks/useNotifications';
import { UtilityBill, AllocationResult } from '../../../types/database';
import { format } from 'date-fns';

interface CostAllocationCalculatorProps {
  buildingId: string;
  buildingName: string;
}

interface AllocationSettings {
  allocationMethod: 'equal' | 'usage' | 'room_size' | 'custom';
  includeCommonAreas: boolean;
  commonAreaPercentage: number;
  dueDate?: Date;
}

export default function CostAllocationCalculator({ buildingId, buildingName }: CostAllocationCalculatorProps) {
  const [utilityBills, setUtilityBills] = useState<UtilityBill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [selectedBill, setSelectedBill] = useState<UtilityBill | null>(null);
  const [allocationSettings, setAllocationSettings] = useState<AllocationSettings>({
    allocationMethod: 'equal',
    includeCommonAreas: true,
    commonAreaPercentage: 20,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  });
  const [allocations, setAllocations] = useState<AllocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchUtilityBills();
  }, [buildingId]);

  useEffect(() => {
    if (selectedBillId) {
      const bill = utilityBills.find(b => b.id === selectedBillId);
      setSelectedBill(bill || null);
      setAllocations([]);
      setHasGenerated(false);
    }
  }, [selectedBillId, utilityBills]);

  const fetchUtilityBills = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/utilities?buildingId=${buildingId}&limit=50`);
      const data = await response.json();

      if (data.success) {
        // Filter bills that haven't been allocated yet
        const unallocatedBills = data.data.bills.filter((bill: UtilityBill) => !bill.isAllocated);
        setUtilityBills(unallocatedBills);
      } else {
        throw new Error(data.error || 'Failed to fetch utility bills');
      }
    } catch (error) {
      console.error('Error fetching utility bills:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load utility bills'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAllocation = async () => {
    if (!selectedBillId) return;

    try {
      setIsCalculating(true);
      const response = await fetch('/api/cost-allocation/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          utilityBillId: selectedBillId,
          allocationMethod: allocationSettings.allocationMethod,
          includeCommonAreas: allocationSettings.includeCommonAreas,
          commonAreaPercentage: allocationSettings.commonAreaPercentage
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAllocations(data.data.allocations);
        addNotification({
          type: 'success',
          title: 'Allocation Calculated',
          message: `Cost allocated among ${data.data.allocations.length} tenants`
        });
      } else {
        throw new Error(data.error || 'Failed to calculate allocation');
      }
    } catch (error) {
      console.error('Error calculating allocation:', error);
      addNotification({
        type: 'error',
        title: 'Calculation Error',
        message: error instanceof Error ? error.message : 'Failed to calculate allocation'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const generateTenantBills = async () => {
    if (!selectedBillId || allocations.length === 0) return;

    try {
      setIsGenerating(true);
      const response = await fetch('/api/cost-allocation/generate-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          utilityBillId: selectedBillId,
          allocationMethod: allocationSettings.allocationMethod,
          includeCommonAreas: allocationSettings.includeCommonAreas,
          commonAreaPercentage: allocationSettings.commonAreaPercentage,
          dueDate: allocationSettings.dueDate?.toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHasGenerated(true);
        addNotification({
          type: 'success',
          title: 'Bills Generated',
          message: `${data.data.tenantBills.length} tenant utility bills created successfully`
        });
        
        // Refresh utility bills to remove the allocated one
        await fetchUtilityBills();
        setSelectedBillId('');
        setAllocations([]);
      } else {
        throw new Error(data.error || 'Failed to generate tenant bills');
      }
    } catch (error) {
      console.error('Error generating tenant bills:', error);
      addNotification({
        type: 'error',
        title: 'Generation Error',
        message: error instanceof Error ? error.message : 'Failed to generate tenant bills'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'equal': return 'Equal Split';
      case 'usage': return 'Usage-Based';
      case 'room_size': return 'Room Size';
      case 'custom': return 'Custom Rules';
      default: return method;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'equal': return 'bg-blue-100 text-blue-800';
      case 'usage': return 'bg-green-100 text-green-800';
      case 'room_size': return 'bg-purple-100 text-purple-800';
      case 'custom': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading utility bills...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bill Selection */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Cost Allocation Calculator - {buildingName}
        </h3>
        <p className="text-sm text-gray-900 mb-6">
          Select a utility bill and calculate how costs should be split among tenants.
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Select Utility Bill</label>
            <select
              value={selectedBillId}
              onChange={(e) => setSelectedBillId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a utility bill to allocate</option>
              {utilityBills.map(bill => (
                <option key={bill.id} value={bill.id}>
                  {bill.utilityType} - {format(new Date(bill.billingPeriodStart), 'MMM yyyy')} - ${bill.amount.toFixed(2)}
                </option>
              ))}
            </select>
            {utilityBills.length === 0 && (
              <p className="text-sm text-gray-900">
                No utility bills available for allocation. Make sure there are unallocated bills for this building.
              </p>
            )}
          </div>

          {selectedBill && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 font-medium">Selected Bill Details</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Utility Type:</strong> {selectedBill.utilityType}
                </div>
                <div>
                  <strong>Amount:</strong> ${selectedBill.amount.toFixed(2)}
                </div>
                <div>
                  <strong>Period:</strong> {format(new Date(selectedBill.billingPeriodStart), 'MMM d')} - {format(new Date(selectedBill.billingPeriodEnd), 'MMM d, yyyy')}
                </div>
                <div>
                  <strong>Due Date:</strong> {format(new Date(selectedBill.dueDate), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Allocation Settings */}
      {selectedBill && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold mb-4">Allocation Settings</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Allocation Method</label>
              <select
                value={allocationSettings.allocationMethod}
                onChange={(e) => setAllocationSettings({
                  ...allocationSettings,
                  allocationMethod: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="equal">Equal Split - Split equally among all tenants</option>
                <option value="usage">Usage-Based - Based on meter readings</option>
                <option value="room_size">Room Size - Based on square footage</option>
                <option value="custom">Custom Rules - Use predefined percentages</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900">Include Common Area Costs</label>
                <p className="text-sm text-gray-900">
                  Include shared space utilities in allocation
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allocationSettings.includeCommonAreas}
                  onChange={(e) => setAllocationSettings({
                    ...allocationSettings,
                    includeCommonAreas: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {allocationSettings.includeCommonAreas && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Common Area Percentage</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={allocationSettings.commonAreaPercentage}
                    onChange={(e) => setAllocationSettings({
                      ...allocationSettings,
                      commonAreaPercentage: parseFloat(e.target.value) || 0
                    })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-900">% of total cost</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Tenant Bill Due Date</label>
              <input
                type="date"
                value={allocationSettings.dueDate ? allocationSettings.dueDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setAllocationSettings({ 
                  ...allocationSettings, 
                  dueDate: e.target.value ? new Date(e.target.value) : undefined 
                })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={calculateAllocation}
                disabled={isCalculating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
              >
                {isCalculating && <Loader2 className="h-4 w-4 animate-spin" />}
                <Calculator className="h-4 w-4" />
                Calculate Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocation Results */}
      {allocations.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Allocation Results
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodColor(allocationSettings.allocationMethod)}`}>
              {getMethodLabel(allocationSettings.allocationMethod)}
            </span>
          </div>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${allocations.reduce((sum, a) => sum + a.allocatedAmount, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-900">Total Allocated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {allocations.length}
                </div>
                <div className="text-sm text-gray-900">Tenants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${(allocations.reduce((sum, a) => sum + a.allocatedAmount, 0) / allocations.length).toFixed(2)}
                </div>
                <div className="text-sm text-gray-900">Average per Tenant</div>
              </div>
            </div>

            <hr />

            {/* Tenant Allocations */}
            <div className="space-y-2">
              <h4 className="font-medium">Individual Allocations</h4>
              <div className="space-y-2">
                {allocations.map((allocation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{allocation.tenantName}</div>
                      <div className="text-sm text-gray-900">
                        Room {allocation.roomNumber} • {allocation.sharePercentage.toFixed(1)}% of total
                      </div>
                      {allocation.usage && (
                        <div className="text-xs text-gray-400">
                          Usage: {allocation.usage.toFixed(2)} units
                        </div>
                      )}
                      {allocation.roomSize && (
                        <div className="text-xs text-gray-400">
                          Room Size: {allocation.roomSize} sq ft
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">${allocation.allocatedAmount.toFixed(2)}</div>
                      <div className="text-sm text-gray-900">
                        {allocation.commonAreaCharge > 0 && (
                          <span>Common: ${allocation.commonAreaCharge.toFixed(2)}</span>
                        )}
                        {allocation.usageCharge > 0 && (
                          <span> • Usage: ${allocation.usageCharge.toFixed(2)}</span>
                        )}
                        {allocation.baseCharge > 0 && (
                          <span> • Base: ${allocation.baseCharge.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <hr />

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={calculateAllocation}
                disabled={isCalculating}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Recalculate
              </button>
              <button 
                onClick={generateTenantBills} 
                disabled={isGenerating || hasGenerated}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                {hasGenerated ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Bills Generated
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Generate Tenant Bills
                  </>
                )}
              </button>
            </div>

            {hasGenerated && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 font-medium">Bills Generated Successfully</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Tenant utility bills have been generated successfully. You can view them in the Tenant Bills section.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 