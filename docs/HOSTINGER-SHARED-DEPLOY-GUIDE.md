# 🚀 Deploy Parenta to Hostinger Shared Hosting

## ✅ Comparison: Your Two Apps

### stagecards.com (Laravel/PHP)
```
✅ PHP application
✅ Apache serves files directly  
✅ Just upload files via SCP
✅ Works immediately
```

### parenta.com.mx (Next.js/Node.js)
```
⚡ Node.js application
⚡ Needs Node.js runtime
⚡ Requires hPanel configuration FIRST
⚡ Then upload and start
```

---

## 🎯 Two-Step Deployment Process

### Step 1: Enable Node.js in hPanel (One-Time Setup)
**Required:** Must be done via web interface  
**Time:** 5 minutes

### Step 2: Deploy Application
**Method:** Automated script (like your stagecards deploy)  
**Time:** 5-10 minutes

---

## 📋 Step 1: Enable Node.js in hPanel

### A. Access hPanel

1. Go to: **https://hpanel.hostinger.com/**
2. Login with your credentials
3. Click on **"parenta.com.mx"**

### B. Create Node.js Application

1. In the left sidebar, go to: **Advanced** → **Node.js**

2. Click: **"Create Application"** (or "+ New Application")

3. Fill in the form:

```
Application Root:     domains/parenta.com.mx/nodejs-app
Application URL:      https://parenta.com.mx (or https://www.parenta.com.mx)
Application Startup:  server.js
Node.js Version:      18.x or 20.x (select latest available)
Application Mode:     Production
```

4. Click **"Create"**

### C. Add Environment Variables

Still in hPanel Node.js section:

1. Click your newly created application
2. Find **"Environment Variables"** section
3. Add these variables:

```bash
DATABASE_URL
Value: postgresql://parenta_user:Parenta2025!!@localhost:5432/parenta_db

NEXTAUTH_URL
Value: https://parenta.com.mx

NEXTAUTH_SECRET
Value: (generate with: openssl rand -base64 32)

NODE_ENV
Value: production

PORT
Value: 3030
```

5. Click **"Save"** or **"Add"** for each

### D. Note the Application Path

The Node.js application directory should be:
```
/home/u876334876/domains/parenta.com.mx/nodejs-app
```

---

## 🚀 Step 2: Deploy Your Application

Now run the deployment script (similar to your stagecards deploy):

### A. Run Deployment Script

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

./scripts/deploy-to-hostinger-shared.sh
```

### B. What the Script Does

The script will:

1. ✅ **Build** your Next.js application
2. ✅ **Package** all necessary files
3. ✅ **Upload** to Hostinger via SCP (using sshpass like stagecards)
4. ✅ **Extract** files on server
5. ✅ **Install** dependencies with npm

Just like your stagecards deployment, you'll enter the password when prompted!

### C. After Script Completes

1. Go back to **hPanel** → **Node.js** section
2. Find your **parenta.com.mx** application
3. Click **"Restart"** button
4. Wait 10-20 seconds for app to start
5. Check status - should show **"Running"**

### D. Test Your Application

Open: **https://parenta.com.mx**

You should see your Parenta landing page!

---

## 🗄️ Step 3: Setup Database

### Option A: Use Cloud Database (Recommended)

Since PostgreSQL setup on shared hosting is complex:

**Use Supabase (Free):**

1. Go to: https://supabase.com
2. Create free account
3. Create new project
4. Go to SQL Editor
5. Copy-paste your `src/lib/schema.sql` content
6. Execute the SQL
7. Get connection string from Settings → Database
8. Update `DATABASE_URL` in hPanel environment variables
9. Restart application in hPanel

**Benefits:**
- ✅ Free tier (500MB database)
- ✅ Reliable and fast
- ✅ Automatic backups
- ✅ Easy to manage
- ✅ No server configuration needed

### Option B: Contact Hostinger Support

Ask them to:
1. Enable PostgreSQL for your account
2. Create database: `parenta_db`
3. Create user: `parenta_user`
4. Provide connection details

---

## 📊 Deployment Comparison

### Your stagecards.com (Laravel/PHP)
```bash
#!/bin/bash
# Upload PHP files
scp file.php user@host:domains/stagecards.com/
# Done! Apache serves it immediately
```

### Your parenta.com.mx (Next.js)
```bash
#!/bin/bash
# 1. Build Next.js app locally
npm run build

# 2. Upload built files
scp -r .next user@host:domains/parenta.com.mx/nodejs-app/

# 3. SSH and install dependencies
ssh user@host "cd domains/parenta.com.mx/nodejs-app && npm install"

