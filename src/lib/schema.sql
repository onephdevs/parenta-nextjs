-- Alfonso Property Management System - Complete Database Schema
-- This file contains all tables and relationships for the full system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- AUTHENTICATION & USER MANAGEMENT
-- =====================================================

-- Users table (already exists, but included for completeness)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'tenant')),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CORE PROPERTY MANAGEMENT
-- =====================================================

-- Buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  description TEXT,
  building_type VARCHAR(50) DEFAULT 'residential',
  year_built INTEGER,
  total_floors INTEGER,
  total_units INTEGER DEFAULT 0,
  amenities TEXT[], -- Array of amenities
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_number VARCHAR(50) NOT NULL,
  floor_number INTEGER,
  room_type VARCHAR(50) DEFAULT 'bedroom',
  square_footage DECIMAL(8,2),
  monthly_rate DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2),
  room_status VARCHAR(20) DEFAULT 'vacant' CHECK (room_status IN ('vacant', 'occupied', 'maintenance', 'reserved')),
  description TEXT,
  amenities TEXT[], -- Array of amenities
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(building_id, room_number)
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to user account for portal access
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  employment_status VARCHAR(50),
  employer_name VARCHAR(255),
  monthly_income DECIMAL(10,2),
  previous_address TEXT,
  move_in_date DATE,
  move_out_date DATE,
  lease_start_date DATE,
  lease_end_date DATE,
  security_deposit DECIMAL(10,2),
  tenant_status VARCHAR(20) DEFAULT 'active' CHECK (tenant_status IN ('active', 'inactive', 'pending', 'terminated')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  -- True while person has an active room assignment; person row persists after vacate
  is_tenant BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant Room Assignments (many-to-many with forever history; snapshots survive unlink)
CREATE TABLE IF NOT EXISTS tenant_room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rate DECIMAL(10,2) NOT NULL,
  deposit_paid DECIMAL(10,2),
  assignment_status VARCHAR(20) DEFAULT 'active' CHECK (assignment_status IN ('active', 'terminated', 'pending')),
  notes TEXT,
  tenant_name_snapshot VARCHAR(255),
  tenant_email_snapshot VARCHAR(255),
  tenant_phone_snapshot VARCHAR(50),
  tenant_emergency_name_snapshot VARCHAR(255),
  tenant_emergency_phone_snapshot VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FINANCIAL MANAGEMENT
-- =====================================================

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES tenant_room_assignments(id) ON DELETE SET NULL,
  asset_assignment_ids UUID[], -- Array of asset assignment IDs for this payment
  amount DECIMAL(10,2) NOT NULL,
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('rent', 'deposit', 'late_fee', 'utility', 'asset_rental', 'other')),
  payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'online')),
  payment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  invoice_status VARCHAR(20) DEFAULT 'draft' CHECK (invoice_status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  item_type VARCHAR(50) DEFAULT 'rent' CHECK (item_type IN ('rent', 'utilities', 'fees', 'deposit', 'other')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  vendor_name VARCHAR(255),
  vendor_contact VARCHAR(255),
  payment_method VARCHAR(50) DEFAULT 'cash',
  receipt_url VARCHAR(500), -- URL to stored receipt
  expense_status VARCHAR(20) DEFAULT 'pending' CHECK (expense_status IN ('pending', 'approved', 'paid', 'rejected')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval VARCHAR(20), -- monthly, quarterly, yearly
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUTO-INVOICING & PAYMENT PROCESSING
-- =====================================================

-- Tenant Credits - Track advance payments and credit balances
CREATE TABLE IF NOT EXISTS tenant_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('excess_payment', 'refund', 'adjustment', 'manual')),
  description TEXT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  applied_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'applied', 'refunded')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_credits_tenant_id ON tenant_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_credits_status ON tenant_credits(status);

-- Deposit Ledger - Track deposit transactions separately
CREATE TABLE IF NOT EXISTS deposit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'refund', 'applied', 'adjustment')),
  applied_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deposit_ledger_tenant_id ON deposit_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_transaction_type ON deposit_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_transaction_date ON deposit_ledger(transaction_date);

