# Alfonso Property Management System

Property management app (Next.js 15 + PostgreSQL/Supabase). Admin, tenant, and staff portals.

## Quick start

```bash
cp .env.example .env.local   # fill DATABASE_URL, NEXTAUTH_*, etc.
npm install
npm run dev                  # http://localhost:3030
```

See [docs/ENVIRONMENT-VARIABLES.md](./docs/ENVIRONMENT-VARIABLES.md) and [docs/GMAIL-EMAIL-SETUP.md](./docs/GMAIL-EMAIL-SETUP.md).

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/QUICK-REFERENCE.md](./docs/QUICK-REFERENCE.md) | Common commands + Vercel deploy |
| [docs/UI.md](./docs/UI.md) | Shared UI layer + refactor notes |
| [docs/archive/](./docs/archive/) | Historical session/audit notes |

## Stack

- Next.js 15 App Router, TypeScript, Tailwind
- Auth: NextAuth
- DB: PostgreSQL via `pg` (Supabase)
- Hosting: **Vercel** (`https://parenta-nextjs.vercel.app`)
- Uploads: Vercel Blob (`BLOB_READ_WRITE_TOKEN`)

Deploy: `vercel --prod` (see [docs/QUICK-REFERENCE.md](./docs/QUICK-REFERENCE.md)).

