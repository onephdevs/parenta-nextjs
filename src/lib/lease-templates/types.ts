/**
 * Lease template CMS — types, variable catalog, and section keys.
 *
 * Dynamic values
 * --------------
 * Designer live preview uses a real active assignment via
 * getLeaseDesignerPreviewContext() (Balibago/Villasol). SAMPLE_LEASE_CONTEXT
 * is only a fallback when no lease exists.
 * Real leases resolve the same {{tokens}} from live DB records when a lease
 * is generated (see lease-agreement-document.ts → LeaseTemplateContext).
 *
 * Admin source of truth for each token:
 * - lease.*          → tenant assignment / lease package / late-fee settings
 * - building.name    → Buildings admin (buildings.name)
 * - building.address → Buildings admin (address lines + city/state/postal)
 * - building.houseRules → Buildings admin (buildings.description) until a dedicated field exists
 * - building.petPolicy  → not stored in DB yet (preview sample text; add building field to edit as admin)
 * - tenant.*         → Tenants admin
 * - landlord.companyName → brand constant / LANDLORD_COMPANY_NAME env (Alfonso)
 * - unit.number      → Rooms admin
 */

import { LANDLORD_COMPANY_NAME } from '@/lib/brand';

export type LeaseTemplateStatus = 'draft' | 'published' | 'archived';
export type LeaseSignatureMethod = 'typed_name' | 'drawn' | 'upload';
export type LeaseVariableCategory = 'lease' | 'building' | 'tenant' | 'landlord' | 'unit';

export type LeaseSectionConditionKey =
  | 'has_co_tenants'
  | 'has_pet_policy'
  | 'has_house_rules'
  | 'has_custom_clauses'
  | null;

export interface LeaseTemplateVariableDef {
  key: string; // e.g. lease.dueDay
  token: string; // e.g. {{lease.dueDay}}
  label: string;
  category: LeaseVariableCategory;
  description: string;
  sampleValue: string;
  /** How the live preview formats the resolved value */
  format?: 'text' | 'currency' | 'date' | 'ordinal_day' | 'days';
}

