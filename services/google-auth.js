const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, '..', 'core', 'google-token.json');

function getAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env — get them from console.cloud.google.com');
  }

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Run `npm run setup-google` first');
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:8888/callback');
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

module.exports = { getAuthClient };
