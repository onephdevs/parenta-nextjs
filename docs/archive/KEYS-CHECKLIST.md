# 🔑 Environment Keys Checklist

Quick reference for all environment variables needed.

---

## ✅ REQUIRED KEYS (5)

### 1. 🗄️ DATABASE_URL
```bash
DATABASE_URL="postgresql://postgres:password@host:6543/database"
```
📍 **Where to get it:** Supabase Dashboard → Settings → Database → Connection String  
🔗 **Link:** https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database

---

### 2. 🔐 NEXTAUTH_SECRET
```bash
NEXTAUTH_SECRET="Xj8dKm2pQ9vL5nR7tW3yH6zB4cA1fE8g"
```
📍 **How to generate:**
```bash
openssl rand -base64 32
```
🔗 **Or use:** https://generate-secret.vercel.app/32

---

### 3. 🌐 NEXTAUTH_URL
```bash
# Development
NEXTAUTH_URL="http://localhost:3030"

# Production
NEXTAUTH_URL="https://parenta.com.mx"
```
📍 **What it is:** Your application's URL

---

### 4. ⚙️ NODE_ENV
```bash
NODE_ENV="development"  # or "production"
```
📍 **When to use:** Always set this

---

### 5. 🔌 PORT
```bash
PORT=3030
```
📍 **What it is:** Port number for your app (Hostinger uses 3030)

---

## 📧 OPTIONAL KEYS (3) - For Email Notifications

### 6. ✉️ GMAIL_USER
```bash
GMAIL_USER="your-email@gmail.com"
```
📍 **What it is:** Your Gmail address for sending emails

---

### 7. 🔑 GMAIL_APP_PASSWORD
```bash
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
```
📍 **How to get it:**
1. Go to https://myaccount.google.com/apppasswords
2. Enable 2FA if not enabled
3. Generate App Password for "Mail"
4. Copy the 16-character password

📖 **Full guide:** `GMAIL-EMAIL-SETUP.md`

---

### 8. 🏷️ EMAIL_FROM
```bash
EMAIL_FROM="Parenta <your-email@gmail.com>"
```
📍 **What it is:** Display name for sent emails (optional, defaults to GMAIL_USER)

---

## 📋 QUICK SETUP GUIDE

### Step 1: Create `.env.local`
```bash
cp .env.example .env.local
```

### Step 2: Fill in the 5 Required Keys
| Key | How to Get |
|-----|-----------|
| DATABASE_URL | From Supabase |
| NEXTAUTH_SECRET | Generate: `openssl rand -base64 32` |
| NEXTAUTH_URL | `http://localhost:3030` (dev) |
| NODE_ENV | `development` |
| PORT | `3030` |

### Step 3 (Optional): Add Gmail Keys
| Key | How to Get |
|-----|-----------|
| GMAIL_USER | Your Gmail |
| GMAIL_APP_PASSWORD | From Google Account |
| EMAIL_FROM | Your preference |

---

## 📝 COMPLETE TEMPLATE

Copy this into your `.env.local`:

```bash
# ========================================
# REQUIRED (5 keys)
# ========================================
DATABASE_URL="postgresql://postgres:password@host:6543/database"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3030"
NODE_ENV="development"
PORT=3030

# ========================================
# OPTIONAL - For Email (3 keys)
# ========================================
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
EMAIL_FROM="Parenta <your-email@gmail.com>"
```

---

## 🧪 TEST YOUR SETUP

### 1. Start the app
```bash
npm run dev
```

### 2. Check it loads
Open http://localhost:3030

### 3. Test email (optional)
```bash
curl -X POST http://localhost:3030/api/notifications/test-email
```

---

## 📚 DETAILED DOCUMENTATION

- 📖 **Complete Guide:** `ENVIRONMENT-VARIABLES.md`
- 📧 **Gmail Setup:** `GMAIL-EMAIL-SETUP.md`
- ⚡ **Gmail Quick:** `GMAIL-QUICK-START.md`

---

## ✨ SUMMARY

### Must Have (5 keys):
✅ `DATABASE_URL` - PostgreSQL  
✅ `NEXTAUTH_SECRET` - Auth secret  
✅ `NEXTAUTH_URL` - App URL  
✅ `NODE_ENV` - Environment  
✅ `PORT` - Port number  

### Nice to Have (3 keys):
⚠️ `GMAIL_USER` - Gmail email  
⚠️ `GMAIL_APP_PASSWORD` - App password  
⚠️ `EMAIL_FROM` - Display name  

---

## 🎯 YOU NEED:

1. **Supabase Account** → Get `DATABASE_URL`
2. **Terminal** → Generate `NEXTAUTH_SECRET`
3. **Gmail** (optional) → Get `GMAIL_USER` + `GMAIL_APP_PASSWORD`

**That's it! You're ready to go!** 🚀

