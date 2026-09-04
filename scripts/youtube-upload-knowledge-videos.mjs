import { createReadStream } from 'node:fs';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const tokenPath = path.resolve('scripts/.youtube-oauth.json');
const mapPath = path.resolve('scripts/.youtube-video-ids.json');
const videosDir = path.resolve('public/knowledge-base/videos');

let tokens;
try {
  tokens = JSON.parse(await readFile(tokenPath, 'utf8'));
} catch {
  console.error('Not signed in. Run: node scripts/youtube-auth.mjs');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
oauth2.setCredentials(tokens);
oauth2.on('tokens', async (fresh) => {
  const merged = { ...tokens, ...fresh };
  await writeFile(tokenPath, JSON.stringify(merged, null, 2));
});

const youtube = google.youtube({ version: 'v3', auth: oauth2 });
const files = (await readdir(videosDir)).filter((name) => name.endsWith('.webm')).sort();
let idMap = {};
try {
  idMap = JSON.parse(await readFile(mapPath, 'utf8'));
} catch {
  idMap = {};
}

const only = process.argv.slice(2);
const pending = files.filter((file) => {
  const slug = file.replace(/\.webm$/, '');
  if (only.length && !only.includes(slug) && !only.includes(file)) return false;
  return !idMap[slug];
});

if (!pending.length) {
  console.log('All videos already have YouTube ids in scripts/.youtube-video-ids.json');
  process.exit(0);
}

console.log(`Uploading ${pending.length} unlisted video(s)`);

for (const file of pending) {
  const slug = file.replace(/\.webm$/, '');
  const title = `Parenta — ${slug.replace(/-/g, ' ')}`;
  const filePath = path.join(videosDir, file);
  console.log(`Uploading ${slug}…`);
  try {
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description: `Office knowledge-base walkthrough (${slug}).`,
          tags: ['Parenta', 'training', slug],
          categoryId: '27',
        },
        status: {
          privacyStatus: 'unlisted',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: createReadStream(filePath),
      },
    });
    const id = res.data.id;
    if (!id) throw new Error('YouTube returned no video id');
    idMap[slug] = id;
    await writeFile(mapPath, JSON.stringify(idMap, null, 2));
    console.log(`  https://youtu.be/${id}`);
  } catch (err) {
    const message = err?.errors?.[0]?.message || err?.message || String(err);
    console.error(`  failed: ${message}`);
    if (/quota/i.test(message)) {
      console.error('YouTube default quota is 10,000 units/day; each upload costs 1,600. Stopped.');
      break;
    }
    process.exitCode = 1;
  }
}

console.log('Id map:', mapPath);
