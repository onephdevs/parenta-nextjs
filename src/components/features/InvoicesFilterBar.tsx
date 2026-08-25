'use client';

import { useEffect, useState } from 'react';
import { FilterBar, SearchInput, Select } from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { useListQuery } from '@/hooks/useListQuery';

interface InvoiceTenantOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface InvoicesFilterBarProps {
  search: string;
  status: string;
  tenantId: string;
  tenants: InvoiceTenantOption[];
  shown: number;
  total: number;
}

export function InvoicesFilterBar({
  search,
  status,
  tenantId,
  tenants,
  shown,
  total,
}: InvoicesFilterBarProps) {
  const { replaceQuery } = useListQuery();
  const [searchDraft, setSearchDraft] = useState(search);
  const [statusDraft, setStatusDraft] = useState(status);
  const [tenantDraft, setTenantDraft] = useState(tenantId);

  useEffect(() => {
    setSearchDraft(search);
    setStatusDraft(status);
    setTenantDraft(tenantId);
  }, [search, status, tenantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft === search) return;
      replaceQuery({ search: searchDraft });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search only
  }, [searchDraft]);

  return (
    <FilterBar
      columns={2}
      collapsible
      activeCount={[statusDraft, tenantDraft].filter(Boolean).length}
      search={
        <SearchInput
          id="search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Invoice #, tenant..."
          aria-label="Search invoices"
        />
      }
      footer={
        <p className="text-sm text-gray-600">
          Showing {shown} of {total} invoices
        </p>
      }
    >
      <FormField label="Status" htmlFor="status">
        <Select
          id="status"
          value={statusDraft}
          onChange={(e) => {
            const value = e.target.value;
            setStatusDraft(value);
            replaceQuery({ status: value });
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </FormField>

      <FormField label="Tenant" htmlFor="tenant">
        <Select
          id="tenant"
          value={tenantDraft}
          onChange={(e) => {
            const value = e.target.value;
            setTenantDraft(value);
            replaceQuery({ tenant: value });
          }}
        >
          <option value="">All Tenants</option>
          {tenants.length > 0 ? (
            tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.firstName} {tenant.lastName}
              </option>
            ))
          ) : (
            <option value="" disabled>
              No tenants available
            </option>
          )}
        </Select>
      </FormField>
    </FilterBar>
  );
}
