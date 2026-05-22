# Phase 9 — Google Drive Sync
## Goal
Sync every application package to Google Drive automatically after generation.
Each application gets its own folder in Drive. Files accessible from anywhere,
shareable with recruiters with one link. Drive URL stored in SQLite and Sheets.

---

## No New Dependencies
Uses existing googleapis, google-auth.js, db.js, sheets.js.

---

## Files to Create

### 1. `services/drive.js`

Requirements:
- Import getAuthClient from google-auth.js
- Read DRIVE_FOLDER_ID from .env — if missing, log warning and return null (don't crash)
- Export: `createApplicationFolder`, `uploadFileToDrive`, `syncApplicationToDrive`

**`createApplicationFolder(company, role, parentFolderId)`**
- Create a folder in Drive named: `[Company] — [Role] — [YYYY-MM-DD]`
- Sanitize name: no special chars except dash and space
- Parent: DRIVE_FOLDER_ID from env
- Return: `{ folderId, folderUrl }` where folderUrl = `https://drive.google.com/drive/folders/[folderId]`

**`uploadFileToDrive(localFilePath, fileName, folderId, mimeType)`**
- Upload file from local path to Drive folder
- mimeType for .md files: `text/plain`
- mimeType for .json files: `application/json`
- Return: `{ fileId, fileUrl }` where fileUrl = `https://drive.google.com/file/d/[fileId]/view`
- If file doesn't exist locally: log warning, skip, return null

**`syncApplicationToDrive(localFolderPath, company, role)`**
- Create Drive folder via createApplicationFolder
- Upload all files from localFolderPath:
  - resume.md
  - cover-letter.md
  - job-description.md
  - company-brief.json
  - other-roles.md
  - score-report.md
  - interview-prep.md (if exists)
  - salary-brief.md (if exists)
- Return: `{ folderId, folderUrl, uploadedFiles: [{name, fileUrl}] }`
- If DRIVE_FOLDER_ID not set: return null and log "Drive sync skipped — add DRIVE_FOLDER_ID to .env"
- If getAuthClient throws (no token): return null and log "Drive sync skipped — run npm run setup-google first"

---

### 2. Update `scripts/apply.js`

After saveApplicationPackage() in --full mode, add Drive sync:

```javascript
// After: console.log('✅ Package saved to: ${folderPath}')
const { syncApplicationToDrive } = require('../services/drive');
console.log('☁️  Syncing to Google Drive...');
const driveResult = await syncApplicationToDrive(folderPath, company, role);
if (driveResult) {
  console.log(`✅ Drive folder: ${driveResult.folderUrl}`);
  // Update SQLite with drive URL
  // Update Sheets with drive URL
} else {
  console.log('⏭  Drive sync skipped.');
}
```

Update `saveApplication()` call to include drive_folder_url if available.
Add `drive_folder_url` column update to db.js updateStatus function.

---

### 3. Update `services/db.js`

Add new function:
**`updateDriveUrl(id, driveUrl)`**
- UPDATE applications SET drive_folder_url = ? WHERE id = ?

Export it alongside existing functions.

---

### 4. Update `services/sheets.js`

Update `syncToSheets()` to include driveUrl in column I (Drive URL).
Update `updateSheetStatus()` to also update drive URL if provided.

---

### 5. Update `scripts/prep.js`

After saving interview-prep.md and salary-brief.md locally,
sync the updated folder back to Drive (just upload the new files):

```javascript
const { syncApplicationToDrive } = require('../services/drive');
// Only sync the new files — check if drive_folder_url already exists
// If yes: upload just interview-prep.md and salary-brief.md to existing folder
// If no: sync entire folder
```

Add helper to drive.js:
**`uploadNewFilesToDrive(localFolderPath, folderId, fileNames)`**
- Upload only the specified files to an existing Drive folder
- fileNames: array of filenames to upload

---

### 6. Update `api/server.js`

Add endpoint:

**POST /api/sync-drive/:id**
- Get application from SQLite by ID
- Find local outputs folder for this application
- Call syncApplicationToDrive
- Update drive_folder_url in SQLite
- Return `{ success: true, folderUrl }`

---

### 7. Update Dashboard `ApplicationDetail.jsx`

In the modal footer (or Score tab):
- If drive_folder_url exists: show "☁️ Open in Drive" button linking to the URL
- If not: show "☁️ Sync to Drive" button that calls POST /api/sync-drive/:id
  - Show loading state during sync
  - Show success with link after sync

---

## Update `.env.example`

Add instructions for DRIVE_FOLDER_ID:
```
# Google Drive folder ID where application packages will be synced
# Get from Drive URL: drive.google.com/drive/folders/[THIS_PART]
# Create a folder called "Job AutoPilot Applications" in your Drive first
DRIVE_FOLDER_ID=
```

---

## Done Test
```bash
# Pre-requisite: DRIVE_FOLDER_ID must be set in .env
# Create a folder in Google Drive, copy its ID from the URL

# Test 1 — sync on apply --full
node scripts/apply.js --full "https://job-boards.greenhouse.io/anthropic/jobs/5205495008" "Anthropic" "IR Manager Test"

# Expected output includes:
# ☁️  Syncing to Google Drive...
# ✅ Drive folder: https://drive.google.com/drive/folders/[id]

# Test 2 — verify folder exists in Drive
# Open the URL printed above — should see the folder with 6 files inside

# Test 3 — Drive sync skipped gracefully when DRIVE_FOLDER_ID is empty
# Temporarily remove DRIVE_FOLDER_ID from .env
# Run: node scripts/apply.js --full [url] [company] [role]
# Expected: "⏭  Drive sync skipped." — no crash

# Test 4 — API endpoint
# curl -X POST http://localhost:3001/api/sync-drive/J-[your-id]
# Expected: { success: true, folderUrl: "https://drive.google.com/..." }

# Test 5 — dashboard shows Drive button
# npm run dev → open localhost:5173
# Click on an application → modal opens
# Should show "☁️ Open in Drive" or "☁️ Sync to Drive" button
```

Phase 9 complete when:
- Running --full on a new job creates a Drive folder with files in it
- Drive URL stored in SQLite and visible in dashboard modal
- Sync gracefully skipped if Drive not configured (no crash)
- Existing applications can be synced via dashboard button or API
