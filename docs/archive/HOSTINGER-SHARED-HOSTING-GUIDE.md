# 🌐 Deploy Parenta to Hostinger Shared Hosting

## 📋 Important Discovery

Your Hostinger account is **Shared Hosting** (not a VPS), which means:
- ❌ No sudo/root access
- ❌ Can't install system software directly
- ✅ Must use hPanel (Hostinger Control Panel)
- ✅ Node.js can be enabled via hPanel
- ✅ Database created via hPanel

---

## 🎯 Revised Deployment Strategy

### Option 1: Use Hostinger's Node.js Hosting (Recommended)

**Prerequisites:**
- Hostinger Business or Premium plan (supports Node.js apps)
- Access to hPanel: https://hpanel.hostinger.com/

### Option 2: Deploy to Proper VPS (Alternative)

If you need full control, consider:
- Hostinger VPS plans (separate from shared hosting)
- DigitalOcean, Linode, or AWS
- Vercel (best for Next.js apps)

---

## 🚀 Deployment Steps for Shared Hosting

### Step 1: Access hPanel

1. Go to: https://hpanel.hostinger.com/
2. Login with your credentials
3. Select your website: **parenta.com.mx**

### Step 2: Enable Node.js Application

1. In hPanel, go to **"Advanced" section**
2. Click **"Node.js"** or **"Node.js Manager"**
3. Click **"Create Application"**

Configure:
```
Application Root: /domains/parenta.com.mx/public_html
Application URL: https://parenta.com.mx
Application Startup File: server.js
Node.js Version: 18 or higher
```

### Step 3: Create Database

1. In hPanel, go to **"Databases" → "MySQL Databases"**
   (Or "PostgreSQL Databases" if available)

2. Create new database:
```
Database Name: parenta_db
Username: parenta_user
Password: (generate secure password)
```

3. Note the connection details for later

### Step 4: Upload Application Files

#### Option A: Via hPanel File Manager

1. In hPanel, go to **"Files" → "File Manager"**
2. Navigate to `/domains/parenta.com.mx/public_html`
3. Upload your built Next.js application files

#### Option B: Via FTP/SFTP

Use FTP credentials from hPanel:
```
Host: ftp.parenta.com.mx (or provided FTP host)
Username: u876334876
Password: (your password)
Port: 21 (FTP) or 22 (SFTP)
```

Upload to: `/domains/parenta.com.mx/public_html`

#### Option C: Via Git (if available)

Some Hostinger plans support Git deployment:
1. In hPanel, go to **"Advanced" → "Git"**
2. Connect your repository
3. Set branch and auto-deploy

### Step 5: Configure Environment Variables

In hPanel Node.js Manager:
1. Click your application
2. Go to **"Environment Variables"**
3. Add:

```
DATABASE_URL=postgresql://parenta_user:password@localhost:5432/parenta_db
NEXTAUTH_URL=https://parenta.com.mx
NEXTAUTH_SECRET=CMgu1S5/GQqa6PXJQBTiSaAD3gaTOzYbtIbV5MZcLKM=
NODE_ENV=production
PORT=3030
```

### Step 6: Install Dependencies and Start

1. In hPanel Node.js Manager
2. Click **"Run npm install"**
3. Wait for dependencies to install
4. Click **"Start Application"**

---

## 🔧 Alternative: Create Custom Server File

Since Next.js standalone mode works best, create a custom server:

Create `server.js` in your project root:

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = process.env.PORT || 3030;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

Update `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3030",
    "build": "next build",
    "start": "node server.js",
    "lint": "next lint"
  }
}
```

---

## 📦 Build Application for Upload

Before uploading, build your app:

```bash
# In your local machine
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

# Build Next.js
npm run build

# Create deployment package
mkdir -p deploy-package
cp -r .next deploy-package/
cp -r public deploy-package/
cp -r src deploy-package/
cp package.json deploy-package/
cp package-lock.json deploy-package/
cp next.config.ts deploy-package/
cp tsconfig.json deploy-package/
cp server.js deploy-package/

# Create zip for upload
cd deploy-package
zip -r ../parenta-deployment.zip .
cd ..
```

Upload `parenta-deployment.zip` via hPanel File Manager and extract it.

---

## 🗄️ Database Setup

### If PostgreSQL is Available:

1. Create database via hPanel
2. Get connection string
3. SSH into server and initialize:

```bash
# Connect via SSH
sshpass -p 'Theanswer001!!!' ssh -p 65002 u876334876@145.79.25.103

# If psql is available
psql -h localhost -U parenta_user -d parenta_db -f ~/domains/parenta.com.mx/public_html/src/lib/schema.sql
```

