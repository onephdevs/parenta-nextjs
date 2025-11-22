# ⚠️ IMPORTANT: Set Environment Variables on Vercel

## The Issue
Your upload is failing with **400 error** because **environment variables are not set on Vercel**.

Vercel doesn't automatically copy your `.env.local` file. You MUST add them manually.

---

## ✅ STEP 1: Test Environment Variables

**Visit this URL to check:**
https://parenta-nextjs-dgyngezgu-estopaceadrians-projects.vercel.app/api/test-env

**You should see:**
```json
{
  "hasDatabaseUrl": false,  // ❌ THIS IS THE PROBLEM
  "hasNextAuthUrl": false,  // ❌ THIS IS THE PROBLEM
  "hasNextAuthSecret": false, // ❌ THIS IS THE PROBLEM
  "nodeEnv": "production"
}
```

If any of these are `false`, that's why uploads are failing!

---

## ✅ STEP 2: Add Environment Variables on Vercel

### Go to Vercel Dashboard:
https://vercel.com/estopaceadrians-projects/parenta-nextjs/settings/environment-variables

### Add These Variables:

1. **DATABASE_URL**
   - Copy from your `.env.local` file
   - Should look like: `postgresql://user:password@host:port/database`

2. **NEXTAUTH_URL**
   - Value: `https://parenta-nextjs-dgyngezgu-estopaceadrians-projects.vercel.app`
   - (or your custom domain if you have one)

3. **NEXTAUTH_SECRET**
   - Copy from your `.env.local` file
   - This is a random secret string

### How to Add:

1. Click **"Add Variable"** button
2. **Name**: `DATABASE_URL`
3. **Value**: (paste your database URL)
4. **Environment**: Check ✅ Production
5. Click **"Save"**
6. Repeat for `NEXTAUTH_URL` and `NEXTAUTH_SECRET`

---

## ✅ STEP 3: Redeploy

After adding environment variables:

```bash
npx vercel --prod --force
```

Or go to Vercel dashboard → Click "Redeploy"

---

## ✅ STEP 4: Verify

Visit the test endpoint again:
https://parenta-nextjs-dgyngezgu-estopaceadrians-projects.vercel.app/api/test-env

**Should now show:**
```json
{
  "hasDatabaseUrl": true,  // ✅ 
  "hasNextAuthUrl": true,  // ✅
  "hasNextAuthSecret": true, // ✅
  "nodeEnv": "production"
}
```

---

## ✅ STEP 5: Test Upload

1. Go to a building page
2. Click "Add Photos"
3. Upload an image
4. Should work now! 🎉

---

## What We Fixed in Code

✅ Increased Vercel function timeout to 30 seconds  
✅ Increased function memory to 1024MB  
✅ Configured Next.js body size limit to 10MB  
✅ Added route segment config for /api/images  
✅ Added test endpoint to check environment variables  

**But you still need to add environment variables manually on Vercel!**

---

## Quick Links

- **Vercel Project**: https://vercel.com/estopaceadrians-projects/parenta-nextjs
- **Environment Variables**: https://vercel.com/estopaceadrians-projects/parenta-nextjs/settings/environment-variables
- **Test Endpoint**: https://parenta-nextjs-dgyngezgu-estopaceadrians-projects.vercel.app/api/test-env
- **Production URL**: https://parenta-nextjs-dgyngezgu-estopaceadrians-projects.vercel.app

---

## Troubleshooting

### If uploads still fail after adding env vars:

1. **Check the test endpoint** - make sure all values are `true`
2. **Check browser console** - look for specific error messages
3. **Check Vercel logs** - Go to deployment → Functions → /api/images
4. **Try different image** - ensure it's < 5MB and valid format

### Need More Help?

Check these files:
- `VERCEL-UPLOAD-FIX.md` - Complete troubleshooting guide
- `IMAGE-UPLOAD-DEBUG-GUIDE.md` - Debug steps for uploads

---

**TL;DR:** Add DATABASE_URL, NEXTAUTH_URL, and NEXTAUTH_SECRET to Vercel environment variables, then redeploy.

