---
# Job: Add an office login

**Replaces:** Sharing one Excel / Gmail login among the office.

**Who does this:** Office admin (owner)

**When:** A new staff member needs the app.

## Steps
1. Sidebar **Users** (`/admin/users`). Click **Create Admin**.
2. In **Create portal account** fill **First name**, **Last name**, **Email**, **Password**, and **Confirm password**. Optional: **Username**. Office accounts are full admin.
3. Click **Create Account**. Give them **Email** (or username) + password and `/auth/signin`.

## Also on this page
- Title **Admin Users**. Cards: **Total Admins**, **Active**, **Inactive**, **Showing**.
- **Search** — **Name, email, username...**
- **Status** filter: **All Status**, **Active**, **Inactive**.
- Pagination 20 per page.
- Row: **Edit**, **Deactivate** / **Activate**. Edit dialog **Edit Admin User** (can set password).
- No hard Delete. No export. No permissions matrix. No staff-role create on this page.
- **Deactivate** is not available on your own active account.
- Footer avatar → **Admin Profile** to change *your* password (see **Change my office password**).
- Staff who only work repairs use `/staff` — a different login, not this page.

## Done when
They appear under **Admin Users** as **Active**. After refresh they can sign in.

## Watch out for
**Password** must be at least 8 characters and match **Confirm password**. This is not a tenant portal login — use **Add Tenant** for that. There is no separate caretaker role.

## Video
[link placeholder]
---
