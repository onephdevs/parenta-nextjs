// Payment types
export interface Payment {
  id: number;
  tenantId: number;
  roomId: number;
  amount: number;
  type: 'rent' | 'deposit' | 'fee' | 'utilities';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  dueDate?: Date;
  description?: string;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
  transactionId?: string;
  lateFeeAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Joined data
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  buildingName?: string;
  roomNumber?: string;
  rentAmount?: number;
}

export interface PaymentFilters {
  search?: string;
  status?: string;
  type?: string;
  tenantId?: number;
  roomId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  completedPayments: number;
  completedAmount: number;
  pendingPayments: number;
  pendingAmount: number;
  overduePayments: number;
  overdueAmount: number;
  averagePaymentAmount: number;
}

export interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
}

// Invoice types
export interface Invoice {
  id: number;
  tenantId: number;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue?: number;
  description?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Joined data
  tenantName?: string;
  tenantEmail?: string;
  
  // Related data
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  createdAt: Date;
}

export interface InvoiceFilters {
  search?: string;
  status?: string;
  tenantId?: string | number;
  roomId?: string | number;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  paidInvoices: number;
  paidAmount: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  overdueInvoices: number;
  overdueAmount: number;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
}

// Expense types
export interface Expense {
  id: number;
  buildingId?: number;
  roomId?: number;
  amount: number;
  category: 'maintenance' | 'utilities' | 'supplies' | 'services' | 'insurance' | 'taxes' | 'other';
  description: string;
  vendor?: string;
  expenseDate: Date;
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Joined data
  buildingName?: string;
  roomNumber?: string;
}

export interface ExpenseFilters {
  search?: string;
  category?: string;
  buildingId?: number;
  roomId?: number;
  dateFrom?: string;
  dateTo?: string;
  vendor?: string;
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalAmount: number;
  monthlyExpenses: number;
  monthlyAmount: number;
  categoryBreakdown: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
}

// Financial reporting types
export interface FinancialReport {
  period: {
    start: Date;
    end: Date;
  };
  revenue: {
    totalRevenue: number;
    rentRevenue: number;
    depositRevenue: number;
    feeRevenue: number;
    utilitiesRevenue: number;
  };
  expenses: {
    totalExpenses: number;
    maintenanceExpenses: number;
    utilitiesExpenses: number;
    suppliesExpenses: number;
    servicesExpenses: number;
    insuranceExpenses: number;
    taxesExpenses: number;
    otherExpenses: number;
  };
  profitLoss: {
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  outstandingBalances: {
    totalOutstanding: number;
    currentOutstanding: number;
    overdueOutstanding: number;
    averageDaysOverdue: number;
  };
}

// Form data types
export interface PaymentFormData {
  tenantId: string;
  roomId: string;
  amount: string;
  type: string;
  status: string;
  paymentDate: string;
  description: string;
  paymentMethod: string;
  transactionId: string;
}

export interface InvoiceFormData {
  tenantId: string;
  dueDate: string;
  description: string;
  notes: string;
  items: InvoiceItemFormData[];
}

export interface InvoiceItemFormData {
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface ExpenseFormData {
  buildingId: string;
  roomId: string;
  amount: string;
  category: string;
  description: string;
  vendor: string;
  expenseDate: string;
  notes: string;
}

// Tenant Credit types
export interface TenantCredit {
  id: string;
  tenantId: string;
  amount: number;
  source: 'excess_payment' | 'refund' | 'adjustment' | 'manual';
  description?: string;
  paymentId?: string;
  appliedToInvoiceId?: string;
  status: 'available' | 'applied' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  
  // Joined data
  tenantName?: string;
  invoiceNumber?: string;
  paymentReference?: string;
}

export interface TenantCreditSummary {
  tenantId: string;
  tenantName: string;
  totalCredits: number;
  availableCredits: number;
  appliedCredits: number;
  refundedCredits: number;
}

export interface CreateTenantCreditData {
  tenantId: string;
  amount: number;
  source: 'excess_payment' | 'refund' | 'adjustment' | 'manual';
  description?: string;
  paymentId?: string;
}

// Deposit Ledger types
export interface DepositTransaction {
  id: string;
  tenantId: string;
  amount: number;
  transactionType: 'deposit' | 'refund' | 'applied' | 'adjustment';
  appliedToInvoiceId?: string;
  paymentId?: string;
  description?: string;
  transactionDate: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Joined data
  tenantName?: string;
  invoiceNumber?: string;
  createdByName?: string;
}

export interface DepositLedgerSummary {
  tenantId: string;
  tenantName: string;
  totalDeposits: number;
  totalRefunds: number;
  totalApplied: number;
  currentBalance: number;
}

export interface CreateDepositTransactionData {
  tenantId: string;
  amount: number;
  transactionType: 'deposit' | 'refund' | 'applied' | 'adjustment';
  description?: string;
  appliedToInvoiceId?: string;
  paymentId?: string;
  transactionDate?: Date;
}

// Payment Allocation types
export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
  allocationDate: Date;
  notes?: string;
  createdAt: Date;
  
