import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
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

const PORT = Number(process.env.YOUTUBE_OAUTH_PORT || 8765);
const redirectUri = `http://127.0.0.1:${PORT}/oauth2callback`;
const tokenPath = path.resolve('scripts/.youtube-oauth.json');

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ],
});

console.log('Add this Authorized redirect URI on the OAuth client if Google shows an error:');
console.log(`  ${redirectUri}`);
console.log('');
console.log('Enable YouTube Data API v3 on the same Google Cloud project.');
console.log('If the app is in Testing, add your Google account as a test user.');
console.log('');
console.log('Opening Google sign-in in your browser…');
console.log(authUrl);
console.log('');

exec(`open '${authUrl.replace(/'/g, "'\\''")}'`);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    if (url.pathname !== '/oauth2callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const error = url.searchParams.get('error');
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end(`Google returned: ${error}`);
      console.error('OAuth error:', error);
      server.close();
      process.exit(1);
    }

    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing code');
      return;
    }

    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('No refresh token. Remove the app from Google account permissions and try again.');
      console.error('Token response had no refresh_token');
      server.close();
      process.exit(1);
    }

    await writeFile(tokenPath, JSON.stringify(tokens, null, 2));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<p>YouTube connected. You can close this tab and return to Cursor.</p>');
    console.log('Saved refresh token to scripts/.youtube-oauth.json (gitignored)');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('OAuth failed. Check the terminal.');
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Waiting for Google redirect on ${redirectUri}`);
});
