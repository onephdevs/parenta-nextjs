# Parenta / Alfonso Property Management — System Report

**As of:** 2026-08-06  
**Production:** https://parenta.com.mx · https://parenta-nextjs.vercel.app  
**Local:** http://localhost:3030  

> Paste this document into the Google Doc report.  
> Open the `.md` file in Google Docs via **File → Open → Upload**, or copy sections below.  
> **Security note:** This file contains demo/seed passwords. Keep the Google Doc restricted to your team; do not make it public.

---

## Table of contents

1. Executive overview  
2. Live system snapshot  
3. Login credentials (admin + tenants by room/store)  
4. Application modules (what the app does)  
5. User roles & portals  
6. Data model (how things connect)  
7. Tech stack & hosting  
8. Suggested next sections to continue this report  

---

## 1. Executive overview

Parenta (Alfonso Property Management) is a multi-building rental operations platform. Admins manage properties, tenants, leases, payments, utilities, expenses, documents, and a sales/leasing task pipeline. Tenants log into a portal to view their unit, payments, documents, and maintenance.

Current live portfolio focuses on:

- **APARTMENT-1 BALIBAGO** — residential units + 1 store  
- **APRTMENT-2 VILLASOL** — residential units  

---

## 2. Live system snapshot (database)

Demo buildings and fake units were removed on 2026-08-06. Counts below are the live portfolio only.

| Metric | Count |
|--------|------:|
| Buildings | 2 |
| Rooms | 42 |
| Occupied rooms | 34 |
| Vacant rooms | 8 |
| Store units | 1 |
| Admin users | 2 |
| Tenant portal users | 34 |

### Buildings breakdown

| Building | Rooms | Occupied | Vacant | Stores |
|----------|------:|---------:|-------:|-------:|
| APARTMENT-1 BALIBAGO | 32 | 26 | 6 | 1 |
| APRTMENT-2 VILLASOL | 10 | 8 | 2 | 0 |
| **Total (live portfolio)** | **42** | **34** | **8** | **1** |

### Cleanup performed
Deleted demo buildings: alfonso, Building 1A, Oak Tree Residences, Sunrise Bldg, Sunrise Residences, Sunset Apartments, Sunset Apartments - Updated, test1 (20 demo rooms + related docs/assets/expenses).  
Also removed Apt-2 inactive Units 11–30, inactive seed users Apartment2Unit3 / Apartment2Unit8, demo login `tenant@parenta.com`, and personal unused accounts `eadrian` / `tiffabarq`.

---

## 3. Login credentials

**Sign-in URLs**

| Role | Path |
|------|------|
| Admin | `/auth/admin/signin` |
| Tenant | `/auth/tenant/signin` |

Login accepts **username** or **email** (when email is set).

### 3.1 Admins

| Username | Email | Password | Notes |
|----------|-------|----------|-------|
| admin | admin@parenta.com | admin123 | Seed / demo admin |
| estopaceadrian | estopaceadrian@gmail.com | *(personal — not seeded)* | Live admin account |

### 3.2 Tenants — APARTMENT-1 BALIBAGO

**Shared seed password for all rows below:** `tenant123`

| Room | Store? | Username | Email |
|------|--------|----------|-------|
| Unit 1 | No | Apartment1Unit1 | — (profile setup pending) |
| Unit 2 | No | Apartment1Unit2 | — |
| Unit 3 | No | Apartment1Unit3 | — |
| Unit 4 | No | Apartment1Unit4 | — |
| Unit 6 | No | Apartment1Unit6 | — |
| Unit 7 | No | Apartment1Unit7 | — |
| Unit 10 | No | Apartment1Unit10 | — |
| Unit 11 | No | Apartment1Unit11 | — |
| Unit 12 | No | Apartment1Unit12 | — |
| Unit 13 | No | Apartment1Unit13 | — |
| Unit 14 | No | Apartment1Unit14 | — |
| Unit 15 | No | Apartment1Unit15 | — |
| Unit 16 | No | Apartment1Unit16 | — |
| Unit 17 | No | Apartment1Unit17 | — |
| Unit 18 | No | Apartment1Unit18 | — |
| Unit 19 | No | Apartment1Unit19 | — |
| Unit 20 | No | Apartment1Unit20 | — |
| Unit 21 | No | Apartment1Unit21 | — |
| Unit 22 | No | Apartment1Unit22 | — |
| Unit 23 | No | Apartment1Unit23 | — |
| Unit 24 | No | Apartment1Unit24 | — |
| Unit 25 | No | Apartment1Unit25 | — |
| Unit 26 | No | Apartment1Unit26 | — |
| Unit 27 | No | Apartment1Unit27 | — |
| Unit 29 | No | Apartment1Unit29 | — |
| **Store** | **Yes** | **Apartment1Store** | — |

Vacant units (no portal account): 5, 8, 9, 28, 30.

Most of these accounts still need profile completion on first login (name, email, phone).

### 3.3 Tenants — APRTMENT-2 VILLASOL

**Shared seed password:** `tenant123`

| Room | Store? | Username | Email |
|------|--------|----------|-------|
| Unit 1 | No | Apartment2Unit1 | — |
| Unit 2 | No | Apartment2Unit2 | — |
| Unit 4 | No | Apartment2Unit4 | — |
| Unit 5 | No | Apartment2Unit5 | — |
| Unit 6 | No | Apartment2Unit6 | — |
| Unit 7 | No | Apartment2Unit7 | — |
| Unit 9 | No | Apartment2Unit9 | — |
| Unit 10 | No | Apartment2Unit10 | — |

