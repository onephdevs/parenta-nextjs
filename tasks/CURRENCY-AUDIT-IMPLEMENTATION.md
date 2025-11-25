# Task: Currency Display Audit & Implementation

## Objective
Ensure ALL pages and components use the global currency context instead of hardcoded currency symbols.

## Success Criteria
- [ ] All pages audited for currency display
- [ ] All hardcoded $, USD references replaced with currency context
- [ ] All currency amounts use `formatCurrency()` function
- [ ] All currency labels use `currencySymbol` from context
- [ ] Default currency is PHP (₱)
- [ ] Tested on production

## Task Breakdown

### Phase 1: Discovery - Find All Currency References
**Status:** In Progress
**Time Estimate:** 15 minutes

#### Subtasks:
- [x] Find all files with hardcoded "$" symbols
- [x] Find all files with "USD" references
- [x] Find all files with currency formatting
- [x] Find all files with "Monthly Rent", "Deposit" labels
- [ ] Create comprehensive list of files to fix

### Phase 2: Admin Pages Audit
**Status:** Pending
**Time Estimate:** 30 minutes

#### Pages to Check:
- [ ] Dashboard (`/admin/page.tsx`)
- [ ] Buildings List (`/admin/buildings/page.tsx`)
- [ ] Building Detail (`/admin/buildings/[id]/page.tsx`)
- [ ] Building Rooms (`/admin/buildings/[id]/rooms/page.tsx`)
- [ ] Add Room (`/admin/buildings/[id]/rooms/new/page.tsx`)
- [ ] Rooms List (`/admin/rooms/page.tsx`)
- [ ] Room Detail (`/admin/rooms/[id]/page.tsx`)
- [ ] Tenants List (`/admin/tenants/page.tsx`)
- [ ] Tenant Detail (`/admin/tenants/[id]/page.tsx`)
- [ ] Edit Tenant (`/admin/tenants/[id]/edit/page.tsx`)
- [ ] Add Tenant (`/admin/tenants/new/page.tsx`)
- [ ] Financial Dashboard (`/admin/financial/dashboard/page.tsx`)
- [ ] Financial Overview (`/admin/financial/page.tsx`)
- [ ] Payments List (`/admin/financial/payments/page.tsx`)
- [ ] Payment Detail (`/admin/financial/payments/[id]/page.tsx`)
- [ ] Add Payment (`/admin/financial/payments/new/page.tsx`)
- [ ] Invoices List (`/admin/financial/invoices/page.tsx`)
- [ ] Invoice Detail (`/admin/financial/invoices/[id]/page.tsx`)
- [ ] Add Invoice (`/admin/financial/invoices/new/page.tsx`)
- [ ] Expenses List (`/admin/financial/expenses/page.tsx`)
- [ ] Expense Detail (`/admin/financial/expenses/[id]/page.tsx`)
- [ ] Add Expense (`/admin/financial/expenses/new/page.tsx`)
- [ ] Financial Reports (`/admin/financial/reports/page.tsx`)
- [ ] Advanced Analytics (`/admin/financial/advanced-analytics/page.tsx`)
- [ ] Late Fee Application (`/admin/financial/late-fees/apply/page.tsx`)
- [ ] Late Fee Settings (`/admin/financial/late-fees/settings/page.tsx`)
- [ ] Payment Gateways (`/admin/financial/payment-gateways/page.tsx`)
- [ ] Assets List (`/admin/assets/page.tsx`)
- [ ] Documents List (`/admin/documents/page.tsx`)
- [ ] Maintenance List (`/admin/maintenance/page.tsx`)
- [ ] Analytics (`/admin/analytics/page.tsx`)
- [ ] Utilities Readings (`/admin/utilities/readings/page.tsx`)
- [ ] Cost Allocation (`/admin/utilities/cost-allocation/page.tsx`)

### Phase 3: Components Audit
**Status:** Pending
**Time Estimate:** 45 minutes

#### Core Components:
- [x] RoomCard.tsx - ✅ FIXED
- [x] QuickEditModal.tsx - ✅ FIXED
- [x] RoomsList.tsx - ✅ FIXED
- [x] CreateInvoiceForm.tsx - ✅ FIXED
- [x] TenantsList.tsx - ✅ FIXED
- [ ] AddRoomForm.tsx
- [ ] EditRoomForm.tsx
- [ ] AddBuildingModal.tsx
- [ ] EditBuildingModal.tsx
- [ ] EditBuildingForm.tsx
- [ ] TenantForm.tsx
- [ ] EditTenantForm.tsx
- [ ] TenantCard.tsx
- [ ] TenantFinancialDetails.tsx
- [ ] PaymentForm.tsx
- [ ] ExpenseForm.tsx
- [ ] AssetForm.tsx
- [ ] BuildingCard.tsx
- [ ] BuildingDetailWithImages.tsx
- [ ] RoomDetailWithImages.tsx
- [ ] RoomDetailClient.tsx
- [ ] TenantAssignmentManager.tsx
- [ ] DepositLedgerManager.tsx
- [ ] TenantCreditsManager.tsx
- [ ] LateFeeApplication.tsx
- [ ] LateFeeSettingsManager.tsx
- [ ] PaymentGatewayManager.tsx
- [ ] AdvancedFinancialDashboard.tsx
- [ ] RoomFinancialDashboard.tsx

