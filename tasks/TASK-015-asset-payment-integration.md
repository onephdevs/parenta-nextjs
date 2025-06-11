# TASK-015: Asset Payment Integration

## Overview
Integrate asset rental fees into the payment system to enable tenants to pay for rented assets alongside their regular rent payments. Complete the asset-to-payment workflow and create visibility of asset assignments in room details.

## Priority
🟡 Medium-High

## Estimated Effort
16 hours

## Status
- [x] Backlog
- [ ] In Progress
- [ ] Review
- [ ] Done

## Dependencies
- [x] TASK-009: Asset Management Module
- [x] TASK-007: Financial Management Module
- [x] TASK-005: Room Management Module
- [x] Asset assignment functionality exists
- [x] Payment system exists

## Current State Analysis

### ✅ What's Already Working
1. **Asset Management**: Assets can be assigned to rooms and tenants
2. **Asset Assignment Tracking**: Database schema supports asset assignments with rental fees
3. **Payment System**: Existing payment infrastructure for rent/utilities
4. **Asset Rental Rates**: Assets have `rental_rate` field for monthly fees

### ❌ What's Missing
1. **Asset Payment Integration**: Asset rental fees are not included in tenant payment calculations
2. **Room Asset Visibility**: Room detail pages don't show assigned assets
3. **Tenant Asset Visibility**: Tenant payment pages don't show asset rental fees
4. **Payment Item Breakdown**: Payments don't itemize asset rental fees
5. **Automated Asset Billing**: No automatic generation of asset rental charges

## User Flow Requirements

### Desired Asset Flow:
1. **Admin assigns asset to building** → Asset belongs to building inventory
2. **Admin assigns asset to specific room** → Asset becomes room-specific
3. **Asset assignment reflects in room details** → Room shows assigned assets and rental fees
4. **Tenant assignment to room** → Tenant inherits asset rental obligations
5. **Payment calculation includes asset fees** → Total monthly payment = Rent + Asset fees
6. **Payment breakdown shows itemization** → Tenant sees rent vs asset fees separately

## Acceptance Criteria

### Asset-Payment Integration
- [ ] Asset rental fees automatically added to tenant monthly payment calculations
- [ ] Payment items breakdown showing: Base Rent + Asset Rental Fees = Total
- [ ] Asset assignments trigger payment recalculation
- [ ] Asset unassignment removes fees from future payments

### Room Asset Visibility
- [ ] Room detail pages show assigned assets with rental rates
- [ ] Room financial dashboard includes asset rental revenue
- [ ] Asset assignment/unassignment from room detail page
- [ ] Room overview shows total monthly cost including assets

### Tenant Asset Visibility
- [ ] Tenant payment page shows asset rental fees breakdown
- [ ] Tenant can see which assets they're paying for
- [ ] Asset history shows past rental charges

### Payment System Enhancements
- [ ] Payment type 'asset_rental' added to payment types
- [ ] Payment records link to specific asset assignments
- [ ] Monthly payment generation includes asset fees
- [ ] Overdue calculation includes asset rental fees

### Admin Dashboard
- [ ] Asset revenue tracking and analytics
- [ ] Asset utilization reports (revenue per asset)
- [ ] Room profitability including asset revenue

## Technical Requirements

### Database Enhancements
```sql
-- Add asset payment linking
ALTER TABLE payments ADD COLUMN asset_assignment_ids UUID[];

-- Create asset billing records
CREATE TABLE asset_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_assignment_id UUID REFERENCES asset_assignments(id),
  tenant_id UUID REFERENCES tenants(id),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  rental_amount DECIMAL(10,2) NOT NULL,
  payment_id UUID REFERENCES payments(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Enhancements
- [ ] `GET /api/rooms/[id]/assets` - Get assets assigned to room
- [ ] `POST /api/rooms/[id]/assets/assign` - Assign asset to room
- [ ] `DELETE /api/rooms/[id]/assets/[assetId]` - Unassign asset from room
- [ ] `GET /api/tenants/[id]/asset-payments` - Get tenant asset payment history
- [ ] `PUT /api/payments/calculate` - Recalculate payments including assets

### Component Updates
- [ ] **RoomDetailClient**: Add assets tab showing assigned assets
- [ ] **TenantPaymentPage**: Show asset rental fee breakdown
- [ ] **PaymentCalculator**: Include asset fees in calculations
- [ ] **RoomFinancialDashboard**: Include asset revenue metrics
- [ ] **AssetAssignmentManager**: New component for room-level asset management

### File Changes Required
1. **src/lib/api/rooms.ts** - Add asset-related functions
2. **src/lib/api/payments.ts** - Enhance payment calculations
3. **src/components/features/RoomDetailClient.tsx** - Add assets tab
4. **src/app/tenant/payments/page.tsx** - Show asset fees
5. **src/types/payments.ts** - Add asset payment types
6. **src/lib/schema.sql** - Add asset billing table

## Implementation Steps

### Phase 1: Database & API Foundation (6 hours)
1. Add asset billing table to schema
2. Enhance payment calculation APIs to include assets
3. Create room-asset API endpoints
4. Update payment types to include asset rentals

### Phase 2: Room Asset Integration (4 hours)
1. Add assets tab to room detail pages
2. Create asset assignment component for rooms
3. Show asset costs in room financial dashboard
4. Update room overview with total costs

### Phase 3: Tenant Payment Integration (4 hours)
1. Enhance tenant payment page with asset breakdown
2. Update payment calculation to include asset fees
3. Show asset payment history for tenants
4. Add asset rental fees to payment notifications

### Phase 4: Admin Analytics & Reports (2 hours)
1. Asset revenue tracking in admin dashboard
2. Room profitability including asset revenue
3. Asset utilization analytics
4. Payment reconciliation reports

## Definition of Done
- [ ] Asset rental fees automatically included in tenant payments
- [ ] Room detail pages show assigned assets and costs
- [ ] Tenant payment pages show asset rental breakdown
- [ ] Payment calculations include asset fees
- [ ] Asset assignment triggers payment updates
- [ ] Database properly tracks asset billing
- [ ] All components handle asset payments correctly
- [ ] Tests pass and build compiles successfully

## Notes
This task completes the asset management user flow by connecting assets to the payment system. The current asset assignment system exists but operates in isolation from payments. This integration will make asset rentals financially functional and visible to both admins and tenants.

## Business Impact
- **Revenue Generation**: Asset rental fees properly billed and collected
- **Transparency**: Clear breakdown of charges for tenants
- **Room Profitability**: Complete picture of room revenue including assets
- **Operational Efficiency**: Automated asset billing reduces manual work

---

**Created**: 2024-12-28  
**Priority**: Medium-High  
**Estimated Effort**: 16 hours  
**Dependencies**: Asset Management, Payment System, Room Management modules 