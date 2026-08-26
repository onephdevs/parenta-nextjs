'use client';

import { useState, useEffect } from 'react';
import { User, CreditCard } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell, { SectionedFormSection, SectionCard } from '@/components/ui/SectionedFormShell';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { compareByRoomThenName } from '@/lib/utils/natural-sort';
import ProcessPaymentClient from '@/components/features/payments/ProcessPaymentClient';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  currentRoomId?: string;
  currentRoomNumber?: string;
  currentBuildingId?: string;
  currentBuildingName?: string;
  buildingName?: string;
  roomNumber?: string;
}

function tenantRoomLabel(tenant: Tenant): string {
  const building = tenant.currentBuildingName || tenant.buildingName || '';
  const room = tenant.currentRoomNumber || tenant.roomNumber || '';
  if (building && room) return `${building} · Unit ${room}`;
  if (room) return `Unit ${room}`;
  if (building) return building;
  return '';
}

function normalizeTenant(raw: Tenant & Record<string, unknown>): Tenant {
  return {
    ...raw,
    currentRoomId: raw.currentRoomId || (raw.current_room_id as string | undefined),
    currentRoomNumber:
      raw.currentRoomNumber ||
      (raw.current_room_number as string | undefined) ||
      raw.roomNumber,
    currentBuildingId:
      raw.currentBuildingId ||
      (raw.current_building_id as string | undefined) ||
      (raw.buildingId as string | undefined),
    currentBuildingName:
      raw.currentBuildingName ||
      (raw.current_building_name as string | undefined) ||
      raw.buildingName,
    roomNumber:
      raw.roomNumber ||
      raw.currentRoomNumber ||
      (raw.current_room_number as string | undefined),
    buildingName:
      raw.buildingName ||
      raw.currentBuildingName ||
      (raw.current_building_name as string | undefined),
  };
}

interface PaymentFormProps {
  initialData?: { tenantId?: string; invoiceId?: string; amount?: string };
  onCancel?: () => void;
  onSuccess?: () => void;
  mode?: 'page' | 'modal';
  isOpen?: boolean;
  /** When set, tenant dropdown lists only tenants in this building. */
  buildingId?: string;
}

type SectionId = 'tenant' | 'payment';

const SECTIONS: SectionedFormSection<SectionId>[] = [
  {
    id: 'tenant',
    label: 'Tenant',
    icon: <User className="h-4 w-4" />,
    title: 'Tenant Selection',
    subtitle: 'Choose the tenant making this payment',
  },
  {
    id: 'payment',
    label: 'Payment Details',
    icon: <CreditCard className="h-4 w-4" />,
    title: 'Process Payment',
    subtitle: 'Select an invoice and confirm payment details',
  },
];