Vacant (no portal account): Units 3, 8.

---

## 4. Application modules (admin)

What the app covers today, aligned with the admin sidebar:

### Overview
- **Dashboard** — `/admin` — occupancy, financial, and operational summary  
- **Tasks (pipeline)** — `/admin/tasks` — leasing / inquiry board (pipeline cards & stages)

### Properties & people
- **Properties / Buildings** — `/admin/properties`, `/admin/buildings`  
- **Rooms** — `/admin/rooms` — units including Store  
- **Tenants** — `/admin/tenants` — profiles, assignments, reservations  

### Contracts & files
- **Lease management** — `/admin/lease-management`  
- **Documents** — `/admin/documents`  
  - Lease designer — `/admin/documents/lease-designer`  
  - Templates — `/admin/documents/templates`  

### Money
- **Payments** — record, list, detail  
- **Invoices** — create / manage  
- **Financial dashboard & reports**  
- **Late fees** — settings + apply  
- **Tenant pay details** — settings tab for payment instructions  

### Bills & utilities
- **Bills & expenses overview**  
- **Utility bills** + meter readings + cost allocation  
- **Expenses** CRUD  

### Operations
- **Assets** — inventory & room assignment  
- **Maintenance** — request tracking  
- **Users** — admin/staff/tenant accounts  
- **Reports** — vacant rooms, tenant list, deposits, collected amount, analytics  

### Public / marketing
- Public landing / portfolio / inquiry forms feed the Tasks pipeline  

---

## 5. Tenant portal modules

| Page | Path | Purpose |
|------|------|---------|
| Home | `/tenant` | Tenant dashboard |
| Payments | `/tenant/payments` | Balance & payment history |
| Documents | `/tenant/documents` | Lease / uploaded docs |
| Maintenance | `/tenant/maintenance` | Submit / track requests |
| Reports | `/tenant/reports` | Tenant-facing summaries |
| Profile | `/tenant/profile` | Name, email, username, phone |

---

## 6. Data model (simplified)

```
Buildings
  └── Rooms (Unit N / Store)
        └── Tenant room assignments (active occupancy)
              └── Tenants ←→ Users (login)
                    ├── Payments
                    ├── Invoices
                    ├── Documents / lease snapshots
                    ├── Utility allocations
                    └── Maintenance requests

Pipeline boards / stages / cards  →  inquiries & leasing workflow
```

Core rule: a **room** belongs to a **building**; an active **tenant_room_assignment** links a **tenant** to that room; the **user** account is how they sign in.

---

## 7. Tech stack & hosting

| Layer | Choice |
|-------|--------|
| App | Next.js 15 (App Router), TypeScript, Tailwind |
| Auth | NextAuth (admin / tenant / staff sign-in) |
| Database | Supabase PostgreSQL |
| Uploads | Vercel Blob (and/or local `public/uploads` in some paths) |
| Email | Gmail app password (optional notifications) |
| Production hosting | Vercel (`parenta-nextjs.vercel.app`); domain parenta.com.mx |
| Legacy | Hostinger/PM2 scripts exist but are legacy |

Local: `npm run dev` → port **3030**.

---

## 8. How to continue this Google Doc

Use this as the remaining outline so the report becomes a full “everything about the app” handbook. Fill each section with screenshots + short how-to steps.

### A. Purpose & audience
- Who uses it (owner, admin, tenants)  
- Problems it solves (rent collection, occupancy, utilities, leasing pipeline)

### B. End-to-end workflows (write these next)
1. **Onboard a building** → add rooms → set rates / deposit rules  
2. **Assign a tenant** → create user → assign room → hand off username/password  
3. **Collect rent** → record payment → (optional) invoice / late fee  
4. **Utilities** → enter bill → meter readings → allocate cost to rooms  
5. **Lease paperwork** → template / designer → generate → tenant documents  
6. **Inquiry → lease** → public form → Tasks board → convert to tenant  
7. **Move-out** → end assignment → vacant room reports  

### C. Screen catalog
- One subsection per sidebar item: purpose, main actions, key fields, common errors  

### D. Roles & permissions
- Admin vs tenant vs staff — what each can see/do  

### E. Environment & ops
- Required env vars (see `docs/ENVIRONMENT-VARIABLES.md`)  
- Deploy steps (`vercel --prod` / GitHub → Vercel)  
- How to reset a tenant password safely  

### F. Current gaps / known state (honest status for stakeholders)
- Invoices count is currently 0 in DB  
- Maintenance requests currently 0  
- Many seeded tenants have incomplete profiles  
- Personal admin/tenant passwords are not recoverable from the DB (hashed only)  

### G. Appendices
- Credentials tables (Section 3 — already done)  
- API map (optional)  
- ER diagram / architecture (can pull from `docs/archive/SYSTEM-ARCHITECTURE-MAP.md`)  
- Change log / deployment history  

---

## 9. Quick paste checklist for Google Docs

1. Open https://docs.google.com/document/d/10Y5d_Icf0aZlk8HUWdkcwsjSzEDYygYhLsTsp68J6Mc/edit  
2. Paste **Section 3 (credentials)** under your existing intro, or replace a “Logins” heading if you already have one.  
3. Paste **Sections 1–2 and 4–7** as the “App information” body.  
4. Turn **Section 8** into heading placeholders and fill with screenshots as you walk the app.  
5. Restrict sharing to editors you trust (passwords are in this doc).  

---

*Generated from live Supabase data + current admin/tenant routes in the parenta-nextjs codebase.*
