#!/bin/bash

# Clear Next.js build cache
# Run this when you see module resolution errors or build cache issues

echo "🧹 Clearing Next.js build cache..."

# Remove .next directory
if [ -d ".next" ]; then
  rm -rf .next
  echo "✅ Cleared .next directory"
else
  echo "ℹ️  .next directory doesn't exist"
fi

# Clear node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "✅ Cleared node_modules/.cache"
fi

# Clear any webpack cache
if [ -d ".next/cache" ]; then
  rm -rf .next/cache
  echo "✅ Cleared .next/cache"
fi

echo ""
echo "✨ Cache cleared! Restart your dev server with: npm run dev"
echo ""

