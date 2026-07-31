# Shared UI

Phase 3 shared-component layer is **complete**.

## Decisions

- Admin CTAs: `Button` primary (purple)
- Tenant CTAs: `Button variant="success"` (green)
- Toasts: `@/hooks/useNotifications` (wraps `NotificationContext`)
- Domain status colors: `@/components/domain/StatusBadges`

## Layout

```
src/components/
  ui/        # Button, Input, Select, Card, Dialog, Badge, Avatar, …
  forms/     # FormField, FormErrorBanner
  layout/    # PageHeader, AdminLayoutClient, …
  domain/    # StatusBadges
  features/  # Feature screens compose the above
```

## Residuals (optional later)

- No shared `Radio` yet (room deposit radios stay native)
- Pre-existing NextAuth `session.user.role` typing gaps
- Room/Building cards can reuse TenantCard equal-height pattern in a separate pass

Historical audit/plan dumps live in `docs/archive/`.
