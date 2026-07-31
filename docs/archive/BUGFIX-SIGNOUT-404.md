# 🐛 Bug Fix: Sign Out 404 Error

**Date:** November 24, 2025  
**Issue:** Sign out button causing 404 error and NextAuth CLIENT_FETCH_ERROR

---

## ❌ PROBLEM

### **Error Symptoms:**
1. Clicking "Sign Out" showed 404 page
2. Console error: `[next-auth][error][CLIENT_FETCH_ERROR]`
3. Error message: `"Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"`
4. URL: `http://localhost:3030/auth/signout` returned 404

### **Root Cause:**
The Sign Out links were using direct `<Link href="/api/auth/signout">` instead of NextAuth's proper `signOut()` function. This caused NextAuth to try to fetch JSON but receive HTML (404 page) instead.

---

## ✅ SOLUTION

### **Changes Made:**

#### **1. Updated `AdminLayoutClient.tsx`**

**Before (Broken):**
```tsx
<Link
  href="/api/auth/signout"
  className="..."
>
  Sign Out
</Link>
```

**After (Fixed):**
```tsx
import { signOut } from 'next-auth/react';

<button
  onClick={() => signOut({ callbackUrl: '/auth/signin?role=admin' })}
  className="..."
>
  Sign Out
</button>
```

#### **2. Updated `AdminSidebar.tsx`**

**Before (Broken):**
```tsx
<Link
  href="/api/auth/signout"
  title="Sign out"
>
  <svg>...</svg>
</Link>
```

**After (Fixed):**
```tsx
import { signOut } from 'next-auth/react';

<button
  onClick={() => signOut({ callbackUrl: '/auth/signin?role=admin' })}
  title="Sign out"
>
  <svg>...</svg>
</button>
```

---

## 🎯 KEY IMPROVEMENTS

### **Before:**
- ❌ Direct link to `/api/auth/signout`
- ❌ NextAuth tried to fetch JSON, got HTML
- ❌ 404 error page
- ❌ Console errors
- ❌ Poor user experience

### **After:**
- ✅ Proper NextAuth `signOut()` function
- ✅ Handles authentication cleanup correctly
- ✅ Redirects to login page
- ✅ No console errors
- ✅ Clean logout flow

---

## 🔄 HOW IT WORKS NOW

### **Sign Out Flow:**

1. **User clicks Sign Out button**
   ↓
2. **`signOut()` function called**
   - Clears NextAuth session
   - Clears cookies
   - Cleans up authentication state
   ↓
3. **User redirected to login page**
   - URL: `/auth/signin?role=admin`
   - Ready to sign in again
   ↓
4. **Clean logout complete** ✅

---

## 🧪 TESTING

### **To Test:**
1. Navigate to `/admin` (dashboard)
2. Click "Sign Out" button (top right or sidebar)
3. Should redirect to `/auth/signin?role=admin`
4. No errors in console
5. Session cleared successfully

### **Expected Results:**
- ✅ Smooth redirect (no 404)
- ✅ No console errors
- ✅ Login page displays
- ✅ Can't access admin pages without login

---

## 📚 TECHNICAL DETAILS

### **NextAuth Sign Out Options:**

```typescript
signOut({
  callbackUrl: '/auth/signin?role=admin',  // Where to redirect
  redirect: true                           // Auto-redirect (default)
})
```

### **Alternative Configurations:**

```typescript
// Sign out without redirect
signOut({ redirect: false });

// Sign out to custom page
signOut({ callbackUrl: '/goodbye' });

// Sign out to home
signOut({ callbackUrl: '/' });
```

---

## 🎓 LESSONS LEARNED

### **Best Practices for NextAuth:**

1. **Always use NextAuth functions for auth operations**
   - `signIn()` for login
   - `signOut()` for logout
   - `useSession()` for session access

2. **Don't link directly to auth API routes**
   - ❌ `<Link href="/api/auth/signout">`
   - ✅ `<button onClick={() => signOut()}>`

3. **Provide callback URLs**
   - Improves user experience
   - Controls navigation flow
   - Prevents confusion

4. **Use buttons for actions, links for navigation**
   - Sign out = action → `<button>`
   - Go to page = navigation → `<Link>`

---

## 🔍 WHY THIS HAPPENED

### **Common Mistake:**
When implementing auth, it's tempting to use:
```tsx
<Link href="/api/auth/signout">Sign Out</Link>
```

This seems logical but:
- NextAuth expects client-side JavaScript calls
- Direct navigation triggers server-side route
- Server returns HTML redirect page
- Client expects JSON response
- Mismatch causes error

### **Correct Approach:**
```tsx
<button onClick={() => signOut()}>Sign Out</button>
```

This:
- Calls NextAuth client function
- Handles cleanup properly
- Manages cookies and session
- Redirects correctly

---

## 📝 FILES MODIFIED

1. **`src/components/layout/AdminLayoutClient.tsx`**
   - Added `signOut` import
   - Changed `<Link>` to `<button>`
   - Added `onClick` handler

2. **`src/components/layout/AdminSidebar.tsx`**
   - Added `signOut` import
   - Changed `<Link>` to `<button>`
   - Added `onClick` handler

---

## ✅ VERIFICATION CHECKLIST

After applying this fix:

- [x] No TypeScript errors
- [x] No linting errors
- [x] Sign out button visible
- [x] Sign out redirects properly
- [x] No console errors
- [x] Session cleared
- [x] Can't access admin pages after logout
- [x] Can log back in successfully

---

## 🚀 STATUS

✅ **Bug Fixed!**

The Sign Out functionality now works correctly:
- Proper NextAuth integration
- Clean logout flow
- No errors
- Redirects to login page
- Session properly cleared

---

## 📞 RELATED DOCUMENTATION

- NextAuth.js Docs: https://next-auth.js.org/getting-started/client#signout
- NextAuth API Reference: https://next-auth.js.org/getting-started/client#options-1

---

**Issue resolved! Sign out now works perfectly.** ✅

