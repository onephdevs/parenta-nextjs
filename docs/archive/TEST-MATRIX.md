# Auto-Invoicing System - Test Matrix

## Test Categories

### 1. Tenant Creation Edge Cases
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| T1.1 | Create tenant with minimal required fields | Success | High |
| T1.2 | Create tenant with all fields populated | Success | High |
| T1.3 | Create tenant with duplicate email | Fail with error | High |
| T1.4 | Create tenant with invalid email format | Fail with validation | Medium |
| T1.5 | Create tenant with negative monthly income | Fail with validation | Medium |
| T1.6 | Create tenant with future date of birth | Fail with validation | Low |
| T1.7 | Create tenant with special characters in name | Success | Medium |

### 2. Room Assignment Edge Cases
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| R2.1 | Assign tenant to available room | Success + invoices | High |
| R2.2 | Assign tenant to occupied room | Fail with error | High |
| R2.3 | Assign same tenant to multiple rooms | Previous terminated | High |
| R2.4 | Assign with lease end before start date | Fail with validation | High |
| R2.5 | Assign with start date in the past | Success with warning | Medium |
| R2.6 | Assign with very long lease (5+ years) | Success + many invoices | Low |
| R2.7 | Assign with same day start and end | Success + 1 invoice | Medium |
| R2.8 | Assign without end date | Success + ongoing | Medium |

### 3. Invoice Generation Test Cases
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| I3.1 | Generate invoices for 1-year lease | 12 monthly invoices | High |
| I3.2 | Generate invoices for 6-month lease | 6 monthly invoices | High |
| I3.3 | Generate invoices for fractional month | Prorated invoice | Medium |
| I3.4 | Generate invoices with mid-month start | All invoices created | Medium |
| I3.5 | Generate invoices across year boundary | Proper date handling | Medium |
| I3.6 | Regenerate invoices for same period | Prevent duplicates | High |
| I3.7 | Generate with different rent amounts | Correct amounts | High |

### 4. Payment Allocation Scenarios
| Test ID | Scenario | Payment Amount | Invoices | Expected Allocation | Credits Created |
|---------|----------|----------------|----------|---------------------|-----------------|
| P4.1 | Exact payment for one invoice | ₱8,000 | 1 x ₱8,000 | Fully paid | ₱0 |
| P4.2 | Exact payment for two invoices | ₱16,000 | 2 x ₱8,000 | Both fully paid | ₱0 |
| P4.3 | Underpayment (partial) | ₱5,000 | 1 x ₱8,000 | Partial (₱5,000) | ₱0 |
| P4.4 | Overpayment (create credit) | ₱20,000 | 2 x ₱8,000 | Both paid | ₱4,000 |
| P4.5 | Multiple partial payments | ₱4,000 each | 1 x ₱8,000 | Accumulate to full | ₱0 |
| P4.6 | Large overpayment | ₱100,000 | 12 x ₱8,000 | All paid | ₱4,000 |
| P4.7 | Payment with existing credit | ₱4,000 + ₱4,000 credit | 1 x ₱8,000 | Use credit first | ₱0 |
| P4.8 | Micro payment | ₱1 | Invoices exist | Applied to oldest | ₱0 |

### 5. Deposit Management Edge Cases
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| D5.1 | Record deposit separately | Balance increased | High |
| D5.2 | Apply deposit to invoice | Invoice paid, balance reduced | High |
| D5.3 | Refund full deposit | Balance to zero | High |
| D5.4 | Refund partial deposit | Remaining balance | Medium |
| D5.5 | Apply deposit exceeding balance | Fail with error | High |
| D5.6 | Apply deposit to already paid invoice | Fail or create credit | Medium |
| D5.7 | Multiple deposits for same tenant | Cumulative balance | Low |

### 6. Credit Management Edge Cases
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| C6.1 | Credit auto-applies to new invoice | Invoice reduced | High |
| C6.2 | Credit applies to multiple invoices | Distributed | High |
| C6.3 | Manual credit addition | Balance increased | Medium |
| C6.4 | Manual credit deduction | Balance decreased | Medium |
| C6.5 | Credit exceeds invoice amount | Remaining credit | Medium |
| C6.6 | Negative credit balance | Prevented | High |

