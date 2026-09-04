import { del, list } from '@vercel/blob';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('BLOB_READ_WRITE_TOKEN is missing');
  process.exit(1);
}

const prefix = 'knowledge-base/videos/';
const urls = [];
let cursor;

do {
  const page = await list({ prefix, cursor, token, limit: 1000 });
  for (const blob of page.blobs) {
    urls.push(blob.url);
    console.log('queued', blob.pathname);
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

if (!urls.length) {
  console.log('No knowledge-base videos in Blob');
  process.exit(0);
}

await del(urls, { token });
console.log(`Deleted ${urls.length} blobs`);
