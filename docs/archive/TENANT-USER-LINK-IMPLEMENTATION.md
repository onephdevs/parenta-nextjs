# 🔗 Tenant-User Link Implementation (Option 1)

## Overview

This document outlines the implementation of **Option 1**: linking the `users` table (authentication) with the `tenants` table (property management) using a foreign key relationship.

## ✅ What Has Been Implemented

### 1. Database Schema
- ✅ `tenants` table already includes `user_id UUID REFERENCES users(id)` column
- ✅ Index on `user_id` for performance
- ✅ Schema designed to support the link

### 2. Migration Scripts

**File: `migrations/add-user-tenant-link.sql`**
- Adds `user_id` column if it doesn't exist
- Creates demo users (admin, tenant, staff)
- Creates demo building, room, tenant profile
- Links tenant profile to user account
- Creates tenant-room assignment
- Adds sample payment data

### 3. Library Functions

**File: `src/lib/api/tenant-user-link.ts`**

New functions created:

| Function | Purpose |
|----------|---------|
| `createTenantWithUser()` | Creates both user account AND tenant profile in a single transaction |
| `linkUserToTenant()` | Links an existing user to an existing tenant profile |
| `getTenantByUserId()` | Fetches tenant profile by user ID |
| `getTenantCompleteData()` | Gets complete tenant info (profile, assignment, room, building) |
| `verifyUserTenantLink()` | Validates that a user-tenant link exists |

### 4. Updated API Endpoints

**File: `src/app/api/tenants/route.ts`**
- Updated `POST` handler to support creating user + tenant together
- Accepts `createUserAccount` parameter (defaults to `true`)
- If `true`: creates both user account and tenant profile (linked)
- If `false`: creates only tenant profile

### 5. New API Endpoints

**File: `src/app/api/tenant/profile/route.ts`**
- `GET /api/tenant/profile`
- Fetches complete tenant profile for logged-in user
- Returns tenant info, room assignment, building details

**File: `src/app/api/tenant/payments-history/route.ts`**
- `GET /api/tenant/payments-history`
- Fetches payment history for logged-in tenant
- Includes summary statistics

**File: `src/app/api/seed-tenant/route.ts`**
- `POST /api/seed-tenant`
- Seeds demo tenant data with proper user-tenant link
- Creates: users, building, room, tenant, assignment, payments

### 6. Seed Scripts

**File: `scripts/seed-tenant-link.ts`**
- Node.js script to seed data
- Can be run with: `npx tsx scripts/seed-tenant-link.ts`

## 📋 Implementation Benefits

### Before (Separated Systems)
```
users table          tenants table
-----------          -------------
id                   id
email                email
password_hash        first_name
role                 last_name
...                  ...

❌ No connection between the two!
```

### After (Linked System)
```
users table          tenants table
-----------          -------------
id ←───────────────── user_id (FK)
email                email
password_hash        first_name
role                 last_name
...                  ...

✅ Direct link via foreign key!
```

## 🎯 How It Works

### Creating a New Tenant (Admin Workflow)

```typescript
// Admin creates a new tenant with user account
POST /api/tenants
{
  "createUserAccount": true,  // Create both user + tenant
  "email": "john.doe@example.com",
  "password": "securepassword",  // Optional: auto-generates if not provided
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+63 917 123 4567",
  "monthlyIncome": 50000,
  "securityDeposit": 30000,
  // ... other tenant details
}

// Behind the scenes:
// 1. Creates user account in users table (with hashed password)
// 2. Creates tenant profile in tenants table
// 3. Links tenant.user_id → user.id
// 4. Returns both IDs
```

### Tenant Logging In

```typescript
// Tenant logs in
POST /api/auth/signin
{
  "email": "john.doe@example.com",
  "password": "securepassword",
  "role": "tenant"
}

// After successful login, tenant can access:
GET /api/tenant/profile
// Returns:
{
  "success": true,
  "data": {
    "tenant_id": "xxx",
    "first_name": "John",
    "last_name": "Doe",
    "room_number": "201A",
    "building_name": "Sunrise Residences",
    "monthly_rate": 15000.00,
    // ... complete tenant info
  }
}
```

## 🔐 Demo Credentials

### Admin Account
- **Email**: `admin@parenta.com`
- **Password**: `admin123`
- **Role**: `admin`

### Tenant Account
- **Email**: `tenant@parenta.com`
- **Password**: `tenant123`
- **Role**: `tenant`
- **Linked To**: John Doe tenant profile
- **Assigned To**: Room 201A, Sunrise Residences

### Staff Account
- **Email**: `staff@parenta.com`
- **Password**: `staff123`
- **Role**: `staff`