# 4. Restart in hPanel
# (via web interface)
```

**Key Difference:** Next.js needs Node.js runtime + restart via hPanel

---

## 🔧 Complete Deployment Commands

### One-Time Setup (in hPanel):
```
✅ Enable Node.js application
✅ Configure environment variables
✅ Note application path
```

### Every Time You Deploy:
```bash
# 1. Deploy new version
./scripts/deploy-to-hostinger-shared.sh

# 2. Restart in hPanel
# Go to hPanel → Node.js → Click "Restart"

# 3. Test
# Open https://parenta.com.mx
```

---

## 🆘 Troubleshooting

### Issue: "Node.js not found"
**Solution:** You must enable Node.js in hPanel first (Step 1)

### Issue: "Application not starting"
**Solution:** 
1. Check hPanel → Node.js → View Logs
2. Verify environment variables are set
3. Check startup file is `server.js`
4. Verify Node.js version is 18+

### Issue: "Database connection failed"
**Solution:**
1. Use Supabase for easier setup
2. Or verify PostgreSQL is enabled in your hosting plan
3. Check DATABASE_URL is correct in hPanel

### Issue: "502 Bad Gateway"
**Solution:**
1. App might be starting - wait 30 seconds
2. Check application status in hPanel (should be "Running")
3. Click "Restart" in hPanel
4. Check logs in hPanel

---

## 📝 Quick Reference

### Server Details
```
SSH Host:     145.79.25.103
SSH Port:     65002
SSH User:     u876334876
SSH Pass:     (scripts/.deploy-secrets → SSH_PASS)
```

### Application Paths
```
Domain Root:       ~/domains/parenta.com.mx
App Directory:     ~/domains/parenta.com.mx/nodejs-app
Public HTML:       ~/domains/parenta.com.mx/public_html
```

### hPanel URLs
```
Main:              https://hpanel.hostinger.com/
Node.js Manager:   hPanel → Websites → parenta.com.mx → Advanced → Node.js
File Manager:      hPanel → Files → File Manager
Databases:         hPanel → Databases
```

---

## 🎯 Complete Checklist

### Before First Deployment
- [ ] Login to hPanel
- [ ] Enable Node.js application
- [ ] Set Application Root: `domains/parenta.com.mx/nodejs-app`
- [ ] Set Startup File: `server.js`
- [ ] Select Node.js 18+
- [ ] Add all environment variables
- [ ] Setup database (Supabase recommended)
- [ ] Save configuration

### For Each Deployment
- [ ] Run `./scripts/deploy-to-hostinger-shared.sh`
- [ ] Wait for upload to complete
- [ ] Go to hPanel → Node.js
- [ ] Click "Restart" application
- [ ] Wait 20-30 seconds
- [ ] Test at https://parenta.com.mx
- [ ] Verify login works
- [ ] Check database connection

---

## 💡 Tips

### 1. Use Supabase for Database
Don't struggle with PostgreSQL on shared hosting. Supabase is:
- Free tier available
- Easy setup (5 minutes)
- Reliable and fast
- Better than shared hosting database

### 2. Check Logs in hPanel
When issues occur:
- hPanel → Node.js → Click your app → View Logs
- Shows startup errors, connection issues, etc.

### 3. Environment Variables
Make sure ALL environment variables are set in hPanel, especially:
- DATABASE_URL (use Supabase connection string)
- NEXTAUTH_SECRET
- NEXTAUTH_URL

### 4. Restart After Changes
After updating environment variables or deploying new code:
- Always click "Restart" in hPanel Node.js section

---

## 🚀 Ready to Deploy?

### Quick Start (3 Steps):

1. **Enable Node.js in hPanel** (5 min)
   - Go to https://hpanel.hostinger.com/
   - Advanced → Node.js → Create Application
   - Add environment variables

2. **Run deployment script** (5 min)
   ```bash
   ./scripts/deploy-to-hostinger-shared.sh
   ```

3. **Restart and test** (1 min)
   - hPanel → Node.js → Restart
   - Open https://parenta.com.mx

**Total Time: ~15 minutes**

---

## 📞 Need Help?

### Hostinger Support
If you need PostgreSQL enabled or have hosting questions:
- Live Chat: Available in hPanel
- Tickets: hPanel → Help Center

### Application Issues
- Check: hPanel → Node.js → Application Logs
- Verify: All environment variables are set
- Test: Database connection (use Supabase!)

---

**Last Updated:** November 13, 2025  
**Status:** Ready to deploy to Hostinger shared hosting  
**Method:** SCP upload + hPanel Node.js manager

