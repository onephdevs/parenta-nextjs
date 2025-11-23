# 🔧 Fixing Next.js Build Cache Errors

## Problem

When you see errors like:
```
Cannot find module './vendor-chunks/@babel.js'
Cannot find module './vendor-chunks/jose.js'
Cannot find module './vendor-chunks/next.js'
```

This means your Next.js build cache is corrupted. This commonly happens during development when:
- Making rapid code changes
- Hot reloading fails
- Build cache gets out of sync

## Quick Fix

### Method 1: Using npm script (Recommended)
```bash
npm run clean
# Then restart dev server
npm run dev
```

### Method 2: Using cleanup script
```bash
./scripts/clear-cache.sh
# Then restart dev server
npm run dev
```

### Method 3: Manual cleanup
```bash
rm -rf .next
npm run dev
```

## When to Clear Cache

Clear the cache when you see:
- ❌ Module resolution errors
- ❌ "Cannot find module" errors
- ❌ Build cache corruption warnings
- ❌ Strange behavior after code changes
- ❌ Hot reload not working properly

## Prevention Tips

1. **Don't interrupt builds** - Let Next.js finish compiling before making more changes
2. **Restart dev server** - If you see cache errors, restart instead of continuing
3. **Clear cache regularly** - If you're making many changes, clear cache periodically
4. **Use npm scripts** - Use `npm run clean` instead of manual deletion

## Available Commands

```bash
# Clear .next cache only
npm run clean

# Clear all caches (.next + node_modules/.cache)
npm run clear-cache

# Or use the script
./scripts/clear-cache.sh
```

## After Clearing Cache

1. Stop your dev server (Ctrl+C)
2. Run `npm run clean` or `./scripts/clear-cache.sh`
3. Start dev server again: `npm run dev`
4. Wait for initial compilation to complete

---

**Note:** Clearing cache will force a full rebuild, which may take longer on first load, but it will fix the module resolution errors.

