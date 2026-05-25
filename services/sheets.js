const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const SHEET_NAME = 'Applications';

function getSheetId() {
  const id = process.env.TRACKING_SHEET_ID;
  if (!id) {
    console.warn('TRACKING_SHEET_ID not set — skipping Sheets sync');
    return null;
  }
  return id;
}

async function syncToSheets(applicationData) {
  if (!process.env.TRACKING_SHEET_ID) return;
  const spreadsheetId = getSheetId();
  if (!spreadsheetId) return;

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const { id, company, role, fit_score, verdict, status, applied_at, job_url, drive_folder_url, notes } = applicationData;
    const row = [id, company, role, fit_score, verdict, status, applied_at, job_url, drive_folder_url, '', notes];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:K`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  } catch (err) {
    console.error('Sheets syncToSheets error:', err.message);
  }
}

async function updateSheetStatus(jobId, status, notes, driveUrl) {
  if (!process.env.TRACKING_SHEET_ID) return;
  const spreadsheetId = getSheetId();
  if (!spreadsheetId) return;

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = readRes.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === jobId);
    if (rowIndex === -1) return;

    const sheetRow = rowIndex + 1;
    const responseDate = new Date().toISOString().slice(0, 10);

    const updateData = [
      { range: `${SHEET_NAME}!F${sheetRow}`, values: [[status]] },
      { range: `${SHEET_NAME}!J${sheetRow}`, values: [[responseDate]] },
      { range: `${SHEET_NAME}!K${sheetRow}`, values: [[notes || '']] },
    ];
    if (driveUrl) updateData.push({ range: `${SHEET_NAME}!I${sheetRow}`, values: [[driveUrl]] });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: updateData },
    });
  } catch (err) {
    console.error('Sheets updateSheetStatus error:', err.message);
  }
}

module.exports = { syncToSheets, updateSheetStatus };