### 7. Date & Time Edge Cases
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| DT7.1 | Lease starting on 31st | Handle months with < 31 days | High |
| DT7.2 | Lease across daylight saving | Proper date handling | Medium |
| DT7.3 | Leap year handling | Feb 29 handled correctly | Low |
| DT7.4 | Payment on weekend | Recorded correctly | Low |
| DT7.5 | Invoice due on holiday | Generated correctly | Low |
| DT7.6 | Timezone differences | UTC consistency | Medium |

### 8. Concurrent Operations
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| CO8.1 | Two payments at same time | Both recorded | High |
| CO8.2 | Assignment while payment processing | Consistent state | High |
| CO8.3 | Multiple invoice generations | No duplicates | High |

### 9. Data Validation
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| V9.1 | Negative payment amount | Fail with validation | High |
| V9.2 | Zero payment amount | Fail with validation | High |
| V9.3 | Extremely large payment (₱1B+) | Success or reasonable limit | Low |
| V9.4 | Negative rent amount | Fail with validation | High |
| V9.5 | Special characters in description | Sanitized/escaped | Medium |
| V9.6 | SQL injection in inputs | Prevented | Critical |
| V9.7 | XSS in tenant notes | Sanitized | Critical |

### 10. Complex Workflows
| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| W10.1 | Full lifecycle | Create → Assign → Invoice → Pay → Move Out | All steps work |
| W10.2 | Room transfer | Pay → Move to new room → New invoices | Proper handling |
| W10.3 | Lease renewal | End lease → Extend → New invoices | Seamless transition |
| W10.4 | Multiple tenants per room | N/A | Should be prevented |
| W10.5 | Tenant with multiple rooms | Create invoices for both | All tracked separately |

### 11. Performance & Scalability
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| S11.1 | Generate 100 invoices at once | < 5 seconds | Medium |
| S11.2 | Process 50 payments simultaneously | All complete | Medium |
| S11.3 | Load 1000+ tenants | No timeout | Low |
| S11.4 | Search with large dataset | < 1 second | Medium |

### 12. Error Recovery
| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| E12.1 | Database connection lost mid-payment | Transaction rolled back | Critical |
| E12.2 | Invoice generation fails halfway | No partial invoices | High |
| E12.3 | Duplicate payment submission | Idempotent (one recorded) | High |
| E12.4 | Invalid tenant ID in payment | Clear error message | High |

## Test Data Matrix

### Rent Amount Variations
- ₱1,000 (low)
- ₱8,000 (medium)
- ₱20,000 (high)
- ₱50,000 (premium)

### Lease Duration Variations
- 1 month (short-term)
- 6 months (mid-term)
- 12 months (standard)
- 24 months (long-term)
- 60 months (very long-term)

### Payment Method Variations
- Cash
- Bank Transfer
- Check
- Credit Card
- Online Payment

### Deposit Scenarios
- No deposit (0 months)
- 1 month deposit
- 2 months deposit
- 3 months deposit

### Advance Payment Scenarios
- No advance (0 months)
- 1 month advance
- 2 months advance
- 3 months advance

## Priority Definitions
- **Critical**: Security issues, data corruption
- **High**: Core functionality, blocking workflows
- **Medium**: Important but workarounds exist
- **Low**: Nice to have, edge cases

## Test Environment Requirements
- Clean database for each test run
- Test data fixtures
- Mock payment gateways
- Isolated test tenants
- Rollback capability

## Success Criteria
- All **Critical** tests pass: 100%
- All **High** priority tests pass: 100%
- **Medium** priority tests pass: >95%
- **Low** priority tests pass: >80%

## Automation Goals
- Automate all High priority tests
- Run on every commit
- Generate test reports
- Track coverage metrics

## Known Issues to Test
1. Invoice generation not triggering on assignment
2. Payment API due_date constraint
3. Authentication on financial APIs
4. Race conditions in concurrent operations
5. Date handling across timezones

## Next Steps
1. Implement automated tests for High priority scenarios
2. Create test fixtures and helpers
3. Add integration tests
4. Set up CI/CD test pipeline
5. Performance benchmarking

