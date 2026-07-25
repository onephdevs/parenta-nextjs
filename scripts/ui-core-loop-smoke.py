#!/usr/bin/env python3
"""UI-path core loop smoke test — mirrors form fetch payloads."""
from __future__ import annotations

import http.cookiejar
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any, Optional

BASE = "http://localhost:3030"
TS = int(time.time())
EMAIL = f"ui.smoke.{TS}@parenta.com"
PASS = "tenant123"


@dataclass
class Step:
    step: str
    pageUrl: str
    button: str
    method: str
    api: str
    httpStatus: int
    ok: bool
    error: Optional[str]
    responseSnippet: Optional[str]


REPORT: list[Step] = []


class Client:
    def __init__(self) -> None:
        self.cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))

    def request(
        self,
        method: str,
        path: str,
        *,
        data: Any = None,
        form: Optional[dict[str, str]] = None,
        headers: Optional[dict[str, str]] = None,
    ) -> tuple[int, Any, str]:
        url = path if path.startswith("http") else f"{BASE}{path}"
        hdrs = dict(headers or {})
        body: Optional[bytes] = None
        if form is not None:
            body = urllib.parse.urlencode(form).encode()
            hdrs.setdefault("Content-Type", "application/x-www-form-urlencoded")
        elif data is not None:
            body = json.dumps(data).encode()
            hdrs.setdefault("Content-Type", "application/json")
        req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
        try:
            with self.opener.open(req, timeout=60) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                code = resp.status
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            code = e.code
        try:
            parsed: Any = json.loads(raw)
        except Exception:
            parsed = raw
        return code, parsed, raw


def add(
    step: str,
    page: str,
    button: str,
    method: str,
    api: str,
    code: int,
    ok: bool,
    error: Optional[str],
    snippet: Any,
) -> None:
    snip = None
    if snippet is not None:
        snip = snippet if isinstance(snippet, str) else json.dumps(snippet, default=str)
        snip = snip[:400]
    REPORT.append(
        Step(step, page, button, method, api, code, ok, error, snip)
    )
    status = "PASS" if ok else "FAIL"
    err = f" | ERROR: {error}" if error else ""
    print(f"[{status}] {step}: {method} {api} -> {code}{err}")


def page_check(
    client: Client,
    step: str,
    path: str,
    needle: str,
    *,
    client_rendered: bool = False,
) -> None:
    code, _, raw = client.request("GET", path)
    hit = needle in raw
    # Next.js often embeds HTTPAccessErrorFallback strings in RSC payloads even on
    # successful pages; only treat as 404 when status is 404 or title is sole chrome.
    title_404 = "<title>404: This page could not be found.</title>" in raw
    is_real_404 = code == 404 or (title_404 and not hit and "static/chunks/app/" not in raw)
    # Client components often SSR only a loading shell — HTTP 200 + no hard 404 is enough.
    if client_rendered:
        ok = code == 200 and not is_real_404
        err = None
        if is_real_404:
            err = "404 page rendered"
        elif code != 200:
            err = f"HTTP {code}"
        add(
            step,
            f"{BASE}{path}",
            "(page load)",
            "GET",
            path,
            code,
            ok,
            err,
            "HIT" if hit else ("CLIENT_SHELL" if ok else "MISS"),
        )
        return
    ok = code == 200 and hit and not is_real_404
    err = None
    if is_real_404:
        err = "404 page rendered"
    elif code != 200:
        err = f"HTTP {code}"
    elif not hit:
        err = f"missing expected content '{needle}'"
    add(step, f"{BASE}{path}", "(page load)", "GET", path, code, ok, err, "HIT" if hit else "MISS")


def api_check(
    client: Client,
    step: str,
    page: str,
    button: str,
    method: str,
    path: str,
    payload: Any = None,
    *,
    expect_success_field: bool = True,
) -> Any:
    code, parsed, raw = client.request(method, path, data=payload)
    ok = 200 <= code < 300
    err = None
    if isinstance(parsed, dict):
        if parsed.get("success") is False:
            ok = False
            err = parsed.get("details") or parsed.get("error") or parsed.get("message") or "success=false"
        elif expect_success_field and "success" in parsed and parsed.get("success") is not True and code >= 400:
            ok = False
            err = parsed.get("error") or "failed"
    if not ok and err is None:
        err = f"HTTP {code}"
    add(step, page, button, method, path, code, ok, err, parsed if isinstance(parsed, (dict, list)) else raw[:400])
    return parsed


