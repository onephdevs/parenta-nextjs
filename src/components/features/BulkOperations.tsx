'use client';

import { useState } from 'react';

type TabType = 'invoices' | 'payments' | 'tenants';

export default function BulkOperations() {
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [loading, setLoading] = useState(false);

  // Bulk Invoice Generation
  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');

  // CSV Payment Import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  // Bulk Tenant Status Update
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
        alert(data.message + '\n\nDetails:\n' + JSON.stringify(data, null, 2));
      } else {
        alert('Error: ' + (data.error || 'Failed to generate invoices'));
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      alert('Failed to generate invoices');
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
      const headers = lines[0].split(',').map(h => h.trim());
      
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return row;
      });

      setCsvPreview(preview.filter(row => Object.keys(row).length > 1));
    };

    reader.readAsText(file);
  };

  const handleImportPayments = async () => {
    if (!csvFile) {
      alert('Please select a CSV file first');
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
        const headers = lines[0].split(',').map(h => h.trim());
        
        const payments = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          
          // Convert types
          return {
            tenant_id: row.tenant_id,
            amount: parseFloat(row.amount),
            payment_date: row.payment_date,
            payment_method: row.payment_method || 'bank_transfer',
            reference_number: row.reference_number || undefined,
            notes: row.notes || undefined,
            deposit_amount: row.deposit_amount ? parseFloat(row.deposit_amount) : undefined,
          };
        }).filter(payment => payment.tenant_id && payment.amount);

        const response = await fetch('/api/bulk/payments/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ payments }),
        });

        const data = await response.json();

        if (data.success || data.partial_success) {
          alert(data.message + '\n\nDetails:\n' + JSON.stringify(data, null, 2));
          setCsvFile(null);
          setCsvPreview([]);
        } else {
          alert('Error: ' + (data.error || 'Failed to import payments'));
        }
      };

      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Error importing payments:', error);
      alert('Failed to import payments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTenantStatuses = async () => {
    const ids = tenantIds.split(',').map(id => id.trim()).filter(id => id);
    
    if (ids.length === 0) {
      alert('Please enter tenant IDs');
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
        alert(data.message);
        setTenantIds('');
      } else {
        alert('Error: ' + (data.error || 'Failed to update tenants'));
      }
    } catch (error) {
      console.error('Error updating tenants:', error);
      alert('Failed to update tenants');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Bulk Operations</h2>

      {/* Tabs */}
      <div className="border-b border-gray-300 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'invoices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-900 hover:text-gray-900'
            }`}
          >
            📄 Generate Invoices
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-900 hover:text-gray-900'
            }`}
          >
            💰 Import Payments
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'tenants'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-900 hover:text-gray-900'
            }`}
          >
            👥 Update Tenants
          </button>
        </div>
      </div>

      {/* Bulk Invoice Generation */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-gray-900 mb-2">Generate Monthly Invoices</h3>
            <p className="text-sm text-gray-900">
              Generate invoices for all active tenants for a specific month. This will create
              an invoice for each tenant's monthly rent.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Target Month</label>
              <input
                type="month"
                value={invoiceMonth}
                onChange={(e) => setInvoiceMonth(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Leave empty for next month"
              />
              <p className="text-xs text-gray-900 mt-1">
                Leave empty to generate for next month
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Building Filter (Optional)</label>
              <input
                type="text"
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Building ID"
              />
              <p className="text-xs text-gray-900 mt-1">
                Leave empty to generate for all buildings
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateInvoices}
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Generating...' : 'Generate Invoices for All Tenants'}
          </button>
        </div>
      )}

      {/* CSV Payment Import */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold text-gray-900 mb-2">Import Payments from CSV</h3>
            <p className="text-sm text-gray-900 mb-3">
              Upload a CSV file with the following columns:
            </p>
            <code className="text-xs bg-white px-2 py-1 rounded block text-gray-900">
              tenant_id, amount, payment_date, payment_method, reference_number, notes, deposit_amount
            </code>
            <p className="text-xs text-gray-900 mt-2">
              Example: "tenant-123", 5000, "2025-01-15", "bank_transfer", "REF-001", "Monthly rent", 1000
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {csvPreview.length > 0 && (
            <div className="border border-gray-300 rounded p-4">
              <h4 className="font-medium text-gray-900 mb-2">Preview (First 5 rows)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-900">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(csvPreview[0]).map(header => (
                        <th key={header} className="px-2 py-1 text-left text-gray-900">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, index) => (
                      <tr key={index} className="border-t">
                        {Object.values(row).map((value: any, i) => (
                          <td key={i} className="px-2 py-1 text-gray-900">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={handleImportPayments}
            disabled={loading || !csvFile}
            className="w-full py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Importing...' : 'Import Payments from CSV'}
          </button>
        </div>
      )}

      {/* Bulk Tenant Status Update */}
      {activeTab === 'tenants' && (
        <div className="space-y-6">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <h3 className="font-semibold text-gray-900 mb-2">Bulk Update Tenant Statuses</h3>
            <p className="text-sm text-gray-900">
              Update the status of multiple tenants at once. Enter comma-separated tenant IDs.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Tenant IDs (comma-separated)</label>
            <textarea
              value={tenantIds}
              onChange={(e) => setTenantIds(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={4}
              placeholder="tenant-1, tenant-2, tenant-3"
            />
            <p className="text-xs text-gray-900 mt-1">
              Example: tenant-123, tenant-456, tenant-789
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">New Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <button
            onClick={handleUpdateTenantStatuses}
            disabled={loading || !tenantIds}
            className="w-full py-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Updating...' : `Update Tenant(s) to ${newStatus.toUpperCase()}`}
          </button>
        </div>
      )}
    </div>
  );
}

