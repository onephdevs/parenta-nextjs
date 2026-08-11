export type RentRollStatus =
  | 'onTime'
  | 'late'
  | 'vacant'
  | 'newTenant'
  | 'atRisk'
  | 'moveOut';

export interface LedgerBuilding {
  id: string;
  name: string;
  shortName: string;
}

export interface LedgerKpis {
  collection: number;
  priorCollection: number;
  expenses: number;
  netIncome: number;
  occupied: number;
  totalUnits: number;
  occupancyRate: number;
  lateUnits: number;
  trackableUnits: number;
  lateRate: number;
}

export interface WaterfallStep {
  label: string;
  value: number;
  sign: '+' | '-';
}

export interface PropertyCardData {
  buildingId: string;
  name: string;
  shortName: string;
  occupied: number;
  vacant: number;
  totalUnits: number;
  collection: number;
  lateRate: number;
  avgDaysLate: number;
}

export interface RentRollRow {
  roomId: string;
  unit: string;
  buildingId: string;
  buildingName: string;
  shortName: string;
  status: RentRollStatus;
  due: string | null;
  paidDate: string | null;
  amount: number;
  daysLate: number | null;
  elec: number | null;
  water: number | null;
  href: string;
}

export interface ExpenseCategoryRow {
  key: string;
  label: string;
  value: number;
}

export interface UtilityRecoveryRow {
  buildingId: string;
  prop: string;
  type: 'Electric' | 'Water';
  billed: number;
  recovered: number;
  pct: number;
}

export interface LedgerAlert {
  id: string;
  text: string;
  href?: string;
}

export interface LedgerMonthOption {
  value: string;
  label: string;
}

export interface PortfolioLedgerData {
  startDate: string;
  endDate: string;
  monthKey: string;
  periodLabel: string;
  availableMonths: LedgerMonthOption[];
  buildingId: string | null;
  buildings: LedgerBuilding[];
  kpis: LedgerKpis;
  waterfall: WaterfallStep[];
  grandTotal: number;
  properties: PropertyCardData[];
  rentRoll: RentRollRow[];
  expenses: ExpenseCategoryRow[];
  utilityRecovery: UtilityRecoveryRow[];
  alerts: LedgerAlert[];
}
