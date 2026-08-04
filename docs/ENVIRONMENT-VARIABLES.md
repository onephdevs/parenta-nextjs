# Environment Variables Guide

Complete list of all environment variables needed for the Parenta Property Management System.

---

## 🔑 REQUIRED KEYS

These are **absolutely required** for the application to work:

### 1. Database Connection

```bash
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

**Description:** PostgreSQL database connection string  
**Required:** ✅ YES  
**Example:** `postgresql://postgres:mypassword@aws-0-us-west-1.pooler.supabase.com:6543/postgres`  
**Where to get it:**
- Supabase: Project Settings → Database → Connection String → URI
- Other providers: Your PostgreSQL provider's dashboard

---

### 2. Authentication Secret

```bash
NEXTAUTH_SECRET="your-super-secret-key-here"
```

**Description:** Secret key for encrypting session tokens  
**Required:** ✅ YES  
**Security:** Must be random, long, and secure  
**How to generate:**

```bash
# Generate a secure random secret
openssl rand -base64 32
```

Or use this online: https://generate-secret.vercel.app/32

**Example:** `Xj8dKm2pQ9vL5nR7tW3yH6zB4cA1fE8g`

---

### 3. NextAuth URL

```bash
# Development
NEXTAUTH_URL="http://localhost:3030"

# Production
NEXTAUTH_URL="https://parenta.com.mx"
```

**Description:** The base URL of your application  
**Required:** ✅ YES  
**Development:** Your local dev URL (usually `http://localhost:3030`)  
**Production:** Your live domain (e.g., `https://parenta.com.mx`)

---

### 4. Node Environment

```bash
# Development
NODE_ENV="development"

# Production
NODE_ENV="production"
```

**Description:** Specifies the environment  
**Required:** ✅ YES  
**Values:** `development` or `production`

---

### 5. Port

```bash
PORT=3030
```

**Description:** Port number for the application  
**Required:** ✅ YES (for Hostinger deployment)  
**Default:** 3030  
**Note:** Hostinger uses port 3030 for Node.js apps

---

## 📧 EMAIL CONFIGURATION (Gmail)

Required for sending email notifications:

### 6. Gmail User

```bash
GMAIL_USER="your-email@gmail.com"
```

**Description:** Gmail email address for sending notifications  
**Required:** ⚠️ Optional (but recommended for notifications)  
**Example:** `parenta.notifications@gmail.com`

---

### 7. Gmail App Password

```bash
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
```

**Description:** Gmail App Password (16 characters)  
**Required:** ⚠️ Optional (but needed if GMAIL_USER is set)  
**Security:** This is NOT your regular Gmail password  
**How to get it:**

1. Go to https://myaccount.google.com/apppasswords
2. Enable 2-Factor Authentication first
3. Generate App Password for "Mail"
4. Copy the 16-character password

**See detailed guide:** `GMAIL-EMAIL-SETUP.md`

---

### 8. Email From Address

```bash
EMAIL_FROM="Parenta Property Management <your-email@gmail.com>"
```

**Description:** Display name and email for sent emails  
**Required:** ⚠️ Optional (defaults to GMAIL_USER)  
**Format:** `"Display Name <email@domain.com>"`  
**Example:** `"Parenta <parenta@gmail.com>"`

---

## 📝 COMPLETE ENVIRONMENT FILES

### Development: `.env.local`

Create this file in the root of your project:

```bash
# ========================================
# DATABASE
# ========================================
DATABASE_URL="postgresql://postgres:password@host:6543/postgres?sslmode=require"

# ========================================
# AUTHENTICATION
# ========================================
NEXTAUTH_URL="http://localhost:3030"
NEXTAUTH_SECRET="generate-a-secure-random-key-here"

# ========================================
# EMAIL NOTIFICATIONS (Gmail)
# ========================================
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-16-char-app-password"
EMAIL_FROM="Parenta <your-email@gmail.com>"

# ========================================
# ENVIRONMENT
# ========================================
NODE_ENV="development"
PORT=3030
```

---

### Production: `.env.production`

For deployment on Hostinger or other servers:

```bash
# ========================================
# DATABASE
# ========================================
DATABASE_URL="postgresql://postgres:password@host:6543/postgres?sslmode=require"

# ========================================
# AUTHENTICATION
# ========================================
NEXTAUTH_URL="https://parenta.com.mx"
NEXTAUTH_SECRET="your-production-secret-key-different-from-dev"

# ========================================
# EMAIL NOTIFICATIONS (Gmail)
# ========================================
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-16-char-app-password"
EMAIL_FROM="Parenta <your-email@gmail.com>"

# ========================================
# ENVIRONMENT
# ========================================
NODE_ENV="production"
PORT=3030
```

---

## 🔒 SECURITY BEST PRACTICES

### 1. Never Commit Environment Files
Your `.gitignore` already includes:
```
.env*
!.env.example
```

✅ **DO:** Keep `.env.local` and `.env.production` out of Git  
❌ **DON'T:** Ever commit real credentials to Git

---

### 2. Use Different Secrets for Dev/Production

```bash
# Development
NEXTAUTH_SECRET="dev-secret-key-12345678"

# Production
NEXTAUTH_SECRET="prod-super-secure-key-87654321"
```

✅ **DO:** Use different secrets for each environment  
❌ **DON'T:** Use the same secret in dev and production

---

### 3. Rotate Secrets Regularly

✅ Change `NEXTAUTH_SECRET` every 6-12 months  
✅ Regenerate Gmail App Passwords if compromised  
✅ Update database passwords periodically

---

