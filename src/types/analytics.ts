// Analytics Type Definitions for Property Management System

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsFilter {
  buildingId?: string;
  dateRange: AnalyticsDateRange;
  period: 'monthly' | 'quarterly' | 'yearly';
}

// Financial Analytics
export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  occupancyRevenue: number;
  utilityRevenue: number;
  otherRevenue: number;
  operatingExpenses: number;
  maintenanceExpenses: number;
  utilityExpenses: number;
  profitMargin: number;
  roi: number;
}

export interface FinancialTrend {
  date: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  profitMargin: number;
}

export interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  cumulativeFlow: number;
}

// Property Analytics
export interface OccupancyMetrics {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  averageRent: number;
  totalRentableArea: number;
  averageOccupancyDuration: number;
}

export interface OccupancyTrend {
  date: string;
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  newLeases: number;
  renewals: number;
  vacancies: number;
}

export interface TenantMetrics {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  averageLeaseLength: number;
  tenantRetentionRate: number;
  averageRent: number;
}

export interface TenantDemographics {
  ageGroups: { label: string; count: number }[];
  leaseTypes: { type: string; count: number }[];
  paymentStatus: { status: string; count: number }[];
  tenantDuration: { duration: string; count: number }[];
}

// Utility Analytics
export interface UtilityMetrics {
  totalConsumption: number;
  totalCost: number;
  averageCostPerUnit: number;
  utilityTypes: {
    type: string;
    consumption: number;
    cost: number;
    percentage: number;
  }[];
}

export interface UtilityTrend {
  date: string;
  electricity: number;
  water: number;
  gas: number;
  totalCost: number;
}

// Asset Analytics
export interface AssetMetrics {
  totalAssets: number;
  totalValue: number;
  maintenanceRequests: number;
  maintenanceCosts: number;
  depreciation: number;
  assetUtilization: number;
}

export interface MaintenanceAnalytics {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  averageCompletionTime: number;
  costByCategory: { category: string; cost: number }[];
  requestsByPriority: { priority: string; count: number }[];
}

// Building Performance
export interface BuildingPerformance {
  buildingId: string;
  buildingName: string;
  occupancyRate: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  roi: number;
  maintenanceRequests: number;
  averageRent: number;
  tenantSatisfaction: number;
}

// Dashboard Overview
export interface DashboardMetrics {
  financial: FinancialMetrics;
  occupancy: OccupancyMetrics;
  tenant: TenantMetrics;
  utility: UtilityMetrics;
  asset: AssetMetrics;
  maintenance: MaintenanceAnalytics;
  buildings: BuildingPerformance[];
}

// Report Types
export interface ReportConfig {
  title: string;
  type: 'financial' | 'occupancy' | 'tenant' | 'utility' | 'maintenance' | 'custom';
  format: 'pdf' | 'excel' | 'csv';
  schedule?: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  filters: AnalyticsFilter;
  includeSections: string[];
}

export interface ReportData {
  config: ReportConfig;
  generatedAt: string;
  data: any;
  summary: string;
}

// Chart Data Structures
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[] | number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  title: string;
  datasets: ChartDataset[];
  labels?: string[];
  options?: any;
}

// Analytics API Responses
export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  metadata?: {
    generatedAt: string;
    filters: AnalyticsFilter;
    recordCount: number;
  };
}

export interface AnalyticsPeriodComparison {
  current: any;
  previous: any;
  change: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

// Custom Analytics
export interface CustomAnalyticsQuery {
  name: string;
  description: string;
  sql: string;
  parameters: { [key: string]: any };
  chartConfig?: ChartConfiguration;
}

export interface AnalyticsAlerts {
  type: 'warning' | 'error' | 'info';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: string;
}

// Advanced Financial Analytics Types
export interface CashFlowForecast {
  period: Date;
  projectedInflow: number;
  projectedOutflow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface ROIAnalysis {
  buildingId: string;
  buildingName: string;
  totalInvestment: number;
  annualRevenue: number;
  annualExpenses: number;
  netIncome: number;
  roi: number;
  paybackPeriod: number; // in years
  capRate: number; // capitalization rate
  cashOnCashReturn: number;
  appreciation: number;
  totalReturn: number;
  lastUpdated: Date;
}

export interface FinancialBenchmark {
  metric: string;
  category: 'revenue' | 'expense' | 'efficiency' | 'profitability';
  currentValue: number;
  benchmarkValue: number;
  industry: string;
  region: string;
  variance: number;
  trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
}

export interface ProfitLossProjection {
  period: Date;
  revenue: {
    rent: number;
    fees: number;
    utilities: number;
    other: number;
    total: number;
  };
  expenses: {
    maintenance: number;
    utilities: number;
    management: number;
    insurance: number;
    taxes: number;
    other: number;
    total: number;
  };
  netIncome: number;
  margin: number;
}

export interface FinancialRatio {
  name: string;
  value: number;
  unit: 'percentage' | 'ratio' | 'currency' | 'number';
  category: 'liquidity' | 'profitability' | 'efficiency' | 'leverage';
  benchmark: number;
  status: 'good' | 'warning' | 'poor';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface ExpenseAnalysis {
  category: string;
  currentPeriod: number;
  previousPeriod: number;
  budgeted: number;
  variance: number;
  variancePercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  breakdown: {
    subcategory: string;
    amount: number;
    percentage: number;
  }[];
}

export interface RevenueAnalysis {
  source: string;
  currentPeriod: number;
  previousPeriod: number;
  projected: number;
  growth: number;
  growthPercentage: number;
  seasonality: {
    month: string;
    multiplier: number;
  }[];
}

export interface AdvancedFinancialMetrics {
  cashFlowForecast: CashFlowForecast[];
  roiAnalysis: ROIAnalysis[];
  benchmarks: FinancialBenchmark[];
  profitLossProjection: ProfitLossProjection[];
  financialRatios: FinancialRatio[];
  expenseAnalysis: ExpenseAnalysis[];
  revenueAnalysis: RevenueAnalysis[];
  summary: {
    totalProperties: number;
    averageROI: number;
    portfolioValue: number;
    monthlyNetIncome: number;
    occupancyRate: number;
    averageRent: number;
  };
} 