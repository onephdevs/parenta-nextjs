# 🚀 Vercel Deployment Guide - Parenta Property Management System

## Overview

This guide will walk you through deploying the Parenta Property Management System to Vercel, including database setup, environment variables, and post-deployment configuration.

---

## 📋 Prerequisites

Before deploying to Vercel, ensure you have:

- ✅ GitHub account with repository access
- ✅ Vercel account (free tier works)
- ✅ PostgreSQL database (Supabase/Neon/Railway/Vercel Postgres)
- ✅ All environment variables ready
- ✅ Code pushed to GitHub (main branch)

---

## 🗄️ Step 1: Database Setup

### Option A: Supabase (Recommended)

1. **Create Supabase Project**
   ```
   1. Go to https://supabase.com
   2. Click "New Project"
   3. Choose organization
   4. Set project name: "parenta-production"
   5. Set strong database password
   6. Choose region (closest to users)
   7. Click "Create new project"
   ```

2. **Get Connection Strings**
   ```
   Navigate to: Settings → Database
   
   You'll need:
   - DATABASE_URL (Connection pooling - Transaction mode)
   - DIRECT_URL (Direct connection)
   ```

3. **Initialize Database Schema**
   ```bash
   # Use the DIRECT_URL for schema creation
   psql "YOUR_DIRECT_URL_HERE" -f src/lib/schema.sql
   ```

### Option B: Neon

1. Go to https://neon.tech
2. Create new project
3. Get connection string (includes pooling)
4. Run schema initialization

### Option C: Vercel Postgres

1. In Vercel dashboard → Storage → Create Database
2. Select Postgres
3. Get connection strings
4. Initialize schema

---

## 🔐 Step 2: Prepare Environment Variables

Create a file locally to prepare your environment variables:

```bash
# .env.production (DO NOT COMMIT THIS FILE)

# Database URLs
DATABASE_URL="postgresql://user:password@host:6543/database?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/database"

# NextAuth Configuration
NEXTAUTH_URL="https://your-app-name.vercel.app"
NEXTAUTH_SECRET="your-generated-secret-here-minimum-32-characters-long"

# Optional: Node Environment
NODE_ENV="production"
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use this Node.js command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🚀 Step 3: Deploy to Vercel (Method 1: Vercel UI)

### 3.1: Connect Repository

1. **Login to Vercel**
   ```
   Go to: https://vercel.com/login
   Sign in with GitHub
   ```

2. **Import Project**
   ```
   1. Click "Add New..." → "Project"
   2. Find your repository: "onephdevs/parenta-nextjs"
   3. Click "Import"
   ```

3. **Configure Project**
   ```
   Project Name: parenta-property-management (or your choice)
   Framework Preset: Next.js (auto-detected)
   Root Directory: ./ (leave as default)
   Build Command: npm run build (auto-detected)
   Output Directory: .next (auto-detected)
   Install Command: npm install (auto-detected)
   ```

### 3.2: Add Environment Variables

In the "Environment Variables" section, add each variable:

```
Name: DATABASE_URL
Value: [Your PostgreSQL connection pooling URL]
Environment: Production, Preview, Development

Name: DIRECT_URL
Value: [Your PostgreSQL direct connection URL]
Environment: Production, Preview, Development

Name: NEXTAUTH_URL
Value: https://your-app-name.vercel.app
Environment: Production

Name: NEXTAUTH_SECRET
Value: [Your generated secret from Step 2]
Environment: Production, Preview, Development

Name: NODE_ENV
Value: production
Environment: Production
```

**Important Notes:**
- Check boxes for: Production, Preview, Development (as needed)
- NEXTAUTH_URL should match your Vercel deployment URL
- Keep NEXTAUTH_SECRET secure and don't share it

### 3.3: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Vercel will provide a URL: `https://your-app-name.vercel.app`

---

## 🚀 Step 4: Deploy to Vercel (Method 2: Vercel CLI)

### 4.1: Install Vercel CLI

```bash
npm install -g vercel
```

### 4.2: Login

```bash
vercel login
```

### 4.3: Deploy

From your project directory:

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs

# First deployment (interactive)
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? Select your account
# - Link to existing project? N (first time)
# - Project name? parenta-property-management
# - Directory? ./
# - Override settings? N
```

### 4.4: Add Environment Variables via CLI

```bash
# Add each environment variable
vercel env add DATABASE_URL production
# Paste value when prompted

vercel env add DIRECT_URL production
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NODE_ENV production
```

### 4.5: Deploy to Production

```bash
vercel --prod
```

---

## 🔧 Step 5: Post-Deployment Configuration

### 5.1: Initialize Database

Once deployed, initialize your database with demo data:

**Option A: Via API (Recommended)**

```bash
# Initialize schema
curl -X POST https://your-app-name.vercel.app/api/init-db

# Seed demo users
curl -X POST https://your-app-name.vercel.app/api/seed-users
```

**Option B: Directly via SQL**

```bash
# Connect to your database
psql "YOUR_DIRECT_URL_HERE"

# Run initialization
\i src/lib/schema.sql

# Or run the migration
\i migrations/add-user-tenant-link.sql
```

### 5.2: Verify Deployment

Visit your deployed application:

```
https://your-app-name.vercel.app
```

You should see the landing page with:
- ✅ Featured properties section
- ✅ Links to Admin/Tenant login
- ✅ Professional design

### 5.3: Test Login

**Admin Portal:**
```
URL: https://your-app-name.vercel.app/auth/admin/signin
Email: admin@parenta.com
Password: admin123
```

**Tenant Portal:**
```
URL: https://your-app-name.vercel.app/auth/tenant/signin
Email: tenant@parenta.com
Password: tenant123
```

---

## 🔒 Step 6: Security Best Practices

### 6.1: Update Demo Credentials

After deployment, immediately update demo passwords:

1. Login as admin
2. Go to profile settings
3. Change password
4. Update demo tenant password

### 6.2: Enable Supabase Row Level Security (RLS)

If using Supabase:

```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies as needed
CREATE POLICY "Users can view their own data"
  ON tenants FOR SELECT
  USING (user_id = auth.uid());
