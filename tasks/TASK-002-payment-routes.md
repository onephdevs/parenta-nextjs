# TASK-002: Implement Payment Individual Routes

**Status**: ⏸️ Pending  
**Priority**: HIGH  
**Estimated Time**: 1 hour  
**Phase**: 1 - Critical Fixes

---

## 📋 DESCRIPTION

Implement GET, PUT, and DELETE operations for individual payment records. Currently only list and create operations exist.

---

## 🎯 ACCEPTANCE CRITERIA

- [ ] `GET /api/payments/[id]` returns payment details
- [ ] `PUT /api/payments/[id]` updates payment
- [ ] `DELETE /api/payments/[id]` deletes payment
- [ ] All operations include proper authentication
- [ ] Error handling for invalid IDs
- [ ] Response format consistent with other endpoints

---

## 🔍 TECHNICAL DETAILS

**New File**: `src/app/api/payments/[id]/route.ts`

**Required Functions** (check if exist in `src/lib/api/payments.ts`):
- `getPaymentById(id: string)`
- `updatePayment(id: string, updates: Partial<Payment>)`
- `deletePayment(id: string)`

---

## ✅ IMPLEMENTATION STEPS

1. Check if payment library functions exist
2. Create missing library functions if needed
3. Create `/api/payments/[id]/route.ts`
4. Implement GET handler
5. Implement PUT handler
6. Implement DELETE handler
7. Add authentication checks
8. Test all operations

---

## 🧪 TESTING

```bash
# Test GET
curl http://localhost:3001/api/payments/[payment-id]
# Expected: 200 with payment data

# Test PUT
curl -X PUT http://localhost:3001/api/payments/[payment-id] \
  -H "Content-Type: application/json" \
  -d '{"paymentStatus": "paid", "notes": "Updated"}'
# Expected: 200 with updated payment

# Test DELETE
curl -X DELETE http://localhost:3001/api/payments/[payment-id]
# Expected: 200 with success message
```

---

## 📝 IMPLEMENTATION TEMPLATE

```typescript
// src/app/api/payments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPaymentById, updatePayment, deletePayment } from '@/lib/api/payments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // Implementation
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  // Implementation
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Implementation
}
```

---

**Created**: 2025-10-28  
**Dependencies**: Payment library functions  
**Blocks**: UI payment edit/delete features

