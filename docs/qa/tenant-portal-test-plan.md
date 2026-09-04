# QA test plan — Tenant Portal

**Routes:** `/auth/signin`, `/tenant`, `/tenant/payments`, `/tenant/documents`, `/tenant/maintenance`, `/tenant/profile`  
**Source:** `UnifiedSignInForm.tsx`, `TenantCompleteProfileGate`, tenant payment/maintenance/document APIs, `src/app/tenant/layout.tsx`  
**Training job:** [tenant-portal.md](../training/tenant-portal.md)

Seed a throwaway portal tenant (do not use a real Balibago occupant’s login). Settings → **Enable tenant portal** must be on.

| # | Scenario | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- |
| 1 | Happy path: tenant signs in and sees their unit | `/auth/signin` with the seeded email + password → **Login**. | Lands on `/tenant`. **Your unit** (and rent/balance cards) visible. | Critical |
| 2 | Invalid login | Email `nobody@parenta.test` / wrong password → **Login**. | **Invalid email, username, or password**. Stay on sign-in. | Critical |
| 3 | Required field validation: first-visit password rules | Seed `profileCompleted: false`. Complete **Set up your account**: new password `short`, then `password1` vs confirm `password2`, then a valid 8+ match. | **New password must be at least 8 characters**. **New passwords do not match**. Success **Save and continue** proceeds to Home. Also required: first name, last name, email, phone, current password. | Critical |
| 4 | Invalid input: Pay now is blocked until the office saves a payment phone | **Payments** → **Pay online**. (Do not clear the office GCash number in Settings.) | If Settings phone is empty: **Pay now is unavailable** / **Pay now is unavailable until they add it**. If a phone is already saved, the **Payment amount (₱)** form is shown instead — both are valid; the gate is `instructions.phone.trim()`. Admin save without phone: **Payment phone number is required**. | Critical |
| 5 | Upload receipt requires a photo and amount | **Upload receipt** → **Submit for verification** with no file / invalid amount. | Receipt required: **Take a photo or choose a screenshot of your payment transfer** (Pay online). Upload-receipt API requires receipt + link (payment/invoice/date). Status stays **pending** until office confirm. | Critical |
| 6 | New ticket: Subject, Category, and Details are required | **Maintenance** → **New ticket** → **Submit ticket** with empties. Then fill Subject `Leaking faucet`, category, details. | Empty: **Please fill in all required fields** / API **Missing required fields**. Success **Maintenance request submitted successfully** / **Ticket opened**. Ticket appears in the queue after refresh. | Important |
| 7 | Edit/update profile | **My profile** → change phone → **Save Changes**. | **Profile updated successfully**. Email is read-only (**Email cannot be changed**). | Important |
| 8 | Delete: tenant cannot upload or delete Documents | **Documents**. Look for Upload/Delete. | Search/filter/Preview/Download only. **No tenant POST/DELETE** on documents. | Critical |
| 9 | Duplicate/conflict: occupant's room must be assigned | Profile **Occupants** → add occupant without an assignment (vacated tenant). | API **No active room assignment found** (404). Required: first name, last name, move-in date. | Important |
| 10 | Data persists correctly after a page refresh | After login, reload `/tenant`. After submitting a ticket, reload Maintenance. | Unit/balance still there. Ticket still listed. | Critical |
| 11 | Permission check: tenant cannot open /admin | While logged in as tenant, open `/admin` and `/admin/financial/payments`. | Redirect `/auth/signin`. Unauthenticated `/tenant` → `/auth/signin?role=tenant`. Portal off → `/auth/signin?portal=disabled`. | Critical |
| 12 | Search documents | Documents **Search documents...** and **Category**. | List filters. **Clear filters** restores. | Nice-to-check |
| 13 | Maintenance queue filters | Tickets **All** / **Open** / **In progress**; search; priority. | Filters change the visible set. | Nice-to-check |
| 14 | Change password after setup | Account & password: current + new + confirm. Mismatch / short / wrong current. | **New passwords do not match**. **New password must be at least 8 characters**. **Current password is incorrect**. Success **Password changed successfully**. | Critical |
| 15 | Export: statements PDF / Excel | Payments → **Statements**. | **Excel**, **PDF**, **Print** controls exist (badge **PDF / Excel**). Generate with From/To. | Important |