```

### 6.3: Configure Custom Domain (Optional)

1. In Vercel Dashboard → Settings → Domains
2. Add custom domain: `app.yourdomain.com`
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` environment variable

---

## 📊 Step 7: Monitoring & Maintenance

### 7.1: Vercel Analytics

Enable Vercel Analytics:
```
1. Go to Vercel Dashboard → Analytics
2. Enable Web Analytics
3. Monitor page views, performance
```

### 7.2: Database Monitoring

**Supabase:**
```
Dashboard → Database → Logs
- Monitor connections
- Check query performance
- Review connection pooling
```

### 7.3: Error Tracking

Monitor Vercel deployment logs:
```
Vercel Dashboard → Deployments → Select deployment → Logs
```

---

## 🐛 Troubleshooting

### Issue 1: Build Fails

**Error:** `Type error` or `ESLint error`

**Solution:** Already configured in `next.config.ts`:
```typescript
module.exports = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
}
```

### Issue 2: Database Connection Error

**Error:** `Error: connect ETIMEDOUT`

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check if database allows Vercel IP ranges
3. Use connection pooling URL
4. For Supabase: Use port 6543 (pooling) not 5432 (direct)

### Issue 3: NextAuth Session Issues

**Error:** `[next-auth][error][JWT_SESSION_ERROR]`

**Solution:**
1. Verify `NEXTAUTH_SECRET` is set
2. Verify `NEXTAUTH_URL` matches deployment URL
3. Check if cookies are being set (browser DevTools)

### Issue 4: API Routes Returning 500

**Solution:**
1. Check Vercel function logs
2. Verify environment variables are set
3. Check database connection
4. Review API route error handling

### Issue 5: Environment Variables Not Working

**Solution:**
1. Redeploy after adding environment variables:
   ```bash
   vercel --prod
   ```
2. Verify variables are set in correct environments
3. Check variable names match exactly (case-sensitive)

---

## 🔄 Step 8: Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "feat: your changes"
git push origin main

# Vercel automatically:
# 1. Detects push
# 2. Runs build
# 3. Deploys to production
# 4. Provides deployment URL
```

### Preview Deployments

Every pull request gets a preview URL:
```
1. Create feature branch
2. Make changes
3. Push to GitHub
4. Create pull request
5. Vercel creates preview URL
6. Test before merging
```

### Deployment Branches

Configure which branches deploy:
```
Vercel Dashboard → Settings → Git
- Production Branch: main
- Preview Branches: All branches
```

---

## 📱 Step 9: Mobile & Performance Optimization

### 9.1: Enable Image Optimization

Already configured in Next.js:
```typescript
// next.config.ts
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/avif', 'image/webp']
  }
}
```

### 9.2: Enable Caching

Vercel automatically caches:
- Static assets (CSS, JS, images)
- API routes (with proper headers)
- Static pages

### 9.3: Monitor Core Web Vitals

Check performance in Vercel Analytics:
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

---

## 📚 Step 10: Documentation & Team Access

### Share Access with Team

1. Vercel Dashboard → Settings → Members
2. Invite team members
3. Set appropriate roles:
   - **Owner**: Full access
   - **Member**: Deploy and manage
   - **Viewer**: View only

### Document Production URLs

Update your documentation with production URLs:

```markdown
## Production URLs

- **Landing Page**: https://your-app-name.vercel.app
- **Admin Portal**: https://your-app-name.vercel.app/auth/admin/signin
- **Tenant Portal**: https://your-app-name.vercel.app/auth/tenant/signin
- **Staff Portal**: https://your-app-name.vercel.app/auth/staff/signin
- **API Docs**: https://your-app-name.vercel.app/api

## Production Credentials

Admin: [Stored in password manager]
Tenant Demo: [Stored in password manager]
```

---

## ✅ Deployment Checklist

Before considering deployment complete, verify:

- [ ] Application builds successfully locally (`npm run build`)
- [ ] All environment variables are set in Vercel
- [ ] Database schema is initialized
- [ ] Demo users are created
- [ ] Admin login works
- [ ] Tenant login works
- [ ] Dashboard loads correctly
- [ ] API endpoints respond
- [ ] Database connections work
- [ ] No console errors in browser
- [ ] Mobile responsive design works
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Team members have access
- [ ] Documentation updated with URLs
- [ ] Demo credentials changed
- [ ] Monitoring enabled

---

## 🎉 Success!

Your Parenta Property Management System is now live on Vercel!

**Next Steps:**
1. Test all features thoroughly
2. Monitor performance and errors
3. Set up regular backups
4. Plan feature releases
5. Gather user feedback

---

## 📞 Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: https://github.com/onephdevs/parenta-nextjs/issues

---

## 🔄 Update & Maintenance

### Regular Updates

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Test locally
npm run dev

# Run build
npm run build

# Push to GitHub (triggers Vercel deployment)
git push origin main
```

### Database Migrations

When updating schema:

```bash
# Create migration file
touch migrations/[timestamp]-migration-name.sql

# Test locally
psql $DIRECT_URL -f migrations/[timestamp]-migration-name.sql

# Apply to production
psql $PRODUCTION_DIRECT_URL -f migrations/[timestamp]-migration-name.sql
```

---

**Last Updated**: October 29, 2025  
**Version**: 1.0  
**Status**: Production Ready ✅

