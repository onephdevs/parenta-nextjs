# ⚡ Enable Node.js in hPanel - Do This FIRST!

## 🎯 You Must Do This Before Deploying

Your app files will upload successfully, but **won't run** until you enable Node.js in hPanel.

---

## 📋 Step-by-Step Instructions

### 1. Login to hPanel

Go to: **https://hpanel.hostinger.com/**

Login with your credentials

### 2. Select Your Website

Click on: **parenta.com.mx**

### 3. Open Node.js Manager

In the left sidebar or top menu:
- Click: **Advanced** → **Node.js**

(Or look for "Node.js" or "Node.js Manager" in the menu)

### 4. Create Node.js Application

Click the button: **"Create Application"** or **"+ New Application"**

### 5. Fill in the Form

```
Application Root:          domains/parenta.com.mx/nodejs-app
Application URL:           https://parenta.com.mx
                          (or https://www.parenta.com.mx)
Application Startup File:  server.js
Node.js Version:           18.x or 20.x (select the highest available)
Application Mode:          Production
```

Click **"Create"** or **"Save"**

### 6. Add Environment Variables

Still in the Node.js Manager, find your application and click on it.

Look for **"Environment Variables"** section.

Add each of these:

```bash
Variable Name: DATABASE_URL
Value: postgresql://postgres.lttvkueyiptqzhubaydg:Theanswer001!!!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

Variable Name: NEXTAUTH_URL
Value: https://parenta.com.mx

Variable Name: NEXTAUTH_SECRET
Value: CMgu1S5/GQqa6PXJQBTiSaAD3gaTOzYbtIbV5MZcLKM=

Variable Name: NODE_ENV
Value: production

Variable Name: PORT
Value: 3030
```

Click **"Save"** or **"Add"** after each one.

### 7. Verify Settings

Double-check:
- ✅ Application Root: `domains/parenta.com.mx/nodejs-app`
- ✅ Startup File: `server.js`
- ✅ Node.js Version: 18 or 20
- ✅ All 5 environment variables added
- ✅ Status shows as "Stopped" or "Not Started" (this is normal - no files yet)

---

## ✅ You're Ready!

Once you've completed these steps, you can run the deployment script:

```bash
./scripts/deploy-to-hostinger-shared.sh
```

---

## 📸 What It Looks Like

### Node.js Section
You should see something like:
```
[ Node.js Applications ]
  
  + Create Application

  OR (if already created):
  
  parenta.com.mx/nodejs-app
  Status: Stopped
  Node.js Version: 18.x
  [Restart] [Stop] [Edit] [Delete]
```

### Environment Variables
You should see:
```
Environment Variables (5)
  DATABASE_URL = postgresql://postgres.lttvkueyip...
  NEXTAUTH_URL = https://parenta.com.mx
  NEXTAUTH_SECRET = CMgu1S5/GQqa...
  NODE_ENV = production
  PORT = 3030
  
  [+ Add Variable]
```

---

## 🆘 Can't Find Node.js Option?

If you don't see "Node.js" in hPanel:

1. **Check your hosting plan**
   - Node.js requires Business or Premium hosting plan
   - Basic/Single plans don't support Node.js

2. **Contact Hostinger Support**
   - Live chat in hPanel
   - Ask: "How do I enable Node.js for my domain?"
   - They can help or upgrade your plan

3. **Alternative: Use Vercel**
   - If Node.js not available, deploy to Vercel instead
   - Free and perfect for Next.js apps
   - Takes 5 minutes

---

## ✅ Checklist

Before proceeding to deployment:

- [ ] Logged into hPanel
- [ ] Selected parenta.com.mx
- [ ] Opened Node.js Manager
- [ ] Created Node.js application
- [ ] Set Application Root to `domains/parenta.com.mx/nodejs-app`
- [ ] Set Startup File to `server.js`
- [ ] Selected Node.js 18+
- [ ] Added DATABASE_URL environment variable
- [ ] Added NEXTAUTH_URL environment variable
- [ ] Added NEXTAUTH_SECRET environment variable
- [ ] Added NODE_ENV environment variable
- [ ] Added PORT environment variable
- [ ] Saved all settings

---

## 🚀 Next Step

After completing this:

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs
./scripts/deploy-to-hostinger-shared.sh
```

The script will:
1. Build your app
2. Upload all files
3. Install dependencies
4. Set everything up

Then you just:
1. Go back to hPanel → Node.js
2. Click "Restart"
3. Open https://parenta.com.mx

**You're almost there!** 🎉

