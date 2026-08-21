---
name: vercel-prod-deploy
description: >-
  Inspect Git vs Vercel production, then deploy to
  https://parenta-nextjs.vercel.app when GitHub auto-deploy did not fire.
  Use when the user asks to deploy to Vercel, says the latest Vercel deploy
  is hours old, local/landing/admin differs from vercel.app, Vercel is
  missing a new image or UI, or to confirm production was updated.
---

# Vercel production deploy

Pushing to GitHub does **not** guarantee Vercel rebuilt. This project’s GitHub auto-deploy often misses `main` (no check runs, 0 deployments for the new SHA). Treat CLI production deploy as the reliable path.

Do this only when the user wants Vercel updated (deploy, “make vercel match local”, “latest deploy was N hours ago”, confirm vercel.app has the new UI).

Hostinger (`https://parenta.com.mx`) is a **separate** pipeline. Never claim it updated because Vercel did.

## Safety

- Never commit unless the user asked to commit/push
- Never force-push
- Never upload `.env*`, credentials, or `public/uploads/documents/`
- Do not `vercel --prod` as a drive-by after an unrelated task

## 1. Inspect (parallel)

From the repo root:

```bash
git status -sb
git rev-parse HEAD origin/main
git log -1 --oneline
npx vercel ls --limit 3
```

Also:

```bash
gh api repos/onephdevs/parenta-nextjs/commits/main --jq '{sha:.sha, message:.commit.message}'
gh api repos/onephdevs/parenta-nextjs/deployments?environment=Production --jq '.[0] | {sha, created:.created_at}'
curl -sI 'https://parenta-nextjs.vercel.app/' | head -15
```

Decide:

| Git `HEAD` vs Vercel production SHA | Action |
|---|---|
| Same SHA, UI still old | Hard-refresh / incognito; re-check a new asset URL |
| Git ahead, Vercel on older SHA (typical) | CLI deploy |
| Uncommitted product files the user wants live | Include them in the CLI upload; say GitHub does not have them yet |
| User only asked “does Vercel work?” | Report; do **not** deploy |

Old vs new admin (quick tell):

- **Stale:** purple sidebar, six Needs Attention cards, Active tenants table
- **Current:** navy `#252A45` / teal `#39CCCC` nav, Plane-style home (quick links, ledger, stickies)

Landing hero file: `/brand/hero-room.jpg` — `404` means this production build predates that commit.

## 2. Deploy

Working tree (includes uncommitted files Vercel should get):

```bash
npx vercel deploy --prod --yes
```

Expect ~1–5 minutes (upload + Next.js build). Do not kill it while `Building…` is printing.

If `osxkeychain` hangs on a **git** push in the same session, use:

```bash
git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin HEAD
```

Git push still does not replace this CLI deploy until auto-deploy is proven healthy again.

## 3. Verify

After exit 0 and `Aliased https://parenta-nextjs.vercel.app`:

```bash
npx vercel ls --limit 2
curl -sI 'https://parenta-nextjs.vercel.app/' | head -12
curl -sI 'https://parenta-nextjs.vercel.app/brand/hero-room.jpg' | head -12
```

Pass when:

- Newest row is **Ready / Production** and age is minutes, not hours
- Homepage `200`
- Probe assets that were missing on the stale build (`hero-room.jpg` → `200`, `content-type: image/jpeg`)

## 4. Report

Tell the user:

- Production URL: https://parenta-nextjs.vercel.app
- Inspect URL from the CLI output
- Git SHA local/`origin/main` vs previous Vercel SHA
- Whether the upload included **uncommitted** files
- Hard-refresh `/` and `/admin` (or incognito)
- Hostinger was **not** updated

## Examples

**User:** “I see that vercel latest deploy was 6hrs ago”  
→ Inspect; if Git is ahead, `vercel deploy --prod --yes`; verify alias + hero image.

**User:** “local landing differs from parenta-nextjs.vercel.app”  
→ Compare SHAs and `/brand/hero-room.jpg`; deploy if production is behind.

**User:** “confirm that vercel works” (screenshot of old purple admin)  
→ Vercel is up but stale; say so; deploy only if they want it updated.
