# QA test plan — Leases / Documents

**Route:** Tenant profile **Documents** tab `/admin/tenants/[id]?tab=documents` (not the sidebar Documents library)  
**Source:** `DocumentUpload.tsx`, `LeaseSignPanel.tsx`, `POST /api/tenants/[id]/agreement/generate`, `POST/DELETE /api/tenants/[id]/agreement`, `POST /api/tenants/[id]/agreement/sign`  
**Training job:** [issue-lease.md](../training/issue-lease.md)

| # | Scenario | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- |
| 1 | Happy path: generate a lease for an assigned tenant | Seed QA tenant + vacant room + assignment. Open tenant → **Documents**. **Generate lease**. | **Lease agreement generated** / **Lease agreement on file**. **View** is available. Required **Lease Contract** shows a file. | Critical |
| 2 | Required: generate lease needs an active room assignment | Create a tenant **without** a room. **Documents** → **Generate lease**. | Error **Tenant has no room assignment. Assign a room before generating a lease agreement.** Empty copy **No lease agreement on file**. | Critical |
| 3 | Invalid input: upload rejects non-PDF/DOC and files over 10MB | **Upload** a `.txt` (or image). | Client **Please select a PDF, DOC, or DOCX file** / **Invalid File**. API **File type … is not supported. Supported types: PDF, DOC, DOCX**. Size: **File must be less than 10MB** / **File size exceeds 10MB limit**. | Important |
| 4 | Sign as landlord: name and terms checkbox are required | After a draft exists: **Sign as landlord**, leave checkbox unchecked → **Sign lease**. Then check the box but name shorter than 3 characters. | Unchecked: toast **Confirm required** / **Please confirm you agree to the lease terms**. Short name: **Name required** / **Type your full legal name to sign**. API: **You must confirm to sign**; **Please type your full legal name to sign**. | Critical |
| 5 | Edit/update: regenerate / replace a signed lease | Generate, sign, then **Regenerate lease**. | Confirm **Replace signed lease?** → **Replace & generate**. Success **Signed agreement replaced with a new draft**. Cancel keeps the signed file. API without `forceReplace`: **409 AGREEMENT_LOCKED**. | Important |
| 6 | Delete the lease document | **Delete** → **Delete document?** | **Tenant agreement deleted successfully**. Tab returns to **No lease agreement on file**. Tenant portal Documents no longer has that file. | Critical |
| 7 | Duplicate/conflict: signed lease is locked until replace | Generate+sign, then generate again without confirming replace. | **409** `A signed lease is already on file. Delete it first, or confirm replace to generate a new draft.` | Important |
| 8 | Data persists correctly after a page refresh | Generate lease, reload `?tab=documents`. | **Lease agreement on file** still. **View** still works. | Critical |
| 9 | Permission check: agreement APIs are admin; tenants cannot open this tab as office | Unauthenticated and tenant session on `/admin/tenants/{id}?tab=documents`. | Redirect `/auth/signin`. Tenant signs via portal, not this admin tab. | Critical |
| 10 | Search / filter / sort / export on the Documents tab | Look at the tenant Documents tab chrome. | **No search / filter / sort / export / print on this tab** (training). Optional documents table paginates 5 per page. | Nice-to-check |