#### Dashboard Components:
- [ ] DashboardClient.tsx
- [ ] MetricsOverview.tsx
- [ ] RevenueChart.tsx
- [ ] OccupancyWidget.tsx
- [ ] RecentPaymentsTimeline.tsx
- [ ] UpcomingDueDates.tsx
- [ ] TopTenantsList.tsx

#### Utility Components:
- [ ] CostAllocationDashboard.tsx
- [ ] AllocationRulesConfig.tsx
- [ ] CostAllocationCalculator.tsx
- [ ] TenantUtilityBills.tsx
- [ ] UtilityStatsCards.tsx
- [ ] UtilityBillsList.tsx
- [ ] MeterReadingsDashboard.tsx
- [ ] MeterReadingForm.tsx

### Phase 4: Tenant Portal Pages
**Status:** Pending
**Time Estimate:** 20 minutes

#### Pages to Check:
- [ ] Tenant Dashboard (`/tenant/page.tsx`)
- [ ] Tenant Payments (`/tenant/payments/page.tsx`)
- [ ] Tenant Documents (`/tenant/documents/page.tsx`)
- [ ] Tenant Maintenance (`/tenant/maintenance/page.tsx`)

### Phase 5: Testing & Verification
**Status:** Pending
**Time Estimate:** 30 minutes

#### Test Cases:
- [ ] Verify all room displays show ₱
- [ ] Verify all payment displays show ₱
- [ ] Verify all invoice displays show ₱
- [ ] Verify all expense displays show ₱
- [ ] Verify all deposit displays show ₱
- [ ] Verify all tenant financial displays show ₱
- [ ] Verify all forms show (₱) in labels
- [ ] Test currency switching in Settings
- [ ] Verify database default is PHP
- [ ] Test on Vercel production
- [ ] Test on Hostinger production

## Implementation Strategy

### Step 1: Run Comprehensive Search
```bash
# Find all potential currency references
grep -r "\$" src/ --include="*.tsx" --include="*.ts" | grep -E "monthly|rent|deposit|payment|price|amount|cost|fee|income|revenue|expense"
```

### Step 2: Categorize Findings
- **High Priority:** User-facing displays (cards, lists, forms)
- **Medium Priority:** Admin analytics and reports
- **Low Priority:** Internal calculations (already using numbers)

### Step 3: Fix Pattern
For each file:
```tsx
// 1. Add import
import { useCurrency } from '@/contexts/CurrencyContext';

// 2. Add hook in component
const { formatCurrency, currencySymbol } = useCurrency();

// 3. Replace hardcoded $ with formatCurrency()
// Before: ${amount}
// After: {formatCurrency(amount)}

// 4. Replace hardcoded ($) in labels
// Before: Monthly Rent ($)
// After: Monthly Rent ({currencySymbol})
```

### Step 4: Build & Test
```bash
npm run build
vercel --prod
```

## Tracking

### Files Fixed (Count: 5)
- [x] src/components/features/RoomCard.tsx
- [x] src/components/features/QuickEditModal.tsx
- [x] src/components/features/RoomsList.tsx
- [x] src/components/features/CreateInvoiceForm.tsx
- [x] src/components/features/TenantsList.tsx

### Files Pending (Count: TBD)
- [ ] (To be populated after comprehensive search)

## Risks & Mitigations

### Risk 1: Breaking Existing Functionality
**Mitigation:** 
- Test each component after fix
- Build after each batch of changes
- Keep commits small and focused

### Risk 2: Missing Currency Displays
**Mitigation:**
- Use comprehensive grep searches
- Manual page-by-page verification
- Create checklist of all pages

### Risk 3: Performance Impact
**Mitigation:**
- Currency context is lightweight
- formatCurrency is memoized
- No API calls, just formatting

## Definition of Done

- [ ] All grep searches return 0 hardcoded currency
- [ ] All pages manually verified
- [ ] Build succeeds with no errors
- [ ] Deployed to Vercel
- [ ] Deployed to Hostinger
- [ ] Tested on production
- [ ] Documentation updated
- [ ] Task marked complete

## Timeline

- **Phase 1 (Discovery):** 15 minutes
- **Phase 2 (Admin Pages):** 30 minutes
- **Phase 3 (Components):** 45 minutes
- **Phase 4 (Tenant Portal):** 20 minutes
- **Phase 5 (Testing):** 30 minutes

**Total Estimated Time:** 2 hours 20 minutes

## Notes

- Focus on user-facing displays first
- Internal calculations don't need currency symbols
- Database stores numbers, display layer adds symbols
- Currency context handles formatting automatically

