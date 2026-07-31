# Tenant Portal Implementation Flow - Systematic Approach

## Overview
This document outlines a systematic, step-by-step implementation flow for the Tenant Portal features. Each step is designed to be:
- **Independent**: Can be tested in isolation
- **Incremental**: Builds on previous steps
- **Testable**: Has clear success criteria
- **Reversible**: Can be rolled back if issues arise

---

## Phase 1: Foundation - Payment Data & Balance

### Step 1.1: Create Payment Schedule API
**Goal**: Provide tenant with their payment schedule (upcoming invoices)

**Files to Create:**
- `src/app/api/tenant/payments/route.ts`

**Implementation:**
1. Get tenant from session using `getTenantByUserId()`
2. Query invoices for tenant with status `sent`, `partial`, or `overdue`
3. Query payments for tenant
4. Calculate upcoming due dates
5. Return structured data: `{ schedule: [], history: [], summary: {} }`

**Test Criteria:**
- ✅ API returns 401 if not authenticated
- ✅ API returns 401 if user is not tenant
- ✅ API returns only tenant's own data
- ✅ Schedule shows upcoming invoices sorted by due date
- ✅ History shows past payments sorted by date DESC

**Test Command:**
```bash
# Test with tenant session
curl -X GET http://localhost:3030/api/tenant/payments \
  -H "Cookie: next-auth.session-token=..."
```

---

### Step 1.2: Create Balance Calculation API
**Goal**: Calculate tenant's current balance including late fees

**Files to Create:**
- `src/app/api/tenant/balance/route.ts`

**Implementation:**
1. Get tenant from session
2. Calculate outstanding invoices (unpaid + partial)
3. Calculate late fees using `late-fee-service.ts`
4. Get building deposit config for late fee settings
5. Return: `{ outstanding: number, lateFees: number, total: number, nextDueDate: string, nextAmount: number }`

**Test Criteria:**
- ✅ Returns correct outstanding balance
- ✅ Calculates late fees correctly
- ✅ Shows next due date and amount
- ✅ Handles tenant with no invoices gracefully

**Dependencies:**
- Step 1.1 (uses invoice data)

---

### Step 1.3: Enhance Payments Page - Connect to Real API
**Goal**: Replace mock data with real API calls

**Files to Modify:**
- `src/app/tenant/payments/page.tsx`

**Implementation:**
1. Replace mock data with API calls to `/api/tenant/payments`
2. Add API call to `/api/tenant/balance`
3. Display real payment schedule
4. Display real balance with late fees
5. Show loading states
6. Handle errors gracefully

**Test Criteria:**
- ✅ Page loads with real data
- ✅ Payment schedule displays correctly
- ✅ Balance shows with late fees
- ✅ Loading states work
- ✅ Error handling works

**Dependencies:**
- Step 1.1
- Step 1.2

---

## Phase 2: Receipt Management

### Step 2.1: Database Migration - Add Receipt Fields
**Goal**: Add receipt storage capability to payments table

**Files to Create:**
- `migrations/add-receipt-fields-to-payments.sql`

**Implementation:**
```sql
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS receipt_file_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS receipt_file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS receipt_file_size INTEGER;
```

**Test Criteria:**
- ✅ Migration runs without errors
- ✅ Columns exist in payments table
- ✅ Existing data unaffected

**Test Command:**
```bash
psql $DIRECT_URL -f migrations/add-receipt-fields-to-payments.sql
```

---

### Step 2.2: Create Receipt Upload API
**Goal**: Allow tenants to upload payment receipts

**Files to Create:**
- `src/app/api/tenant/payments/[id]/receipt/route.ts` (POST)

**Implementation:**
1. Verify tenant owns the payment (security check)
2. Validate file (PDF, JPG, PNG, max 5MB)
3. Save file to `public/uploads/receipts/`
4. Update payment record with receipt info
5. Return success with file path

**Test Criteria:**
- ✅ Rejects unauthorized access
- ✅ Validates file type and size
- ✅ Saves file correctly
- ✅ Updates database correctly
- ✅ Returns proper error messages

**Dependencies:**
- Step 2.1

---

### Step 2.3: Create Receipt Download API
**Goal**: Allow tenants to download uploaded receipts

**Files to Create:**
- `src/app/api/tenant/payments/[id]/receipt/route.ts` (GET)

**Implementation:**
1. Verify tenant owns the payment
2. Check if receipt exists
3. Return file with proper headers

