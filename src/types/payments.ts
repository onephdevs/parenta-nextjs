// Enhanced Payment Gateway Integration Types
export interface PaymentGateway {
  id: string;
  name: string;
  type: 'stripe' | 'paypal' | 'square' | 'authorize_net';
  isActive: boolean;
  apiKey?: string;
  secretKey?: string;
  webhookUrl?: string;
  settings: PaymentGatewaySettings;
  supportedMethods: PaymentMethodType[];
  fees: GatewayFees;
}

export interface PaymentGatewaySettings {
  currency: string;
  testMode: boolean;
  autoCapture: boolean;
  allowSaveCard: boolean;
  requireCvv: boolean;
  enableRecurring: boolean;
}

export interface GatewayFees {
  fixedFee: number;
  percentageFee: number;
  internationalFee?: number;
  refundFee?: number;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  isActive: boolean;
  gatewayMethodId: string;
  lastFourDigits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  bankName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethodType {
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'digital_wallet' | 'check';
  displayName: string;
  icon: string;
  processingTime: string;
  fees?: string;
}

export interface RecurringPayment {
  id: string;
  tenantId: string;
  paymentMethodId: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  nextPaymentDate: Date;
  endDate?: Date;
  maxPayments?: number;
  completedPayments: number;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  gatewayIntentId: string;
  gateway: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'cancelled';
  clientSecret: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface PaymentNotification {
  id: string;
  paymentId: string;
  type: 'payment_succeeded' | 'payment_failed' | 'payment_refunded' | 'recurring_payment_due' | 'payment_method_expires';
  recipient: string;
  channel: 'email' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Enhanced existing Payment interface
export interface Payment {
  id: number;
  tenantId: number;
  tenant?: Tenant;
  invoiceId?: number;
  amount: number;
  type: 'rent' | 'deposit' | 'fee' | 'utilities' | 'maintenance' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paymentDate: Date;
  dueDate?: Date;
  description?: string;
  referenceNumber?: string;
  // Enhanced gateway integration fields
  paymentMethodId?: string;
  gatewayTransactionId?: string;
  gateway?: string;
  gatewayFees?: number;
  recurringPaymentId?: string;
  isRecurring?: boolean;
  processingFee?: number;
  netAmount?: number;
  // Additional metadata
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
} 