export interface LeaseTemplateSection {
  id: string;
  templateId: string;
  sectionKey: string;
  title: string;
  body: string;
  sortOrder: number;
  isEnabled: boolean;
  conditionKey: LeaseSectionConditionKey;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaseTemplate {
  id: string;
  buildingId: string | null;
  name: string;
  description: string | null;
  status: LeaseTemplateStatus;
  version: number;
  signatureMethod: LeaseSignatureMethod;
  requireWitness: boolean;
  auditIp: boolean;
  auditTimestamp: boolean;
  auditUserAgent: boolean;
  isSystem: boolean;
  publishedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  sections: LeaseTemplateSection[];
}

export interface LeaseTemplateContext {
  lease: {
    rentAmount: number;
    securityDeposit: number;
    advanceRent: number;
    dueDay: number;
    lateFeeGraceDays: number;
    lateFeeLabel?: string | null;
    startDate: string;
    endDate?: string | null;
    moveInDate?: string | null;
  };
  building: {
    name: string;
    address?: string | null;
    depositValidityDays: number;
    nonRefundableAfterDays: number;
    petPolicy?: string | null;
    houseRules?: string | null;
  };
  tenant: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  landlord: {
    companyName: string;
  };
  unit: {
    number: string;
  };
  occupants?: Array<{
    name: string;
    role: string;
    relationship?: string | null;
  }>;
  customClauses?: string[];
  documentId?: string | null;
  isDraft?: boolean;
  conditions?: {
    has_co_tenants?: boolean;
    has_pet_policy?: boolean;
    has_house_rules?: boolean;
    has_custom_clauses?: boolean;
  };
}

export const LEASE_TEMPLATE_VARIABLES: LeaseTemplateVariableDef[] = [
  {
    key: 'lease.rentAmount',
    token: '{{lease.rentAmount}}',
    label: 'rentAmount',
    category: 'lease',
    description: 'Monthly rent',
    sampleValue: '12500',
    format: 'currency',
  },
  {
    key: 'lease.securityDeposit',
    token: '{{lease.securityDeposit}}',
    label: 'securityDeposit',
    category: 'lease',
    description: 'Security deposit',
    sampleValue: '25000',
    format: 'currency',
  },
  {
    key: 'lease.advanceRent',
    token: '{{lease.advanceRent}}',
    label: 'advanceRent',
    category: 'lease',
    description: 'Advance rent',
    sampleValue: '12500',
    format: 'currency',
  },
  {
    key: 'lease.dueDay',
    token: '{{lease.dueDay}}',
    label: 'dueDay',
    category: 'lease',
    description: 'Rent due day of month',
    sampleValue: '5',
    format: 'ordinal_day',
  },
  {
    key: 'lease.lateFeeGraceDays',
    token: '{{lease.lateFeeGraceDays}}',
    label: 'lateFeeGraceDays',
    category: 'lease',
    description: 'Late fee grace period',
    sampleValue: '5',
    format: 'days',
  },
  {
    key: 'lease.lateFeeLabel',
    token: '{{lease.lateFeeLabel}}',
    label: 'lateFeeLabel',
    category: 'lease',
    description: 'Late fee description',
    sampleValue: '₱500 flat fee',
    format: 'text',
  },
  {
    key: 'lease.startDate',
    token: '{{lease.startDate}}',
    label: 'startDate',
    category: 'lease',
    description: 'Lease start',
    sampleValue: '2026-04-01',
    format: 'date',
  },
  {
    key: 'lease.endDate',
    token: '{{lease.endDate}}',
    label: 'endDate',
    category: 'lease',
    description: 'Lease end (or Open-ended)',
    sampleValue: '2027-03-31',
    format: 'date',
  },
  {
    key: 'lease.moveInDate',
    token: '{{lease.moveInDate}}',
    label: 'moveInDate',
    category: 'lease',
    description: 'Move-in date',
    sampleValue: '2026-04-01',
    format: 'date',
  },
  {
    key: 'building.name',
    token: '{{building.name}}',
    label: 'name',
    category: 'building',
    description: 'Building name',
    sampleValue: 'APARTMENT-1 BALIBAGO',
    format: 'text',
  },
  {
    key: 'building.address',
    token: '{{building.address}}',
    label: 'address',
    category: 'building',
    description: 'Building address',
    sampleValue: 'A. Santos St., Angeles, Pampanga',
    format: 'text',
  },
  {
    key: 'building.depositValidityDays',
    token: '{{building.depositValidityDays}}',
    label: 'depositValidityDays',
    category: 'building',
    description: 'Deposit validity window',
    sampleValue: '5',
    format: 'days',
  },
  {
    key: 'building.nonRefundableAfterDays',
    token: '{{building.nonRefundableAfterDays}}',
    label: 'nonRefundableAfterDays',
    category: 'building',
    description: 'Days until deposit may become non-refundable',
    sampleValue: '5',
    format: 'days',
  },
  {
    key: 'building.petPolicy',
    token: '{{building.petPolicy}}',
    label: 'petPolicy',
    category: 'building',
    description: 'Pet policy text',
    sampleValue: 'No pets without written approval.',
    format: 'text',
  },
  {
    key: 'building.houseRules',
    token: '{{building.houseRules}}',
    label: 'houseRules',
    category: 'building',
    description: 'House rules text',
    sampleValue: 'Quiet hours 10:00 PM – 7:00 AM.',
    format: 'text',
  },
  {
    key: 'tenant.name',
    token: '{{tenant.name}}',
    label: 'name',
    category: 'tenant',
    description: 'Primary tenant name',
    sampleValue: 'Adrian Estopace',
    format: 'text',
  },
  {
    key: 'tenant.email',
    token: '{{tenant.email}}',
    label: 'email',
    category: 'tenant',
    description: 'Tenant email',
    sampleValue: 'juan@example.com',
    format: 'text',
  },
  {
    key: 'tenant.phone',
    token: '{{tenant.phone}}',
    label: 'phone',
    category: 'tenant',
    description: 'Tenant phone',
    sampleValue: '+63 917 123 4567',
    format: 'text',
  },
  {
    key: 'landlord.companyName',
    token: '{{landlord.companyName}}',
    label: 'companyName',
    category: 'landlord',
    description: 'Landlord / management company',
    sampleValue: LANDLORD_COMPANY_NAME,
    format: 'text',
  },
  {
    key: 'unit.number',
    token: '{{unit.number}}',
    label: 'number',
    category: 'unit',
    description: 'Unit / room number',
    sampleValue: '4B',
    format: 'text',
  },
];

export const VARIABLE_CATEGORIES: Array<{
  id: LeaseVariableCategory;
  label: string;
}> = [
  { id: 'lease', label: 'LEASE' },
  { id: 'building', label: 'BUILDING' },
  { id: 'tenant', label: 'TENANT' },
  { id: 'landlord', label: 'LANDLORD' },
  { id: 'unit', label: 'UNIT' },
];

export const CONDITION_LABELS: Record<string, string> = {
  has_co_tenants: 'if co-tenants',
  has_pet_policy: 'if pet policy set',
  has_house_rules: 'if house rules set',
  has_custom_clauses: 'if custom clauses',
};

/** Compact 1-page Room Rental Agreement defaults (reference template). */
export const DEFAULT_SECTION_DEFS: Array<{
  sectionKey: string;
  title: string;
  body: string;
  conditionKey: LeaseSectionConditionKey;
  sortOrder: number;
}> = [
  {
    sectionKey: 'parties',
    title: 'The Parties',
    body: `This Room Rental Agreement ("Agreement") is made on {{lease.startDate}}, by and between:

Landlord: {{landlord.companyName}} ("Landlord"), AND

Tenant(s): {{tenant.name}} ("Tenant").`,
    conditionKey: null,
    sortOrder: 0,
  },
  {
    sectionKey: 'term',
    title: 'Term of Rental',
    body: `The term of this Agreement shall be on a fixed-term basis starting on {{lease.startDate}} and ending on {{lease.endDate}} ("Term").`,
    conditionKey: null,
    sortOrder: 1,
  },
  {
    sectionKey: 'rent',
    title: 'Rent',
    body: `The Tenant shall pay the Landlord, or their Agent: {{lease.rentAmount}} as Rent for the Term of this Agreement.

Payment shall be made by the Tenant to the Landlord on the {{lease.dueDay}} of every month ("Due Date").`,
    conditionKey: null,
    sortOrder: 2,
  },
  {
    sectionKey: 'late_fee',
    title: 'Late Fee',
    body: JSON.stringify({
      __type: '__choice_v1__',
      intro: '',
      selectHint: '(select one)',
      exclusive: true,
      options: [
        {
          id: 'penalty',
          letter: 'a',
          label:
            'If Rent is not paid within {{lease.lateFeeGraceDays}} of the Due Date, a penalty of {{lease.lateFeeLabel}} shall be due and payable',
          selected: true,
          nested: [
            { id: 'one_time', label: 'One-Time Payment', selected: true },
            { id: 'daily', label: 'for Every Day Rent is Late', selected: false },
          ],
        },
        {
          id: 'none',
          letter: 'b',
          label: 'There shall be No Late Fee if Rent is late.',
          selected: false,
        },
      ],
    }),
    conditionKey: null,
    sortOrder: 3,
  },
  {
    sectionKey: 'early_termination',
    title: 'Early Termination',
    body: JSON.stringify({
      __type: '__choice_v1__',
      intro: '',
      selectHint: '(select one)',
      exclusive: true,
      options: [
        {
          id: 'allowed',
          letter: 'a',
          label:
            "The Tenant(s) can terminate this Agreement by providing the Landlord at least 30 days' notice and paying a termination fee of {{lease.securityDeposit}}.",
          selected: true,
        },
        {
          id: 'none',
          letter: 'b',
          label:
            'The Tenant(s) shall not have the right to terminate this Agreement early.',
          selected: false,
        },
      ],
    }),
    conditionKey: null,
    sortOrder: 4,
  },
  {
    sectionKey: 'utilities',
    title: 'Utilities',
    body: JSON.stringify({
      __type: '__utility_table_v1__',
      intro: 'Rent includes utilities, except as specified below:',
      rows: [
        { id: 'gas_electric', label: 'Gas/Electricity', checked: true, tenantPaysPercent: 50 },
        { id: 'water', label: 'Water', checked: true, tenantPaysPercent: 50 },
        { id: 'garbage', label: 'Garbage', checked: true, tenantPaysPercent: 100 },
        { id: 'internet', label: 'Internet', checked: false, tenantPaysPercent: null },
        { id: 'other', label: 'Other', checked: false, tenantPaysPercent: null },
      ],
    }),
    conditionKey: null,
    sortOrder: 5,
  },
  {
    sectionKey: 'additional_terms',
    title: 'Additional Terms and Conditions',
    body: JSON.stringify({
      __type: '__free_text_v1__',
      text: '',
      blankLineCount: 2,
    }),
    conditionKey: null,
    sortOrder: 6,
  },
  {
    sectionKey: 'signatures',
    title: 'Signatures',
    body: '',
    conditionKey: null,
    sortOrder: 7,
  },
];

export const SAMPLE_LEASE_CONTEXT: LeaseTemplateContext = {
  lease: {
    rentAmount: 4800,
    securityDeposit: 9600,
    advanceRent: 4800,
    dueDay: 5,
    lateFeeGraceDays: 0,
    lateFeeLabel: 'None',
    startDate: '2026-08-05',
    endDate: '2027-02-04',
    moveInDate: '2026-08-05',
  },
  building: {
    name: 'APARTMENT-1 BALIBAGO',
    address: 'A. Santos St., Brgy. Balibago, Angeles, Pampanga',
    depositValidityDays: 5,
    nonRefundableAfterDays: 5,
    petPolicy: 'No pets without prior written approval from management.',
    houseRules: 'Quiet hours and house rules as posted by management.',
  },
  tenant: {
    name: 'Tenant Unit 1',
    email: null,
    phone: null,
  },
  landlord: {
    companyName: LANDLORD_COMPANY_NAME,
  },
  unit: {
    number: '1',
  },
  occupants: [{ name: 'Tenant Unit 1', role: 'Primary' }],
  customClauses: [],
  documentId: null,
  isDraft: true,
  conditions: {
    has_co_tenants: false,
    has_pet_policy: true,
    has_house_rules: true,
    has_custom_clauses: false,
  },
};
