# TASK-003: Implement Asset Individual Routes

**Status**: ⏸️ Pending  
**Priority**: HIGH  
**Estimated Time**: 1 hour  
**Phase**: 1 - Critical Fixes

---

## 📋 DESCRIPTION

Implement GET, PUT, and DELETE operations for individual asset records. Currently only list, create, and assign operations exist.

---

## 🎯 ACCEPTANCE CRITERIA

- [ ] `GET /api/assets/[id]` returns asset details
- [ ] `PUT /api/assets/[id]` updates asset
- [ ] `DELETE /api/assets/[id]` deletes asset
- [ ] Authentication required for all operations
- [ ] Proper error handling
- [ ] Consistent response format

---

## 🔍 TECHNICAL DETAILS

**New File**: `src/app/api/assets/[id]/route.ts`

**Library Functions** (check `src/lib/api/assets.ts`):
- `getAssetById(id: string)` - likely exists
- `updateAsset(id: string, updates)` - may need creation
- `deleteAsset(id: string)` - may need creation

---

## ✅ IMPLEMENTATION STEPS

1. Review existing asset library functions
2. Create missing functions in `src/lib/api/assets.ts`
3. Create `/api/assets/[id]/route.ts`
4. Implement GET, PUT, DELETE handlers
5. Add authentication
6. Test all CRUD operations

---

## 🧪 TESTING

```bash
# Get asset details
curl http://localhost:3001/api/assets/ad998cdb-721d-4307-9d34-d04042ed1a1c

# Update asset
curl -X PUT http://localhost:3001/api/assets/[id] \
  -H "Content-Type: application/json" \
  -d '{"assetCondition": "excellent", "currentValue": 22000}'

# Delete asset
curl -X DELETE http://localhost:3001/api/assets/[id]
```

---

**Created**: 2025-10-28  
**Dependencies**: Asset library  
**Blocks**: Asset management UI

