# Internal QA — module coverage matrix

**Not for the client.** Use this before marking a milestone complete.

**Re-run:** People directory is **hidden**. Sidebar has no **People** item. `/admin/people` redirects to `/admin/tenants`. Former occupants stay on **Tenants** with status **inactive** (lease assignment still uses `terminated`). Do not treat People as an office module.

**How scored:** Each cell is from reading the matching API route and UI. If a cell could not be verified, it says **NEEDS MANUAL CHECK**.

| Mark | Meaning |
| --- | --- |
| ✅ | Working UI + handler found |
| ⚠️ | Exists but incomplete (API without UI, UI without API, weak validation, auth gap) |
| ❌ | Not found |

**Permissions** = route checks session/role. **Validation** = required-field checks on create (UI and/or API).

---

| Module | Create | Read/List | Update | Delete | Permissions checked | Validation on required fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Properties (buildings) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Add** on `/admin/properties` → `POST /api/buildings` (`requireAdmin`; name, city, region). **Edit property** → `PUT`. **Delete building** + `ConfirmDialog`. Office accounts are admin (caretaker role withdrawn 2 Sep). |
| Rooms | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | **Add Room** → `POST /api/rooms` (buildingId, roomNumber, roomType). **Edit Room** → `PUT /api/rooms/[id]` has **no** required-field check. **Delete Room** modal. |
| Tenants | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | **Add Tenant** → `POST /api/tenants` (random temp password emailed). Profile **Reset password** → `POST /api/tenants/[id]/password` (generate + email, or set from office). List **Status**: Current / Active / Pending / **Former tenants**. End Assignment and deactivate write `inactive`. Hard DELETE API exists (history-protected); **no office delete button**. `GET /api/people` still exists but has no office nav. |
| Occupants | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Add Occupant** on room; `POST /api/occupants` requires roomId, firstName, lastName, moveInDate. Portal **Occupants** PUT/DELETE `/api/tenant/occupants/[id]`. |
| Leases | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | Create via **New lease** / assign / **Create Tenant**, not `POST /api/leases` (GET-only). **Edit** → `PATCH` requires **Reason**. Vacate: **End Assignment** or Finalize move-out. **Terminate** (`POST /api/leases/[id]/terminate`) ends the contract on paper, sets **planned move-out date**, does **not** vacate; UI status **Notice given**. `?action=terminate` opens `TerminateLeaseDialog`. |
| Lease templates | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `/admin/lease-templates` → `/api/lease-package-templates`. Name required. Delete 409 if in use. |
| Invoices | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | **Create Invoice** → `POST /api/invoices`. `PUT`/`DELETE` on `[id]` exist; **no UI** found. |
| Payments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Process Payment** → `POST /api/payments`. Payment detail **Refund** (`refunded` status, restores invoices; new pay = new id) and **Void** (DELETE). |
| Utility bills | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | **Add Bill** → `POST /api/utility-bills/room`. List **Delete** (confirm) and mark paid (`PUT` status only). No full edit form. |
| Unit groups | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | POST requires buildingId + name. UI **Deactivate**, not hard DELETE. |
| Expenses | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Delete has confirm. Create/update accept office categories (`staff_salary`, `food_allowance`, …); aliases like `worker_wages` map in. |
| Meter readings | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | GET/POST `/api/meter-readings`. No PUT/DELETE routes. |
| Cost allocation | ⚠️ | ✅ | ⚠️ | ❌ | NEEDS MANUAL CHECK | NEEDS MANUAL CHECK | Calculate / generate-bills. Hardcoded actor `'system'`. |
| Documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Upload requires file + documentName. Optional **Add Document** on tenant profile only sets `location.hash` — does not upload. |
| Document templates | ✅ | ✅ | ✅ | ✅ | NEEDS MANUAL CHECK | NEEDS MANUAL CHECK | `/api/documents/templates` CRUD. Auth/validation not fully traced. |
| Tasks / leads | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | **Add opportunity** → `POST /api/pipeline/cards`. **CSV Import** and **Advanced Filters** work. Generate lease emails a random temp password (not `tenant123`). |
| Users | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | **Create Admin**. PATCH deactivate (not self). **No DELETE** route. |
| Maintenance | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | Create + update in UI. `DELETE /api/maintenance?id=` exists; **no delete button** on `/admin/maintenance`. |
| Assets | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | Delete confirms. `GET`/`POST /api/assets` require admin session. |
| Reservations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | POST validates required fields. **GET `/api/reservations` requires admin session.** |
| Move-outs | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️ | List + finalize worksheet. **Start move-out** UI (`StartMoveOutModal`) calls `POST /api/lease/moveouts`. Does not vacate until Finalize / End Assignment. |
| Images | ✅ | ✅ | ✅ | ✅ | ✅ | NEEDS MANUAL CHECK | Building photo upload/gallery. `[id]` PUT/DELETE require admin. |

**People (hidden):** not an office module. Code leftovers: `PeopleClient`, `GET /api/people`, redirect stub at `/admin/people`.

---

## Cross-cutting findings (verified)

1. **Former tenant policy:** **End Assignment** and deactivate write `inactive`. Legacy `terminated` person rows are treated as former. Tenant list **Status** has **Former tenants** (not a separate Terminated person filter). Lease assignment_status can still be `terminated`.
2. **API delete without office UI:** tenants, invoices, maintenance. Payments **Void** is the office DELETE.
3. **Hardcoded:** Cost allocation actor `'system'`. Seed routes may still use `tenant123`. Generate lease emails a random password.
4. **Caretaker role withdrawn (2 Sep):** office logins are `admin`. Leftover JWT `caretaker` is normalized to admin.
5. **Terminate lease** is notice-on-paper (planned move-out date), not vacate. Vacate = End Assignment / Finalize.

## Suggested manual pass

- After **End Assignment**, Tenants → **Status: Former tenants** shows the person; they are not on a People page.
- Office login can open Dashboard, Reports, and Create Invoice (caretaker is no longer a limited role).
- Expense **Staff salary** / **Food allowance** save successfully.
