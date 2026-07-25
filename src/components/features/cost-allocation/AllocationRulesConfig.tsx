'use client';

import React, { useState, useEffect } from 'react';
import { Save, Settings, Calculator, Users, Home } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { UtilityAllocationRule } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

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
  { value: 'other', label: 'Other' },
];

const allocationMethods = [
  {
    value: 'equal',
    label: 'Equal Split',
    description: 'Split costs equally among all tenants',
  },
  {
    value: 'usage',
    label: 'Usage-Based',
    description: 'Allocate based on actual meter readings',
  },
  {
    value: 'room_size',
    label: 'Room Size',
    description: 'Allocate based on room square footage',
  },
  {
    value: 'custom',
    label: 'Custom Rules',
    description: 'Use custom allocation percentages',
  },
];

export default function AllocationRulesConfig({ buildingId, buildingName }: AllocationRulesConfigProps) {
  const [rules, setRules] = useState<UtilityAllocationRule[]>([]);
  const [currentRule, setCurrentRule] = useState<RuleFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { showNotification } = useNotifications();

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
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load allocation rules',
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
        commonAreaPercentage: rule.commonAreaPercentage,
      });
    } else {
      setCurrentRule({
        utilityType: utilityType as RuleFormData['utilityType'],
        allocationMethod: 'equal',
        includeCommonAreas: true,
        commonAreaPercentage: 20,
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
          ...currentRule,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Allocation rule saved successfully',
        });
        await fetchAllocationRules();
        setCurrentRule(null);
        setIsEditMode(false);
      } else {
        throw new Error(data.error || 'Failed to save allocation rule');
      }
    } catch (error) {
      console.error('Error saving allocation rule:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save allocation rule',
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
      <Card>
        <div className="flex items-center justify-center py-8 text-gray-900">
          Loading allocation rules...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cost Allocation Rules - {buildingName}
          </h3>
          <p className="text-sm text-gray-900">
            Configure how utility costs are split among tenants for each utility type.
          </p>
        </CardHeader>

        <CardBody>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditRule(utility.value)}
                  >
                    {rule ? 'Edit' : 'Configure'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {isEditMode && currentRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" padding="none">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {rules.find(r => r.utilityType === currentRule.utilityType) ? 'Edit' : 'Create'} Allocation Rule
              </h3>
            </div>

            <div className="p-6 space-y-6">
              <FormField label="Utility Type" htmlFor="rule-utility-type">
                <Select
                  id="rule-utility-type"
                  value={currentRule.utilityType}
                  onChange={(e) => setCurrentRule({ ...currentRule, utilityType: e.target.value as RuleFormData['utilityType'] })}
                >
                  {utilityTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Allocation Method" htmlFor="rule-allocation-method">
                <Select
                  id="rule-allocation-method"
                  value={currentRule.allocationMethod}
                  onChange={(e) => setCurrentRule({ ...currentRule, allocationMethod: e.target.value as RuleFormData['allocationMethod'] })}
                >
                  {allocationMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label} - {method.description}
                    </option>
                  ))}
                </Select>
              </FormField>

              <div className="border-t pt-4">
                <div className="mb-4 space-y-1">
                  <Checkbox
                    id="rule-include-common-areas"
                    checked={currentRule.includeCommonAreas}
                    onChange={(e) => setCurrentRule({ ...currentRule, includeCommonAreas: e.target.checked })}
                    label="Include Common Area Costs"
                  />
                  <p className="text-sm text-gray-900 pl-6">
                    Include shared space utilities (hallways, lobby, etc.)
                  </p>
                </div>

                {currentRule.includeCommonAreas && (
                  <FormField
                    label="Common Area Percentage"
                    htmlFor="rule-common-area-percentage"
                    hint="This percentage will be split equally among all tenants"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        id="rule-common-area-percentage"
                        type="number"
                        min="0"
                        max="100"
                        value={currentRule.commonAreaPercentage}
                        onChange={(e) => setCurrentRule({
                          ...currentRule,
                          commonAreaPercentage: parseFloat(e.target.value) || 0,
                        })}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-900">% of total cost</span>
                    </div>
                  </FormField>
                )}
              </div>

              {currentRule.allocationMethod === 'usage' && (
                <Alert variant="success" title="Usage-Based Allocation">
                  Usage-based allocation requires meter readings for accurate calculations.
                  Make sure meter readings are recorded regularly for this utility type.
                </Alert>
              )}

              {currentRule.allocationMethod === 'room_size' && (
                <Alert variant="info" title="Room Size Allocation">
                  Room size allocation uses the square footage of each room.
                  Ensure room sizes are accurately recorded in the system.
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveRule}
                  isLoading={isSaving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Rule
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
