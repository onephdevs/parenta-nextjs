# Vercel Upload 400 Error Fix

## Problem
Image upload works locally but fails on Vercel production with:
```
Failed to load resource: the server responded with a status of 400 ()
Upload error for file: bz.jpg Error: Upload failed with status: 400
```

## Root Causes

### 1. Missing Environment Variables (Most Likely)
Vercel doesn't automatically copy your `.env.local` file. You need to set environment variables in Vercel dashboard.

### 2. Vercel Body Size Limit
Default limit is 4.5MB for serverless functions, but we're uploading 5MB max files.

### 3. Missing Write Permissions
Vercel's filesystem is read-only except for `/tmp` directory.

## Solutions

### ✅ SOLUTION 1: Set Environment Variables on Vercel

**Required Environment Variables:**
```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-production-url.vercel.app
NEXTAUTH_SECRET=your-secret-key
```

**How to Add:**

1. **Go to Vercel Dashboard:**
   - https://vercel.com/estopaceadrians-projects/parenta-nextjs

2. **Click "Settings" tab**

3. **Click "Environment Variables" in left sidebar**

4. **Add each variable:**
   - Click "Add New"
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
   - Environment: Production (and Preview if needed)
   - Click "Save"

5. **Repeat for:**
   - `NEXTAUTH_URL` = `https://parenta-nextjs-hiho8tijo-estopaceadrians-projects.vercel.app`
   - `NEXTAUTH_SECRET` = (your secret key from .env.local)

6. **Redeploy:**
   ```bash
   npx vercel --prod --force
   ```

### ✅ SOLUTION 2: Increase Vercel Body Size Limit

Create `vercel.json` in project root:

```json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "api": {
    "bodyParser": {
      "sizeLimit": "10mb"
    }
  }
}
```

This increases:
- Body size limit to 10MB
- Function timeout to 30 seconds
- Memory allocation to 1024MB

### ✅ SOLUTION 3: Fix File Upload Path for Vercel

The `/tmp` directory is the only writable directory on Vercel.

Update `src/lib/api/images.ts` to use `/tmp` for uploads:

```typescript
// In saveUploadedImage function
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images', entityType, entityId);

// Change to:
const isProduction = process.env.NODE_ENV === 'production';
const uploadDir = isProduction
  ? path.join('/tmp', 'uploads', 'images', entityType, entityId)
  : path.join(process.cwd(), 'public', 'uploads', 'images', entityType, entityId);
```

**However**, `/tmp` is ephemeral on Vercel! Files are deleted after function execution.

**Better Solution: Use Cloud Storage**
- Vercel Blob Storage
- AWS S3
- Cloudinary
- Uploadthing

## Quick Debug Steps

### Step 1: Check Server Logs on Vercel

1. Go to: https://vercel.com/estopaceadrians-projects/parenta-nextjs
2. Click "Deployments"
3. Click latest deployment
4. Click "Functions" tab
5. Look for `/api/images` function
6. Check logs for actual error message

### Step 2: Test Environment Variables

Add a test endpoint to check if env vars are set:

```typescript
// src/app/api/test-env/route.ts
export async function GET() {
  return Response.json({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nodeEnv: process.env.NODE_ENV,
  });
}
```

Visit: `https://your-app.vercel.app/api/test-env`

Should return:
```json
{
  "hasDatabaseUrl": true,
  "hasNextAuthUrl": true,
  "hasNextAuthSecret": true,
  "nodeEnv": "production"
}
```

### Step 3: Get Detailed Error from API

Update the frontend to log the full error response:

```typescript
// In ImageUpload.tsx uploadFile function
const response = await fetch('/api/images', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log('Full API response:', result); // Log full response

if (!response.ok) {
  throw new Error(`Upload failed: ${result.error || result.details || response.statusText}`);
}
```

## Most Likely Fix

Based on the 400 error, the most likely issue is **missing environment variables**.

### Quick Fix:

1. **Check if DATABASE_URL is set on Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Verify `DATABASE_URL` exists and is correct

2. **If missing, add it:**
   - Copy from your `.env.local`
   - Add to Vercel
   - Redeploy

3. **Redeploy with force:**
   ```bash
   npx vercel --prod --force
   ```

## Temporary Workaround (Not Recommended)

If you need a quick fix while setting up cloud storage:

1. Store images as base64 in database (not recommended for production)
2. Use a free tier of Cloudinary or Uploadthing
3. Enable Vercel Blob Storage

## Recommended Long-Term Solution

For production, use cloud storage:

### Option 1: Vercel Blob (Easiest)
```bash
npm install @vercel/blob
```

### Option 2: Cloudinary (Free tier)
```bash
npm install cloudinary
```

### Option 3: AWS S3
```bash
npm install @aws-sdk/client-s3
```

## Next Steps

1. ✅ Check Vercel environment variables
2. ✅ Add missing variables
3. ✅ Redeploy
4. ✅ Test upload again
5. ⏳ Consider migrating to cloud storage for production

