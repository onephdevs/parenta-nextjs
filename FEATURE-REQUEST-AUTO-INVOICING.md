# Feature Request: Auto-Invoicing & Payment Processing

**Date:** November 20, 2025  
**Status:** Planning Phase

---

## FOR IMPROVEMENT

### General
- **Add a main menu as a left panel** (aside from quick actions) - ex. there's no way to go directly to the Financial Dashboard. I can only access it when clicking Record New Payment and Back

### Record New Payment
- **Remove the Room dropdown**
- **Tenant should be auto-selected** if Record New Payment page is accessed thru the Tenant Management page
- **Remove Status dropdown**
- **Fix error message:** "Tenant ID is required" when a Tenant is already selected and the Record Payment is clicked
- **Add option to use Deposit as payment**
- **Add Deposit amount field** that adds to the Tenant's deposit ledger. For example, the Amount Paid is 5000 and the Deposit Amount is 2000, the 2000 is placed in Deposit ledger and 3000 is distributed to the invoices as payment

### Tenant
- **Add section to view Payment/transaction history and Invoices sent**
- **Add section that displays current Credit and Deposit amounts**
- **When adding a New Tenant,** there should be an option to assign a Property & Room before the rent and lease details
- **When adding a New Tenant or assigning a Tenant to a room,** the system should automatically generate the initial payment invoice and the succeeding monthly invoices based on the rent and lease details

---

## SYSTEM DOCUMENTATION: Auto-Invoicing & Payment Processing

### Overview
This document outlines how the system automatically generates invoices for tenants, how payments are processed, and how deposits and credits/advances are handled. The system is designed so that **creating or assigning a tenant only generates invoices**, while **recording payment is a separate process**.

---

## 1. Auto-Invoicing

### Trigger Events
- **Creating a New Tenant**
- **Assigning a Tenant to a Room/Unit**

*(These events do not record payment — they only generate invoices.)*

### Rules
- **Payment schedule is always monthly**
- **Invoices are generated based on:**
  - Monthly rent amount
  - Lease start date & end date
  - Number of months in the lease

### Flow
1. **Retrieve Lease Information**
   - Rent per month
   - Lease duration (start → end)

2. **Generate Initial Invoice**
   - First invoice corresponds to the lease start month
   - Status: **Pending**

3. **Generate Succeeding Monthly Invoices**
   - Continue generating monthly invoices until lease end date
   - All invoices are **Pending** unless paid/credited later

4. **Create Deposit Record (Optional)**
   - If a deposit is required, store it in a **Deposit Ledger**
   - **Deposits:**
     - Are not auto-applied to invoices
     - Can only be applied/refunded manually by Admin

---

## 2. Payment Processing

### Trigger Event
User manually **records a New Payment** for a tenant

### Rules
- Payments **automatically apply to oldest unpaid invoices first**
- **Excess payment becomes Tenant Credit** (treated as Advance payment)
- **Credit auto-applies to future invoices**
- **Deposits remain untouched** unless Admin manually applies/refunds them

### Flow
1. **Record New Payment**
   - User fills in amount, method, date, reference number, notes

2. **System Retrieves All Unpaid Invoices**
   - Sorted from oldest → newest

3. **Automatic Allocation**
   - System allocates the payment across unpaid invoices

4. **Excess Payment Handling**
   - If payment > unpaid invoices:
     - Excess is saved as **Tenant Credit (Advance Payment)**
     - Credit will automatically apply to any future invoice

5. **Invoice Status Updates**
   - **Completed** → If fully paid
   - **Partial** → If partially covered
   - **Pending** → No payment applied yet

6. **Credit Auto-Application on New Invoices**
   - When a new invoice is generated:
     - If Tenant Credit exists → system automatically uses it
     - Invoice completes or becomes partially paid based on credit amount

7. **Deposit Handling (Manual)**
   - Deposit stays separate
   - Only Admin can:
     - Refund deposit
     - Apply deposit to pay an invoice

---

## 3. Payment Types Overview

| Type | Auto-Applies to Invoices? | Notes |
|------|---------------------------|-------|
| Regular Payment | Yes | Allocated immediately to oldest invoices |
| Advance Payment (Credit) | Yes | Any excess payment becomes credit |
| Deposit | No | Managed manually; stored separately |

---

## SEQUENCE FLOW DIAGRAM

### A. Auto-Invoicing Flow

```
User                         System                           Invoices
│                              │                                    │
│---[1] Create New Tenant / Assign Tenant to Room------------------>│
│                              │                                    │
│                              │---[2] Retrieve Lease Details------>│
│                              │                                    │
│                              │---[3] Generate Initial Invoice---->Invoices
│                              │                                    │
│                              │---[4] Generate Monthly Invoices--->Invoices
│                              │                                    │
│                              │---[5] Create Deposit Record (optional) 
│                              │                                    │
│<---[6] Show Tenant Setup Summary----------------------------------│
```

---

### B. Payment Processing Flow

```
User                        System                           Invoices / Credits
│                             │                                        │
│---[1] Open "Record Payment" Modal----------------------------------->│
│                             │                                        │
│---[2] Enter Payment Details----------------------------------------->│
│                             │                                        │
│---[3] Submit Payment----------------------------------------------->│
                              │
                              │---[4] Get All Unpaid Invoices-------->Invoices
                              │<---------------------------------------
                              │
                              │---[5] Auto-Distribute Payment-------->Invoices
                              │        • Apply to oldest invoices
                              │        • Reduce remaining amount
                              │<---------------------------------------
                              │
                              │---[6] Check for Excess Payment-------->Credits
                              │        IF excess > 0:
                              │           Save as Tenant Credit
                              │<---------------------------------------
                              │
│<---[7] Display Updated Balances & Credit Summary---------------------│
```

---

### C. Future: New Invoice Creation with Existing Credit

```
System                          Credits / Invoices
│                                   │
│---[A1] New Monthly Invoice Created------------------------------->Invoices
│                                   │
│---[A2] Check for Tenant Credit----------------------------------->Credits
│<------------------------------------------------------------------
│
│---[A3] Apply Credit Automatically------------------------------->Invoices
│        • Adjust invoice balance
│        • Update remaining credit
│<------------------------------------------------------------------
│
│---[A4] Update Invoice Status------------------------------------>Invoices
```

---

## Database Changes Required

### New Tables Needed

1. **`tenant_credits`** - Track advance payments/credit
```sql
CREATE TABLE tenant_credits (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  amount DECIMAL(10,2),
  source VARCHAR(50), -- 'excess_payment', 'refund', etc.
  description TEXT,
  created_at TIMESTAMP
);
```

2. **`deposit_ledger`** - Track deposits separately
```sql
CREATE TABLE deposit_ledger (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  amount DECIMAL(10,2),
  transaction_type VARCHAR(20), -- 'deposit', 'refund', 'applied'
  applied_to_invoice_id UUID REFERENCES invoices(id),
  description TEXT,
  created_at TIMESTAMP
);
```

3. **`payment_allocations`** - Track how payments are distributed
```sql
CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  invoice_id UUID REFERENCES invoices(id),
  allocated_amount DECIMAL(10,2),
  created_at TIMESTAMP
);
```

