# Vercel Blob Storage Setup

## ✅ What Changed

We've migrated from **filesystem storage** to **Vercel Blob Storage** for image uploads.

### Why?
- ❌ Vercel has a **read-only filesystem** (serverless functions)
- ❌ Images uploaded locally don't work on Vercel
- ✅ Vercel Blob provides **persistent cloud storage**
- ✅ Works seamlessly with Vercel deployments

---

## 🔧 What Was Updated

### 1. Package Installed
```bash
npm install @vercel/blob
```

### 2. Files Modified

**`src/lib/api/images.ts`**
- ✅ Updated `saveUploadedImage()` to use `put()` from Vercel Blob
- ✅ Updated `deleteImage()` to use `del()` from Vercel Blob
- ✅ Images now stored as blob URLs instead of file paths

**`src/components/features/ImageGallery.tsx`**
- ✅ Updated `getImageUrl()` to handle blob URLs
- ✅ Backward compatible with old filesystem images

---

## 🚀 How It Works

### Upload Flow (New):
1. User selects image
2. Frontend validates image (size, type)
3. **POST /api/images** with FormData
4. Backend calls `put()` to upload to Vercel Blob
5. Vercel Blob returns public URL: `https://xxx.public.blob.vercel-storage.com/...`
6. URL saved to database in `images.file_path` column
7. Image displayed directly from blob URL

### Upload Flow (Old - Local Only):
1. Image saved to `public/uploads/images/`
2. Relative path stored: `uploads/images/building/xxx.jpg`
3. Served via `/api/images/serve/...`
4. **Doesn't work on Vercel** (read-only filesystem)

---

## 🔐 Environment Variables

### Automatic on Vercel
When you deploy to Vercel with `@vercel/blob` installed:
- ✅ `BLOB_READ_WRITE_TOKEN` is **automatically provided**
- ✅ No manual configuration needed
- ✅ Works immediately after deployment

### Local Development
For local testing with Vercel Blob (optional):

1. Go to Vercel Dashboard → Storage
2. Create a Blob Store if not exists
3. Copy the token
4. Add to `.env.local`:
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
   ```

**Note:** Local development will continue to use filesystem storage unless you add the token.

---

## 📊 Data Migration

### Existing Images
- ✅ Old filesystem images still work (backward compatible)
- ✅ Displayed via `/api/images/serve/...` endpoint
- ℹ️ New uploads go to Vercel Blob

### Database Schema
No migration needed! The `images.file_path` column now stores:
- **Old format**: `uploads/images/building/xxx.jpg`
- **New format**: `https://xxx.public.blob.vercel-storage.com/...`

The code handles both formats automatically.

---

## 🧪 Testing

### After Deployment:

1. **Upload a new image:**
   - Go to any building detail page
   - Click "Add Photos"
   - Upload an image
   - Should work without errors ✅

2. **View uploaded images:**
   - Image should display correctly
   - Inspect network tab: should load from blob URL
   - URL format: `https://xxx.public.blob.vercel-storage.com/...`

3. **Delete an image:**
   - Click delete icon
   - Image should be removed from Blob storage
   - Should disappear from gallery ✅

---

## 🔍 Troubleshooting

### Upload fails with 403 error
**Cause:** BLOB_READ_WRITE_TOKEN not set
**Solution:** Redeploy - Vercel auto-configures this

### Images still show black boxes
**Cause:** These are old locally-uploaded images that don't exist on Vercel
**Solution:** Delete them and upload new ones

### Old images (404 errors)
**Cause:** Filesystem images from local don't exist on Vercel
**Solution:** Normal - only new uploads will work

---

## 💰 Pricing

### Vercel Blob Storage:
- **Free tier:** 1GB storage, 10GB bandwidth/month
- **Pro tier:** Included storage varies by plan
- **Pay-as-you-go:** $0.15/GB storage, $0.30/GB bandwidth

For a property management app with moderate image usage:
- ~100 images/month × 500KB avg = 50MB/month
- Well within free tier ✅

---

## 📝 Summary

| Feature | Before (Filesystem) | After (Vercel Blob) |
|---------|---------------------|---------------------|
| **Storage** | `public/uploads/` | Vercel Blob Cloud |
| **URL Format** | Relative path | Full blob URL |
| **Works on Vercel** | ❌ No | ✅ Yes |
| **Persistent** | Local only | ✅ Cloud |
| **Setup Required** | None | Auto on Vercel |
| **Cost** | Free | Free tier available |

---

## ✅ Deployment Checklist

- [x] Install `@vercel/blob` package
- [x] Update `saveUploadedImage()` function
- [x] Update `deleteImage()` function
- [x] Update `ImageGallery` component
- [x] Commit changes
- [ ] Deploy to Vercel
- [ ] Test image upload
- [ ] Verify images display correctly
- [ ] Test image deletion

---

**Status:** ✅ Ready for deployment

**Next:** Deploy to Vercel and test!

