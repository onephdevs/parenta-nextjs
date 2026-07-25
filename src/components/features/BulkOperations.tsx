'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

type TabType = 'invoices' | 'payments' | 'tenants';

export default function BulkOperations() {
  const { showSuccess, showError, showInfo } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [loading, setLoading] = useState(false);

  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  const [tenantIds, setTenantIds] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive' | 'terminated'>('active');

  const handleGenerateInvoices = async () => {
    if (!confirm('Generate monthly invoices for all active tenants?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bulk/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          month: invoiceMonth || undefined,
          building_id: buildingFilter || undefined,
        }),
      });

      const data = await response.json();

      if (data.success || data.partial_success) {
        showSuccess(data.message);
        showInfo(JSON.stringify(data, null, 2));
      } else {
        showError(data.error || 'Failed to generate invoices');
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      showError('Failed to generate invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());

      const preview = lines.slice(1, 6).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return row;
      });

      setCsvPreview(preview.filter((row) => Object.keys(row).length > 1));
    };

    reader.readAsText(file);
  };

  const handleImportPayments = async () => {
    if (!csvFile) {
      showError('Please select a CSV file first');
      return;
    }

    if (!confirm(`Import ${csvPreview.length}+ payments from CSV?`)) {
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());

        const payments = lines
          .slice(1)
          .map((line) => {
            const values = line.split(',').map((v) => v.trim());
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index];
            });

            return {
              tenant_id: row.tenant_id,
              amount: parseFloat(row.amount),
              payment_date: row.payment_date,
              payment_method: row.payment_method || 'bank_transfer',
              reference_number: row.reference_number || undefined,
              notes: row.notes || undefined,
              deposit_amount: row.deposit_amount ? parseFloat(row.deposit_amount) : undefined,
            };
          })
          .filter((payment) => payment.tenant_id && payment.amount);

        const response = await fetch('/api/bulk/payments/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ payments }),
        });

        const data = await response.json();

        if (data.success || data.partial_success) {
          showSuccess(data.message);
          showInfo(JSON.stringify(data, null, 2));
          setCsvFile(null);
          setCsvPreview([]);
        } else {
          showError(data.error || 'Failed to import payments');
        }
      };

      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Error importing payments:', error);
      showError('Failed to import payments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTenantStatuses = async () => {
    const ids = tenantIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id);

    if (ids.length === 0) {
      showError('Please enter tenant IDs');
      return;
    }

    if (!confirm(`Update ${ids.length} tenant(s) to status: ${newStatus}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bulk/tenants/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenant_ids: ids,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(data.message);
        setTenantIds('');
      } else {
        showError(data.error || 'Failed to update tenants');
      }
    } catch (error) {
      console.error('Error updating tenants:', error);
      showError('Failed to update tenants');
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (tab: TabType) =>
    `px-4 py-2 font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-purple-600 text-purple-600'
        : 'border-transparent text-gray-900 hover:text-gray-700'
    }`;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Bulk Operations</h2>

      <div className="border-b border-gray-300 mb-6">
        <div className="flex gap-4">
          <button type="button" onClick={() => setActiveTab('invoices')} className={tabClass('invoices')}>
            Generate Invoices
          </button>
          <button type="button" onClick={() => setActiveTab('payments')} className={tabClass('payments')}>
            Import Payments
          </button>
          <button type="button" onClick={() => setActiveTab('tenants')} className={tabClass('tenants')}>
            Update Tenants
          </button>
        </div>
      </div>

      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <Alert variant="info" title="Generate Monthly Invoices">
            Generate invoices for all active tenants for a specific month. This will create an invoice for each
            tenant&apos;s monthly rent.
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              htmlFor="invoiceMonth"
              label="Target Month"
              hint="Leave empty to generate for next month"
            >
              <Input
                id="invoiceMonth"
                type="month"
                value={invoiceMonth}
                onChange={(e) => setInvoiceMonth(e.target.value)}
                placeholder="Leave empty for next month"
              />
            </FormField>

            <FormField
              htmlFor="buildingFilter"
              label="Building Filter (Optional)"
              hint="Leave empty to generate for all buildings"
            >
              <Input
                id="buildingFilter"
                type="text"
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                placeholder="Building ID"
              />
            </FormField>
          </div>

          <Button
            variant="primary"
            className="w-full"
            size="lg"
            onClick={handleGenerateInvoices}
            isLoading={loading}
          >
            Generate Invoices for All Tenants
          </Button>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <Alert variant="success" title="Import Payments from CSV">
            <p className="mb-3">Upload a CSV file with the following columns:</p>
            <code className="text-xs bg-white px-2 py-1 rounded block text-gray-900">
              tenant_id, amount, payment_date, payment_method, reference_number, notes, deposit_amount
            </code>
            <p className="text-xs mt-2">
              Example: &quot;tenant-123&quot;, 5000, &quot;2025-01-15&quot;, &quot;bank_transfer&quot;, &quot;REF-001&quot;, &quot;Monthly rent&quot;, 1000
            </p>
          </Alert>

          <FormField htmlFor="csvFile" label="Select CSV File">
            <Input id="csvFile" type="file" accept=".csv" onChange={handleFileUpload} />
          </FormField>

          {csvPreview.length > 0 && (
            <Card padding="sm">
              <h4 className="font-medium text-gray-900 mb-2">Preview (First 5 rows)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-900">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(csvPreview[0]).map((header) => (
                        <th key={header} className="px-2 py-1 text-left text-gray-900">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, index) => (
                      <tr key={index} className="border-t">
                        {Object.values(row).map((value: any, i) => (
                          <td key={i} className="px-2 py-1 text-gray-900">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Button
            variant="primary"
            className="w-full"
            size="lg"
            onClick={handleImportPayments}
            isDisabled={!csvFile}
            isLoading={loading}
          >
            Import Payments from CSV
          </Button>
        </div>
      )}

      {activeTab === 'tenants' && (
        <div className="space-y-6">
          <Alert variant="info" title="Bulk Update Tenant Statuses">
            Update the status of multiple tenants at once. Enter comma-separated tenant IDs.
          </Alert>

          <FormField
            htmlFor="tenantIds"
            label="Tenant IDs (comma-separated)"
            hint='Example: tenant-123, tenant-456, tenant-789'
          >
            <Textarea
              id="tenantIds"
              value={tenantIds}
              onChange={(e) => setTenantIds(e.target.value)}
              rows={4}
              placeholder="tenant-1, tenant-2, tenant-3"
            />
          </FormField>

          <FormField htmlFor="newStatus" label="New Status">
            <Select
              id="newStatus"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as 'active' | 'inactive' | 'terminated')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </Select>
          </FormField>

          <Button
            variant="primary"
            className="w-full"
            size="lg"
            onClick={handleUpdateTenantStatuses}
            isDisabled={!tenantIds}
            isLoading={loading}
          >
            Update Tenant(s) to {newStatus.toUpperCase()}
          </Button>
        </div>
      )}
    </div>
  );
}
