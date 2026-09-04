---
# Job: Set office preferences

**Replaces:** TBD - ask client (portal on/off, late fees, reminders were not in the Excel ledger).

**Who does this:** Admin

**When:** First week on the app, and when you turn the tenant portal or late fees on or off.

## Steps
1. Header gear → **Settings** (`/admin/settings`). (Not a sidebar item except **Tenant pay details**.)
2. **System:** tick **Enable tenant portal** if tenants will log in. Leave **Enable late-fee penalties** off unless you will use **Apply Late Fees**.
3. Click **Save Settings**. For GCash numbers use tab **Tenant payments** (separate job).

## Also on this page
- Tabs: **Notifications**, **Security**, **Preferences**, **Tenant payments**, **System**.
- **Notifications** — **Notification categories**; **In-app** / **Email** toggles.
- **Security** — **Two-Factor Authentication**, **Session Timeout** (15 min–8 hours), **Change Password**.
- **Preferences** — Language, Timezone, Currency, Date Format.
- **System** — **Nearby map** / **Cached street-route lifetime (days)** / **Replace all catalogs from OpenStreetMap**; **System Information**; **Clear Cache**; **Export Data**.
- No search. Branding/SMTP/role matrix are not on this page.

## Done when
After refresh the same checkboxes are still set. Tenants can open `/auth/signin` only if **Enable tenant portal** is on.

## Watch out for
**Enable late-fee penalties** is off by default. Turning it on without running Apply Late Fees does not charge anyone by itself.

## Video
[link placeholder]
---