export default function PaymentForm({
  initialData,
  onCancel,
  onSuccess,
  mode = 'page',
  isOpen = true,
  buildingId,
}: PaymentFormProps) {
  const { addNotification } = useNotifications();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantId, setTenantId] = useState(initialData?.tenantId || '');
  const [activeSection, setActiveSection] = useState<SectionId>(
    initialData?.tenantId ? 'payment' : 'tenant'
  );

  const selectedTenant = tenants.find((t) => t.id === tenantId) || null;

  useEffect(() => {
    const loadData = async () => {
      setTenantsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '300',
          status: 'active',
        });
        if (buildingId) params.set('buildingId', buildingId);
        const tenantsRes = await fetch(`/api/tenants?${params.toString()}`, {
          credentials: 'include',
        });

        if (!tenantsRes.ok) {
          setTenants([]);
          return;
        }
        const tenantsData = await tenantsRes.json();
        let tenantsList: Tenant[] = [];
        if (tenantsData.success && tenantsData.data) {
          tenantsList = Array.isArray(tenantsData.data.tenants)
            ? tenantsData.data.tenants
            : Array.isArray(tenantsData.data)
              ? tenantsData.data
              : [];
        } else if (Array.isArray(tenantsData.tenants)) {
          tenantsList = tenantsData.tenants;
        } else if (Array.isArray(tenantsData.data)) {
          tenantsList = tenantsData.data;
        }

        let list = (Array.isArray(tenantsList) ? tenantsList : []).map((t) =>
          normalizeTenant(t as Tenant & Record<string, unknown>)
        );
        if (buildingId) {
          list = list.filter((t) => !t.currentBuildingId || t.currentBuildingId === buildingId);
        }
        setTenants([...list].sort(compareByRoomThenName));
      } catch (error) {
        console.error('Error loading tenants:', error);
        addNotification('Failed to load tenant data', 'error');
        setTenants([]);
      } finally {
        setTenantsLoading(false);
      }
    };

    void loadData();
  }, [addNotification, buildingId]);

  const handleCancel = () => {
    onCancel?.();
  };

  const goToPayment = () => {
    if (!tenantId) {
      addNotification('Select a tenant first', 'error');
      setActiveSection('tenant');
      return;
    }
    setActiveSection('payment');
  };

  if (mode === 'modal' && !isOpen) return null;

  const shellProps = {
    eyebrow: 'Record payment',
    entityLabel: selectedTenant
      ? `${selectedTenant.firstName} ${selectedTenant.lastName}`
      : undefined,
    sections: SECTIONS,
    activeSection,
    onSectionChange: (id: SectionId) => {
      if (id === 'payment' && !tenantId) {
        addNotification('Select a tenant first', 'error');
        setActiveSection('tenant');
        return;
      }
      setActiveSection(id);
    },
    onCancel: handleCancel,
    primaryLabel: 'Continue',
    primaryType: 'button' as const,
    onPrimary: goToPayment,
    hidePrimary: activeSection === 'payment',
    primaryDisabled: !tenantId,
    size: 'wide' as const,
  };

  const body = (
    <div className="space-y-6">
      {activeSection === 'tenant' && (
        <SectionCard title="Tenant Selection">
          <FormField
            label="Tenant"
            htmlFor="tenantId"
            required
            hint={
              buildingId
                ? tenantsLoading
                  ? 'Loading tenants in this property…'
                  : tenants.length === 0
                    ? 'No active tenants in this property'
                    : `${tenants.length} tenant${tenants.length === 1 ? '' : 's'} in this property`
                : undefined
            }
          >
            <Select
              id="tenantId"
              name="tenantId"
              value={tenantId}
              onChange={(e) => {
                const next = e.target.value;
                setTenantId(next);
                if (next) setActiveSection('payment');
              }}
            >
              <option value="">Select a tenant</option>
              {tenantsLoading ? (
                <option value="" disabled>
                  Loading tenants...
                </option>
              ) : tenants.length > 0 ? (
                tenants.map((tenant) => {
                  const unit = tenantRoomLabel(tenant);
                  return (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName}
                      {unit ? ` (${unit})` : ''}
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>
                  No tenants found
                </option>
              )}
            </Select>
          </FormField>
        </SectionCard>
      )}

      {activeSection === 'payment' && (
        tenantId ? (
          <ProcessPaymentClient
            key={tenantId}
            embedded
            initialTenantId={tenantId}
            initialInvoiceId={initialData?.invoiceId}
            initialAmount={initialData?.amount}
            onCancel={() => setActiveSection('tenant')}
            onSuccess={() => onSuccess?.()}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            Select a tenant to load the process payment form.
          </p>
        )
      )}
    </div>
  );

  return (
    <div className="text-gray-900">
      {mode === 'page' ? (
        <SectionedFormShell mode="page" {...shellProps}>
          {body}
        </SectionedFormShell>
      ) : (
        <SectionedFormShell mode="modal" isOpen={isOpen} {...shellProps}>
          {body}
        </SectionedFormShell>
      )}
    </div>
  );
}
