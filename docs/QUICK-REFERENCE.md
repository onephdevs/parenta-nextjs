# Alfonso — Quick reference

## Production

```
https://parenta-nextjs.vercel.app
```

Admin sign-in: `/auth/admin/signin`  
Tenant sign-in: `/auth/tenant/signin`

## Local development

```bash
cp .env.example .env.local   # fill DATABASE_URL, NEXTAUTH_*, etc.
npm install
npm run dev                  # http://localhost:3030
```

## Deploy (Vercel)

```bash
# From repo root (requires vercel login)
vercel --prod

# Or push to main if GitHub ↔ Vercel integration is connected
git push origin main
```

Required production env (Vercel dashboard → Project → Settings → Environment Variables):

- `DATABASE_URL`, `DIRECT_URL`
- `NEXTAUTH_URL` = `https://parenta-nextjs.vercel.app`
- `NEXTAUTH_SECRET`
- `BLOB_READ_WRITE_TOKEN` (uploads)
- Optional: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`

## Useful Vercel CLI

```bash
vercel whoami
vercel env ls
vercel logs parenta-nextjs.vercel.app
vercel inspect parenta-nextjs.vercel.app
```

## Database

Supabase PostgreSQL (external). App hosting is Vercel only.

## Legacy Hostinger

Hostinger/PM2 scripts under `scripts/deploy-*.sh` and `scripts/ssh-hostinger.sh` are **legacy**. Do not use for production. If an old PM2 process is still running on Hostinger, stop it:

```bash
# Only if scripts/.deploy-secrets is configured locally
./scripts/ssh-hostinger.sh stop
```
