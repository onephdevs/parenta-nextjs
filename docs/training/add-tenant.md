---
# Job: Put a person in a unit (lease + portal login)

**Replaces:** Excel tenant rows plus a handwritten or Messenger password for the portal.

**Who does this:** Office admin

**When:** Someone is moving in and needs a lease and a login.

## Steps
1. Sidebar **Tenants** (`/admin/tenants`). Click **Add Tenant**. (From a vacant unit you can click **Add Tenant** on **Properties** instead; **Property** and **Room** stay locked.)
2. On **Personal Info** fill **First Name**, **Last Name**, and **Email** (this is the portal login). On **Housing** choose **Property** and **Room**, confirm **Monthly Rent (₱)**, and select **Lease Template**. On **Lease** set **Lease Start Date** and **Move In Date**.
3. Click **Create Tenant**. If a portal login was created, copy **Temporary password** from **Tenant account created** (it is also emailed). Click **Continue to tenant**. Give the tenant **Email** + that password and send them to `/auth/signin`.

## Done when
The tenant profile opens (`/admin/tenants/[id]`). After refresh they still appear under **Tenants**, the room is occupied, and they can log in with the email.

## Watch out for
**Email is required.** If you see **This email is already in use**, pick another email. Assigning a room also requires **Lease Template**, **Lease Start Date**, and **Monthly Rent (₱)**. If they forget the password later, open the tenant profile and use **Reset password** (generate and email, or type one from the office).

## Video
[link placeholder]
---
