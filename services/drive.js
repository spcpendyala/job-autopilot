const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

const MIME_TYPES = {
  '.md': 'text/plain',
  '.json': 'application/json',
};

function sanitizeName(str) {
  return (str || 'Unknown').replace(/[^a-zA-Z0-9 \-]/g, '').trim();
}

async function createApplicationFolder(company, role, parentFolderId) {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const date = new Date().toISOString().slice(0, 10);
  const name = `${sanitizeName(company)} — ${sanitizeName(role)} — ${date}`;

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  const folderId = res.data.id;
  return {
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
  };
}

async function uploadFileToDrive(localFilePath, fileName, folderId, mimeType) {
  if (!fs.existsSync(localFilePath)) {
    console.warn(`  ⚠️  File not found, skipping: ${fileName}`);
    return null;
  }

  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const ext = path.extname(fileName).toLowerCase();
  const resolvedMime = mimeType || MIME_TYPES[ext] || 'text/plain';

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: resolvedMime,
      body: fs.createReadStream(localFilePath),
    },
    fields: 'id',
  });

  const fileId = res.data.id;
  return {
    fileId,
    fileUrl: `https://drive.google.com/file/d/${fileId}/view`,
  };
}

async function uploadNewFilesToDrive(localFolderPath, folderId, fileNames) {
  const uploaded = [];
  for (const name of fileNames) {
    const localPath = path.join(localFolderPath, name);
    const result = await uploadFileToDrive(localPath, name, folderId);
    if (result) uploaded.push({ name, fileUrl: result.fileUrl });
  }
  return uploaded;
}

async function syncApplicationToDrive(localFolderPath, company, role) {
  const parentFolderId = process.env.DRIVE_FOLDER_ID;
  if (!parentFolderId) {
    console.log('Drive sync skipped — add DRIVE_FOLDER_ID to .env');
    return null;
  }

  try {
    getAuthClient();
  } catch {
    console.log('Drive sync skipped — run npm run setup-google first');
    return null;
  }

  try {
    const { folderId, folderUrl } = await createApplicationFolder(company, role, parentFolderId);

    const filesToUpload = [
      'resume.md',
      'cover-letter.md',
      'job-description.md',
      'company-brief.json',
      'other-roles.md',
      'score-report.md',
      'interview-prep.md',
      'salary-brief.md',
    ];

    const uploadedFiles = [];
    for (const name of filesToUpload) {
      const localPath = path.join(localFolderPath, name);
      if (!fs.existsSync(localPath)) continue;
      const result = await uploadFileToDrive(localPath, name, folderId);
      if (result) uploadedFiles.push({ name, fileUrl: result.fileUrl });
    }

    return { folderId, folderUrl, uploadedFiles };
  } catch (err) {
    console.error('Drive sync error:', err.message);
    return null;
  }
}

module.exports = { createApplicationFolder, uploadFileToDrive, uploadNewFilesToDrive, syncApplicationToDrive };
