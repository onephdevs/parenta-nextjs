# QA test plan — Leasing Pipeline

**Route:** `/admin/tasks?board=onboarding`  
**Source:** `NewPipelineCardModal.tsx`, `TasksBoard.tsx`, `POST/PATCH/DELETE /api/pipeline/cards`, `generateLeaseFromCard`  
**Training job:** [lead-to-tenant.md](../training/lead-to-tenant.md)

| # | Scenario | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- |
| 1 | Happy path: create an onboarding opportunity | **Tasks** (Onboarding) → **Add opportunity**. First **Luis**, last **Santos**, email `luis.santos.{stamp}@parenta.test`, phone `09181234567`. Building prefer Balibago, a vacant room, rent `4800`. **Create opportunity**. | Card appears on **New inquiry** (or **Viewing scheduled** if a viewing date was set). Refresh still shows it. | Critical |
| 2 | Required field validation: create does not require name or email — flag as bug | **Add opportunity** → **Create opportunity** with contact fields empty. | **Unexpectedly permissive:** `POST /api/pipeline/cards` only requires `boardSlug`. Card is created. Name/email/room are required later for **Generate lease**, not for create. Flag if the office expected a complete contact before save. | Important |
| 3 | Generate lease: email, room, payment received, template, and start date | Open the card. Try **Generate lease** with those unset. Then set them (including **Payment received**) and generate. | UI: **Email is required to generate a lease**; **Select building and room before generating a lease**; **Confirm payment under Payment before generating a lease**; **Select a lease template before generating a lease**; **Lease start date is required**. Button stays off until **Payment received**. Success: **Lease generated — tenant & lease created** (or portal-email variant). | Critical |
| 4 | Invalid / conflict: occupied room cannot take a lease from the pipeline | Assign the room to someone else, then **Generate lease** on the card pointing at that room. | **Room is already occupied — pick another unit before generating a lease**. Reserved-by-other-paid: **Room is reserved by another opportunity with payment confirmed — pick another unit**. | Critical |
| 5 | Edit/update an opportunity | Open the card, change phone / notes → **Save changes**. | Card keeps the new values after reopen/refresh. | Important |
| 6 | Delete an opportunity | Select the card / **Delete**, or bulk **Delete (n)** with confirm. | Card is gone after refresh. Confirm: cannot be undone. | Important |
| 7 | Duplicate emails on two opportunities are allowed — flag as bug | Create two cards with the same email. | Both succeed. **No unique email on cards.** Conflict is only at lease time (occupied / reserved room). | Important |
| 8 | Data persists correctly after a page refresh | Create **Luis Santos**, reload `/admin/tasks?board=onboarding`, search the email. | Card still on the board. | Critical |
| 9 | Permission check: pipeline APIs require admin | Unauthenticated `/admin/tasks`. Tenant session. | Redirect `/auth/signin`. API **401 Unauthorized**. Caretaker is not a separate office role. | Critical |
| 10 | Search opportunities | Placeholder **Search Opportunities**. Type `Luis` / the unique email. | Card is visible; unrelated cards hide. | Important |
| 11 | Sort the board | Click **Sort** (cycles updated / title / amount / due). | Sort control is usable; board still renders. | Nice-to-check |
| 12 | Advanced Filters | **Advanced Filters**: stage, building, amount min/max. **Clear filters**. | Filtered set changes; **Clear filters** restores the board. | Important |
| 13 | Import CSV limit | Open **Import**. (Do not need a real 201-row file if the API is asserted.) | API: **CSV is limited to 200 rows per import**. Missing csv: **boardSlug and csv are required**. | Nice-to-check |
| 14 | Export / pagination | Look for export/print/pagination. | **No pagination. No export or print** (training). | Nice-to-check |
