# ✅ Setup Default Tenant - Quick Guide

**API Endpoint:** `POST /api/tenant/setup-default`  
**Access:** Admin only

---

## 🎯 What This Does

This endpoint automatically:
1. ✅ Finds or creates user account for `tenant@parenta.com`
2. ✅ Creates tenant profile (if doesn't exist)
3. ✅ Links user account to tenant profile
4. ✅ Finds an unoccupied room (or creates demo building/room)
5. ✅ Assigns tenant to the room
6. ✅ Sets up deposit and advance payment
7. ✅ Updates room status to "occupied"

---

## 🚀 How to Use

### Option 1: Using cURL (Terminal)

```bash
# First, login as admin to get session cookie
# Then run:
curl -X POST http://localhost:3030/api/tenant/setup-default \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Option 2: Using Browser Console (Easier)

1. **Login as admin** at `http://localhost:3030/auth/admin/signin`
   - Email: `admin@parenta.com`
   - Password: `admin123`

2. **Open browser console** (F12 or Cmd+Option+I)

3. **Run this command:**
```javascript
fetch('/api/tenant/setup-default', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Result:', data);
  if (data.success) {
    alert('✅ Default tenant created successfully!\n\n' + 
          'Room: ' + data.data.roomNumber + '\n' +
          'Building: ' + data.data.buildingName + '\n' +
          'Monthly Rate: ₱' + data.data.monthlyRate.toLocaleString());
  } else {
    alert('❌ Error: ' + data.error);
  }
})
.catch(err => console.error('Error:', err));
```

### Option 3: Using the Seed Endpoint (Alternative)

```bash
curl -X POST http://localhost:3030/api/seed-tenant
```

This creates complete demo data including:
- Admin and tenant users
- Building and room
- Tenant profile (linked)
- Room assignment
- Sample payments

---

## 📋 What Gets Created

### User Account
- **Email:** `tenant@parenta.com`
- **Password:** `tenant123`
- **Role:** `tenant`

### Tenant Profile
- **Name:** John Doe
- **Email:** `tenant@parenta.com`
- **Phone:** +63 917 123 4567
- **Monthly Income:** ₱45,000
- **Security Deposit:** ₱30,000
- **Status:** Active

### Room Assignment
- **Room:** First available unoccupied room (or creates "201A" in "Sunrise Residences")
- **Monthly Rate:** Room's monthly rate
- **Deposit Paid:** ₱30,000
- **Advance Paid:** ₱15,000 (1 month)
- **Status:** Active

---

## ✅ Verification

After running the endpoint, verify:

1. **Check tenant profile link:**
   ```sql
   SELECT 
     u.email,
     t.first_name || ' ' || t.last_name as tenant_name,
     t.user_id IS NOT NULL as is_linked
   FROM users u
   LEFT JOIN tenants t ON t.user_id = u.id
   WHERE u.email = 'tenant@parenta.com';
   ```

2. **Check room assignment:**
   ```sql
   SELECT 
     t.first_name || ' ' || t.last_name as tenant_name,
     r.room_number,
     b.name as building_name,
     tra.assignment_status
   FROM tenants t
   INNER JOIN tenant_room_assignments tra ON t.id = tra.tenant_id
   INNER JOIN rooms r ON tra.room_id = r.id
   INNER JOIN buildings b ON r.building_id = b.id
   WHERE t.email = 'tenant@parenta.com'
     AND tra.assignment_status = 'active';
   ```

3. **Test login:**
   - Go to `/auth/tenant/signin`
   - Login with `tenant@parenta.com` / `tenant123`
   - Should now see tenant portal without errors

---

## 🔄 Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Default tenant created and assigned to room",
  "data": {
    "userId": "user-uuid",
    "tenantId": "tenant-uuid",
    "roomId": "room-uuid",
    "roomNumber": "201A",
    "buildingName": "Sunrise Residences",
    "monthlyRate": 15000
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to setup default tenant",
  "details": "Error message here"
}
```

---

## 🎯 Next Steps

After running this endpoint:

1. ✅ Tenant can login at `/auth/tenant/signin`
2. ✅ Tenant portal pages will work:
   - `/tenant` - Dashboard
   - `/tenant/payments` - Payments
   - `/tenant/maintenance` - Maintenance requests
   - `/tenant/profile` - Profile
3. ✅ All APIs will return data instead of 404 errors

---

## 📝 Notes

- This endpoint is **idempotent** - safe to run multiple times
- If tenant profile already exists, it will link it to the user
- If no unoccupied rooms exist, it creates a demo building and room
- All operations are wrapped in a database transaction (rolls back on error)

---

## 🚨 Troubleshooting

**Error: "Unauthorized"**
- Make sure you're logged in as admin
- Check session cookie is valid

**Error: "Database connection failed"**
- Check `DATABASE_URL` in `.env.local`
- Verify database is accessible
- Restart dev server after changing env vars

**Error: "No vacant rooms"**
- The endpoint will create a demo building/room automatically
- Or manually create a room first via admin panel

---

**Status:** ✅ Ready to use!
