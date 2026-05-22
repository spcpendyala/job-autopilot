const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

async function getRecentEmails(daysBack) {
  try {
    const auth = getAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const after = Math.floor((Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000);
    const q = `after:${after} (subject:application OR subject:interview OR subject:position OR subject:opportunity OR subject:"thank you for applying" OR subject:offer OR subject:assessment)`;

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: 50,
    });

    const messages = listRes.data.messages || [];
    const results = [];

    for (const msg of messages) {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = detail.data.payload.headers || [];
      const get = (name) => (headers.find(h => h.name === name) || {}).value || '';

      results.push({
        messageId: msg.id,
        subject: get('Subject'),
        from: get('From'),
        date: get('Date'),
        snippet: detail.data.snippet || '',
      });
    }

    return results;
  } catch (err) {
    console.error('Gmail API error:', err.message);
    return [];
  }
}

module.exports = { getRecentEmails };
