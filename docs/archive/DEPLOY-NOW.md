# 🚀 Deploy Parenta to Hostinger - START HERE

## ✅ What I Found

Your Hostinger account is **Shared Hosting** (same as stagecards.com), but:

| stagecards.com | parenta.com.mx |
|----------------|----------------|
| PHP/Laravel app | Next.js/Node.js app |
| Apache serves directly | **Needs Node.js runtime** |
| Just upload files | Upload + Enable Node.js in hPanel |
| Works immediately | Needs restart via hPanel |

---

## 🎯 Your Deployment (2 Steps)

### Step 1: Enable Node.js in hPanel (5 min) - ONE TIME

Go to: **https://hpanel.hostinger.com/**

1. Click **parenta.com.mx**
2. Go to: **Advanced** → **Node.js**  
3. Click **"Create Application"**
4. Fill in:
   ```
   Application Root: domains/parenta.com.mx/nodejs-app
   Application URL: https://parenta.com.mx
   Startup File: server.js
   Node.js Version: 18+ (select latest)
   ```
5. Click **"Create"**
6. Add **Environment Variables**:
   ```
   DATABASE_URL = (use Supabase - see below)
   NEXTAUTH_URL = https://parenta.com.mx
   NEXTAUTH_SECRET = YOUR_NEXTAUTH_SECRET
   NODE_ENV = production
   PORT = 3030
   ```

### Step 2: Run Deployment Script (5 min)

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

./scripts/deploy-to-hostinger-shared.sh
```

**This script:**
- ✅ Builds your Next.js app
- ✅ Uploads files via SCP (like your stagecards script!)
- ✅ Extracts files on server
- ✅ Installs dependencies

Then:
1. Go back to **hPanel** → **Node.js**
2. Click **"Restart"** button
3. Open **https://parenta.com.mx**

---

## 🗄️ Database Setup (5 min) - IMPORTANT

PostgreSQL on shared hosting is complex. **Use Supabase instead** (free!):

### Quick Supabase Setup

1. Go to: **https://supabase.com**
2. **Sign Up** (free account)
3. Click **"New Project"**
4. Fill in:
   ```
   Project Name: parenta
   Database Password: (create a strong password)
   Region: (choose closest to you)
   ```
5. Wait 2 minutes for database to provision
6. Go to **SQL Editor** (left sidebar)
7. Click **"New Query"**
8. Open your local file: `src/lib/schema.sql`
9. Copy ALL contents
10. Paste into Supabase SQL Editor
11. Click **"Run"** (or press Cmd+Enter)
12. Wait for it to complete (creates all tables)
13. Go to **Settings** → **Database** → **Connection String**
14. Copy the **URI** connection string
15. Update in **hPanel**:
    - Go to hPanel → Node.js → Your App → Environment Variables
    - Update `DATABASE_URL` with Supabase connection string
    - Click Save

**Example Supabase connection string:**
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

---

## 🚀 Complete Deployment Steps

### First Time Setup:

```bash
# 1. Enable Node.js in hPanel (5 min)
Open: https://hpanel.hostinger.com/
→ parenta.com.mx → Advanced → Node.js → Create Application

# 2. Setup Supabase database (5 min)
Open: https://supabase.com
→ Create project → Run schema.sql → Get connection string

# 3. Add DATABASE_URL to hPanel (1 min)
hPanel → Node.js → Environment Variables → Update DATABASE_URL

# 4. Deploy application (5 min)
./scripts/deploy-to-hostinger-shared.sh

# 5. Restart application (1 min)
hPanel → Node.js → Click "Restart"

# 6. Test (1 min)
Open: https://parenta.com.mx
```

**Total Time: ~20 minutes**

### Future Deployments:

```bash
# Just run the script
./scripts/deploy-to-hostinger-shared.sh

# Then restart in hPanel
hPanel → Node.js → Restart

