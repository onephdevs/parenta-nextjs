# Financial Reports SQL Column Errors - FIXED

**Date:** December 2024  
**Status:** ✅ Fixed

---

## 🐛 Errors Found

### Error 1: `column i.paid_amount does not exist`
- **Location:** `src/lib/api/financial-reports.ts:274:17`
- **Function:** `getOutstandingBalances()`
- **Issue:** Query was using `i.paid_amount` but the correct column is `i.amount_paid`

### Error 2: `column "type" does not exist`
- **Location:** `src/lib/api/financial-reports.ts:59:26`
- **Function:** `generateFinancialReport()`
- **Issue:** Query was using `type` but the correct column is `payment_type`

---

## ✅ Fixes Applied

### 1. Invoice Column Names
**Changed:**
- `i.paid_amount` → `i.amount_paid`
- `i.status` → `i.invoice_status`

**Affected Functions:**
- `generateFinancialReport()` - outstanding balances query
- `getOutstandingBalances()` - all invoice references
- `getFinancialMetrics()` - outstanding balances query
- `exportFinancialData()` - invoices export query

### 2. Payment Column Names
**Changed:**
- `type` → `payment_type`
- `status` → `payment_status`
- `description` → `notes` (for payments table)

**Affected Functions:**
- `generateFinancialReport()` - revenue analysis query
- `getRevenueByCategory()` - category grouping query
- `getMonthlyTrends()` - monthly revenue query
- `getFinancialMetrics()` - monthly revenue query
- `exportFinancialData()` - payments export query

### 3. Date Calculation Fix
**Changed:**
- `EXTRACT(DAY FROM CURRENT_DATE - i.due_date)` → `(CURRENT_DATE - i.due_date)`
- **Reason:** PostgreSQL date subtraction returns integer days directly, not an interval

### 4. Payment Type Values
**Updated payment type mappings:**
- `'fee'` → `'late_fee'` (to match schema)
- `'utilities'` → `'utility'` (to match schema)

### 5. CSV Export Headers
**Updated headers to match new column names:**
- `Type,Status` → `Payment Type,Payment Status`
- `Status` → `Invoice Status`

---

## 📋 Database Schema Reference

### Invoices Table
- `amount_paid` (not `paid_amount`)
- `invoice_status` (not `status`)
- `balance_due` (computed column: `total_amount - amount_paid`)
- `notes` (not `description`)

### Payments Table
- `payment_type` (not `type`)
- `payment_status` (not `status`)
- `notes` (not `description`)
- Valid `payment_type` values: `'rent'`, `'deposit'`, `'late_fee'`, `'utility'`, `'asset_rental'`, `'other'`
- Valid `payment_status` values: `'pending'`, `'paid'`, `'partial'`, `'overdue'`, `'cancelled'`

---

## ✅ Verification

- ✅ Build successful
- ✅ No TypeScript errors
- ✅ All SQL queries updated
- ✅ CSV export headers updated
- ✅ Date calculations fixed

---

## 🧪 Testing Required

1. Navigate to `/admin/financial/reports`
2. Verify page loads without errors
3. Test report generation
4. Test outstanding balances display
5. Test CSV export functionality

---

**Status:** ✅ **All SQL Column Errors Fixed**