### If Only MySQL is Available:

You'll need to convert the PostgreSQL schema to MySQL:
1. Use a conversion tool
2. Or use a cloud PostgreSQL service (Supabase, Heroku)

---

## ☁️ Recommended Alternative: Use Cloud Database

Since shared hosting has limitations, use a cloud database:

### Option 1: Supabase (Recommended)

1. Go to: https://supabase.com
2. Create free account
3. Create new project
4. Get PostgreSQL connection string
5. Run your schema.sql via Supabase SQL Editor
6. Use the connection string in your app

### Option 2: Railway

1. Go to: https://railway.app
2. Create free account
3. Create PostgreSQL database
4. Get connection string
5. Use in your application

### Option 3: ElephantSQL

Free PostgreSQL hosting:
1. Go to: https://www.elephantsql.com
2. Create free "Tiny Turtle" plan
3. Get connection URL
4. Use in your app

---

## 🎯 Best Recommendation for Your App

Given that your app is a **full Next.js application with PostgreSQL**, I recommend:

### **Option A: Deploy to Vercel (Easiest)**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

**Benefits:**
- ✅ Perfect for Next.js
- ✅ Automatic builds and deploys
- ✅ Free SSL
- ✅ Global CDN
- ✅ Easy database connection (use Supabase)
- ✅ Custom domain support

**Time:** 5 minutes

### **Option B: Get Hostinger VPS**

If you want to stick with Hostinger:
1. Upgrade to Hostinger VPS plan
2. Get full root access
3. Use our original deployment scripts
4. Full control over server

**Cost:** ~$4-8/month for VPS

### **Option C: Hybrid Approach**

- **App:** Deploy to Vercel (free)
- **Database:** Supabase (free tier)
- **Domain:** Point parenta.com.mx to Vercel

**Total Cost:** Free (with limits)

---

## 🚀 Quick Deploy to Vercel (Recommended)

Let me help you deploy to Vercel instead:

### Step 1: Prepare for Vercel

```bash
# Make sure build works
npm run build

# Commit your code
git add .
git commit -m "Prepare for Vercel deployment"
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel
```

### Step 3: Setup Database

Use Supabase:
1. Create account at https://supabase.com
2. Create new project
3. Go to SQL Editor
4. Paste your schema.sql content
5. Get connection string from Settings → Database
6. Add to Vercel environment variables

### Step 4: Configure Environment Variables in Vercel

1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
```
DATABASE_URL=your-supabase-connection-string
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=CMgu1S5/GQqa6PXJQBTiSaAD3gaTOzYbtIbV5MZcLKM=
NODE_ENV=production
```

5. Redeploy: `vercel --prod`

### Step 5: Add Custom Domain

1. In Vercel dashboard → Settings → Domains
2. Add: parenta.com.mx
3. Follow DNS instructions to point domain to Vercel
4. SSL automatically configured

---

## 📊 Comparison

| Option | Complexity | Cost | Control | Best For |
|--------|-----------|------|---------|----------|
| **Hostinger Shared** | High | Low | Low | Static sites |
| **Hostinger VPS** | Medium | Medium | High | Full stack apps |
| **Vercel + Supabase** | Low | Free/Low | Medium | Next.js apps |
| **DigitalOcean** | High | Medium | High | Custom setups |

---

## 💡 My Recommendation

For your Parenta Property Management System, I **strongly recommend Vercel + Supabase**:

**Why:**
- ✅ Built for Next.js (Vercel created Next.js)
- ✅ 5-minute setup vs. hours of configuration
- ✅ Automatic SSL, CDN, and optimization
- ✅ Free tier is generous
- ✅ Professional reliability
- ✅ Easy updates (git push = deploy)
- ✅ No server maintenance needed

**Hostinger shared hosting is designed for:**
- WordPress sites
- Static HTML sites
- PHP applications
- Not ideal for full-stack Next.js apps

---

## 🎯 Next Steps

**Choose your path:**

### Path 1: Deploy to Vercel (Recommended - 15 min)
→ Follow "Quick Deploy to Vercel" section above

### Path 2: Upgrade to Hostinger VPS ($4-8/month)
→ Get VPS plan, then use original deployment scripts

### Path 3: Try Hostinger Shared Hosting (Complex)
→ Follow "Deployment Steps for Shared Hosting" above

**What would you like to do?**

---

## 📞 Support

If you want to proceed with Vercel, I can help you:
1. Deploy to Vercel
2. Setup Supabase database
3. Configure custom domain
4. Test everything

If you want Hostinger VPS instead:
1. Upgrade to VPS plan
2. Use our original deployment scripts
3. Full control deployment

Let me know which path you'd like to take! 🚀