**Test Criteria:**
- ✅ Returns 404 if receipt doesn't exist
- ✅ Returns 401 if unauthorized
- ✅ Returns file with correct content-type
- ✅ Only tenant can access their receipts

**Dependencies:**
- Step 2.2

---

### Step 2.4: Create Receipt Upload Component
**Goal**: UI component for uploading receipts

**Files to Create:**
- `src/components/features/tenant/ReceiptUpload.tsx`

**Implementation:**
1. File input with drag-and-drop
2. Preview uploaded file
3. Upload progress indicator
4. Success/error notifications
5. Display existing receipt if available

**Test Criteria:**
- ✅ File selection works
- ✅ Drag-and-drop works
- ✅ Preview shows correctly
- ✅ Upload progress displays
- ✅ Success notification appears
- ✅ Error handling works

**Dependencies:**
- Step 2.2

---

### Step 2.5: Integrate Receipt Upload into Payments Page
**Goal**: Add receipt upload functionality to payments page

**Files to Modify:**
- `src/app/tenant/payments/page.tsx`

**Implementation:**
1. Add ReceiptUpload component to payment history table
2. Add "Upload Receipt" button for each payment
3. Show receipt status (uploaded/not uploaded)
4. Add download link for uploaded receipts

**Test Criteria:**
- ✅ Upload button appears for each payment
- ✅ Upload works from payments page
- ✅ Receipt status displays correctly
- ✅ Download link works

**Dependencies:**
- Step 2.3
- Step 2.4

---

## Phase 3: Receipt Generation & Printing

### Step 3.1: Create Receipt Generator Service
**Goal**: Generate PDF receipts for payments

**Files to Create:**
- `src/lib/services/receipt-generator.ts`

**Implementation:**
1. Use existing `pdf-export-service.tsx` as reference
2. Create receipt template with:
   - Tenant information
   - Payment details (amount, date, method, reference)
   - Property information (building, room)
   - Receipt number
   - Company branding
3. Generate PDF using `pdfkit` or similar

**Test Criteria:**
- ✅ Generates valid PDF
- ✅ Contains all required information
- ✅ Formatting is correct
- ✅ File size is reasonable

**Dependencies:**
- Step 1.1 (needs payment data)

---

### Step 3.2: Create Receipt Print API
**Goal**: API endpoint to generate and return receipt PDF

**Files to Create:**
- `src/app/api/tenant/payments/[id]/print/route.ts`

**Implementation:**
1. Verify tenant owns the payment
2. Get payment details with tenant and property info
3. Generate PDF using receipt-generator service
4. Return PDF with proper headers

**Test Criteria:**
- ✅ Returns 401 if unauthorized
- ✅ Returns 404 if payment not found
- ✅ Returns valid PDF
- ✅ PDF contains correct information

**Dependencies:**
- Step 3.1

---

### Step 3.3: Create Receipt Viewer Component
**Goal**: Component to display and print receipts

**Files to Create:**
- `src/components/features/tenant/ReceiptViewer.tsx`

**Implementation:**
1. Modal/dialog component
2. PDF viewer or image preview
3. Print button
4. Download button
5. Close button

**Test Criteria:**
- ✅ Opens in modal
- ✅ Displays receipt correctly
- ✅ Print button works
- ✅ Download button works

**Dependencies:**
- Step 3.2

---

### Step 3.4: Add Print Receipt to Payments Page
**Goal**: Add print receipt functionality

**Files to Modify:**
- `src/app/tenant/payments/page.tsx`

**Implementation:**
1. Add "Print Receipt" button to each payment row
2. Open ReceiptViewer modal on click
3. Load receipt PDF

**Test Criteria:**
- ✅ Print button appears
- ✅ Opens receipt viewer
- ✅ Print functionality works

**Dependencies:**
- Step 3.3

---

## Phase 4: Profile Management

### Step 4.1: Create Profile API
**Goal**: Get and update tenant profile

**Files to Create:**
- `src/app/api/tenant/profile/route.ts` (GET, PUT)

**Implementation:**
1. GET: Return tenant profile with occupant and emergency contact info
2. PUT: Update tenant profile (validate, update database)
3. Security: Only tenant can access/update their own profile

**Test Criteria:**
- ✅ GET returns correct profile data
- ✅ PUT updates profile correctly
- ✅ Validation works
- ✅ Security checks work

---

### Step 4.2: Create Occupant Management API
**Goal**: Manage occupants for tenant