-- Payment Allocations - Track how payments are distributed across invoices
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(10,2) NOT NULL,
  allocation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- =====================================================
-- UTILITIES MANAGEMENT
-- =====================================================

-- Utility Bills table
CREATE TABLE IF NOT EXISTS utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  utility_type VARCHAR(50) NOT NULL CHECK (utility_type IN ('electricity', 'water', 'gas', 'internet', 'cable', 'waste', 'other')),
  provider_name VARCHAR(255) NOT NULL,
  provider_account_number VARCHAR(100),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  usage_amount DECIMAL(10,2), -- kWh, gallons, etc.
  usage_unit VARCHAR(20), -- kWh, gallons, cubic feet, etc.
  bill_status VARCHAR(20) DEFAULT 'pending' CHECK (bill_status IN ('pending', 'paid', 'overdue', 'disputed')),
  bill_url VARCHAR(500), -- URL to stored bill document
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utility Meter Readings table
CREATE TABLE IF NOT EXISTS utility_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE, -- Optional: room-specific meters
  utility_type VARCHAR(50) NOT NULL,
  meter_number VARCHAR(100),
  reading_date DATE NOT NULL,
  reading_value DECIMAL(10,2) NOT NULL,
  previous_reading DECIMAL(10,2),
  usage_calculated DECIMAL(10,2) GENERATED ALWAYS AS (reading_value - COALESCE(previous_reading, 0)) STORED,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ASSET MANAGEMENT
