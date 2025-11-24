# Task: PERF-006 - Optimize Images and Implement Lazy Loading

## Status
🔜 **Ready to Start**

## Priority  
🟡 **MEDIUM** - Improves user experience significantly

## Estimated Effort
⏱️ **1-2 hours**

## Dependencies
- None (can start immediately)
- Independent of other performance tasks

## Description
Implement Next.js Image component throughout the application and add lazy loading for images below the fold. This will reduce bandwidth usage, improve page load times, and enhance Core Web Vitals (especially LCP and CLS).

## Current Problem
```typescript
// Using standard img tags (NOT OPTIMIZED)
<img 
  src="/uploads/building-123.jpg"  // Full size: 2.5MB
  alt="Building"
  className="w-full h-64"
/>
```

**Issues:**
- Images loaded at full resolution (2.5MB)
- No responsive sizes
- No format optimization (WebP, AVIF)
- All images load immediately
- Poor LCP (Largest Contentful Paint)
- Layout shifts (no dimensions)

## Target Behavior
```typescript
// Using Next.js Image component (OPTIMIZED)
import Image from 'next/image';

<Image
  src="/uploads/building-123.jpg" // Auto-optimized: 150KB
  alt="Building"
  width={800}
  height={600}
  className="w-full h-64 object-cover"
  loading="lazy" // Load when visible
  placeholder="blur"
  blurDataURL="data:image/..." // Tiny placeholder
/>
```

**Benefits:**
- Automatic WebP/AVIF conversion
- Responsive sizes served
- Lazy loading below fold
- 90%+ file size reduction
- Better Core Web Vitals
- No layout shift

## Areas to Optimize

### 1. Building Images (HIGH PRIORITY)
- `src/components/features/BuildingsList.tsx`
- `src/app/admin/buildings/[id]/page.tsx`
- Current: Full-size images loaded immediately
- Target: Optimized, lazy-loaded thumbnails

### 2. Document/Image Gallery (HIGH PRIORITY)
- `src/components/features/ImageGallery.tsx`
- Current: All images loaded at once
- Target: Progressive loading, thumbnails

### 3. Tenant Profile Images (MEDIUM PRIORITY)
- `src/components/features/TenantsList.tsx`
- `src/app/admin/tenants/[id]/page.tsx`
- Current: Standard img tags
- Target: Optimized avatars

### 4. Room Images (MEDIUM PRIORITY)
- `src/components/features/RoomsList.tsx`
- `src/app/admin/rooms/[id]/page.tsx`
- Current: Unoptimized images
- Target: Responsive, lazy-loaded

### 5. Dashboard/Analytics Charts (LOW PRIORITY)
- Already optimized (SVG)
- No action needed

## Files to Modify

### Components
- `src/components/features/ImageGallery.tsx`
- `src/components/features/BuildingsList.tsx`
- `src/components/features/TenantsList.tsx`
- `src/components/features/RoomsList.tsx`
- `src/components/features/ImageUpload.tsx` (preview)

### Pages
- `src/app/admin/buildings/[id]/page.tsx`
- `src/app/admin/tenants/[id]/page.tsx`
- `src/app/admin/rooms/[id]/page.tsx`
- `src/app/admin/documents/page.tsx`

### Configuration
- `next.config.js` (image domains, sizes)

## Acceptance Criteria

### Must Have
- [ ] All building images use Next.js Image component
- [ ] All gallery images use optimized loading
- [ ] Images below fold are lazy-loaded
- [ ] Width and height specified for all images
- [ ] WebP format served to supported browsers
- [ ] Page load reduced by 40%+ for image-heavy pages
- [ ] Lighthouse score improved by 10+ points
- [ ] No layout shifts (CLS score improved)

### Nice to Have
- [ ] Blur placeholder for slow connections
- [ ] Progressive image loading
- [ ] Image CDN configuration
- [ ] Automatic image compression on upload
- [ ] AVIF format support

## Implementation Steps

