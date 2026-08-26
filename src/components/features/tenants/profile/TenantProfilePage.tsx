'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { PreviewTenantPortalButton } from '@/components/features/tenant/PreviewTenantPortalButton';
import TenantNotesAction from '@/components/features/tenants/TenantNotesAction';
import { useNotifications } from '@/hooks/useNotifications';
import { TenantSummaryCard } from './TenantSummaryCard';
import { ProfileTab } from './ProfileTab';
import { LeaseTab } from './LeaseTab';
import { FinancialsTab } from './FinancialsTab';
import { DocumentsTab } from './DocumentsTab';
import { LeaseDetailsPanel } from './LeaseDetailsPanel';
import type { TenantProfileAssignment, TenantProfileData, TenantProfileTab } from './types';
import { fullName } from './utils';

interface TenantProfilePageProps {
  tenant: TenantProfileData;
}

function parseTab(value: string | null): TenantProfileTab {
  if (value === 'lease' || value === 'financials' || value === 'documents' || value === 'profile') {
    return value;
  }
  return 'profile';
}

export default function TenantProfilePage({ tenant: initialTenant }: TenantProfilePageProps) {
  const searchParams = useSearchParams();
  const { showNotification } = useNotifications();
  const [tab, setTab] = useState<TenantProfileTab>(() => parseTab(searchParams.get('tab')));
  const [selectedLease, setSelectedLease] = useState<TenantProfileAssignment | null>(null);
  const [tenant, setTenant] = useState(initialTenant);
  const name = fullName(tenant.firstName, tenant.lastName);

  useEffect(() => {
    setTenant(initialTenant);
  }, [initialTenant]);

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    const updated = searchParams.get('leaseUpdated') === '1';
    const renewed = searchParams.get('leaseRenewed') === '1';
    if (!updated && !renewed) return;

    if (renewed) {
      showNotification({
        type: 'success',
        title: 'Successfully renewed!',
        message: 'Lease has been successfully renewed.',
      });
    } else {
      showNotification({
        type: 'success',
        title: 'Successfully updated!',
        message: 'Changes successfully applied to lease.',
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('leaseUpdated');
    url.searchParams.delete('leaseRenewed');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, [searchParams, showNotification]);

  const handleTabChange = (value: string) => {
    setSelectedLease(null);
    setTab(value as TenantProfileTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F8FA]">
      <div className="border-b border-gray-200/80 bg-white px-5 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/tenants"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <PreviewTenantPortalButton tenantId={tenant.id} tenantName={name} />
            <TenantNotesAction tenantId={tenant.id} tenantName={name} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 p-5 lg:grid-cols-[300px_1fr] lg:gap-7 lg:p-8">
        <TenantSummaryCard
          tenant={tenant}
          className="lg:sticky lg:top-5"
          onTenantUpdated={(patch) => setTenant((prev) => ({ ...prev, ...patch }))}
        />

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          {selectedLease ? (
            <LeaseDetailsPanel
              lease={selectedLease}
              tenantId={tenant.id}
              history={tenant.assignmentHistory}
              onBack={() => setSelectedLease(null)}
            />
          ) : (
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabList className="gap-7 space-x-0 border-gray-200">
                <Tab value="profile" className="px-0 text-sm font-semibold">
                  Profile
                </Tab>
                <Tab value="lease" className="px-0 text-sm font-semibold">
                  Lease
                </Tab>
                <Tab value="financials" className="px-0 text-sm font-semibold">
                  Financials
                </Tab>
                <Tab value="documents" className="px-0 text-sm font-semibold">
                  Documents
                </Tab>
              </TabList>

              <TabPanel value="profile" className="pt-6">
                <ProfileTab
                  tenant={tenant}
                  onTenantUpdated={(patch) =>
                    setTenant((prev) => ({ ...prev, ...patch }))
                  }
                />
              </TabPanel>
              <TabPanel value="lease" className="pt-6">
                <LeaseTab
                  tenant={tenant}
                  onViewLease={(lease) => setSelectedLease(lease)}
                />
              </TabPanel>
              <TabPanel value="financials" className="pt-6">
                <FinancialsTab tenantId={tenant.id} />
              </TabPanel>
              <TabPanel value="documents" className="pt-6">
                <DocumentsTab
                  tenantId={tenant.id}
                  agreementDocumentId={tenant.agreementDocumentId}
                  agreementDocumentUrl={tenant.agreementDocumentUrl}
                  agreementDocumentName={tenant.agreementDocumentName}
                />
              </TabPanel>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
