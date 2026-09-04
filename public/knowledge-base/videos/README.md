Walkthrough `.webm` files for local playback during `next dev`.

Successful training recordings copy here automatically (same file names as `recordings/`). To copy by hand:

```bash
cp recordings/*.webm public/knowledge-base/videos/
```

These files stay gitignored. Production plays **unlisted YouTube** embeds. Paste each link into `KNOWLEDGE_YOUTUBE_IDS` in `src/lib/knowledge-base/articles.ts`.

Do not re-upload these files to Vercel Blob.
