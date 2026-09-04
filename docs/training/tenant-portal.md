---
# Job: Tenant self-serve (unit, balance, docs, maintenance)

**Replaces:** Asking the office for balance, photos of the lease, and repair requests by chat.

**Who does this:** Tenant (office can **Preview portal** from the tenant profile)

**When:** After the office creates the account and shares **Email** + **Temporary password**.

## Steps
1. Open `/auth/signin`. Enter **Email or username** and **Password**. Click **Login**.
2. First visit: complete **Set up your account** (**First name**, **Last name**, **Email**, **Phone number**, **Current password**, **New password**, **Confirm new password**) and click **Save and continue**.
3. **Home** shows **Your unit**. **Payments** → **Overview & balance** for amount due; **Pay now** (only after the office saved a GCash / bank number) or **Upload receipt** then **Submit for verification**. **Documents** → **Download**. **Maintenance** → **New ticket** → **Subject**, **Category**, **Details** → **Submit ticket**.

## Also on this page
**Sign-in**
- **Remember me**. **Forgot Password?** → `/auth/forgot-password`. **Register here** (public signup). Error: **Invalid email, username, or password**.

**Home** (`/tenant`)
- Due banner; **Pay now** or **View payments**. Cards: **Your unit**, **Monthly rent**, deposit/advance. **Quick actions:** **Documents**, **Maintenance**, **My profile**, **Statements**. **Recent payments**, **Your tickets**. No search on Home.

**Payments** (`/tenant/payments`)
- Tabs: **Overview & balance**, **Pay online**, **Upload receipt**, **History**, **Statements** (badge **PDF / Excel**).
- Overview: **Total paid**, **Next due**, **Past due**, **Deposit held**, **Advance paid**; **Payment Schedule**; **Pay** / **Pay partial**.
- **Pay online** sub-tabs: **Rent Payment**, **Deposit & Advance**, **Utility Deposit**, **Manual Entry**. Form: **Send payment here**, **Mobile / GCash number**, **Select invoice to pay**, **Payment amount (₱)**, **How did you pay?**, **GCash / bank reference**, **Submit payment + receipt**. If the office has no number: **Pay now is unavailable**.
- **Upload receipt:** **Link to payment date**, **Payment date**, **Amount (₱)**, **Reference / transaction number**, **Submit for verification**.
- **History:** search **Search payments...**; **All Payments** / **Paid** / **Partial**; **Track** / **Message**, **Print**, **Upload**.
- **Statements:** **Statement type** (**Payment history**, **Invoice history**, **Financial summary**), **From**, **To**, **Generate statement**; **Excel**, **PDF**, **Print**.
- No card checkout, no autopay.

**Documents**
- Search **Search documents...**; **Category** (**All Categories**, **Lease**, **Payment**, **Maintenance**, **Insurance**, **Legal**, **Other**). **Preview**, **Download**, **Clear filters**. Tenant cannot upload or delete here.

**Maintenance** (`/tenant/maintenance`)
- **Tickets**; **New ticket**. Queue: **All**, **Open**, **In progress**, **Resolved**. Search; priority **All priority** / **High** / **Medium** / **Low**. New ticket: **Subject**, **Category**, **Priority**, **Details**, **Photos** (**Take maintenance photo**).

**Profile**
- Nav: **Personal info**, **Occupants**, **Emergency contact**, **Account & password** (page tab: **Account**).
- **Save Changes** on personal; **Add Occupant** / **Update Occupant**; emergency relationship list; **Change password** / **Update password**. **Sign your lease** on personal.
- Shell: **Dark theme** / **Light theme**, **Manage account**, **Sign out** (or **Exit preview**).

Office: tenant profile **Preview portal**. Settings → **Enable tenant portal** must be on.

## Done when
After refresh, **Home** still shows the unit and balance. A submitted ticket appears under **Maintenance**. Uploaded receipts show under **Payments** → **History**.

## Watch out for
Wrong login: **Invalid email, username, or password**. **New password** must be at least 8 characters and match **Confirm new password**. Lost password: office **Reset password**. **Pay now** stays blocked until **Tenant pay details** has a phone number.

## Video
[link placeholder]
---
