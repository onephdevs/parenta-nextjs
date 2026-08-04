# Deploy Parenta to Vercel (RECOMMENDED)

## Why Vercel?

✅ **Built for Next.js** - Created by the Next.js team  
✅ **Zero configuration** - Works out of the box  
✅ **Auto-deploy on push** - Commit → Push → Deployed  
✅ **Never goes down** - No more 502 errors  
✅ **Free tier** - Perfect for this project size  
✅ **Global CDN** - Fast worldwide  
✅ **Automatic SSL** - HTTPS configured automatically  
✅ **Private repo support** - Works with `onephdevs/parenta-nextjs`  

---

## Step-by-Step Deployment

### 1. Sign Up for Vercel

1. Go to **[vercel.com](https://vercel.com)**
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### 2. Grant Organization Access

When Vercel asks for permissions:
1. **Grant access to `onephdevs` organization**
   - GitHub will prompt: "Vercel would like permission to access onephdevs"
   - Click **"Grant"** or **"Authorize"**
2. Select the repositories Vercel can access:
   - Choose **"Only select repositories"** → Select `parenta-nextjs`
   - OR choose **"All repositories"** if you want to deploy other projects later

### 3. Import Your Project

1. In Vercel dashboard, click **"Add New Project"**
2. You'll see repositories from `onephdevs` organization
3. Find **`onephdevs/parenta-nextjs`**
4. Click **"Import"**

### 4. Configure Project Settings

Vercel will auto-detect Next.js. Keep these defaults:
- **Framework Preset:** Next.js
- **Root Directory:** `./` (default)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

### 5. Add Environment Variables

Click **"Environment Variables"** and add these (copy-paste):

```bash
DATABASE_URL
postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true

DIRECT_URL
postgresql://USER:PASSWORD@HOST:5432/postgres

NEXTAUTH_SECRET
YOUR_NEXTAUTH_SECRET

NEXTAUTH_URL
https://parenta.com.mx

NODE_ENV
production
```

**Important:** For `NEXTAUTH_URL`, initially use the Vercel URL (like `https://parenta-nextjs.vercel.app`), then update it after adding your custom domain.

### 6. Deploy!

1. Click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Build your Next.js app
   - Deploy to global CDN
   - Give you a live URL (e.g., `parenta-nextjs.vercel.app`)
3. **Wait ~2-3 minutes** for the first deployment

### 7. Test Your Deployment

Once deployed:
1. Click the deployment URL (e.g., `parenta-nextjs.vercel.app`)
2. Test the application:
   - ✅ Homepage loads
   - ✅ Login works
   - ✅ Database connection works
   - ✅ All features functional

---

## Connect Custom Domain (parenta.com.mx)

### In Vercel:
1. Go to your project → **"Settings"** → **"Domains"**
2. Add domain: `parenta.com.mx`
3. Vercel will show DNS records you need to add

### In Hostinger (Domain DNS):
1. Log in to Hostinger
2. Go to **Domains** → **parenta.com.mx** → **DNS/Name Servers**
3. Add the records Vercel provides (usually):
   - **Type:** A Record
   - **Name:** @ (or leave blank)
   - **Value:** `76.76.21.21` (Vercel's IP)
   
   **AND**
   
   - **Type:** CNAME
   - **Name:** www
   - **Value:** `cname.vercel-dns.com`

4. Save changes
5. Wait 5-60 minutes for DNS propagation

### Update NEXTAUTH_URL:
1. In Vercel → **"Settings"** → **"Environment Variables"**
2. Edit `NEXTAUTH_URL` → Change to `https://parenta.com.mx`
3. Click **"Save"**
4. Vercel will automatically redeploy

---

## Your New Workflow (Post-Vercel)

### Before (Hostinger):
```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push

# Manual deployment
./scripts/deploy-with-manual-nodejs.sh

# Hope it doesn't randomly stop 🙏
# Check if it's still running...
# Restart if needed...
```

### After (Vercel):
```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push

# ✨ DONE! ✨
# Auto-deploys in 2-3 minutes
# Never needs restarts
# Never goes down
```

---

## Automatic Deployments

Every time you push to GitHub:
- **Production branch (main):** Auto-deploys to `parenta.com.mx`
- **Other branches:** Creates preview deployments with unique URLs
- **Pull Requests:** Automatic preview deployments for testing

---

## Monitoring & Logs

### View Real-Time Logs:
1. Go to Vercel dashboard
2. Click your project
3. Click **"Deployments"**
4. Click any deployment → **"Logs"**

### Rollback to Previous Version:
1. Go to **"Deployments"**
2. Find the working deployment
3. Click **"⋯"** → **"Promote to Production"**
4. Done in 5 seconds!

---

## What About Hostinger?

Once Vercel is running:
1. **Keep Hostinger for the domain only** (DNS management)
2. **Stop the PM2 process** on Hostinger:
   ```bash
   ssh -p 65002 u876334876@145.79.25.103
   pm2 stop parenta-app
   pm2 delete parenta-app
   ```
3. **Optional:** Cancel the hosting plan (keep domain registration)

---

## Cost Comparison

| Feature | Hostinger (Current) | Vercel (Free Tier) |
|---------|--------------------|--------------------|
| **Cost** | ~$5-10/month | **$0/month** |
| **Uptime** | ❌ Random 502 errors | ✅ 99.99% uptime |
| **Auto-deploy** | ❌ Manual script | ✅ On git push |
| **Auto-restart** | ❌ Must manually restart | ✅ Never needed |
| **SSL** | ✅ Included | ✅ Automatic |
| **Global CDN** | ❌ Single server | ✅ Worldwide |
| **Build time** | ~5-10 minutes | ~2-3 minutes |
| **Monitoring** | ❌ Manual PM2 logs | ✅ Real-time dashboard |

---

## Troubleshooting

### "Can't find onephdevs/parenta-nextjs"
- Go to Vercel → Account Settings → Git Integrations
- Click GitHub → Configure GitHub App
- Grant access to `onephdevs` organization

### "Build Failed"
- Check Vercel logs for specific error
- Verify environment variables are set correctly
- Check that your local build works: `npm run build`

### "Database Connection Error"
- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check Supabase is accessible (not paused/deleted)
- Ensure `ssl: { rejectUnauthorized: false }` is in your DB config

### "NEXTAUTH Error"
- Verify `NEXTAUTH_URL` matches your domain
- Ensure `NEXTAUTH_SECRET` is set
- Check that NextAuth callbacks are configured correctly

---

## Support & Resources

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Next.js on Vercel:** [vercel.com/docs/frameworks/nextjs](https://vercel.com/docs/frameworks/nextjs)
- **Custom Domains:** [vercel.com/docs/custom-domains](https://vercel.com/docs/custom-domains)

---

## Next Steps

1. ✅ Sign up for Vercel
2. ✅ Import `onephdevs/parenta-nextjs`
3. ✅ Add environment variables
4. ✅ Deploy!
5. ✅ Test the Vercel URL
6. ✅ Add custom domain `parenta.com.mx`
7. ✅ Update DNS in Hostinger
8. ✅ Update `NEXTAUTH_URL` to production domain
9. ✅ Stop Hostinger PM2 process
10. ✅ Celebrate! 🎉 No more 502 errors!

---

**Ready to deploy?** Follow the steps above and you'll have a production-ready app in less than 10 minutes!

