# Phase 3 — Tracker + Follow-up
## Goal
Every application is logged, tracked, and followed up automatically.
Gmail scanned for responses. Recruiter info found. Follow-up emails drafted.
Morning brief printed to terminal every day.

---

## New Dependencies
```bash
npm install googleapis node-cron
```

---

## Files to Create

### 1. `scripts/setup-google.js`
Google OAuth setup wizard. Run once to authenticate.

Requirements:
- Read GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from .env
- Throw clear error if either is missing with message: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env — get them from console.cloud.google.com"
- Create OAuth2 client with redirect URI: `http://localhost:8888/callback`
- Required scopes:
  - https://www.googleapis.com/auth/gmail.readonly
  - https://www.googleapis.com/auth/spreadsheets
  - https://www.googleapis.com/auth/drive
- Generate auth URL and print it: "Open this URL in your browser: [url]"
- Spin a temporary Express server on port 8888 to catch the OAuth callback
- When callback received, exchange code for tokens
- Save tokens to `core/google-token.json`
- Print "✅ Google auth complete. Token saved to core/google-token.json"
- Shut down the temp server after saving

Add to package.json scripts: `"setup-google": "node scripts/setup-google.js"`

---

### 2. `services/google-auth.js`
Shared Google auth helper. All Google services use this.

Requirements:
- Export: `getAuthClient()`
- Read GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET from env
- Read token from `core/google-token.json`
- Throw clear error if token file doesn't exist: "Run `npm run setup-google` first"
- Return configured OAuth2 client with credentials set

---

### 3. `services/sheets.js`
Google Sheets sync. Write-only from the app — Sheets is a view, SQLite is truth.

Requirements:
- Export: `syncToSheets(applicationData)`, `updateSheetStatus(jobId, status, notes)`
- Read TRACKING_SHEET_ID from .env — if missing, log warning and return (don't crash)
- Sheet name: "Applications"
- Column order (A through K):
  A: Job ID | B: Company | C: Role | D: Fit Score | E: Verdict |
  F: Status | G: Applied At | H: Job URL | I: Drive URL | J: Response Date | K: Notes
- `syncToSheets`: append one row using spreadsheets.values.append
- `updateSheetStatus`: find row by Job ID in column A, update columns F, J, K
- If Sheets API call fails, log the error but do NOT throw — app continues without Sheets

---

### 4. `services/gmail.js`
Gmail reader. Scan for job application responses.

Requirements:
- Export: `getRecentEmails(daysBack)`
- Use getAuthClient()
- Query: search Gmail for emails in last `daysBack` days
- Gmail search query: `after:[unix_timestamp] (subject:application OR subject:interview OR subject:position OR subject:opportunity OR subject:"thank you for applying" OR subject:offer OR subject:assessment)`
- For each message, fetch metadata: Subject, From, Date headers + snippet
- Return array of: `{ messageId, subject, from, date, snippet }`
- Max 50 results
- If Gmail API fails, return empty array and log error

---

### 5. `agents/response-classifier.js`
Classifies emails as job-related responses using Haiku (cheap — short output).

Requirements:
- Export: `classifyEmail(subject, from, snippet)`
- Use callClaude with tier: 'cheap', maxTokens: 30, useCache: false
- Prompt: classify this email in the context of job applications. Return ONLY one label.
- Valid labels: INTERVIEW_REQUEST | REJECTION | APPLICATION_RECEIVED | ASSESSMENT_SENT | OFFER | FOLLOW_UP_NEEDED | IRRELEVANT
- Parse the response text directly (it's just a label, not JSON)
- Trim and validate — if response isn't one of the valid labels, return 'IRRELEVANT'

---

### 6. `agents/follow-up-drafter.js`
Drafts a personalized follow-up email for a specific application.

Requirements:
- Load profile (cached)
- Export: `draftFollowUp(company, role, daysElapsed, recruiterName)`
- Use callClaude with tier: 'quality', maxTokens: 300, useCache: true
- recruiterName can be empty string — prompt handles both cases

Prompt rules:
- If recruiterName provided: address them by first name
- If not: use "Hiring Team"
- 3 sentences maximum
- Tone: professional, direct, not desperate
- Reference the specific role by name
- Express continued interest, ask for a status update
- Do NOT say "I wanted to follow up" or "just checking in"
- Do NOT use hollow phrases like "I remain very interested"
- Return email body only — no subject line, no sign-off

---

### 7. `scripts/daily-scan.js`
Morning brief. Scans Gmail + surfaces follow-ups needed + syncs statuses.

Requirements:
- `require('dotenv').config()` at top
- Run immediately when called + schedule via node-cron at 8am daily
- Import: getRecentEmails, classifyEmail, draftFollowUp, getAllApplications, updateApplicationStatus
- Also import syncToSheets for any status changes

Pipeline:
1. Print header: `\n⏰ AutoPilot Morning Brief — [date]\n`
2. Get all applications from SQLite where status = 'applied'
3. Scan Gmail for last 24 hours (daysBack: 1)
4. For each email: classify it
5. For INTERVIEW_REQUEST or REJECTION or OFFER: print it clearly, update status in SQLite + Sheets
6. Check which applications hit day 5 with no response (applied_at <= 5 days ago, status still 'applied')
7. For each day-5 application: draft follow-up, print it, ask [Y/n] if user wants to save it
8. If user presses Y: save the draft to `outputs/[folder]/follow-up-draft.md`

Terminal output format:
```
⏰ AutoPilot Morning Brief — May 21, 2026
══════════════════════════════════════════

📬 NEW RESPONSES (2)
  ✅ INTERVIEW_REQUEST — Anthropic (Incident Response Manager)
     From: recruiter@anthropic.com
     "We'd love to schedule a call to discuss..."

  ❌ REJECTION — Acme Corp (Operations Manager)
     From: no-reply@acmecorp.com

📅 FOLLOW-UP DUE (1)
  → Anthropic — Applied May 16 (5 days ago)
    Role: Incident Response Manager, Enforcement

    Draft follow-up:
    ─────────────────
    [generated email body]
    ─────────────────
    Save this draft? [Y/n]:

📊 SUMMARY
  Applied: 3 | Responded: 1 | Interviews: 1 | Rejections: 1
══════════════════════════════════════════
```

Add to package.json scripts: `"scan": "node scripts/daily-scan.js"`

---

## Update `.env.example`
Add these new keys:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TRACKING_SHEET_ID=
DRIVE_FOLDER_ID=
```

---

## Update `services/db.js`
Add these new functions (do not change existing ones):
- `getApplicationsDueFollowUp()` — return all rows where status='applied' AND applied_at <= 5 days ago
- `updateStatus(id, status)` — update status column by job ID
- `getStats()` — return `{ total, applied, responded, interviews, rejections, offers }`

---

## Done Test
```bash
# Test 1 — Google setup (requires real Google credentials in .env)
node scripts/setup-google.js
# Should: open browser URL, catch token, save core/google-token.json

# Test 2 — Daily scan (run after setup-google)
node scripts/daily-scan.js
# Should: print morning brief, show any emails from last 24h, show any day-5 follow-ups

# Test 3 — Follow-up draft
# Manually set an application's applied_at to 5+ days ago in SQLite:
# sqlite3 data/autopilot.db "UPDATE applications SET applied_at='2026-05-15' WHERE id='J-...'"
# Then run: node scripts/daily-scan.js
# Should: show that application in follow-up section with a drafted email
```

Phase 3 is complete when daily-scan.js runs without crashing and prints the morning brief format shown above, even if there are 0 responses and 0 follow-ups due.