**Files to Create:**
- `src/app/api/tenant/occupants/route.ts` (GET, POST)
- `src/app/api/tenant/occupants/[id]/route.ts` (PUT, DELETE)

**Implementation:**
1. GET: List occupants for tenant's room
2. POST: Add occupant (validate tenant owns room)
3. PUT: Update occupant
4. DELETE: Remove occupant

**Test Criteria:**
- ✅ Lists only tenant's occupants
- ✅ Can add occupant
- ✅ Can update occupant
- ✅ Can delete occupant
- ✅ Security checks work

**Note**: Uses existing `occupants` table and API structure

---

### Step 4.3: Create Profile Form Component
**Goal**: Form to edit tenant profile

**Files to Create:**
- `src/components/features/tenant/ProfileForm.tsx`

**Implementation:**
1. Form fields for tenant info
2. Emergency contact section
3. Validation
4. Submit handler
5. Success/error notifications

**Test Criteria:**
- ✅ Form loads with current data
- ✅ Validation works
- ✅ Submit updates profile
- ✅ Success notification appears

**Dependencies:**
- Step 4.1

---

### Step 4.4: Create Occupant List Component
**Goal**: Component to manage occupants

**Files to Create:**
- `src/components/features/tenant/OccupantList.tsx`

**Implementation:**
1. Display list of occupants
2. Add occupant form/modal
3. Edit occupant functionality
4. Delete occupant with confirmation

**Test Criteria:**
- ✅ Lists occupants correctly
- ✅ Can add occupant
- ✅ Can edit occupant
- ✅ Can delete occupant

**Dependencies:**
- Step 4.2

---

### Step 4.5: Create Profile Page
**Goal**: Complete profile management page

**Files to Create:**
- `src/app/tenant/profile/page.tsx`

**Implementation:**
1. Use ProfileForm component
2. Use OccupantList component
3. Display current room assignment
4. Display lease information
5. Layout and styling

**Test Criteria:**
- ✅ Page loads correctly
- ✅ All components work
- ✅ Data displays correctly
- ✅ Updates work

**Dependencies:**
- Step 4.3
- Step 4.4

---

## Phase 5: Documents Access

### Step 5.1: Create Tenant Documents API
**Goal**: List documents accessible to tenant

**Files to Create:**
- `src/app/api/tenant/documents/route.ts`

**Implementation:**
1. Get tenant from session
2. Query documents where:
   - `tenant_id = tenant.id` OR
   - `access_level = 'tenant'` AND `is_public = true` OR
   - `room_id` matches tenant's room
3. Return filtered document list

**Test Criteria:**
- ✅ Returns only accessible documents
- ✅ Security checks work
- ✅ Filters correctly

---

### Step 5.2: Create Document Download API
**Goal**: Download documents for tenant

**Files to Create:**
- `src/app/api/tenant/documents/[id]/download/route.ts`

**Implementation:**
1. Verify tenant has access to document
2. Check file exists
3. Return file with proper headers

**Test Criteria:**
- ✅ Returns 401 if unauthorized
- ✅ Returns 404 if file not found
- ✅ Returns file correctly
- ✅ Only accessible documents can be downloaded

**Dependencies:**
- Step 5.1

---

### Step 5.3: Connect Documents Page to Real API
**Goal**: Replace mock data with real API

**Files to Modify:**
- `src/app/tenant/documents/page.tsx`

**Implementation:**
1. Replace mock data with API call
2. Implement real download functionality
3. Add document preview (for PDFs)
4. Improve error handling

**Test Criteria:**
- ✅ Loads real documents
- ✅ Download works
- ✅ Preview works for PDFs
- ✅ Error handling works

**Dependencies:**
- Step 5.1
- Step 5.2

---

## Phase 6: Online Payment Integration

### Step 6.1: Create Payment Processing API
**Goal**: Process online payments

**Files to Create:**
- `src/app/api/tenant/payments/process/route.ts`

**Implementation:**
1. Get tenant from session
2. Validate payment amount and invoice
3. Integrate with payment gateway (use existing structure)
4. Create payment record
5. Update invoice status
6. Return payment confirmation

**Test Criteria:**
- ✅ Validates payment data
- ✅ Processes payment correctly
- ✅ Updates database
- ✅ Returns confirmation
- ✅ Handles errors

**Note**: Use existing `payment-gateway` API structure

---

