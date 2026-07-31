# Testing Guide - Auto-Invoicing System

## 📋 Overview

This document provides a comprehensive guide to testing the auto-invoicing and payment processing system. We have multiple test suites covering different aspects of the system.

## 🗂️ Test Files

### 1. **TEST-MATRIX.md**
- **Type**: Documentation
- **Purpose**: Comprehensive test matrix with all test cases
- **Contains**:
  - 12 test categories
  - Edge case scenarios
  - Expected results
  - Priority levels
  - Success criteria

### 2. **test-edge-cases.sh**
- **Type**: Semi-automated test script
- **Purpose**: Tests edge cases and validation scenarios
- **Tests**:
  - Payment amount edge cases (zero, negative, large)
  - Lease duration variations (1 month, 24 months, same-day)
  - Data validation (duplicate email, invalid formats)
  - Date handling (31st day, leap year, past dates)
  - Deposit scenarios (zero, large amounts)
- **Usage**:
  ```bash
  ./test-edge-cases.sh
  ```

### 3. **test-payment-scenarios.sh**
- **Type**: Documentation script with visual diagrams
- **Purpose**: Illustrates payment allocation scenarios
- **Contains**:
  - 12 payment allocation scenarios
  - Visual ASCII diagrams
  - Payment flow explanations
  - Allocation rules summary
- **Usage**:
  ```bash
  ./test-payment-scenarios.sh
  ```

### 4. **test-automated-scenarios.sh**
- **Type**: Fully automated API test suite
- **Purpose**: Executes real API calls and validates responses
- **Tests**:
  - ✓ Exact payment for single invoice
  - ✓ Partial payment (under-payment)
  - ✓ Overpayment (credit creation)
  - ✓ Zero payment (validation)
  - ✓ Negative payment (validation)
  - ✓ Payment with deposit split
  - ✓ Multiple sequential payments
- **Usage**:
  ```bash
  ./test-automated-scenarios.sh
  ```

### 5. **test-api-flow.sh**
- **Type**: Integration test script
- **Purpose**: Tests complete workflows end-to-end
- **Tests**:
  - Database schema verification
  - Tenant creation
  - Room assignment
  - Invoice generation
  - Payment recording
  - Payment allocation
  - Credit tracking
- **Usage**:
  ```bash
  ./test-api-flow.sh
  ```

### 6. **test-deployment.sh**
- **Type**: Deployment verification script
- **Purpose**: Verifies database migration and initial state
- **Tests**:
  - Table existence
  - Function existence
  - Initial balances
  - Indexes
- **Usage**:
  ```bash
  ./test-deployment.sh
  ```

## 🚀 Quick Start

### Running All Tests

```bash
# 1. Start the development server
npm run dev

# 2. In another terminal, run tests

# Visual documentation (no API calls)
./test-payment-scenarios.sh

# Edge case tests (creates test data)
./test-edge-cases.sh

# Automated API tests (comprehensive)
./test-automated-scenarios.sh

# Full workflow test
./test-api-flow.sh
```

### Running Individual Test Categories

```bash
# Test only payment allocation
./test-automated-scenarios.sh

# Test only edge cases
./test-edge-cases.sh

# Verify deployment
./test-deployment.sh
```

## 📊 Test Matrix Summary

### Test Categories

| Category | Test Count | Priority | Automation |
|----------|------------|----------|------------|
| Payment Amounts | 8 | High | ✅ Yes |
| Lease Durations | 4 | High | ✅ Yes |
| Data Validation | 7 | High | ✅ Yes |
| Deposits | 7 | Medium | ⚠️ Partial |
| Credits | 6 | High | ⚠️ Partial |
| Date/Time | 6 | Medium | ⚠️ Partial |
| Concurrent Ops | 3 | High | ❌ Manual |
| Complex Workflows | 5 | High | ⚠️ Partial |
| Performance | 4 | Medium | ❌ Manual |
| Error Recovery | 4 | Critical | ❌ Manual |

### Priority Levels

- **Critical**: Security, data corruption (100% must pass)
- **High**: Core functionality (100% must pass)
- **Medium**: Important features (>95% must pass)
- **Low**: Edge cases (>80% must pass)

## 🧪 Test Scenarios

### Scenario 1: Exact Payment
```
Invoice:  ₱8,000
Payment:  ₱8,000
Result:   Invoice paid, no credit
Status:   Completed
```

### Scenario 2: Partial Payment
```
Invoice:  ₱8,000
Payment:  ₱5,000
Result:   Invoice partial, ₱3,000 remaining
Status:   Partial
```

### Scenario 3: Overpayment
```
Invoices: 2 x ₱8,000 = ₱16,000
Payment:  ₱20,000
Result:   Both invoices paid, ₱4,000 credit
Status:   Completed + Credit
```

### Scenario 4: Multiple Invoices
```
Invoices: 3 x ₱8,000 = ₱24,000
Payment:  ₱20,000
Result:   2 paid, 1 partial (₱4,000)
Status:   2 completed, 1 partial
```

### Scenario 5: With Existing Credit
```
Invoice:  ₱8,000
Credit:   ₱4,000 (existing)
Payment:  ₱4,000 (new)
Result:   Credit auto-applied + payment
Status:   Completed, credit used
```

### Scenario 6: Deposit Split
```
Total:    ₱10,000
Deposit:  ₱2,000 → Deposit Ledger
Payment:  ₱8,000 → Invoice
Result:   Separate tracking
```

## 🎯 Testing Best Practices

### Before Testing