-- =====================================================

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(100) NOT NULL, -- furniture, appliance, electronics, etc.
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  current_value DECIMAL(10,2),
  depreciation_rate DECIMAL(5,2), -- percentage per year
  asset_condition VARCHAR(50) DEFAULT 'good' CHECK (asset_condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  asset_status VARCHAR(20) DEFAULT 'available' CHECK (asset_status IN ('available', 'assigned', 'maintenance', 'disposed')),
  warranty_expiry DATE,
  maintenance_schedule VARCHAR(100), -- monthly, quarterly, yearly
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  rental_rate DECIMAL(10,2), -- monthly rental rate if applicable
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Assignments table
CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  assignment_date DATE NOT NULL,
  return_date DATE,
  monthly_rental_fee DECIMAL(10,2),
  assignment_status VARCHAR(20) DEFAULT 'active' CHECK (assignment_status IN ('active', 'returned', 'damaged', 'lost')),
  condition_on_assignment VARCHAR(50),
  condition_on_return VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Billing table for tracking rental charges
CREATE TABLE IF NOT EXISTS asset_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_assignment_id UUID NOT NULL REFERENCES asset_assignments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  rental_amount DECIMAL(10,2) NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  billing_status VARCHAR(20) DEFAULT 'pending' CHECK (billing_status IN ('pending', 'billed', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DOCUMENT MANAGEMENT
-- =====================================================

-- Document Categories
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  document_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  document_type VARCHAR(100), -- lease, invoice, receipt, photo, etc.
  description TEXT,
  tags TEXT[], -- Array of tags for searching
  is_public BOOLEAN DEFAULT false, -- Can tenants access this document?
  expiry_date DATE, -- For documents that expire
  version_number INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  access_level VARCHAR(20) DEFAULT 'admin' CHECK (access_level IN ('admin', 'tenant', 'public')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Images table for building, room, and asset photos
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('building', 'room', 'asset')),
  entity_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  image_type VARCHAR(50) DEFAULT 'photo' CHECK (image_type IN ('photo', 'floor_plan', 'before', 'after', 'maintenance')),
  caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- COMMUNICATION & NOTIFICATIONS
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- payment_reminder, maintenance, announcement, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  notification_status VARCHAR(20) DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'delivered', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communication Log table
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who initiated the communication
  communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN ('email', 'phone', 'text', 'in_person', 'note')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  communication_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SYSTEM AUDIT & TRACKING
-- =====================================================

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'READ')),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Buildings indexes
CREATE INDEX IF NOT EXISTS idx_buildings_active ON buildings(is_active);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(building_type);

-- Rooms indexes
CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(room_status);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_user ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(tenant_status);
CREATE INDEX IF NOT EXISTS idx_tenants_is_tenant ON tenants(is_tenant);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- Tenant Room Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_tenant ON tenant_room_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assignments_room ON tenant_room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON tenant_room_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON tenant_room_assignments(start_date, end_date);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_room ON payments(room_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Invoice Line Items indexes
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_building ON expenses(building_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(expense_status);

-- Utility Bills indexes
CREATE INDEX IF NOT EXISTS idx_utility_bills_building ON utility_bills(building_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_type ON utility_bills(utility_type);
CREATE INDEX IF NOT EXISTS idx_utility_bills_status ON utility_bills(bill_status);
CREATE INDEX IF NOT EXISTS idx_utility_bills_due_date ON utility_bills(due_date);

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_building ON assets(building_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(asset_status);
CREATE INDEX IF NOT EXISTS idx_assets_condition ON assets(asset_condition);

-- Asset Assignments indexes
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_room ON asset_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_tenant ON asset_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_status ON asset_assignments(assignment_status);

-- Asset Billing indexes
CREATE INDEX IF NOT EXISTS idx_asset_billing_assignment ON asset_billing(asset_assignment_id);
CREATE INDEX IF NOT EXISTS idx_asset_billing_tenant ON asset_billing(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_billing_payment ON asset_billing(payment_id);
CREATE INDEX IF NOT EXISTS idx_asset_billing_status ON asset_billing(billing_status);
CREATE INDEX IF NOT EXISTS idx_asset_billing_due_date ON asset_billing(due_date);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_building ON documents(building_id);
CREATE INDEX IF NOT EXISTS idx_documents_room ON documents(room_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_access ON documents(access_level);
CREATE INDEX IF NOT EXISTS idx_documents_public ON documents(is_public);

-- Images indexes
CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_images_type ON images(image_type);
CREATE INDEX IF NOT EXISTS idx_images_primary ON images(is_primary);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(notification_status);

-- Communications indexes
CREATE INDEX IF NOT EXISTS idx_communications_tenant ON communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communications_user ON communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_communications_date ON communications(communication_date);

-- Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_buildings_active ON buildings(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(room_status);

-- Utility Cost Allocation Rules table
CREATE TABLE IF NOT EXISTS utility_allocation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  utility_type VARCHAR(50) NOT NULL CHECK (utility_type IN ('electricity', 'water', 'gas', 'internet', 'cable', 'waste', 'other')),
  allocation_method VARCHAR(20) NOT NULL DEFAULT 'equal' CHECK (allocation_method IN ('equal', 'usage', 'room_size', 'custom')),
  include_common_areas BOOLEAN DEFAULT true,
  common_area_percentage DECIMAL(5,2) DEFAULT 20.00, -- Percentage for common areas
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(building_id, utility_type)
);

-- Tenant Utility Bills table
CREATE TABLE IF NOT EXISTS tenant_utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  utility_bill_id UUID REFERENCES utility_bills(id) ON DELETE SET NULL,
  utility_type VARCHAR(50) NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_building_cost DECIMAL(10,2) NOT NULL,
  total_building_usage DECIMAL(10,2),
  tenant_usage DECIMAL(10,2),
  tenant_share_percentage DECIMAL(5,2) NOT NULL,
  allocated_amount DECIMAL(10,2) NOT NULL,
  allocation_method VARCHAR(20) NOT NULL,
  common_area_charge DECIMAL(10,2) DEFAULT 0.00,
  usage_charge DECIMAL(10,2) DEFAULT 0.00,
  base_charge DECIMAL(10,2) DEFAULT 0.00,
  bill_status VARCHAR(20) DEFAULT 'pending' CHECK (bill_status IN ('pending', 'sent', 'paid', 'overdue')),
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  allocation_details JSONB, -- Store detailed allocation breakdown
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost Allocation History table (for audit trail)
CREATE TABLE IF NOT EXISTS cost_allocation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  utility_bill_id UUID NOT NULL REFERENCES utility_bills(id) ON DELETE CASCADE,
  allocation_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  total_tenants INTEGER NOT NULL,
  allocation_method VARCHAR(20) NOT NULL,
  allocation_summary JSONB NOT NULL, -- Store allocation breakdown for all tenants
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 