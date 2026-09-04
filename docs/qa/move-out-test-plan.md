# QA test plan — Move-out

**Routes:** `/admin/leasing`, `/admin/leasing/moveouts/[id]`, `/admin/rooms/[id]` **End Assignment**, `POST /api/lease/moveouts`, `POST /api/leases/[id]/terminate`, `DELETE /api/rooms/[id]/assign`  
**Training job:** [move-out.md](../training/move-out.md)

Use a **throwaway** occupied QA tenant. Do not vacate a real Balibago/Villasol occupant.

| # | Scenario | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- |
| 1 | Happy path: End Assignment vacates the unit and keeps history | Seed occupied QA room. Room detail → **End Assignment**. **End Date** today, optional notes → **End Assignment**. | Toast **Tenant unassigned successfully!** API **Tenant unassigned; room vacant. Occupant history retained.** Room **Vacant**. Person still listed; **Status: Former tenants** (`inactive`). Not deleted. **Tenancy History** keeps a **Terminated** row. | Critical |
| 2 | Required field validation: End Date is required in the UI | Open **End Tenant Assignment**, clear **End Date**, submit. | `#endDate` is HTML `required` (`valueMissing`). API defaults end date to **today** if omitted — UI is stricter than API. | Critical |
| 3 | Start move-out does not vacate the room | **Leasing** → **Move-outs** → **Start move-out**. Pick the occupied QA lease and **Planned move-out date** → submit. | Toast: worksheet ready; **unit stays occupied until you finalize**. Room still **Occupied**. API requires `tenantId`, `roomAssignmentId`, `moveoutDate` else **tenantId, roomAssignmentId, and moveoutDate are required**. | Critical |
| 4 | Terminate on paper does not vacate | Lease detail → **Terminate**. Set **Planned move-out date** → confirm. | **Lease ended on paper. The unit stays occupied until you End Assignment or finalize move-out.** UI status **Notice given**. Missing date: **Planned move-out date is required**. | Critical |
| 5 | Start move-out reuses an open worksheet | Start move-out twice on the same assignment. | Same `moveoutId` returned (status not completed/cancelled). No second worksheet. | Important |
| 6 | Finalize requires actual move-out date | Open the worksheet. **Finalize** with empty **Actual move-out date**. | UI **Enter the actual move-out date**. API **actualMoveoutDate is required**. After a valid date: **Move-out finalized** / **Move-out completed successfully**; room vacant. | Critical |
| 7 | Delete/deactivate: person is not deleted on vacate | After End Assignment, search the person under **Former tenants**. `DELETE /api/tenants/{id}`. | Person remains. Hard delete **409 HISTORY_PROTECTED**. | Critical |
| 8 | Data persists correctly after a page refresh | After End Assignment, reload the room and leasing list. | Room still vacant. History still listed. | Critical |
| 9 | Permission check: unauthenticated cannot open Leasing | Open `/admin/leasing` logged out and as a tenant. | Redirect `/auth/signin`. Start-move-out POST is **admin only**. | Critical |
| 10 | Search leases | `#lease-search` placeholder **Tenant, unit...**. Search the QA tenant name. | Matching lease row visible (before vacate). | Important |
| 11 | Filter leases by status and building | `#lease-status` **Active** / **Notice given** / **Terminated**. `#lease-building`. | Filters match the training options. After terminate-on-paper, **Notice given** includes that lease. | Important |
| 12 | Export on Leasing | Look for sort/bulk/export/print. | **No sort / bulk / export / print** on the leases list. | Nice-to-check |