def signin(client: Client, email: str, password: str, role: str, page: str) -> None:
    code, csrf_data, _ = client.request("GET", "/api/auth/csrf")
    csrf = csrf_data.get("csrfToken") if isinstance(csrf_data, dict) else None
    code, parsed, _ = client.request(
        "POST",
        "/api/auth/callback/credentials",
        form={
            "csrfToken": csrf or "",
            "email": email,
            "password": password,
            "role": role,
            "callbackUrl": f"{BASE}/",
            "json": "true",
        },
    )
    _, session, _ = client.request("GET", "/api/auth/session")
    ok = isinstance(session, dict) and (session.get("user") or {}).get("role") == role
    err = None if ok else "session missing or wrong role"
    add(
        f"auth-{role}",
        page,
        "Sign In",
        "POST",
        "/api/auth/callback/credentials",
        code,
        ok,
        err,
        session,
    )


def main() -> None:
    admin = Client()
    tenant = Client()

    print("======== UI CORE LOOP SMOKE ========")

    # 1) Admin login + dashboard
    signin(admin, "admin@parenta.com", "admin123", "admin", f"{BASE}/auth/admin/signin")
    page_check(admin, "1-admin-dashboard", "/admin", "Welcome back")
    before = api_check(admin, "1b-dashboard-stats", f"{BASE}/admin", "(page data)", "GET", "/api/dashboard/stats")

    # 2) Create building
    page_check(admin, "2-buildings-page", "/admin/buildings", "Building")
    building = api_check(
        admin,
        "2-create-building",
        f"{BASE}/admin/buildings",
        "Create Building",
        "POST",
        "/api/buildings",
        {
            "name": f"UI Smoke Tower {TS}",
            "addressLine1": "200 Smoke Ave",
            "city": "Manila",
            "state": "NCR",
            "postalCode": "1000",
            "country": "Philippines",
            "buildingType": "residential",
            "description": "UI core loop smoke building",
            "amenities": ["WiFi", "Parking"],
        },
    )
    building_id = (building or {}).get("data", {}).get("id") if isinstance(building, dict) else None
    print(f"BUILDING_ID={building_id}")

    # 3) Create room
    new_room_path = f"/admin/buildings/{building_id}/rooms/new"
    page_check(admin, "3-new-room-page", new_room_path, "Room")
    room = api_check(
        admin,
        "3-create-room",
        f"{BASE}{new_room_path}",
        "Create Room",
        "POST",
        "/api/rooms",
        {
            "buildingId": building_id,
            "roomNumber": "UI-201",
            "floorNumber": 2,
            "roomType": "studio",
            "monthlyRate": 15000,
            "squareFootage": 32,
            "maxOccupancy": 2,
            "description": "UI smoke room",
            "amenities": ["AC", "WiFi"],
        },
    )
    room_id = (room or {}).get("data", {}).get("id") if isinstance(room, dict) else None
    print(f"ROOM_ID={room_id}")

    # 4) Create tenant (TenantForm)
    page_check(admin, "4-new-tenant-page", "/admin/tenants/new", "Tenant Information")
    api_check(admin, "4a-load-buildings", f"{BASE}/admin/tenants/new", "(form load)", "GET", "/api/buildings")
    api_check(admin, "4b-load-rooms", f"{BASE}/admin/tenants/new", "(form load)", "GET", "/api/rooms")
    tenant_resp = api_check(
        admin,
        "4-create-tenant",
        f"{BASE}/admin/tenants/new",
        "Create Tenant",
        "POST",
        "/api/tenants",
        {
            "firstName": "UI",
            "lastName": "Smoke",
            "email": EMAIL,
            "phone": "+639171234567",
            "password": PASS,
            "createUserAccount": True,
            "buildingId": building_id,
            "roomId": room_id,
            "monthlyRent": 15000,
            "depositMonths": 1,
            "advanceMonths": 1,
            "leaseStartDate": "2026-07-26",
            "leaseEndDate": "2027-07-26",
        },
    )
    data = (tenant_resp or {}).get("data", {}) if isinstance(tenant_resp, dict) else {}
    tenant_id = data.get("id") or data.get("tenantId")
    print(f"TENANT_ID={tenant_id} EMAIL={EMAIL}")

    # 5) Assign (second step of TenantForm submit)
    assign = api_check(
        admin,
        "5-assign-room",
        f"{BASE}/admin/tenants/new",
        "Create Tenant (assign step)",
        "POST",
        f"/api/rooms/{room_id}/assign",
        {
            "tenantId": tenant_id,
            "startDate": "2026-07-26",
            "endDate": "2027-07-26",
            "monthlyRate": 15000,
            "depositPaid": 15000,
            "advanceAmount": 15000,
        },
    )

    # 6) Create invoice
    page_check(admin, "6-new-invoice-page", "/admin/financial/invoices/new", "Invoice")
    invoice = api_check(
        admin,
        "6-create-invoice",
        f"{BASE}/admin/financial/invoices/new",
        "Create Invoice",
        "POST",
        "/api/invoices",
        {
            "tenantId": tenant_id,
            "roomId": room_id,
            "dueDate": "2026-08-15",
            "notes": "UI smoke manual invoice",
            "items": [
                {
                    "description": "Monthly rent",
                    "quantity": 1,
                    "unitPrice": 15000,
                    "itemType": "rent",
                }
            ],
        },
    )
    invoice_id = (
        ((invoice or {}).get("data") or {}).get("invoice") or {}
    ).get("id") if isinstance(invoice, dict) else None
    print(f"INVOICE_ID={invoice_id}")

    # 7) Record payment
    page_check(admin, "7-new-payment-page", "/admin/financial/payments/new", "Payment")
    payment = api_check(
        admin,
        "7-record-payment",
        f"{BASE}/admin/financial/payments/new",
        "Record Payment",
        "POST",
        "/api/payments",
        {
            "tenantId": tenant_id,
            "amount": 15000,
            "paymentType": "rent",
            "paymentMethod": "cash",
            "paymentDate": "2026-07-26",
            "dueDate": "2026-08-15",
            "paymentStatus": "paid",
            "notes": "UI smoke payment",
            "autoAllocate": True,
        },
    )
    payment_id = (
        (((payment or {}).get("data") or {}).get("payment") or {}).get("id")
        if isinstance(payment, dict)
        else None
    )
    print(f"PAYMENT_ID={payment_id}")

    # 8) Dashboard stats update
    page_check(admin, "8-dashboard-after", "/admin", "Welcome back")
    after = api_check(admin, "8-dashboard-stats-after", f"{BASE}/admin", "(page data)", "GET", "/api/dashboard/stats")

    def dig(obj: Any, *keys: str, default: Any = 0) -> Any:
        cur = obj.get("data", obj) if isinstance(obj, dict) else {}
        for k in keys:
            if not isinstance(cur, dict):
                return default
            cur = cur.get(k, default)
        return default if cur is None else cur

    delta = {
        "buildings": (dig(before, "buildings", "total"), dig(after, "buildings", "total")),
        "tenants": (dig(before, "tenants", "total"), dig(after, "tenants", "total")),
        "paidPayments": (dig(before, "financial", "paidPayments"), dig(after, "financial", "paidPayments")),
        "totalRevenue": (dig(before, "financial", "totalRevenue"), dig(after, "financial", "totalRevenue")),
        "occupied": (dig(before, "rooms", "occupied"), dig(after, "rooms", "occupied")),
    }
    stats_ok = (
        delta["buildings"][1] > delta["buildings"][0]
        and delta["tenants"][1] > delta["tenants"][0]
        and (
            float(delta["totalRevenue"][1]) > float(delta["totalRevenue"][0])
            or int(delta["paidPayments"][1]) > int(delta["paidPayments"][0])
        )
    )
    add(
        "8-stats-delta",
        f"{BASE}/admin",
        "(verify)",
        "GET",
        "/api/dashboard/stats",
        200,
        stats_ok,
        None if stats_ok else f"stats did not increase: {delta}",
        delta,
    )
    print("STATS_DELTA", json.dumps(delta))

    # 9-12 Tenant portal (pages are client-rendered shells; APIs prove data loop)
    signin(tenant, EMAIL, PASS, "tenant", f"{BASE}/auth/tenant/signin")
    page_check(tenant, "9-tenant-home", "/tenant", "Payment", client_rendered=True)
    api_check(tenant, "9-tenant-profile-api", f"{BASE}/tenant", "(page data)", "GET", "/api/tenant/profile")
    api_check(tenant, "9b-tenant-payments-api", f"{BASE}/tenant", "(page data)", "GET", "/api/tenant/payments")
    page_check(tenant, "10-tenant-profile", "/tenant/profile", "Profile", client_rendered=True)
    api_check(tenant, "10-tenant-profile-api", f"{BASE}/tenant/profile", "(page data)", "GET", "/api/tenant/profile")
    page_check(tenant, "11-tenant-payments", "/tenant/payments", "Payment", client_rendered=True)
    api_check(tenant, "11-tenant-payments-api", f"{BASE}/tenant/payments", "(page data)", "GET", "/api/tenant/payments")
    page_check(tenant, "12-tenant-maintenance-page", "/tenant/maintenance", "Maintenance", client_rendered=True)
    api_check(
        tenant,
        "12-submit-maintenance",
        f"{BASE}/tenant/maintenance",
        "Submit Request",
        "POST",
        "/api/tenant/maintenance",
        {
            "title": "UI smoke leak",
            "description": "Faucet dripping during UI core loop smoke test",
            "category": "plumbing",
            "priority": "medium",
        },
    )
    api_check(
        tenant,
        "12b-list-maintenance",
        f"{BASE}/tenant/maintenance",
        "(reload list)",
        "GET",
        "/api/tenant/maintenance",
    )

    # Dashboard widget APIs (called from /admin client widgets)
    api_check(
        admin,
        "13-dashboard-active-tenants",
        f"{BASE}/admin",
        "(ActiveTenantsList mount)",
        "GET",
        "/api/admin/dashboard/active-tenants",
    )
    api_check(
        admin,
        "13b-dashboard-notifications",
        f"{BASE}/admin",
        "(NotificationsWidget mount)",
        "GET",
        "/api/admin/dashboard/notifications",
    )
    api_check(
        admin,
        "13c-dashboard-activity-logs",
        f"{BASE}/admin",
        "(ActivityLogsWidget mount)",
        "GET",
        "/api/admin/dashboard/activity-logs",
    )
    # Known bad path seen in logs (route does not exist)
    code, parsed, raw = admin.request("GET", "/api/admin/dashboard")
    add(
        "13d-missing-admin-dashboard-api",
        f"{BASE}/admin",
        "(stale/wrong client call)",
        "GET",
        "/api/admin/dashboard",
        code,
        code == 404,
        None if code == 404 else f"expected 404, got {code}",
        parsed if isinstance(parsed, (dict, list)) else raw[:400],
    )

    print("\n======== REPORT ========")
    fails = [r for r in REPORT if not r.ok]
    print(f"TOTAL {len(REPORT)} | PASS {len(REPORT) - len(fails)} | FAIL {len(fails)}\n")
    print(
        f"{'STEP':<30} {'HTTP':<5} {'OK':<5} {'PAGE':<48} {'BUTTON':<30} {'API':<42} ERROR"
    )
    print("-" * 190)
    for r in REPORT:
        print(
            f"{r.step:<30} {r.httpStatus:<5} {str(r.ok):<5} {r.pageUrl[-48:]:<48} "
            f"{r.button[:30]:<30} {r.api[:42]:<42} {r.error or ''}"
        )

    out_path = "/tmp/ui_smoke_report.json"
    with open(out_path, "w") as f:
        json.dump([asdict(r) for r in REPORT], f, indent=2)
    print(f"\nWrote {out_path}")

    if fails:
        print("\nFAILURES DETAIL:")
        for r in fails:
            print(json.dumps(asdict(r), indent=2))
        raise SystemExit(1)
    print("\nALL STEPS PASSED")


if __name__ == "__main__":
    main()
