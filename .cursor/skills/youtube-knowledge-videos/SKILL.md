---
name: youtube-knowledge-videos
description: >-
  Upload office knowledge-base walkthrough .webm files to YouTube as unlisted,
  then wire video ids into KNOWLEDGE_YOUTUBE_IDS so the admin lesson player
  embeds them. Use when the user mentions YouTube knowledge-base videos,
  unlisted walkthroughs, GOOGLE_CLIENT_ID, youtube-auth, youtube-upload,
  missing lesson players on production, or replacing Vercel Blob video hosting.
---

# YouTube knowledge-base videos

Recordings live in `public/knowledge-base/videos/{slug}.webm` (gitignored). Production must **not** serve those files from Vercel Blob or `public/` — the lesson player embeds unlisted YouTube.

Do this only when the user wants videos uploaded, re-uploaded, or wired into the knowledge base.

## Safety

- Never read or print `.env*`, `GOOGLE_CLIENT_SECRET`, or `scripts/.youtube-oauth.json`
- Never commit `scripts/.youtube-oauth.json`, `.env*`, or `public/knowledge-base/videos/*.webm`
- Never log in with the user’s Google password; they complete the browser consent page
- Do not re-upload files to Vercel Blob
- Do not commit or `vercel --prod` unless the user asked

## Prerequisites

Env (`.env` or `.env.local`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

Google Cloud OAuth client must include this **Authorized redirect URI** (use `127.0.0.1`, not `localhost`):

```
http://127.0.0.1:8765/oauth2callback
```

Also: YouTube Data API v3 enabled. If the OAuth app is in Testing, the Google account must be a test user.

Local files: `public/knowledge-base/videos/*.webm` (copy from `recordings/` after Playwright training recordings).

Dev dependency: `googleapis`.

## Workflow

Run from the repo root.

### 1. Sign in (if needed)

Token file is `scripts/.youtube-oauth.json` (gitignored). If it is missing:

```bash
node scripts/youtube-auth.mjs
```

A Google tab opens. Wait until the local page says **YouTube connected**. If the callback never arrives, the redirect URI is wrong or the user closed Google before the local page loaded. Re-run auth; do not invent a token.

Confirm without printing secrets:

```bash
node -e "const t=require('./scripts/.youtube-oauth.json'); console.log('has_refresh', Boolean(t.refresh_token))"
```

### 2. Upload unlisted videos

Skips slugs already in `scripts/.youtube-video-ids.json`.

```bash
# all missing
node scripts/youtube-upload-knowledge-videos.mjs

# one lesson
node scripts/youtube-upload-knowledge-videos.mjs add-unit
```

Uploads use `privacyStatus: unlisted` and title `Parenta — {slug with spaces}`.

Default YouTube API quota is 10,000 units/day; `videos.insert` is 1,600 units each. If a run fails with quota, stop and resume later — the id map keeps finished slugs.

### 3. Wire ids into the app

Merge `scripts/.youtube-video-ids.json` into `KNOWLEDGE_YOUTUBE_IDS` in `src/lib/knowledge-base/articles.ts` (11-char ids or `https://youtu.be/...`).

The article loop already sets `youtubeId` from that map. `KnowledgeArticleView` embeds `https://www.youtube-nocookie.com/embed/{id}?rel=0`. Local `next dev` still plays `.webm` from `public/` when no YouTube id is set.

### 4. Production

If the user wants vercel.app updated, follow the `vercel-prod-deploy` skill (`npx vercel deploy --prod --yes`). Hostinger is a separate pipeline.

YouTube may still be processing for a few minutes after upload; a black embed can mean encoding, not a missing id.

## Do not

- Put `.webm` in git or in the Vercel upload (`.vercelignore` already excludes them)
- Use `<video src="https://youtu.be/...">` — YouTube requires the iframe embed
- Share or commit OAuth client secrets
