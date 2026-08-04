# 🚀 Deploy Parenta NOW - Your Complete Guide

## ✅ Everything is Ready!

- ✅ Supabase database connected (25 tables)
- ✅ `.env.production` configured
- ✅ SSH access verified
- ✅ SSH key ready for GitHub
- ✅ **TWO deployment methods** available
- ✅ All scripts tested and working

---

## 🎯 Choose Your Deployment Method

### ⚡ Method 1: SCP Upload (Quick Start - 10 min)
**Best for:** Getting live TODAY, no GitHub setup

```bash
./scripts/deploy-to-hostinger-shared.sh
```

**Time:** 10 minutes total  
**Setup:** None needed  
**See:** `DEPLOY-NOW.md`

---

### 🚀 Method 2: Git Auto (Professional - 15 min)
**Best for:** Regular updates, team work, faster deploys

```bash
./scripts/deploy-git-auto.sh
```

**Time:** 15 minutes total (5 min setup + 10 min deploy)  
**Setup:** Add SSH key to GitHub  
**See:** `GIT-DEPLOYMENT-SETUP.md`

---

## 📋 Quick Start: SCP Method (Recommended for First Time)

### Step 1: Enable Node.js in hPanel (5 min)

Go to: **https://hpanel.hostinger.com/**

1. Click **parenta.com.mx**
2. **Advanced** → **Node.js** → **Create Application**
3. Fill in:
   ```
   Application Root: domains/parenta.com.mx/nodejs-app
   Startup File: server.js
   Node.js Version: 18 or 20
   ```
4. Add environment variables (5 variables - see `ENABLE-NODEJS-HPANEL.md`)

**Full guide:** `ENABLE-NODEJS-HPANEL.md`

---

### Step 2: Deploy Application (5 min)

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

./scripts/deploy-to-hostinger-shared.sh
```

**Password when prompted:** `(set SSH_PASS in scripts/.deploy-secrets)`

Script will:
- Build app
- Upload files
- Extract and install
- All automatic!

---

### Step 3: Restart & Test (2 min)

1. Go to **hPanel** → **Node.js**
2. Click **"Restart"**
3. Wait 20 seconds
4. Open: **https://parenta.com.mx**

**🎉 You're live!**

---

## 🚀 Or: Git Auto Method (Better for Long-Term)

### Step 1: Add SSH Key to GitHub (2 min)

Your SSH key (already on server):
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDf6YAaBZYfP4DxlyhrqrJtXKrc4AaBZ8nKRwQiPQjRe3vMHeiSLuJsskn11ZKYkVgWWjgBDJ93VniwhBzAECDgHqNLbgFcFKUK+hnp2nUiS5w2SFh8MuDA8IPhfJwo2UUXFbU0ENb8Z5jASB3yaZhR0CoS806Ug/6oCmLV0pVM3XEI4Z9X9TjvJ5+G7rNRWQdwPYpp69JnkB30e0FObIJ6eJWq3RsKdmnNXtp7ysptWQVOAHzKln4DI3axs7XCwVF3S1l2F685lLrBaoe4WwR6yEb3Ib17mnOkWbwIA0f2e9lMX7+CdRyKifypOUiWjt9w9hrBPnbFCv/7AZQOaUg7HpQW/WV189mjIYxnYp1m016TLhHXlOIe6om4e0R2wL8myYZ2n2a8vy0vLtMw5z19caeCf7EdTqLIljhXbeAX2ITnnAxjPtHWO+OGT6X+wIrR302SPDUvx3ZADFX8xjDLtKbQwMPdfWnTlKMaQ3TQ9vnrdthPo37HeOjZ2F0Tk30= u876334876@my-kul-web2088.main-hosting.eu
```

1. Go to: **https://github.com/settings/keys**
2. Click **"New SSH key"**
3. Title: `Hostinger Server - parenta.com.mx`
4. Paste key above
5. Click **"Add SSH key"**

---

### Step 2: Push Code to GitHub (2 min)

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