### 4. Secure Storage

✅ **Development:** Store in `.env.local` (never commit)  
✅ **Production:** Set on server via SSH or control panel  
✅ **Team:** Use password manager for sharing (1Password, LastPass)

---

## 📦 QUICK SETUP GUIDE

### Step 1: Copy Template

```bash
# Create .env.local from this template
cp .env.example .env.local
```

### Step 2: Fill in Required Values

| Variable | How to Get It |
|----------|---------------|
| `DATABASE_URL` | From Supabase dashboard |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your app URL |
| `NODE_ENV` | Set to `development` |
| `PORT` | Set to `3030` |

### Step 3: Optional - Configure Gmail

| Variable | How to Get It |
|----------|---------------|
| `GMAIL_USER` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | Generate from Google Account settings |
| `EMAIL_FROM` | Your preferred display name |

See `GMAIL-QUICK-START.md` for detailed Gmail setup.

### Step 4: Test Configuration

```bash
# Start development server
npm run dev

# Check if app loads
open http://localhost:3030

# Test database connection
curl http://localhost:3030/api/health
```

---

## 🧪 TESTING YOUR CONFIGURATION

### Test Database Connection

```javascript
// In browser console at http://localhost:3030
fetch('/api/health')
  .then(r => r.json())
  .then(console.log);
```

Expected: `{ status: 'ok', database: 'connected' }`

---

### Test Email Configuration

```javascript
// In browser console (after logging in as admin)
fetch('/api/notifications/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log);
```

Expected: `{ success: true, message: 'Gmail SMTP is configured and working!' }`

---

## ❌ COMMON ERRORS & FIXES

### Error: "DATABASE_URL is not defined"

**Cause:** Environment file not loaded  
**Fix:**
1. Check `.env.local` exists in project root
2. Restart dev server: `npm run dev`
3. Verify file has `DATABASE_URL=...`

---

### Error: "Invalid NEXTAUTH_SECRET"

**Cause:** Missing or too short NEXTAUTH_SECRET  
**Fix:**
1. Generate new secret: `openssl rand -base64 32`
2. Add to `.env.local`: `NEXTAUTH_SECRET="your-generated-secret"`
3. Restart server

---

### Error: "Gmail credentials not configured"

**Cause:** Gmail environment variables missing  
**Fix:**
1. Set `GMAIL_USER` and `GMAIL_APP_PASSWORD`
2. See `GMAIL-EMAIL-SETUP.md` for setup guide
3. Test with `/api/notifications/test-email`

---

### Error: "Connection refused" to database

**Cause:** Wrong DATABASE_URL or database is down  
**Fix:**
1. Verify DATABASE_URL is correct
2. Check Supabase project is active
3. Test connection from Supabase dashboard
4. Ensure IP is not blocked by firewall

---

## 📋 ENVIRONMENT VARIABLES CHECKLIST

Use this checklist when setting up a new environment:

### Required (Must Have) ✅
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` - Secure random key
- [ ] `NEXTAUTH_URL` - Your app's URL
- [ ] `NODE_ENV` - development or production
- [ ] `PORT` - 3030 (for Hostinger)

### Optional (Recommended) ⚠️
- [ ] `GMAIL_USER` - For email notifications
- [ ] `GMAIL_APP_PASSWORD` - For Gmail SMTP
- [ ] `EMAIL_FROM` - Email display name

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Deploying to Production:

1. ✅ Create `.env.production` on server
2. ✅ Set all required environment variables
3. ✅ Use production DATABASE_URL
4. ✅ Set NEXTAUTH_URL to production domain
5. ✅ Generate new NEXTAUTH_SECRET (different from dev)
6. ✅ Configure Gmail credentials (if using email)
7. ✅ Set NODE_ENV=production
8. ✅ Set PORT=3030
9. ✅ Test all configurations
10. ✅ Verify database connection works

---

## 📚 RELATED DOCUMENTATION

- **Gmail Setup:** `GMAIL-EMAIL-SETUP.md` - Complete Gmail configuration guide
- **Gmail Quick Start:** `GMAIL-QUICK-START.md` - 5-minute Gmail setup
- **Deployment:** `DEPLOYMENT-SUCCESS.md` - Complete deployment guide
- **Cursor Rules:** `.cursorrules` - Project configuration and standards

---

## 🆘 NEED HELP?

### Quick Reference

**Generate Secret:**
```bash
openssl rand -base64 32
```

**Test Email:**
```bash
curl -X POST http://localhost:3030/api/notifications/test-email
```

**Check Config:**
```bash
curl http://localhost:3030/api/notifications/test-email
```

---

## ✨ SUMMARY

### Minimum Required (5 variables):
1. ✅ `DATABASE_URL` - PostgreSQL connection
2. ✅ `NEXTAUTH_SECRET` - Authentication secret
3. ✅ `NEXTAUTH_URL` - App URL
4. ✅ `NODE_ENV` - Environment type
5. ✅ `PORT` - Port number (3030)

### For Email Notifications (3 additional):
6. ⚠️ `GMAIL_USER` - Gmail address
7. ⚠️ `GMAIL_APP_PASSWORD` - App password
8. ⚠️ `EMAIL_FROM` - Display name (optional)

---

## 🎯 NEXT STEPS

1. ✅ Create `.env.local` file
2. ✅ Fill in required variables
3. ✅ Generate NEXTAUTH_SECRET
4. ✅ Get DATABASE_URL from Supabase
5. ✅ (Optional) Configure Gmail
6. ✅ Test configuration
7. ✅ Start development!

**You're ready to code!** 🚀

