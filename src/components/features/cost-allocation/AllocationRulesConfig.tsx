'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Save, Settings, Calculator, Users, Home } from 'lucide-react';
import { useNotifications } from '../../../hooks/useNotifications';
import { UtilityAllocationRule } from '../../../types/database';

interface AllocationRulesConfigProps {
  buildingId: string;
  buildingName: string;
}

interface RuleFormData {
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  allocationMethod: 'equal' | 'usage' | 'room_size' | 'custom';
  includeCommonAreas: boolean;
  commonAreaPercentage: number;
}

const utilityTypes = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'gas', label: 'Gas' },
  { value: 'internet', label: 'Internet' },
  { value: 'cable', label: 'Cable TV' },
  { value: 'waste', label: 'Waste Management' },
  { value: 'other', label: 'Other' }
];

const allocationMethods = [
  { 
    value: 'equal', 
    label: 'Equal Split',
    description: 'Split costs equally among all tenants'
  },
  { 
    value: 'usage', 
    label: 'Usage-Based',
    description: 'Allocate based on actual meter readings'
  },
  { 
    value: 'room_size', 
    label: 'Room Size',
    description: 'Allocate based on room square footage'
  },
  { 
    value: 'custom', 
    label: 'Custom Rules',
    description: 'Use custom allocation percentages'
  }
];

export default function AllocationRulesConfig({ buildingId, buildingName }: AllocationRulesConfigProps) {
  const [rules, setRules] = useState<UtilityAllocationRule[]>([]);
  const [currentRule, setCurrentRule] = useState<RuleFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchAllocationRules();
  }, [buildingId]);

  const fetchAllocationRules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cost-allocation/rules?buildingId=${buildingId}`);
      const data = await response.json();

      if (data.success) {
        setRules(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch allocation rules');
      }
    } catch (error) {
      console.error('Error fetching allocation rules:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load allocation rules'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRule = (utilityType: string) => {
    const rule = rules.find(r => r.utilityType === utilityType);
    if (rule) {
      setCurrentRule({
        utilityType: rule.utilityType,
        allocationMethod: rule.allocationMethod,
        includeCommonAreas: rule.includeCommonAreas,
        commonAreaPercentage: rule.commonAreaPercentage
      });
    } else {
      setCurrentRule({
        utilityType: utilityType as any,
        allocationMethod: 'equal',
        includeCommonAreas: true,
        commonAreaPercentage: 20
      });
    }
    setIsEditMode(true);
  };

  const handleSaveRule = async () => {
    if (!currentRule) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/cost-allocation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          ...currentRule
        }),
      });

      const data = await response.json();

      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Allocation rule saved successfully'
        });
        await fetchAllocationRules();
        setCurrentRule(null);
        setIsEditMode(false);
      } else {
        throw new Error(data.error || 'Failed to save allocation rule');
      }
    } catch (error) {
      console.error('Error saving allocation rule:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save allocation rule'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrentRule(null);
    setIsEditMode(false);
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'equal': return 'bg-blue-100 text-blue-800';
      case 'usage': return 'bg-green-100 text-green-800';
      case 'room_size': return 'bg-purple-100 text-purple-800';
      case 'custom': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'equal': return <Users className="h-3 w-3" />;
      case 'usage': return <Calculator className="h-3 w-3" />;
      case 'room_size': return <Home className="h-3 w-3" />;
      default: return <Settings className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading allocation rules...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Cost Allocation Rules - {buildingName}
        </h3>
        <p className="text-sm text-gray-900 mb-6">
          Configure how utility costs are split among tenants for each utility type.
        </p>
        
        <div className="grid gap-4">
          {utilityTypes.map(utility => {
            const rule = rules.find(r => r.utilityType === utility.value);
            return (
              <div
                key={utility.value}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{utility.label}</h4>
                    {rule && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodBadgeColor(rule.allocationMethod)}`}>
                        {getMethodIcon(rule.allocationMethod)}
                        <span className="ml-1">
                          {allocationMethods.find(m => m.value === rule.allocationMethod)?.label}
                        </span>
                      </span>
                    )}
                  </div>
                  {rule && (
                    <div className="mt-1 text-sm text-gray-900">
                      Common areas: {rule.includeCommonAreas ? `${rule.commonAreaPercentage}%` : 'Not included'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleEditRule(utility.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {rule ? 'Edit' : 'Configure'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit/Create Rule Modal */}
      {isEditMode && currentRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {rules.find(r => r.utilityType === currentRule.utilityType) ? 'Edit' : 'Create'} Allocation Rule
              </h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Utility Type</label>
                <select
                  value={currentRule.utilityType}
                  onChange={(e) => setCurrentRule({ ...currentRule, utilityType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {utilityTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Allocation Method</label>
                <select
                  value={currentRule.allocationMethod}
                  onChange={(e) => setCurrentRule({ ...currentRule, allocationMethod: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {allocationMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label} - {method.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">Include Common Area Costs</label>
                    <p className="text-sm text-gray-900">
                      Include shared space utilities (hallways, lobby, etc.)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentRule.includeCommonAreas}
                      onChange={(e) => setCurrentRule({ ...currentRule, includeCommonAreas: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {currentRule.includeCommonAreas && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-900">Common Area Percentage</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentRule.commonAreaPercentage}
                        onChange={(e) => setCurrentRule({
                          ...currentRule,
                          commonAreaPercentage: parseFloat(e.target.value) || 0
                        })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-900">% of total cost</span>
                    </div>
                    <p className="text-xs text-gray-900">
                      This percentage will be split equally among all tenants
                    </p>
                  </div>
                )}
              </div>

              {currentRule.allocationMethod === 'usage' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-green-600" />
                    <span className="text-green-800 font-medium">Usage-Based Allocation</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    Usage-based allocation requires meter readings for accurate calculations. 
                    Make sure meter readings are recorded regularly for this utility type.
                  </p>
                </div>
              )}

              {currentRule.allocationMethod === 'room_size' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-purple-600" />
                    <span className="text-purple-800 font-medium">Room Size Allocation</span>
                  </div>
                  <p className="text-purple-700 text-sm mt-1">
                    Room size allocation uses the square footage of each room. 
                    Ensure room sizes are accurately recorded in the system.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRule}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 