1. **Clean Database State**
   ```bash
   # Optional: Reset test data
   # Be careful in production!
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Verify API Accessibility**
   ```bash
   curl http://localhost:3030/api/health
   ```

### During Testing

1. **Monitor Logs**
   ```bash
   # Terminal 1: Server logs
   npm run dev
   
   # Terminal 2: Run tests
   ./test-automated-scenarios.sh
   ```

2. **Check Database State**
   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Check invoices
   SELECT * FROM invoices ORDER BY created_at DESC LIMIT 5;
   
   # Check payments
   SELECT * FROM payments ORDER BY payment_date DESC LIMIT 5;
   
   # Check credits
   SELECT * FROM tenant_credits ORDER BY created_at DESC;
   ```

3. **Verify API Responses**
   - Check status codes (200, 400, 500)
   - Validate response structure
   - Confirm data integrity

### After Testing

1. **Review Test Results**
   - Check pass/fail rates
   - Investigate failures
   - Document issues

2. **Clean Up Test Data** (Optional)
   ```sql
   -- Delete test tenants
   DELETE FROM tenants WHERE email LIKE '%@test.com';
   
   -- Clean up related records (cascades should handle this)
   ```

3. **Document Findings**
   - Update test matrix
   - Log bugs
   - Note improvements

## 📝 Test Data Fixtures

### Sample Tenant
```json
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test.user@example.com",
  "phone": "+63 917 123 4567",
  "monthlyRent": 8000,
  "leaseStartDate": "2025-01-01",
  "leaseEndDate": "2025-12-31"
}
```

### Sample Payment
```json
{
  "tenantId": "tenant-uuid",
  "roomId": "room-uuid",
  "amount": 8000,
  "depositAmount": 0,
  "paymentType": "rent",
  "paymentMethod": "cash",
  "paymentDate": "2025-01-15"
}
```

### Rent Amount Variations
- ₱1,000 (low-income housing)
- ₱5,000 (budget)
- ₱8,000 (standard)
- ₱15,000 (mid-range)
- ₱25,000 (premium)
- ₱50,000 (luxury)

### Lease Duration Variations
- 1 month (short-term)
- 3 months (trial)
- 6 months (mid-term)
- 12 months (standard)
- 24 months (long-term)

## 🐛 Troubleshooting

### Tests Failing

**Issue**: Connection refused
```
Solution: Ensure dev server is running on port 3030
```

**Issue**: Database errors
```
Solution: Run migrations and verify DATABASE_URL
```

**Issue**: No available rooms
```
Solution: Create test properties and rooms first
```

### Expected Failures

Some tests are designed to fail (validation tests):
- ❌ Zero payment amount
- ❌ Negative payment amount
- ❌ Duplicate email
- ❌ Invalid date ranges
- ❌ End date before start date

These are **expected failures** and should show "correctly rejected" in results.

## 📈 Test Coverage Goals

### Current Coverage
- ✅ Payment allocation logic
- ✅ Invoice generation
- ✅ Credit management
- ✅ Basic validation
- ⚠️ Deposit management (partial)
- ⚠️ Date edge cases (partial)
- ❌ Concurrent operations
- ❌ Performance benchmarks

### Target Coverage
- **Unit Tests**: 80%+
- **Integration Tests**: 70%+
- **E2E Tests**: Key workflows
- **Performance**: Basic benchmarks

## 🔄 Continuous Integration

### Recommended CI Pipeline

```yaml
# Example GitHub Actions workflow
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
      - name: Install dependencies
        run: npm install
      - name: Run edge case tests
        run: ./test-edge-cases.sh
      - name: Run automated scenarios
        run: ./test-automated-scenarios.sh
      - name: Run API flow tests
        run: ./test-api-flow.sh
```

## 📞 Support

### Reporting Issues

When reporting test failures, include:
1. Test script name
2. Specific test case
3. Expected result
4. Actual result
5. Error messages
6. Environment (dev/staging/prod)

### Adding New Tests

1. Update `TEST-MATRIX.md` with new test case
2. Add test to appropriate script
3. Document expected behavior
4. Verify test passes/fails correctly
5. Update this guide

## 🎓 Learning Resources

### Understanding Payment Allocation
- Read `test-payment-scenarios.sh` for visual diagrams
- Review `FEATURE-REQUEST-AUTO-INVOICING.md` for business logic
- Check `IMPLEMENTATION-REPORT.md` for technical details

### Database Schema
- Review `src/lib/schema.sql`
- Check `migrations/add-auto-invoicing-tables.sql`
- Understand relationships between tables

### API Endpoints
- Tenants: `/api/tenants`
- Rooms: `/api/rooms`
- Invoices: `/api/invoices`
- Payments: `/api/payments`
- Credits: `/api/tenant-credits`
- Deposits: `/api/deposit-ledger`

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All High priority tests pass
- [ ] Critical security tests pass
- [ ] Database migrations run successfully
- [ ] API endpoints respond correctly
- [ ] Payment allocation works as expected
- [ ] Credit system functions properly
- [ ] Deposit tracking accurate
- [ ] Validation prevents invalid data
- [ ] Error messages are clear
- [ ] Audit trails are complete

## 🎉 Success Criteria

The system is ready for production when:
- ✅ 100% of Critical tests pass
- ✅ 100% of High priority tests pass
- ✅ >95% of Medium priority tests pass
- ✅ >80% of Low priority tests pass
- ✅ No blocking issues identified
- ✅ Performance meets requirements
- ✅ Security audit completed
- ✅ Documentation complete

---

**Last Updated**: November 20, 2025  
**Version**: 1.0  
**Maintained By**: Development Team

