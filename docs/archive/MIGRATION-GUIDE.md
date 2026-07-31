# Downpayment Migration Guide

## Status
The migration adds `'downpayment'` as a valid payment type to the `payments` table.

## How to Run the Migration

### Option 1: Via API Endpoint (Recommended)

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Log in as admin** at `http://localhost:3030/auth/signin`

3. **Run the migration** by making a POST request to:
   ```
   http://localhost:3030/api/migrations/downpayment
   ```

   **Using curl:**
   ```bash
   # First, get your session token from browser cookies
   # Then run:
   curl -X POST http://localhost:3030/api/migrations/downpayment \
     -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN' \
     -H 'Content-Type: application/json'
   ```

   **Or use browser console:**
   ```javascript
   fetch('/api/migrations/downpayment', { method: 'POST' })
     .then(r => r.json())
     .then(console.log);
   ```

### Option 2: Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `migrations/add-downpayment-payment-type.sql`
4. Click **Run**

## Verify Migration

After running the migration, verify it worked:

```bash
node scripts/verify-downpayment-migration.js
```

Or check manually in Supabase SQL Editor:
```sql
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'payments_payment_type_check';
```

The `check_clause` should include `'downpayment'` in the list.

## What the Migration Does

1. Drops the existing `payments_payment_type_check` constraint
2. Adds a new constraint that includes `'downpayment'`:
   ```sql
   CHECK (payment_type IN ('rent', 'deposit', 'downpayment', 'late_fee', 'utility', 'asset_rental', 'other'))
   ```
3. Adds a comment to the `payment_type` column

## Testing

After migration, test that downpayment works:

1. **Tenant Portal:**
   - Go to `/tenant/payments`
   - Click "Deposit" tab
   - Select "Downpayment" payment type
   - Submit a payment

2. **Admin Portal:**
   - Go to `/admin/financial/payments/new`
   - Select payment type "Downpayment"
   - Create a payment

## Troubleshooting

If you get "Tenant or user not found" error:
- This might be a database connection issue
- Try using the API endpoint approach instead
- Or run the migration directly in Supabase SQL Editor

If migration fails:
- Check that you're logged in as admin
- Verify database connection is working
- Check Supabase project is not paused
