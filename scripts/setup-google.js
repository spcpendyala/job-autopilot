require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env — get them from console.cloud.google.com');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:8888/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];
const TOKEN_PATH = path.join(__dirname, '..', 'core', 'google-token.json');

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
console.log('\nOpen this URL in your browser:', authUrl, '\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) return;

  const code = new URL(req.url, 'http://localhost:8888').searchParams.get('code');
  if (!code) {
    res.end('No code received.');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    res.end('✅ Auth complete. You can close this tab.');
    console.log('✅ Google auth complete. Token saved to core/google-token.json');
  } catch (err) {
    res.end('Error exchanging token: ' + err.message);
    console.error('Token exchange failed:', err.message);
  }

  server.close();
});

server.listen(8888);