## 🚀 Next Steps

### Option A: Automatic Seeding (Recommended)

1. Restart the development server to pick up new endpoints
2. Run the seed endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/seed-tenant
   ```

### Option B: Manual Seeding

1. Run the init-db endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/init-db
   ```

2. Execute SQL commands to ensure the link:
   ```sql
   -- Add user_id column if missing
   ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
   CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
   
   -- Link existing tenant to user
   UPDATE tenants 
   SET user_id = (SELECT id FROM users WHERE email = 'tenant@parenta.com')
   WHERE email = 'tenant@parenta.com';
   ```

### Option C: Run SQL Migration File

Execute the migration file directly:
```bash
psql $DIRECT_URL -f migrations/add-user-tenant-link.sql
```

## ✅ Verification

After seeding, verify the link:

```sql
SELECT 
  u.email as user_email,
  u.role,
  t.first_name || ' ' || t.last_name as tenant_name,
  t.tenant_status,
  r.room_number,
  b.name as building_name
FROM users u
INNER JOIN tenants t ON t.user_id = u.id
LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id 
  AND tra.assignment_status = 'active'
LEFT JOIN rooms r ON tra.room_id = r.id
LEFT JOIN buildings b ON r.building_id = b.id
WHERE u.email = 'tenant@parenta.com';
```

**Expected Result:**
| user_email | role | tenant_name | tenant_status | room_number | building_name |
|------------|------|-------------|---------------|-------------|---------------|
| tenant@parenta.com | tenant | John Doe | active | 201A | Sunrise Residences |

## 🧪 Testing Flow

1. **Login as Tenant**:
   ```
   http://localhost:3001/auth/tenant/signin
   Email: tenant@parenta.com
   Password: tenant123
   ```

2. **Access Tenant Dashboard**:
   ```
   http://localhost:3001/tenant
   ```

3. **Verify Data Displays**:
   - ✅ Tenant name: John Doe
   - ✅ Room: 201A
   - ✅ Building: Sunrise Residences
   - ✅ Monthly rent: ₱15,000
   - ✅ Payment history (4 payments)
   - ✅ Lease dates

## 🎯 Benefits of This Implementation

1. **Data Integrity**: Foreign key ensures users and tenants are properly linked
2. **Single Sign-On**: One email/password grants access to tenant portal
3. **Automatic Creation**: Admin can create tenant + user account in one step
4. **Security**: User credentials separate from tenant profile data
5. **Scalability**: Easy to add more roles (staff, maintenance, etc.)
6. **Audit Trail**: Track which user account performs which actions

## 📊 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER SIGNS UP                             │
└────────────────────────┬─────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│              Admin Creates Tenant via Form                        │
│              (or API endpoint /api/tenants)                       │
└────────────────────────┬─────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│             createTenantWithUser() Function                       │
│                                                                   │
│  ┌────────────────┐          ┌─────────────────┐                 │
│  │ 1. Create User │───────▶│  users table    │                 │
│  │    Account     │          │  - email        │                 │
│  │                │          │  - password_hash│                 │
│  └────────┬───────┘          │  - role: tenant │                 │
│           │                  └─────────┬───────┘                 │
│           │                            │                         │
│           ▼                            │ user_id                 │
│  ┌────────────────┐          ┌────────▼────────┐                 │
│  │ 2. Create      │───────▶│  tenants table  │                 │
│  │    Tenant      │          │  - user_id (FK) │                 │
│  │    Profile     │          │  - first_name   │                 │
│  │                │          │  - last_name    │                 │
│  └────────────────┘          │  - ...details   │                 │
│                              └─────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│             Tenant Can Now Login & Access Portal                 │
│                                                                   │
│  1. Login with email/password                                    │
│  2. Session contains user_id                                     │
│  3. Dashboard fetches tenant profile via user_id                 │
│  4. Displays complete tenant information                         │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Future Enhancements

1. **Email Invitations**: Send welcome email with portal access instructions
2. **Password Reset**: Implement forgot password flow
3. **Multi-Tenant Support**: Allow one user to manage multiple tenant profiles
4. **Role Upgrades**: Allow tenant to become landlord/admin
5. **SSO Integration**: Support Google, Facebook login

## 📝 Summary

✅ **Option 1 is now fully implemented!**

The system now properly links user accounts (authentication) with tenant profiles (property management), ensuring that when `tenant@parenta.com` logs in, they can access their complete tenant information including:

- Personal details
- Room assignment
- Lease information
- Payment history
- Maintenance requests
- Documents

All that's left is to seed the database and test the flow!

