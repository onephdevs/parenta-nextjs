# 🗑️ Vercel Cache Clearing Guide

**Date:** November 22, 2025  
**Purpose:** Clear Vercel's cache to force fresh deployment with latest code changes

---

## ✅ QUICK COMMANDS

### **1. Force Deploy (Clears Build Cache)**
```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs
vercel --prod --force
```

**What this does:**
- ✅ Bypasses Vercel's build cache
- ✅ Rebuilds everything from scratch
- ✅ Uploads fresh build to CDN
- ✅ Clears edge cache automatically

---

### **2. Clear Deployment Cache via Vercel Dashboard**

**Steps:**
1. Go to https://vercel.com/estopaceadrians-projects/parenta-nextjs
2. Click "Settings" tab
3. Scroll to "Data Cache"
4. Click "Purge Cache" or "Clear All Cache"
5. Redeploy: `vercel --prod`

---

### **3. Clear Specific Route Cache (via API)**

If you only need to clear cache for specific routes (like image uploads):

```bash
# Clear all cache
curl -X PURGE https://parenta-nextjs-bh0cbg5po-estopaceadrians-projects.vercel.app/*

# Clear specific route cache
curl -X PURGE https://parenta-nextjs-bh0cbg5po-estopaceadrians-projects.vercel.app/api/images/*
```

---

## 🎯 WHEN TO CLEAR VERCEL CACHE

### **Always Clear Cache When:**
- ✅ Fixing image upload/display issues
- ✅ Updating API routes
- ✅ Changing static assets
- ✅ Fixing CSS/styling issues
- ✅ Updating Next.js configuration
- ✅ Users report seeing old content

### **Probably Don't Need to Clear When:**
- ❌ Only changing database data (not code)
- ❌ Updating environment variables (just redeploy)
- ❌ Minor text changes in components

---

## 📊 TYPES OF CACHE IN VERCEL

### **1. Build Cache**
- **What:** Cached dependencies and build artifacts
- **Clear with:** `vercel --prod --force`
- **When:** After package updates or build config changes

### **2. CDN/Edge Cache**
- **What:** Static files, images, API responses at edge locations
- **Clear with:** Automatic on new deployment
- **When:** After fixing image/asset issues

### **3. Data Cache**
- **What:** ISR (Incremental Static Regeneration) cached pages
- **Clear with:** Dashboard or redeploy
- **When:** After changing page generation logic

---

## 🔄 DEPLOYMENT WORKFLOW WITH CACHE CLEARING

### **Standard Deployment:**
```bash
# 1. Build locally
npm run build

# 2. Commit changes
git add -A
git commit -m "fix: your message"
git push origin main

# 3. Deploy to Vercel
vercel --prod
```

### **Force Deployment (Clear Cache):**
```bash
# 1. Build locally
npm run build

# 2. Commit changes
git add -A
git commit -m "fix: your message"
git push origin main

# 3. Force deploy with cache clear
vercel --prod --force
```

---

## 🚨 TROUBLESHOOTING CACHE ISSUES

### **Problem: Users Still See Old Content**

**Solution 1: Force Deploy**
```bash
vercel --prod --force
```

**Solution 2: Add Cache-Control Headers**
```typescript
// In API routes or pages
export const revalidate = 0; // Disable caching for this route

// Or in API response:
return new Response(data, {
  headers: {
    'Cache-Control': 'no-store, max-age=0'
  }
});
```

**Solution 3: Invalidate Client Browser Cache**
- Change asset filenames
- Add version query params: `image.jpg?v=2`
- Use `Date.now()` for dynamic assets

---

### **Problem: Images Still Showing Black After Deploy**

**Root Causes:**
1. Vercel edge cache has old image files
2. Client browser cache
3. Image serving API needs cache headers

**Fix:**
```bash
# 1. Force redeploy
vercel --prod --force

# 2. Update image serving API with cache headers
# (see src/app/api/images/serve/[...path]/route.ts)

# 3. Tell users to hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## 📝 CACHE CONFIGURATION

### **Next.js Cache Settings:**

**In `next.config.js`:**
```javascript
module.exports = {
  // Disable caching in development
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, immutable'
              : 'no-store, must-revalidate'
          }
        ]
      }
    ];
  }
};
```

### **API Route Cache Headers:**

**For static content (images, PDFs):**
```typescript
return new NextResponse(fileBuffer, {
  headers: {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
  },
});
```

**For dynamic content (API data):**
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'no-store, max-age=0',
  },
});
```

---

## 🔍 VERIFY CACHE CLEARED

### **Check Deployment:**
```bash
# Get latest deployment URL
vercel ls

# Check deployment status
vercel inspect [deployment-url]
```

### **Test in Browser:**
1. **Open DevTools** (F12)
2. **Network tab**
3. **Disable cache** (checkbox)
4. **Hard refresh** (Cmd+Shift+R)
5. **Check response headers:**
   - Look for `X-Vercel-Cache: MISS` (cache cleared)
   - Or `X-Vercel-Cache: HIT` (cached)

---

## 🎯 BEST PRACTICES

### **1. Version Your Assets**
```typescript
const version = Date.now();
const imageUrl = `/api/images/serve/${path}?v=${version}`;
```

### **2. Use Proper Cache Headers**
- Static assets: Long cache (1 year)
- Dynamic API: No cache or short TTL
- Pages: Use ISR with revalidation

### **3. Test Before Deploying**
```bash
# Always test locally first
npm run build
npm run start

# Then deploy
vercel --prod
```

### **4. Monitor Cache Performance**
- Check Vercel Analytics
- Monitor cache hit rates
- Watch for cache-related bugs

---

## 📞 COMMON COMMANDS REFERENCE

```bash
# Force deploy (clear build cache)
vercel --prod --force

# List deployments
vercel ls

# Inspect specific deployment
vercel inspect [deployment-url]

# Check deployment logs
vercel logs [deployment-url]

# Redeploy latest (without code changes)
vercel --prod

# Deploy to preview
vercel

# Pull environment variables
vercel env pull .env.production

# Link project
vercel link
```

---

## ✅ VERIFICATION CHECKLIST

After clearing cache and redeploying:

- [ ] Force deployed with `vercel --prod --force`
- [ ] Deployment succeeded without errors
- [ ] Visited production URL in incognito window
- [ ] Hard refreshed browser (Cmd+Shift+R)
- [ ] Tested image upload functionality
- [ ] Images display correctly (not black)
- [ ] Toast notifications appear properly
- [ ] All forms submit correctly
- [ ] No console errors in DevTools
- [ ] Network tab shows 200 status for API calls

---

## 🎉 CURRENT STATUS

**Latest Deployment:**
- ✅ Cache cleared with `--force` flag
- ✅ Fresh build deployed
- ✅ All fixes included:
  - Image upload fixes
  - Black image preview fix
  - Toast notifications
  - Dashboard building count fix
  - Form submission fixes

**Production URL:**
https://parenta-nextjs-bh0cbg5po-estopaceadrians-projects.vercel.app

**Next Steps:**
1. Visit production URL
2. Hard refresh browser (Cmd+Shift+R)
3. Test image upload
4. Should see "Upload complete" instead of "Upload failed"
5. Images should display correctly

---

**Cache cleared successfully! All users will now get the latest version.** 🚀