# Done!
```

---

## 📊 Comparison with stagecards.com

### stagecards.com Deployment (Current Working)
```bash
#!/bin/bash
# Your stagecards deploy script
scp -P 65002 file.php u327733245@141.136.39.191:domains/stagecards.com/
# Done! PHP works immediately
```

### parenta.com.mx Deployment (New Script)
```bash
#!/bin/bash
# Your new parenta deploy script
./scripts/deploy-to-hostinger-shared.sh
# Builds, uploads, extracts, installs

# Then manually:
# hPanel → Node.js → Restart
# (Node.js apps need explicit restart)
```

**Key Difference:** Next.js needs Node.js runtime enabled first!

---

## ✅ Pre-Flight Checklist

Before running deployment:

- [ ] hPanel account accessible (https://hpanel.hostinger.com/)
- [ ] Node.js application created in hPanel
- [ ] Environment variables added in hPanel
- [ ] Supabase account created
- [ ] Database schema loaded in Supabase
- [ ] DATABASE_URL updated in hPanel with Supabase connection string
- [ ] You have the SSH password ready: `(set SSH_PASS in scripts/.deploy-secrets)`

---

## 🎯 Quick Deploy Commands

```bash
# Navigate to project
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

# Check that build works
npm run build

# Run deployment
./scripts/deploy-to-hostinger-shared.sh

# Script will prompt for confirmation
# Then upload all files automatically
```

---

## 🆘 Troubleshooting

### "Node.js not found in PATH"
→ Enable Node.js in hPanel first (Step 1)

### "Application not starting"
→ Check hPanel → Node.js → View Logs
→ Verify environment variables are set
→ Click "Restart"

### "Database connection failed"
→ Make sure you're using Supabase connection string
→ Check DATABASE_URL in hPanel matches Supabase
→ Verify schema.sql was run in Supabase SQL Editor

### "502 Bad Gateway"
→ Wait 30 seconds (app is starting)
→ Check hPanel → Node.js → Status should be "Running"
→ Click "Restart" if needed

---

## 💡 Why Supabase?

**Instead of fighting with PostgreSQL on shared hosting:**

✅ **5-minute setup** vs hours of configuration  
✅ **Free tier** - 500MB database, plenty for your app  
✅ **Automatic backups** - Built-in  
✅ **Fast & reliable** - Professional infrastructure  
✅ **Easy management** - Web interface for SQL queries  
✅ **No server maintenance** - They handle everything  

**Supabase is perfect for your Parenta app!**

---

## 📞 Quick Reference

### Hostinger
```
hPanel:           https://hpanel.hostinger.com/
SSH:              ssh -p 65002 u876334876@145.79.25.103
Password:         (set SSH_PASS in scripts/.deploy-secrets)
App Directory:    ~/domains/parenta.com.mx/nodejs-app
```

### Supabase
```
Website:          https://supabase.com
Your Project:     (create one)
SQL Editor:       Load schema.sql here
Connection:       Settings → Database → URI
```

---

## 🎉 Ready to Deploy?

### Option 1: Deploy with Supabase Database (RECOMMENDED)

**Total time: 20 minutes**

1. ✅ Setup Supabase (5 min) - https://supabase.com
2. ✅ Enable Node.js in hPanel (5 min)
3. ✅ Run deployment script (5 min)
4. ✅ Restart in hPanel (1 min)
5. ✅ Test application (1 min)

### Option 2: Contact Hostinger for PostgreSQL

If you prefer PostgreSQL on your hosting:
- Contact Hostinger support
- Request PostgreSQL enabled
- They'll set it up (may take 1-2 days)
- Then deploy with script

---

## 🚀 Let's Deploy!

**Run this command when ready:**

```bash
./scripts/deploy-to-hostinger-shared.sh
```

**Don't forget:**
1. Enable Node.js in hPanel first!
2. Use Supabase for database (easier!)
3. Restart after deployment in hPanel

---

**Need the full guide?** See: `HOSTINGER-SHARED-DEPLOY-GUIDE.md`

**Let's get Parenta live! 🎉**

