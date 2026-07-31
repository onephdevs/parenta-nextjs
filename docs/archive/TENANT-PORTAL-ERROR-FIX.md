# 🔧 Tenant Portal Error Fix

**Issue:** "No tenant profile found" error when accessing Tenant Portal  
**Date:** December 3, 2024

---

## 🐛 Problem

When a tenant user logs in successfully (`tenant@parenta.com`), they see:
- ❌ Error: "No tenant profile found"
- ❌ 404 errors on `/api/tenant/payments` and `/api/tenant/balance`
- ❌ Empty payments page

**Root Cause:**
The user account exists and authentication works, but:
1. **No tenant profile is linked** to the user account (`user_id` is NULL in tenants table)
2. OR the tenant profile doesn't exist at all

---

## ✅ Solution

### Option 1: Link Existing User to Existing Tenant (Recommended)

**API Endpoint:** `POST /api/tenant/link` (Admin only)

**Link by Email:**
```bash
curl -X POST http://localhost:3030/api/tenant/link \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "email": "tenant@parenta.com"
  }'
```

This will:
- Find user with email `tenant@parenta.com`
- Find tenant with matching email
- Link them together

**Link by User ID and Tenant ID:**
```bash
curl -X POST http://localhost:3030/api/tenant/link \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "userId": "user-uuid",
    "tenantId": "tenant-uuid"
  }'
```

**Check Link Status:**
```bash
curl http://localhost:3030/api/tenant/link?email=tenant@parenta.com \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

---

### Option 2: Seed Demo Tenant Data

**API Endpoint:** `POST /api/seed-tenant`

This creates:
- ✅ User account: `tenant@parenta.com` (password: `tenant123`)
- ✅ Tenant profile: John Doe
- ✅ Building: Sunrise Residences
- ✅ Room: 201A
- ✅ Room assignment (linked)
- ✅ Sample payments

**Run:**
```bash
curl -X POST http://localhost:3030/api/seed-tenant
```

**Note:** This will create/update demo data. Use in development only.

---

### Option 3: Create Tenant with User Account (Admin)

**API Endpoint:** `POST /api/tenants`

**Request:**
```json
{
  "email": "tenant@parenta.com",
  "password": "tenant123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+63 917 123 4567",
  "createUserAccount": true
}
```

This creates both user account AND tenant profile, automatically linked.

---

## 🔍 Verify the Fix

### Check User-Tenant Link

**SQL Query:**
```sql
SELECT 
  u.email as user_email,
  u.role,
  t.id as tenant_id,
  t.first_name || ' ' || t.last_name as tenant_name,
  t.email as tenant_email,
  t.user_id IS NOT NULL as is_linked
FROM users u
LEFT JOIN tenants t ON t.user_id = u.id
WHERE u.email = 'tenant@parenta.com';
```

**Expected Result:**
- `is_linked` should be `true`
- `tenant_id` should not be NULL
- `tenant_name` should show the tenant's name

### Test Tenant Portal

1. **Login as tenant:**
   - Email: `tenant@parenta.com`
   - Password: `tenant123`
   - Role: `tenant`

2. **Access Tenant Portal:**
   - `/tenant` - Dashboard
   - `/tenant/payments` - Payments page
   - `/tenant/profile` - Profile page

3. **Should see:**
   - ✅ No "No tenant profile found" error
   - ✅ Payment data loads
   - ✅ Balance information displays
   - ✅ Profile information shows

---

## 📝 Database Connection Issue

**Error:** `error: Tenant or user not found` (code: XX000)

This is a **database connection error**, not a data issue. Check:

1. **Environment Variables:**
   ```bash
   # Check DATABASE_URL is set
   echo $DATABASE_URL
   ```

2. **Database Connection:**
   ```bash
   # Test connection
   node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e.message))"
   ```

3. **Fix:**
   - Ensure `.env.local` has correct `DATABASE_URL`
   - Restart dev server after changing env vars
   - Check Supabase connection string format

---

## 🎯 Quick Fix Steps

1. **Run seed endpoint** (creates everything):
   ```bash
   curl -X POST http://localhost:3030/api/seed-tenant
   ```

2. **Or link existing user to tenant:**
   ```bash
   # As admin, link user to tenant
   curl -X POST http://localhost:3030/api/tenant/link \
     -H "Content-Type: application/json" \
     -d '{"email": "tenant@parenta.com"}'
   ```

3. **Test login:**
   - Go to `/auth/tenant/signin`
   - Login with `tenant@parenta.com` / `tenant123`
   - Should now see tenant portal without errors

---

## ✅ Status

- ✅ Created `/api/tenant/link` endpoint to link users to tenants
- ✅ Updated error handling in payments page
- ✅ Seed endpoint available for demo data
- ✅ All tenant portal APIs require linked tenant profile

**Next Step:** Run the seed endpoint or link the existing user to a tenant profile.
