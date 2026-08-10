/** Contact directory roles — a person may hold multiple via contact_roles. */

export const CONTACT_ROLES = ['TENANT', 'STAFF', 'VENDOR'] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  TENANT: 'Tenant',
  STAFF: 'Staff',
  VENDOR: 'Vendor',
};

export function isContactRole(value: string | null | undefined): value is ContactRole {
  return (CONTACT_ROLES as readonly string[]).includes(String(value || '').toUpperCase());
}

/** Company-only vendors use this last_name sentinel (column is NOT NULL). */
export const VENDOR_COMPANY_LAST_NAME = '-';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  tenantId?: string;
  userId?: string;
  isActive: boolean;
  roles: ContactRole[];
  createdAt?: string;
  updatedAt?: string;
}

export function contactDisplayName(
  contact: Pick<Contact, 'firstName' | 'lastName'>
): string {
  const last = (contact.lastName || '').trim();
  if (!last || last === VENDOR_COMPANY_LAST_NAME || last === '.') {
    return contact.firstName.trim();
  }
  return `${contact.firstName.trim()} ${last}`.trim();
}

export function vendorContactPersonName(lastName: string | null | undefined): string {
  const last = (lastName || '').trim();
  if (!last || last === VENDOR_COMPANY_LAST_NAME || last === '.') return '';
  return last;
}