# If not already a git repo
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub: https://github.com/new
# Then:
git remote add origin git@github.com:YOUR_USERNAME/parenta-nextjs.git
git push -u origin main
```

---

### Step 3: Update Deploy Script (1 min)

Edit: `scripts/deploy-git-auto.sh`

Line 17, change:
```bash
GIT_REPO="git@github.com:YOUR_USERNAME/parenta-nextjs.git"
```

To your actual GitHub URL.

---

### Step 4: Deploy! (5 min)

Enable Node.js in hPanel first (Step 1 from SCP method)

Then:
```bash
./scripts/deploy-git-auto.sh
```

Restart in hPanel and test!

**Full guide:** `GIT-DEPLOYMENT-SETUP.md`

---

## 📊 Which Method to Choose?

### Use SCP if:
- ✅ Want to deploy RIGHT NOW
- ✅ Don't have GitHub yet
- ✅ First time deployment
- ✅ Simplest option

### Use Git if:
- ✅ Have GitHub account
- ✅ Want faster updates (5x faster!)
- ✅ Will update regularly
- ✅ Want version control

### Can't Decide?
**Start with SCP today**, setup Git tomorrow!

**See:** `DEPLOYMENT-METHODS-COMPARISON.md`

---

## 📁 Documentation Files

| File | Purpose | When to Use |
|------|---------|-------------|
| **DEPLOY-PARENTA-NOW.md** | **This file** - Overview | Start here |
| **ENABLE-NODEJS-HPANEL.md** | hPanel setup | Before first deploy |
| **DEPLOY-NOW.md** | SCP method details | Using SCP |
| **GIT-DEPLOYMENT-SETUP.md** | Git method setup | Using Git |
| **DEPLOYMENT-METHODS-COMPARISON.md** | Compare both | Deciding which |
| **DEPLOY-STEPS.md** | Step-by-step walkthrough | Need guidance |

---

## 🎯 Recommended Path: Start Today!

### For Immediate Deploy (10 minutes):

```bash
# 1. Enable Node.js in hPanel (see ENABLE-NODEJS-HPANEL.md)

# 2. Deploy
./scripts/deploy-to-hostinger-shared.sh

# 3. Restart in hPanel

# 4. Test at https://parenta.com.mx

# Done! ✅
```

### Upgrade Tomorrow (5 minutes):

```bash
# 1. Add SSH key to GitHub

# 2. Push code to GitHub

# 3. Update deploy script

# 4. Use Git deploys
./scripts/deploy-git-auto.sh

# Future updates in 1 minute! 🚀
```

---

## ✅ Pre-Flight Checklist

Before deploying:

- [x] Supabase database ready
- [x] All tables loaded (25 tables)
- [x] `.env.production` created
- [x] SSH access working
- [x] Deployment scripts ready
- [ ] **Node.js enabled in hPanel** ← DO THIS
- [ ] Environment variables in hPanel
- [ ] Ready to deploy!

---

## 🚀 Deploy Commands

### SCP Method:
```bash
./scripts/deploy-to-hostinger-shared.sh
```

### Git Method:
```bash
./scripts/deploy-git-auto.sh
```

---

## 🆘 Need Help?

### hPanel Access:
- URL: https://hpanel.hostinger.com/
- Your domain: parenta.com.mx
- Node.js: Advanced → Node.js

### Deployment Issues:
- Check Node.js is enabled in hPanel
- Verify environment variables are set
- Try restarting application in hPanel

### Database Issues:
- Supabase is already connected ✅
- Connection string in `.env.production` ✅
- All tables loaded ✅

---

## 📊 Database Status

```
✅ Connected to Supabase
✅ 25 tables loaded:
   • Core: users, buildings, rooms, tenants
   • Financial: payments, invoices, expenses
   • Operations: maintenance, assets, utilities
   • Supporting: documents, notifications, audit_logs
   
✅ Production ready!
```

---

## 🎉 Ready to Deploy!

**Choose your method:**

### Quick Start (Today):
👉 **`./scripts/deploy-to-hostinger-shared.sh`**

### Professional Setup (Better):
👉 **See `GIT-DEPLOYMENT-SETUP.md`**

---

## 📞 Quick Reference

**Server:** u876334876@145.79.25.103:65002  
**Password:** (set SSH_PASS in scripts/.deploy-secrets)  
**App Path:** ~/domains/parenta.com.mx/nodejs-app  
**Live URL:** https://parenta.com.mx  
**hPanel:** https://hpanel.hostinger.com/  
**Database:** Supabase (connected ✅)  

---

**Let's deploy Parenta! Choose your method and let's go! 🚀**

**Questions?** Check the documentation files listed above.

**Ready now?** Run: `./scripts/deploy-to-hostinger-shared.sh`