  // Joined data
  invoiceNumber?: string;
  paymentReference?: string;
  tenantName?: string;
}

export interface CreatePaymentAllocationData {
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
  notes?: string;
}

export interface PaymentAllocationSummary {
  paymentId: string;
  totalAllocated: number;
  allocations: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    dueDate: Date;
  }[];
  excessAmount: number;
}

// Auto-invoicing types
export interface InvoiceGenerationRequest {
  tenantId: string;
  roomId: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  monthlyRent: number;
  depositAmount?: number;
  advanceAmount?: number;
}

export interface InvoiceGenerationResult {
  success: boolean;
  invoicesCreated: number;
  invoiceIds: string[];
  /** Summary rows for notifications / API responses */
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
  }>;
  totalAmount: number;
  firstInvoiceNumber?: string;
  lastInvoiceNumber?: string;
  depositRecorded: boolean;
  depositAmount?: number;
  message: string;
}

// Payment allocation types
export interface PaymentAllocationRequest {
  paymentId: string;
  tenantId: string;
  paymentAmount: number;
  depositAmount?: number;
  useDeposit?: boolean;
  /** When set, allocate to this invoice first, then FIFO across remaining unpaid invoices. */
  preferredInvoiceId?: string;
}

export interface PaymentAllocationResult {
  success: boolean;
  totalAllocated: number;
  allocations: {
    invoiceId: string;
    invoiceNumber: string;
    amountAllocated: number;
    invoiceStatus: string;
  }[];
  creditCreated: boolean;
  creditAmount: number;
  depositUsed: number;
  message: string;
}

// =====================================================
// LATE FEE TYPES
// =====================================================

export type LateFeeType = 'percentage' | 'flat_rate' | 'tiered';
export type LateFeeStatus = 'pending' | 'applied' | 'waived' | 'cancelled';

export interface LateFeeSettings {
  id: string;
  building_id?: string;
  name: string;
  description?: string;
  
  // Fee calculation
  fee_type: LateFeeType;
  percentage_amount?: number;
  flat_rate_amount?: number;
  
  // Grace period
  grace_period_days: number;
  apply_after_days: number;
  
  // Recurrence
  is_recurring: boolean;
  recurring_interval_days?: number;
  max_occurrences?: number;
  
  // Limits
  max_fee_amount?: number;
  min_invoice_amount?: number;
  
  // Application settings
  is_active: boolean;
  auto_apply: boolean;
  send_notification: boolean;
  
  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LateFeeApplication {
  id: string;
  invoice_id: string;
  tenant_id: string;
  late_fee_setting_id: string;
  
  // Fee details
  fee_amount: number;
  calculation_method: string;
  days_overdue: number;
  original_amount: number;
  
  // Status
  status: LateFeeStatus;
  applied_at?: string;
  waived_at?: string;
  waived_by?: string;
  waived_reason?: string;
  
  // Generated invoice
  late_fee_invoice_id?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface LateFeeTier {
  id: string;
  late_fee_setting_id: string;
  min_days_overdue: number;
  max_days_overdue?: number;
  fee_type: 'percentage' | 'flat_rate';
  percentage_amount?: number;
  flat_rate_amount?: number;
  tier_order: number;
  created_at: string;
}

export interface OverdueInvoiceForLateFee {
  invoice_id: string;
  tenant_id: string;
  building_id: string;
  days_overdue: number;
  outstanding_amount: number;
  applicable_setting_id: string;
}

export interface LateFeeCalculationResult {
  invoice_id: string;
  tenant_id: string;
  fee_amount: number;
  days_overdue: number;
  original_amount: number;
  calculation_method: string;
  setting_used: LateFeeSettings;
}

export interface CreateLateFeeSettingsData {
  building_id?: string;
  name: string;
  description?: string;
  fee_type: LateFeeType;
  percentage_amount?: number;
  flat_rate_amount?: number;
  grace_period_days: number;
  apply_after_days: number;
  is_recurring?: boolean;
  recurring_interval_days?: number;
  max_occurrences?: number;
  max_fee_amount?: number;
  min_invoice_amount?: number;
  is_active?: boolean;
  auto_apply?: boolean;
  send_notification?: boolean;
  tiers?: CreateLateFeeTierData[];
}

export interface CreateLateFeeTierData {
  min_days_overdue: number;
  max_days_overdue?: number;
  fee_type: 'percentage' | 'flat_rate';
  percentage_amount?: number;
  flat_rate_amount?: number;
  tier_order: number;
}

export interface LateFeeApplicationRequest {
  invoice_ids?: string[];
  dry_run?: boolean;
}

export interface LateFeeApplicationResult {
  success: boolean;
  fees_applied: number;
  total_fee_amount: number;
  applications: {
    invoice_id: string;
    tenant_id: string;
    fee_amount: number;
    late_fee_invoice_id?: string;
    status: string;
  }[];
  message: string;
} 