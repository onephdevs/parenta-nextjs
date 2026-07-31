# Image Upload Debugging Guide

## How to Debug Upload Failures

### Step 1: Check Browser Console
When an upload fails, check the browser console (F12 → Console tab) for detailed logs:

```javascript
// Look for these log messages:
🔍 Validating file: { name, type, size }
✅ File validation passed
// OR
❌ Validation failed - [reason]

// During upload:
Uploading file: { fileName, fileType, fileSize, entityType, entityId }
Upload response: { success, data/error }

// If failed:
Upload error for file: [filename] Error: [details]
```

### Step 2: Check Network Tab
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Try uploading again
4. Look for `POST /api/images` request
5. Check the response:
   - **Status Code**: 200 (success), 400 (validation error), 401 (unauthorized), 500 (server error)
   - **Response Body**: Contains error details

### Step 3: Common Upload Failure Reasons

#### 1. **File Type Issues**
**Symptom**: Black preview, "File type not supported" error
**Cause**: Browser sends empty MIME type or file is corrupted
**Solution**: 
- Try different image file
- Ensure file has correct extension (.jpg, .png, .gif, .webp)
- Check if file is corrupted

#### 2. **File Size Too Large**
**Symptom**: "File size exceeds 5MB limit"
**Solution**: Compress or resize image before upload

#### 3. **Authentication Issues**
**Symptom**: "Unauthorized" error
**Cause**: User session expired or not admin
**Solution**: 
- Refresh page and login again
- Verify user has admin role

#### 4. **Entity Not Found**
**Symptom**: "Entity type and ID are required" or "Invalid entity type"
**Cause**: Building/Room/Asset ID is missing or invalid
**Solution**: Verify the entity exists in database

#### 5. **Server/File System Issues**
**Symptom**: Generic "Failed to upload image" error
**Cause**: Server can't write to uploads directory
**Solution**: 
- Check server logs
- Verify uploads directory exists and has write permissions
- Check disk space

### Step 4: Test with Known Good Image

Try uploading a test image:
1. Use a small JPEG file (< 1MB)
2. Ensure it has .jpg or .jpeg extension
3. Verify it opens normally in image viewer
4. Try uploading to test the flow

### Step 5: Check Server Logs

If running locally, check terminal where `npm run dev` is running:
```bash
# Look for:
[next-auth][warn][DEBUG_ENABLED]
POST /api/images - Should appear when upload starts

# Error logs:
Error uploading image: [detailed error message]
```

### Step 6: Verify Environment

Check that required environment variables are set:
```bash
# Database connection
DATABASE_URL="postgresql://..."

# Next Auth (for authentication)
NEXTAUTH_URL="http://localhost:3030"
NEXTAUTH_SECRET="..."
```

## Quick Test Script

To test if uploads are working, try this in browser console on the building/room detail page:

```javascript
// Create a test file
const canvas = document.createElement('canvas');
canvas.width = 100;
canvas.height = 100;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'blue';
ctx.fillRect(0, 0, 100, 100);

canvas.toBlob(async (blob) => {
  const formData = new FormData();
  formData.append('file', blob, 'test.png');
  formData.append('entityType', 'building'); // or 'room', 'asset'
  formData.append('entityId', 'YOUR_ENTITY_ID_HERE'); // Get from URL
  formData.append('imageType', 'photo');
  
  const response = await fetch('/api/images', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  console.log('Upload result:', result);
}, 'image/png');
```

## Expected Console Output (Success)

```
🔍 Validating file: {
  name: "test-image.jpg",
  type: "image/jpeg",
  size: 245678,
  sizeInMB: "0.23MB"
}
✅ File validation passed
Processing file: { name: "test-image.jpg", type: "image/jpeg", size: 245678 }
Created UploadFile: { 
  id: "abc123", 
  name: "test-image.jpg", 
  type: "image/jpeg", 
  size: 245678,
  hasPreview: true,
  error: undefined 
}
Uploading file: {
  fileName: "test-image.jpg",
  fileType: "image/jpeg",
  fileSize: 245678,
  entityType: "building",
  entityId: "b0ca378b-66b9-4909-9f18-e89fe0a24700"
}
Upload response: {
  success: true,
  data: { id: "...", fileName: "...", filePath: "..." }
}
Upload results: [{ id: "...", fileName: "..." }]
Success count: 1, Error count: 0
```

## Expected Console Output (Failure)

```
🔍 Validating file: {
  name: "test.pdf",
  type: "application/pdf",
  size: 12345
}
❌ Validation failed - unsupported type: File type not supported...
```

OR

```
Uploading file: { ... }
Upload error for file: test-image.jpg Error: Upload failed with status: 401 Unauthorized
Upload results: [null]
Success count: 0, Error count: 1
All uploads failed: {
  files: "test-image.jpg",
  errors: ["Upload failed with status: 401 Unauthorized"]
}
```

## Improved Error Notifications

With the latest changes, users now see:
- ✅ Specific error reasons in notifications
- ✅ Red border around failed images
- ✅ Error icon overlay on preview
- ✅ Detailed error message box below thumbnail
- ✅ Auto-removal of failed files after 5 seconds

## Still Having Issues?

1. **Check all console logs** - The detailed logs will show exactly where it's failing
2. **Check network tab** - See the actual API request/response
3. **Try different file** - Rule out file corruption issues
4. **Check authentication** - Ensure you're logged in as admin
5. **Restart dev server** - Sometimes helps with module caching issues

