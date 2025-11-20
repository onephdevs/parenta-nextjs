'use client';

import { useState } from 'react';
import { LateFeeCalculationResult } from '@/types/financial';

export default function LateFeeApplication() {
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
        alert(data.message);
      } else {
        alert(data.error || 'Failed to calculate late fees');
      }
    } catch (error) {
      console.error('Error calculating late fees:', error);
      alert('Failed to calculate late fees');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (dryRun: boolean = false) => {
    if (!dryRun && !confirm('Are you sure you want to apply late fees to all eligible invoices?')) {
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
        alert(data.message);
        
        if (!dryRun) {
          // Refresh calculations
          setHasCalculated(false);
          setCalculations([]);
        }
      } else {
        alert(data.error || 'Failed to apply late fees');
      }
    } catch (error) {
      console.error('Error applying late fees:', error);
      alert('Failed to apply late fees');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Late Fee Application</h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold mb-2">How It Works</h3>
        <ol className="list-decimal list-inside text-sm space-y-1">
          <li>Click "Calculate Eligible Fees" to see which invoices are eligible for late fees</li>
          <li>Review the list of invoices and calculated fees</li>
          <li>Click "Apply Late Fees" to create late fee invoices for all eligible tenants</li>
          <li>Late fee invoices will be automatically generated and sent to tenants</li>
        </ol>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Calculating...' : 'Calculate Eligible Fees'}
        </button>
        
        {hasCalculated && calculations.length > 0 && (
          <>
            <button
              onClick={() => handleApply(true)}
              disabled={loading}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Dry Run (Preview)'}
            </button>
            <button
              onClick={() => handleApply(false)}
              disabled={loading}
              className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              {loading ? 'Applying...' : 'Apply Late Fees'}
            </button>
          </>
        )}
      </div>

      {hasCalculated && (
        <div className="border border-gray-300 rounded-lg bg-white">
          <div className="p-4 border-b border-gray-300 bg-gray-50">
            <h3 className="text-lg font-semibold">
              Eligible Invoices ({calculations.length})
            </h3>
            {calculations.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Total Late Fees: ₱
                {calculations
                  .reduce((sum, calc) => sum + calc.fee_amount, 0)
                  .toFixed(2)}
              </p>
            )}
          </div>

          {calculations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No invoices are currently eligible for late fees.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {calculations.map((calc: any, index: number) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Invoice ID:</span>
                        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {calc.invoice_id}
                        </code>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
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
                      <p className="text-sm text-gray-600 mb-1">Late Fee</p>
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

