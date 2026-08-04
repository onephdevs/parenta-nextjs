'use client';

import { useState } from 'react';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Button } from '@/components/ui/Button';

export default function LateFeeApplication() {
  const { alert, confirm, dialog } = useAppDialog();
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/late-fees/calculate', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setCalculations(data.calculations || []);
        setHasCalculated(true);
        await alert({
          title: 'Late fee calculation',
          message: data.message || 'Calculation complete.',
          variant: (data.calculations || []).length > 0 ? 'success' : 'info',
        });
      } else {
        await alert({
          title: 'Calculation failed',
          message: data.error || 'Failed to calculate late fees',
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error calculating late fees:', error);
      await alert({
        title: 'Calculation failed',
        message: 'Failed to calculate late fees',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (dryRun: boolean = false) => {
    if (
      !dryRun &&
      !(await confirm({
        title: 'Apply late fees?',
        message: 'Are you sure you want to apply late fees to all eligible invoices?',
        confirmText: 'Apply late fees',
        variant: 'danger',
      }))
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/late-fees/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dry_run: dryRun }),
      });

      const data = await response.json();

      if (data.success || data.partial_success) {
        await alert({
          title: dryRun ? 'Dry run complete' : 'Late fees applied',
          message: data.message,
          variant: 'success',
        });

        if (!dryRun) {
          setHasCalculated(false);
          setCalculations([]);
        }
      } else {
        await alert({
          title: 'Apply failed',
          message: data.error || 'Failed to apply late fees',
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error applying late fees:', error);
      await alert({
        title: 'Apply failed',
        message: 'Failed to apply late fees',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {dialog}
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Late Fee Application</h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold mb-2 text-gray-900">How It Works</h3>
        <ol className="list-decimal list-inside text-sm space-y-1 text-gray-900">
          <li>Click &quot;Calculate Eligible Fees&quot; to see which invoices are eligible for late fees</li>
          <li>Review the list of invoices and calculated fees</li>
          <li>Click &quot;Apply Late Fees&quot; to create late fee invoices for all eligible tenants</li>
          <li>Late fee invoices will be automatically generated and sent to tenants</li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={handleCalculate} isDisabled={loading} isLoading={loading}>
          {loading ? 'Calculating...' : 'Calculate Eligible Fees'}
        </Button>

        {hasCalculated && calculations.length > 0 && (
          <>
            <Button variant="outline" onClick={() => handleApply(true)} isDisabled={loading}>
              {loading ? 'Processing...' : 'Dry Run (Preview)'}
            </Button>
            <Button variant="danger" onClick={() => handleApply(false)} isDisabled={loading}>
              {loading ? 'Applying...' : 'Apply Late Fees'}
            </Button>
          </>
        )}
      </div>

      {hasCalculated && (
        <div className="border border-gray-300 rounded-lg bg-white">
          <div className="p-4 border-b border-gray-300 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              Eligible Invoices ({calculations.length})
            </h3>
            {calculations.length > 0 && (
              <p className="text-sm text-gray-900 mt-1">
                Total Late Fees: ₱
                {calculations
                  .reduce((sum, calc) => sum + calc.fee_amount, 0)
                  .toFixed(2)}
              </p>
            )}
          </div>

          {calculations.length === 0 ? (
            <div className="p-8 text-center text-gray-900">
              No invoices are currently eligible for late fees.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {calculations.map((calc: any, index: number) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">Invoice ID:</span>
                        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-900">
                          {calc.invoice_id}
                        </code>
                      </div>
                      <div className="text-sm text-gray-900 space-y-1">
                        <p>
                          <span className="font-medium">Tenant ID:</span> {calc.tenant_id}
                        </p>
                        <p>
                          <span className="font-medium">Days Overdue:</span>{' '}
                          <span className="text-red-600 font-semibold">
                            {calc.days_overdue} days
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Original Amount:</span> ₱
                          {calc.original_amount.toFixed(2)}
                        </p>
                        <p>
                          <span className="font-medium">Calculation Method:</span>{' '}
                          <span className="capitalize">{calc.calculation_method}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900 mb-1">Late Fee</p>
                      <p className="text-2xl font-bold text-red-600">
                        ₱{calc.fee_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
