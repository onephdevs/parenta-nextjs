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
  tenantId?: number;
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