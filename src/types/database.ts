// Database type definitions for Parenta Property Management System

// =====================================================
// CORE PROPERTY MANAGEMENT TYPES
// =====================================================

export interface Building {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  description?: string;
  buildingType: string;
  yearBuilt?: number;
  totalFloors?: number;
  totalUnits?: number;
  activeUnits?: number;
  occupiedUnits?: number;
  vacantUnits?: number;
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseBuilding {
  id: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  description?: string;
  building_type: string;
  year_built?: number;
  total_floors?: number;
  total_units: number;
  active_units: number;
  amenities: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  buildingId: string;
  roomNumber: string;
  floorNumber?: number;
  roomType: string;
  squareFootage?: number;
  monthlyRate: number;
  depositAmount?: number;
  depositRequired?: boolean;
  depositType?: 'fixed' | 'percentage' | 'one_month';
  depositFixedAmount?: number;
  depositPercentage?: number;
  roomStatus: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  description?: string;
  amenities: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseRoom {
  id: string;
  building_id: string;
  room_number: string;
  floor_number?: number;
  room_type: string;
  square_footage?: number;
  monthly_rate: number;
  deposit_amount?: number;
  deposit_required?: boolean;
  deposit_type?: 'fixed' | 'percentage' | 'one_month';
  deposit_percentage?: number;
  room_status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  description?: string;
  amenities: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Tenant {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employmentStatus?: string;
  employerName?: string;
  monthlyIncome?: number;
  previousAddress?: string;
  moveInDate?: Date;
  moveOutDate?: Date;
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  securityDeposit?: number;
  tenantStatus: 'active' | 'inactive' | 'pending' | 'terminated';
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseTenant {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: Date;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  employment_status?: string;
  employer_name?: string;
  monthly_income?: number;
  previous_address?: string;
  move_in_date?: Date;
  move_out_date?: Date;
  lease_start_date?: Date;
  lease_end_date?: Date;
  security_deposit?: number;
  tenant_status: 'active' | 'inactive' | 'pending' | 'terminated';
  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TenantRoomAssignment {
  id: string;
  tenantId: string;
  roomId: string;
  startDate: Date;
  endDate?: Date;
  monthlyRate: number;
  depositPaid?: number;
  assignmentStatus: 'active' | 'terminated' | 'pending';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  tenantId: string;
  roomId: string;
  reservationDate: Date;
  expiryDate: Date;
  monthlyRate: number;
  reservationDeposit: number;
  depositPaymentId?: string;
  reservationStatus: 'active' | 'converted' | 'expired' | 'cancelled';
  convertedToAssignmentId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationWithDetails extends Reservation {
  tenantName: string;
  tenantEmail: string;
  roomNumber: string;
  buildingName: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

export interface CreateReservationData {
  tenantId: string;
  roomId: string;
  reservationDate?: Date;
  expiryDate: Date;
  monthlyRate: number;
  reservationDeposit: number;
  notes?: string;
}

export interface DatabaseTenantRoomAssignment {
  id: string;
  tenant_id: string;
  room_id: string;
  start_date: Date;
  end_date?: Date;
  monthly_rate: number;
  deposit_paid?: number;
  assignment_status: 'active' | 'terminated' | 'pending';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// FINANCIAL MANAGEMENT TYPES
// =====================================================

export interface Payment {
  id: string;
  tenantId: string;
  roomId?: string;
  assignmentId?: string;
  assetAssignmentIds?: string[]; // Array of asset assignment IDs for this payment
  amount: number;
  paymentType: 'rent' | 'deposit' | 'late_fee' | 'utility' | 'asset_rental' | 'other';
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
  paymentDate: Date;
  dueDate: Date;
  paymentStatus: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  referenceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabasePayment {
  id: string;
  tenant_id: string;
  room_id?: string;
  assignment_id?: string;
  asset_assignment_ids?: string[]; // Array of asset assignment IDs for this payment
  amount: number;
  payment_type: 'rent' | 'deposit' | 'late_fee' | 'utility' | 'asset_rental' | 'other';
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
  payment_date: Date;
  due_date: Date;
  payment_status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  reference_number?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  invoiceStatus: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseInvoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  issue_date: Date;
  due_date: Date;
  billing_period_start?: Date;
  billing_period_end?: Date;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  invoice_status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemType: 'rent' | 'utilities' | 'fees' | 'deposit' | 'other';
  createdAt: Date;
}

export interface DatabaseInvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_type: 'rent' | 'utilities' | 'fees' | 'deposit' | 'other';
  created_at: Date;
}

export interface Expense {
  id: string;
  buildingId?: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: Date;
  vendorName?: string;
  vendorContact?: string;
  paymentMethod: string;
  receiptUrl?: string;
  expenseStatus: 'pending' | 'approved' | 'paid' | 'rejected';
  isRecurring: boolean;
  recurrenceInterval?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseExpense {
  id: string;
  building_id?: string;
  category: string;
  description: string;
  amount: number;
  expense_date: Date;
  vendor_name?: string;
  vendor_contact?: string;
  payment_method: string;
  receipt_url?: string;
  expense_status: 'pending' | 'approved' | 'paid' | 'rejected';
  is_recurring: boolean;
  recurrence_interval?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// UTILITY MANAGEMENT TYPES
// =====================================================

export interface UtilityBill {
  id: string;
  buildingId: string;
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  providerName: string;
  providerAccountNumber?: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  amount: number;
  usageAmount?: number;
  usageUnit?: string;
  billStatus: 'pending' | 'paid' | 'overdue' | 'disputed';
  billUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseUtilityBill {
  id: string;
  building_id: string;
  utility_type: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  provider_name: string;
  provider_account_number?: string;
  billing_period_start: Date;
  billing_period_end: Date;
  due_date: Date;
  amount: number;
  usage_amount?: number;
  usage_unit?: string;
  bill_status: 'pending' | 'paid' | 'overdue' | 'disputed';
  bill_url?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UtilityMeterReading {
  id: string;
  buildingId: string;
  roomId?: string;
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  meterNumber?: string;
  readingDate: Date;
  readingValue: number;
  previousReading?: number;
  usageCalculated: number;
  notes?: string;
  createdAt: Date;
}

export interface DatabaseUtilityMeterReading {
  id: string;
  building_id: string;
  room_id?: string;
  utility_type: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  meter_number?: string;
  reading_date: Date;
  reading_value: number;
  previous_reading?: number;
  usage_calculated: number;
  notes?: string;
  created_at: Date;
}

// =====================================================
// ASSET MANAGEMENT TYPES
// =====================================================

export interface Asset {
  id: string;
  buildingId?: string;
  assetName: string;
  assetType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  currentValue?: number;
  depreciationRate?: number;
  assetCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  assetStatus: 'available' | 'assigned' | 'maintenance' | 'disposed';
  warrantyExpiry?: Date;
  maintenanceSchedule?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  rentalRate?: number;
  description?: string;
  notes?: string;
  isActive: boolean;
  assignedRoom?: string;
  assignedTenant?: string;
  assignmentDate?: Date;
  // Enhanced tracking fields
  qrCode?: string;
  qrCodeGenerated?: boolean;
  barcodeType?: 'QR' | 'CODE128' | 'EAN13';
  nfcTag?: string;
  rfidTag?: string;
  gpsLocation?: string;
  lastScannedAt?: Date;
  lastScannedBy?: string;
  trackingEnabled: boolean;
  assetTags: string[];
  // Insurance and compliance
  insurancePolicy?: string;
  insuranceExpiry?: Date;
  complianceCertificates?: string[];
  safetyInspectionDate?: Date;
  nextSafetyInspection?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseAsset {
  id: string;
  building_id?: string;
  asset_name: string;
  asset_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: Date;
  purchase_price?: number;
  current_value?: number;
  depreciation_rate?: number;
  asset_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  asset_status: 'available' | 'assigned' | 'maintenance' | 'disposed';
  warranty_expiry?: Date;
  maintenance_schedule?: string;
  last_maintenance_date?: Date;
  next_maintenance_date?: Date;
  rental_rate?: number;
  description?: string;
  notes?: string;
  // Enhanced tracking fields
  qr_code?: string;
  qr_code_generated?: boolean;
  barcode_type?: 'QR' | 'CODE128' | 'EAN13';
  nfc_tag?: string;
  rfid_tag?: string;
  gps_location?: string;
  last_scanned_at?: Date;
  last_scanned_by?: string;
  tracking_enabled: boolean;
  asset_tags: string[];
  // Insurance and compliance
  insurance_policy?: string;
  insurance_expiry?: Date;
  compliance_certificates?: string[];
  safety_inspection_date?: Date;
  next_safety_inspection?: Date;
  is_active: boolean;
  assigned_room?: string;
  assigned_tenant?: string;
  assignment_date?: Date;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// DOCUMENT MANAGEMENT TYPES
// =====================================================

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface DatabaseDocumentCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Document {
  id: string;
  categoryId?: string;
  buildingId?: string;
  roomId?: string;
  tenantId?: string;
  assetId?: string;
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  documentType?: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
  expiryDate?: Date;
  versionNumber: number;
  previousVersionId?: string;
  uploadedBy?: string;
  accessLevel: 'admin' | 'tenant' | 'public';
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseDocument {
  id: string;
  category_id?: string;
  building_id?: string;
  room_id?: string;
  tenant_id?: string;
  asset_id?: string;
  document_name: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  document_type?: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  expiry_date?: Date;
  version_number: number;
  previous_version_id?: string;
  uploaded_by?: string;
  access_level: 'admin' | 'tenant' | 'public';
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// COMMON INPUT TYPES
// =====================================================

export interface CreateBuildingData {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  description?: string;
  buildingType?: string;
  yearBuilt?: number;
  totalFloors?: number;
  amenities?: string;
}

export interface CreateRoomData {
  buildingId: string;
  roomNumber: string;
  floorNumber?: number;
  roomType?: string;
  squareFootage?: number;
  monthlyRate: number;
  depositRequired?: boolean;
  depositType?: 'fixed' | 'percentage' | 'one_month';
  depositFixedAmount?: number;
  depositPercentage?: number;
  roomStatus?: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  description?: string;
  amenities?: string;
}

export interface CreateTenantData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employmentStatus?: string;
  employerName?: string;
  monthlyIncome?: number;
  previousAddress?: string;
  securityDeposit?: number;
}

export interface CreatePaymentData {
  tenantId: string;
  roomId?: string;
  assetAssignmentIds?: string[]; // Array of asset assignment IDs for this payment
  amount: number;
  paymentType: 'rent' | 'deposit' | 'late_fee' | 'utility' | 'asset_rental' | 'other';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
  paymentDate: Date;
  dueDate: Date;
  referenceNumber?: string;
  notes?: string;
}

export interface CreateUtilityBillData {
  buildingId: string;
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  providerName: string;
  providerAccountNumber?: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  amount: number;
  usageAmount?: number;
  usageUnit?: string;
  billStatus?: 'pending' | 'paid' | 'overdue' | 'disputed';
  billUrl?: string;
  notes?: string;
}

export interface CreateMeterReadingData {
  buildingId: string;
  roomId?: string;
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  meterNumber?: string;
  readingDate: Date;
  readingValue: number;
  notes?: string;
}

// =====================================================
// UTILITY COST ALLOCATION TYPES
// =====================================================

export interface UtilityAllocationRule {
  id: string;
  buildingId: string;
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  allocationMethod: 'equal' | 'usage' | 'room_size' | 'custom';
  includeCommonAreas: boolean;
  commonAreaPercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseUtilityAllocationRule {
  id: string;
  building_id: string;
  utility_type: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  allocation_method: 'equal' | 'usage' | 'room_size' | 'custom';
  include_common_areas: boolean;
  common_area_percentage: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TenantUtilityBill {
  id: string;
  tenantId: string;
  buildingId: string;
  roomId?: string;
  utilityBillId?: string;
  utilityType: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  totalBuildingCost: number;
  totalBuildingUsage?: number;
  tenantUsage?: number;
  tenantSharePercentage: number;
  allocatedAmount: number;
  allocationMethod: string;
  commonAreaCharge: number;
  usageCharge: number;
  baseCharge: number;
  billStatus: 'pending' | 'sent' | 'paid' | 'overdue';
  dueDate?: Date;
  paidDate?: Date;
  notes?: string;
  allocationDetails?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseTenantUtilityBill {
  id: string;
  tenant_id: string;
  building_id: string;
  room_id?: string;
  utility_bill_id?: string;
  utility_type: string;
  billing_period_start: Date;
  billing_period_end: Date;
  total_building_cost: number;
  total_building_usage?: number;
  tenant_usage?: number;
  tenant_share_percentage: number;
  allocated_amount: number;
  allocation_method: string;
  common_area_charge: number;
  usage_charge: number;
  base_charge: number;
  bill_status: 'pending' | 'sent' | 'paid' | 'overdue';
  due_date?: Date;
  paid_date?: Date;
  notes?: string;
  allocation_details?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CostAllocationHistory {
  id: string;
  buildingId: string;
  utilityBillId: string;
  allocationDate: Date;
  totalAmount: number;
  totalTenants: number;
  allocationMethod: string;
  allocationSummary: any;
  createdBy?: string;
  createdAt: Date;
}

export interface CreateAllocationRuleData {
  buildingId: string;
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  allocationMethod: 'equal' | 'usage' | 'room_size' | 'custom';
  includeCommonAreas?: boolean;
  commonAreaPercentage?: number;
}

export interface AllocationResult {
  tenantId: string;
  tenantName: string;
  roomNumber?: string;
  allocatedAmount: number;
  sharePercentage: number;
  usage?: number;
  roomSize?: number;
  commonAreaCharge: number;
  usageCharge: number;
  baseCharge: number;
  allocationDetails: any;
}

// =====================================================
// ASSET BILLING TYPES
// =====================================================

export interface AssetBilling {
  id: string;
  assetAssignmentId: string;
  tenantId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  rentalAmount: number;
  paymentId?: string;
  billingStatus: 'pending' | 'billed' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseAssetBilling {
  id: string;
  asset_assignment_id: string;
  tenant_id: string;
  billing_period_start: Date;
  billing_period_end: Date;
  rental_amount: number;
  payment_id?: string;
  billing_status: 'pending' | 'billed' | 'paid' | 'overdue' | 'cancelled';
  due_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAssetBillingData {
  assetAssignmentId: string;
  tenantId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  rentalAmount: number;
  dueDate?: Date;
  notes?: string;
} 