### Step 6.2: Create Payment Form Component
**Goal**: Form for making online payments

**Files to Create:**
- `src/components/features/tenant/PaymentForm.tsx`

**Implementation:**
1. Select invoice to pay
2. Enter payment amount
3. Select payment method
4. Payment gateway integration
5. Success/error handling

**Test Criteria:**
- ✅ Form validation works
- ✅ Payment processing works
- ✅ Success flow works
- ✅ Error handling works

**Dependencies:**
- Step 6.1

---

### Step 6.3: Integrate Payment Form into Payments Page
**Goal**: Add online payment to payments page

**Files to Modify:**
- `src/app/tenant/payments/page.tsx`

**Implementation:**
1. Add PaymentForm component
2. Integrate with "Pay Now" button
3. Show payment status
4. Refresh data after payment

**Test Criteria:**
- ✅ Payment form appears
- ✅ Payment works
- ✅ Status updates
- ✅ Data refreshes

**Dependencies:**
- Step 6.2

---

## Phase 7: Reports Generation

### Step 7.1: Create Tenant Reports API
**Goal**: Generate reports for tenant

**Files to Create:**
- `src/app/api/tenant/reports/route.ts`

**Implementation:**
1. Get tenant from session
2. Generate payment history report
3. Generate invoice history report
4. Generate financial summary
5. Return report data

**Test Criteria:**
- ✅ Generates correct reports
- ✅ Only includes tenant's data
- ✅ Security checks work

**Note**: Reuse existing report generation services

---

### Step 7.2: Create Report Export API
**Goal**: Export reports as Excel/PDF

**Files to Create:**
- `src/app/api/tenant/reports/export/route.ts`

**Implementation:**
1. Get tenant from session
2. Generate report data
3. Export as Excel or PDF
4. Return file

**Test Criteria:**
- ✅ Exports Excel correctly
- ✅ Exports PDF correctly
- ✅ Only tenant's data included
- ✅ Security checks work

**Dependencies:**
- Step 7.1

---

### Step 7.3: Create Reports Page
**Goal**: Page for generating and downloading reports

**Files to Create:**
- `src/app/tenant/reports/page.tsx`

**Implementation:**
1. Report type selection
2. Date range picker
3. Generate button
4. Download buttons (Excel/PDF)
5. Preview report data

**Test Criteria:**
- ✅ Page loads correctly
- ✅ Can generate reports
- ✅ Can download Excel
- ✅ Can download PDF
- ✅ Preview works

**Dependencies:**
- Step 7.2

---

## Testing Strategy

### Unit Testing
Each API endpoint should be tested:
1. Authentication/authorization
2. Input validation
3. Business logic
4. Error handling

### Integration Testing
Test complete flows:
1. Upload receipt → View receipt → Print receipt
2. Update profile → View updated profile
3. Make payment → View payment in history → Download receipt
4. Generate report → Download Excel → Download PDF

### Manual Testing Checklist
For each phase:
- [ ] Test as tenant user
- [ ] Test as admin (should fail)
- [ ] Test as unauthenticated (should fail)
- [ ] Test with invalid data
- [ ] Test with missing data
- [ ] Test error scenarios
- [ ] Test mobile responsiveness

---

## Implementation Order Summary

1. **Phase 1** (Foundation): Payment data & balance APIs
2. **Phase 2** (Receipt Upload): Database → API → Component → Integration
3. **Phase 3** (Receipt Print): Service → API → Component → Integration
4. **Phase 4** (Profile): API → Components → Page
5. **Phase 5** (Documents): API → Integration
6. **Phase 6** (Online Payment): API → Component → Integration
7. **Phase 7** (Reports): API → Export → Page

---

## Success Criteria

### Functional
- ✅ All features work as specified
- ✅ All security checks pass
- ✅ All error handling works
- ✅ All UI components are responsive

### Technical
- ✅ All APIs return correct data
- ✅ All database operations work
- ✅ All file operations work
- ✅ All integrations work

### User Experience
- ✅ Loading states work
- ✅ Error messages are clear
- ✅ Success notifications appear
- ✅ Navigation is intuitive

---

## Rollback Plan

If any step fails:
1. Revert database migrations
2. Remove new files
3. Restore previous versions
4. Test previous functionality still works

Each step is independent enough to roll back without affecting others.

---

## Notes

- Always test each step before moving to the next
- Keep database migrations reversible
- Document any deviations from this flow
- Update this document if flow changes
- Test security at every step
