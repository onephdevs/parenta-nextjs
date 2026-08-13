/**
 * Serializable tenant profile props for the Alfonso-style Tenant Profile page.
 * Dates are ISO strings so the shell can be a client component.
 */

export interface TenantProfileAssignment {
  id: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  monthlyRate: number;
  startDate: string | null;
  endDate: string | null;
  assignmentStatus: string;
  depositPaid?: number | null;
  advancePaid?: number | null;
  utilityDepositPaid?: number | null;
  notes?: string | null;
  leasePackageTemplateId?: string | null;
  leasePackageTemplateName?: string | null;
  leasePackageTermMonths?: number | null;
  leasePackageDepositMonths?: number | null;
  leasePackageAdvanceMonths?: number | null;
  leasePackageGracePeriodDays?: number | null;
  leasePackagePenaltyType?: 'percentage' | 'flat_fee' | null;
  leasePackagePenaltyFee?: number | null;
}

export interface TenantProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  previousAddress?: string | null;
  tenantStatus: string;
  isTenant: boolean;
  profilePictureUrl?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  employmentStatus?: string | null;
  employerName?: string | null;
  monthlyIncome?: number | null;
  securityDeposit?: number | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  notes?: string | null;
  agreementDocumentId?: string | null;
  agreementDocumentUrl?: string | null;
  agreementDocumentName?: string | null;
  currentAssignment?: TenantProfileAssignment | null;
  assignmentHistory: TenantProfileAssignment[];
}

export type TenantProfileTab = 'profile' | 'lease' | 'financials' | 'documents';
