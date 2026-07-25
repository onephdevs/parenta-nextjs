'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Users,
  FileText,
  CheckCircle,
  Send,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { UtilityBill, AllocationResult } from '@/types/database';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

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
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  const [allocations, setAllocations] = useState<AllocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { showNotification } = useNotifications();

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
        const unallocatedBills = data.data.bills.filter((bill: UtilityBill) => !bill.isAllocated);
        setUtilityBills(unallocatedBills);
      } else {
        throw new Error(data.error || 'Failed to fetch utility bills');
      }
    } catch (error) {
      console.error('Error fetching utility bills:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load utility bills',
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
          commonAreaPercentage: allocationSettings.commonAreaPercentage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAllocations(data.data.allocations);
        showNotification({
          type: 'success',
          title: 'Allocation Calculated',
          message: `Cost allocated among ${data.data.allocations.length} tenants`,
        });
      } else {
        throw new Error(data.error || 'Failed to calculate allocation');
      }
    } catch (error) {
      console.error('Error calculating allocation:', error);
      showNotification({
        type: 'error',
        title: 'Calculation Error',
        message: error instanceof Error ? error.message : 'Failed to calculate allocation',
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
          dueDate: allocationSettings.dueDate?.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHasGenerated(true);
        showNotification({
          type: 'success',
          title: 'Bills Generated',
          message: `${data.data.tenantBills.length} tenant utility bills created successfully`,
        });

        await fetchUtilityBills();
        setSelectedBillId('');
        setAllocations([]);
      } else {
        throw new Error(data.error || 'Failed to generate tenant bills');
      }
    } catch (error) {
      console.error('Error generating tenant bills:', error);
      showNotification({
        type: 'error',
        title: 'Generation Error',
        message: error instanceof Error ? error.message : 'Failed to generate tenant bills',
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
      <Card>
        <div className="flex items-center justify-center py-8 text-gray-900">
          Loading utility bills...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Allocation Calculator - {buildingName}
          </h3>
          <p className="text-sm text-gray-900">
            Select a utility bill and calculate how costs should be split among tenants.
          </p>
        </CardHeader>

        <CardBody className="space-y-4">
          <FormField label="Select Utility Bill" htmlFor="utility-bill-select">
            <Select
              id="utility-bill-select"
              value={selectedBillId}
              onChange={(e) => setSelectedBillId(e.target.value)}
            >
              <option value="">Choose a utility bill to allocate</option>
              {utilityBills.map(bill => (
                <option key={bill.id} value={bill.id}>
                  {bill.utilityType} - {format(new Date(bill.billingPeriodStart), 'MMM yyyy')} - ${bill.amount.toFixed(2)}
                </option>
              ))}
            </Select>
            {utilityBills.length === 0 && (
              <p className="text-sm text-gray-900 mt-1">
                No utility bills available for allocation. Make sure there are unallocated bills for this building.
              </p>
            )}
          </FormField>

          {selectedBill && (
            <Alert variant="info" title="Selected Bill Details">
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
            </Alert>
          )}
        </CardBody>
      </Card>

      {selectedBill && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Allocation Settings</h3>
          </CardHeader>

          <CardBody className="space-y-4">
            <FormField label="Allocation Method" htmlFor="allocation-method">
              <Select
                id="allocation-method"
                value={allocationSettings.allocationMethod}
                onChange={(e) => setAllocationSettings({
                  ...allocationSettings,
                  allocationMethod: e.target.value as AllocationSettings['allocationMethod'],
                })}
              >
                <option value="equal">Equal Split - Split equally among all tenants</option>
                <option value="usage">Usage-Based - Based on meter readings</option>
                <option value="room_size">Room Size - Based on square footage</option>
                <option value="custom">Custom Rules - Use predefined percentages</option>
              </Select>
            </FormField>

            <div className="space-y-1">
              <Checkbox
                id="include-common-areas"
                checked={allocationSettings.includeCommonAreas}
                onChange={(e) => setAllocationSettings({
                  ...allocationSettings,
                  includeCommonAreas: e.target.checked,
                })}
                label="Include Common Area Costs"
              />
              <p className="text-sm text-gray-900 pl-6">
                Include shared space utilities in allocation
              </p>
            </div>

            {allocationSettings.includeCommonAreas && (
              <FormField label="Common Area Percentage" htmlFor="common-area-percentage">
                <div className="flex items-center gap-2">
                  <Input
                    id="common-area-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={allocationSettings.commonAreaPercentage}
                    onChange={(e) => setAllocationSettings({
                      ...allocationSettings,
                      commonAreaPercentage: parseFloat(e.target.value) || 0,
                    })}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-900">% of total cost</span>
                </div>
              </FormField>
            )}

            <FormField label="Tenant Bill Due Date" htmlFor="tenant-bill-due-date">
              <Input
                id="tenant-bill-due-date"
                type="date"
                value={allocationSettings.dueDate ? allocationSettings.dueDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setAllocationSettings({
                  ...allocationSettings,
                  dueDate: e.target.value ? new Date(e.target.value) : undefined,
                })}
                min={new Date().toISOString().split('T')[0]}
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={calculateAllocation}
                isLoading={isCalculating}
                leftIcon={<Calculator className="h-4 w-4" />}
              >
                Calculate Allocation
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {allocations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Allocation Results
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodColor(allocationSettings.allocationMethod)}`}>
                {getMethodLabel(allocationSettings.allocationMethod)}
              </span>
            </div>
          </CardHeader>

          <CardBody className="space-y-4">
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

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={calculateAllocation}
                isLoading={isCalculating}
              >
                Recalculate
              </Button>
              <Button
                variant="primary"
                onClick={generateTenantBills}
                isLoading={isGenerating}
                isDisabled={hasGenerated}
                leftIcon={hasGenerated ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              >
                {hasGenerated ? 'Bills Generated' : 'Generate Tenant Bills'}
              </Button>
            </div>

            {hasGenerated && (
              <Alert variant="success" title="Bills Generated Successfully">
                Tenant utility bills have been generated successfully. You can view them in the Tenant Bills section.
              </Alert>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
