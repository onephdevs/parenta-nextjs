export type ApartmentPayStatus =
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'vacant'
  | 'newTenant';

export type ApartmentLineKind =
  | 'rent'
  | 'electric'
  | 'water'
  | 'advance'
  | 'deposit'
  | 'utilityDeposit'
  | 'vacant'
  | 'newTenant';

export interface ApartmentBuilding {
  id: string;
  name: string;
  shortName: string;
}

export interface ApartmentMonthOption {
  value: string;
  label: string;
}

export interface ApartmentLedgerLine {
  kind: ApartmentLineKind;
  label: string;
  amountPaid: number | null;
  datePaid: string | null;
  electric: number | null;
  water: number | null;
  unpaid: boolean;
}

export interface ApartmentUnitBlock {
  roomId: string;
  unit: string;
  tenantName: string | null;
  tenantId: string | null;
  href: string;
  payStatus: ApartmentPayStatus;
  monthlyRate: number;
  lines: ApartmentLedgerLine[];
}

export interface ApartmentExpenseItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  categoryLabel: string;
  buildingId: string | null;
  buildingName: string | null;
}

export interface ApartmentBuildingSheet {
  buildingId: string;
  name: string;
  shortName: string;
  headerTitle: string;
  billsTitle: string;
  collection: number;
  electricTotal: number;
  waterTotal: number;
  paidUnits: number;
  unpaidUnits: number;
  vacantUnits: number;
  newTenantUnits: number;
  occupiedUnits: number;
  totalUnits: number;
  units: ApartmentUnitBlock[];
  expenses: ApartmentExpenseItem[];
  expenseTotal: number;
}

export interface ApartmentRecordsSummary {
  collection: number;
  expenses: number;
  cashAllowance: number;
  cheque: number;
  netIncome: number;
  grandTotal: number;
  electricTotal: number;
  waterTotal: number;
  paidUnits: number;
  unpaidUnits: number;
  vacantUnits: number;
  newTenantUnits: number;
  occupiedUnits: number;
  totalUnits: number;
}

export interface ApartmentRecordsData {
  startDate: string;
  endDate: string;
  monthKey: string;
  periodLabel: string;
  periodShortLabel: string;
  availableMonths: ApartmentMonthOption[];
  buildingId: string | null;
  buildings: ApartmentBuilding[];
  summary: ApartmentRecordsSummary;
  expenses: ApartmentExpenseItem[];
  sheets: ApartmentBuildingSheet[];
}