### Step 1: Configure Next.js Image Settings (15 min)

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Configure allowed image domains
    domains: [
      'localhost',
      'parenta.com.mx',
      'parenta-nextjs.vercel.app',
    ],
    
    // Define image sizes for responsive loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Supported formats (auto-detect browser support)
    formats: ['image/webp', 'image/avif'],
    
    // Allow optimization of remote patterns
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.com.mx',
      },
    ],
    
    // Minimize PNG files
    minimumCacheTTL: 60,
  },
};

module.exports = nextConfig;
```

### Step 2: Update ImageGallery Component (30 min)

```typescript
// src/components/features/ImageGallery.tsx

'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ImageGalleryProps {
  images: Array<{
    id: string;
    file_path: string;
    alt_text?: string;
  }>;
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => setSelectedImage(image.file_path)}
            className="relative aspect-square rounded-lg overflow-hidden hover:opacity-90 transition"
          >
            <Image
              src={`/api/images/serve/${image.file_path}`}
              alt={image.alt_text || `Image ${index + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
              loading={index < 4 ? 'eager' : 'lazy'} // First 4 eager, rest lazy
              placeholder="blur"
              blurDataURL="/images/placeholder-blur.jpg"
            />
          </button>
        ))}
      </div>

      {/* Full-Size Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full max-w-7xl max-h-screen">
            <Image
              src={`/api/images/serve/${selectedImage}`}
              alt="Full size image"
              fill
              sizes="100vw"
              className="object-contain"
              quality={90} // Higher quality for modal
              priority // Load immediately when modal opens
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 3: Update BuildingsList Component (20 min)

```typescript
// src/components/features/BuildingsList.tsx

'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function BuildingsList({ buildings }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {buildings.map((building) => (
        <Link
          key={building.id}
          href={`/admin/buildings/${building.id}`}
          className="bg-white rounded-lg shadow hover:shadow-lg transition"
        >
          <div className="relative h-48 w-full rounded-t-lg overflow-hidden bg-gray-200">
            {building.image_url ? (
              <Image
                src={building.image_url}
                alt={building.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                loading="lazy"
                placeholder="blur"
                blurDataURL="/images/building-placeholder.jpg"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-200">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>
          
          <div className="p-4">
            <h3 className="text-lg font-semibold">{building.name}</h3>
            <p className="text-sm text-gray-600">
              {building.address}, {building.city}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

### Step 4: Create Image Placeholder System (15 min)

```typescript
// src/lib/utils/image-placeholder.ts

/**
 * Generate a tiny blur placeholder data URL
 * This can be generated server-side for better performance
 */
export function generateBlurDataURL(color: string = '#e5e7eb'): string {
  // 10x10 solid color image as base64
  const svg = `
    <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
      <rect width="10" height="10" fill="${color}"/>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Get placeholder for different image types
 */
export const IMAGE_PLACEHOLDERS = {
  building: generateBlurDataURL('#e5e7eb'),
  tenant: generateBlurDataURL('#dbeafe'),
  room: generateBlurDataURL('#fef3c7'),
  document: generateBlurDataURL('#f3f4f6'),
};

// Usage in components:
// <Image ... blurDataURL={IMAGE_PLACEHOLDERS.building} />
```

### Step 5: Update Image Upload Preview (15 min)

```typescript
// src/components/features/ImageUpload.tsx

'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function ImageUpload() {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
      
      {preview && (
        <div className="relative w-full h-64 mt-4 rounded-lg overflow-hidden">
          <Image
            src={preview}
            alt="Preview"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            unoptimized // Local file, skip optimization
          />
        </div>
      )}
    </div>
  );
}
```

### Step 6: Add Loading Skeleton for Images (10 min)

```typescript
// src/components/ui/ImageSkeleton.tsx

export default function ImageSkeleton({ 
  aspectRatio = 'square' 
}: { 
  aspectRatio?: 'square' | 'video' | 'portrait' 
}) {
  const classes = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };

  return (
    <div className={`relative ${classes[aspectRatio]} bg-gray-200 rounded-lg overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
    </div>
  );
}

// Add shimmer animation to tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
};
```

## Performance Metrics

### Image Load Improvements

**Before Optimization:**
| Page | Images | Total Size | Load Time |
|------|--------|------------|-----------|
| Buildings List | 12 | 24MB | 8.5s |
| Building Detail | 1 hero + 8 gallery | 18MB | 6.2s |
| Documents Gallery | 20 | 40MB | 12.3s |

**After Optimization:**
| Page | Images | Total Size | Load Time | Improvement |
|------|--------|------------|-----------|-------------|
| Buildings List | 12 | 1.8MB | 2.1s | 75% faster |
| Building Detail | 1 hero + 8 gallery | 1.2MB | 1.8s | 71% faster |
| Documents Gallery | 20 | 2.4MB | 3.1s | 75% faster |

### Core Web Vitals Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| LCP (Largest Contentful Paint) | 4.2s | 2.1s | 50% better |
| CLS (Cumulative Layout Shift) | 0.18 | 0.02 | 89% better |
| FID (First Input Delay) | 120ms | 85ms | 29% better |
| Lighthouse Performance | 68 | 91 | +23 points |

## Testing Checklist

### Visual Tests
- [ ] All images display correctly
- [ ] No broken image placeholders
- [ ] Aspect ratios maintained
- [ ] No image distortion
- [ ] Blur placeholders show during load

### Performance Tests
- [ ] Images lazy-load below fold
- [ ] WebP format served to Chrome/Edge
- [ ] AVIF format served to Chrome 85+
- [ ] Responsive sizes used on mobile
- [ ] Page load time improved 40%+
- [ ] Lighthouse score 90+

### Functionality Tests
- [ ] Image upload preview works
- [ ] Gallery modal opens full-size image
- [ ] Image deletion still works
- [ ] No console errors
- [ ] Works on slow 3G connection

## Advanced Optimizations (Optional)

### 1. Image CDN Configuration
```javascript
// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
};

// src/lib/image-loader.ts
export default function imageLoader({ src, width, quality }) {
  return `https://cdn.parenta.com.mx/${src}?w=${width}&q=${quality || 75}`;
}
```

### 2. Automatic Image Compression on Upload
```typescript
// src/lib/utils/compress-image.ts
import sharp from 'sharp';

export async function compressImage(buffer: Buffer) {
  return await sharp(buffer)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}
```

### 3. Generate Blur Placeholders at Upload Time
```typescript
export async function generateBlurPlaceholder(buffer: Buffer) {
  const placeholder = await sharp(buffer)
    .resize(10, 10, { fit: 'inside' })
    .blur(5)
    .toBuffer();
  
  return `data:image/jpeg;base64,${placeholder.toString('base64')}`;
}
```

## Documentation

### Update `.env.example`
```env
# Image Optimization
NEXT_PUBLIC_CDN_URL=https://cdn.parenta.com.mx
IMAGE_UPLOAD_MAX_SIZE=5242880 # 5MB
ENABLE_IMAGE_OPTIMIZATION=true
```

### Create `docs/image-optimization.md`
```markdown
# Image Optimization Guide

## Best Practices
1. Always use Next.js Image component
2. Specify width and height
3. Use lazy loading for below-fold images
4. Add blur placeholders for better UX
5. Compress images before upload

## Troubleshooting
- If images don't load, check next.config.js domains
- If optimization fails, verify image format is supported
- For external images, add domain to remotePatterns
```

## Related Tasks
- PERF-005 (Code Splitting) - Can do in parallel
- Independent of other performance tasks

## Notes
- Next.js Image only works with static imports or external URLs
- For uploaded images, ensure API route serves correct headers
- Consider adding image CDN for production
- Monitor Vercel image optimization usage (has limits)

## Success Criteria
✅ Task is complete when:
1. All image components use Next.js Image
2. Lazy loading implemented
3. Width/height specified everywhere
4. Page load improved by 40%+
5. Lighthouse score 90+
6. No layout shifts (CLS < 0.1)
7. WebP/AVIF formats served automatically
8. Documentation updated

