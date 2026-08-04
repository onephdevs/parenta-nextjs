# 🚀 Deploy Parenta Now - Follow These Steps

## ✅ What's Already Done

- ✅ `.env.production` created with Supabase connection
- ✅ Supabase database connected and verified
- ✅ All 25 database tables loaded (including maintenance)
- ✅ Deployment script ready
- ✅ SSH access verified

**You're 95% ready to deploy!**

---

## 🎯 What You Need to Do Now

### Step 1: Enable Node.js in hPanel (5 minutes)

**Open this file and follow instructions:**
```
ENABLE-NODEJS-HPANEL.md
```

**Quick summary:**
1. Go to https://hpanel.hostinger.com/
2. Click parenta.com.mx
3. Advanced → Node.js → Create Application
4. Set Application Root: `domains/parenta.com.mx/nodejs-app`
5. Set Startup File: `server.js`
6. Add all 5 environment variables (DATABASE_URL, NEXTAUTH_URL, etc.)

**This is ONE-TIME setup. You won't need to do this again.**

---

### Step 2: Run Deployment Script (5 minutes)

After Step 1 is complete, run:

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

./scripts/deploy-to-hostinger-shared.sh
```

**What this does:**
- ✅ Builds your Next.js app
- ✅ Creates deployment package
- ✅ Uploads to Hostinger via SCP (like your stagecards script!)
- ✅ Extracts files on server
- ✅ Installs dependencies
- ✅ All automatic!

**You'll be prompted for password:** `(set SSH_PASS in scripts/.deploy-secrets)`

---

### Step 3: Restart Application in hPanel (1 minute)

After deployment completes:

1. Go back to **hPanel** → **Node.js**
2. Find your **parenta.com.mx** application
3. Click **"Restart"** button
4. Wait 20-30 seconds

---

### Step 4: Test Your Application! (1 minute)

Open: **https://parenta.com.mx**

You should see your Parenta landing page! 🎉

Create admin account at: **https://parenta.com.mx/auth/signup**

---

## 📊 Summary

```
Time breakdown:
├── Step 1: Enable Node.js in hPanel    → 5 minutes (one-time)
├── Step 2: Run deployment script       → 5 minutes
├── Step 3: Restart in hPanel           → 1 minute
└── Step 4: Test application            → 1 minute
                                          ___________
                                          12 minutes total
```

---

## 🔄 Future Deployments

After the first deployment, future updates are even easier:

```bash
# Make your changes to the code

# Run deployment
./scripts/deploy-to-hostinger-shared.sh

# Restart in hPanel
# (go to hPanel → Node.js → Restart)

# Done!
```

**Just like your stagecards deployment!**

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `ENABLE-NODEJS-HPANEL.md` | **Step 1:** hPanel setup instructions |
| `scripts/deploy-to-hostinger-shared.sh` | **Step 2:** Deployment script |
| `DEPLOY-STEPS.md` | **This file:** Overview |
| `DEPLOY-NOW.md` | Quick reference guide |
| `HOSTINGER-SHARED-DEPLOY-GUIDE.md` | Complete documentation |

---

## ✅ Pre-Flight Check

Before starting deployment:

- [x] Supabase database ready
- [x] All database tables loaded
- [x] `.env.production` created
- [x] Deployment script ready
- [x] SSH access working
- [ ] **Node.js enabled in hPanel** ← DO THIS NOW
- [ ] Environment variables added in hPanel
- [ ] Ready to deploy!

---

## 🚀 Ready to Start?

1. **Open:** `ENABLE-NODEJS-HPANEL.md`
2. **Follow:** Step-by-step instructions
3. **Then run:** `./scripts/deploy-to-hostinger-shared.sh`
4. **Finally:** Restart in hPanel and test!

---

## 🆘 Need Help?

### If Node.js option not in hPanel
- Check your hosting plan (needs Business/Premium)
- Contact Hostinger support
- Or use Vercel (free alternative)

### If deployment fails
- Check the error message
- Verify hPanel Node.js is configured
- Verify environment variables are set
- Try again - script is safe to re-run

### If app won't start
- Check hPanel → Node.js → View Logs
- Verify DATABASE_URL is correct
- Click "Restart" in hPanel
- Wait 30 seconds and try again

---

## 💡 Tips

**First Time Deploying?**
- Follow `ENABLE-NODEJS-HPANEL.md` carefully
- Double-check all environment variables
- Be patient - first deployment takes a few minutes

**Already Have Node.js Enabled?**
- Just run `./scripts/deploy-to-hostinger-shared.sh`
- Then restart in hPanel
- That's it!

---

**Let's deploy Parenta to Hostinger! 🎉**

Start with: `ENABLE-NODEJS-HPANEL.md`

