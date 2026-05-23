# Phase 13 — Approval Workflow
## Goal
Every tailored resume requires user approval before applying.
System auto-tailors for jobs scoring 7.5+. User sees split-screen
job vs tailored resume, can edit inline, then approves.
Approved applications move to Apply Queue.

---

## No New Dependencies

---

## New DB Tables (add to initDB)

```sql
CREATE TABLE IF NOT EXISTS approval_queue (
  id TEXT PRIMARY KEY,
  application_id TEXT,
  company TEXT,
  role TEXT,
  job_url TEXT,
  fit_score REAL,
  verdict TEXT,
  job_description TEXT,
  tailored_resume TEXT,
  cover_letter TEXT,
  status TEXT DEFAULT 'pending',
  -- pending | approved | edited | skipped
  created_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS apply_queue (
  id TEXT PRIMARY KEY,
  approval_id TEXT,
  company TEXT,
  role TEXT,
  job_url TEXT,
  fit_score REAL,
  tailored_resume TEXT,
  cover_letter TEXT,
  added_at TEXT DEFAULT (datetime('now')),
  applied_at TEXT,
  status TEXT DEFAULT 'ready'
  -- ready | applied | skipped
);
```

Add to db.js exports:
- `addToApprovalQueue(data)` — insert approval queue item
- `getApprovalQueue(status)` — get items by status (default: 'pending')
- `updateApprovalStatus(id, status, editedResume, editedCoverLetter)` — update item
- `addToApplyQueue(data)` — insert apply queue item
- `getApplyQueue(status)` — get items by status
- `markApplied(id)` — set apply_queue status to 'applied', applied_at to now
- `getApprovalStats()` — return counts: pending, approved, skipped

---

## Auto-Tailor Trigger

### Update `discovery/auto-scorer.js`
After scoring each job, if score >= AUTO_TAILOR_THRESHOLD (7.5):
- Call tailorResume + generateCoverLetter in parallel
- Call addToApprovalQueue with all data
- Print: `  ✦ [score] ${title} — queued for approval`

AUTO_TAILOR_THRESHOLD reads from core/config.json `autoTailorThreshold` (default 7.5).

---

## New API Endpoints (add to server.js)

**GET /api/approval-queue**
Returns all items with status='pending', ordered by fit_score DESC.
Each item includes: id, company, role, job_url, fit_score, verdict,
job_description, tailored_resume, cover_letter, created_at.

**GET /api/approval-queue/stats**
Returns: `{ pending: N, approved: N, skipped: N, applyReady: N }`

**POST /api/approval-queue/:id/approve**
Body: `{ resume: "final resume text", coverLetter: "final cover letter" }`
- Update approval_queue status to 'approved', reviewed_at to now
- Add to apply_queue
- Update applications table status to 'approved'
- Return: `{ success: true }`

**POST /api/approval-queue/:id/skip**
- Update status to 'skipped'
- Return: `{ success: true }`

**GET /api/apply-queue**
Returns all items with status='ready', ordered by added_at DESC.

**POST /api/apply-queue/:id/mark-applied**
- Update apply_queue: status='applied', applied_at=now
- Update applications table: status='applied', applied_at=now
- Sync to Google Sheets
- Return: `{ success: true }`

---

## Update `scripts/daily-scan.js`
At end of morning brief, print approval queue summary:
```
⏳ APPROVAL QUEUE
  Pending review: 3 packages
  Ready to apply: 2 approved packages
  → Open dashboard to review
```

---

## Done Test
```bash
# Test 1 — manually add item to approval queue
node -e "
require('dotenv').config()
const { initDB, addToApprovalQueue } = require('./services/db')
initDB()
addToApprovalQueue({
  id: 'AQ-' + Date.now(),
  application_id: 'J-test',
  company: 'Shopify',
  role: 'Operations Manager',
  job_url: 'https://example.com',
  fit_score: 8.2,
  verdict: 'STRONG MATCH',
  job_description: 'Test JD...',
  tailored_resume: '# Sai Pendyala\n\nTest resume...',
  cover_letter: 'Test cover letter...'
})
console.log('Added to queue')
"

# Test 2 — get approval queue
curl http://localhost:3001/api/approval-queue
# Expected: array with 1 item

# Test 3 — approve it
curl -X POST http://localhost:3001/api/approval-queue/AQ-{id}/approve \
  -H "Content-Type: application/json" \
  -d '{"resume":"# Sai Pendyala\n\nEdited...","coverLetter":"Edited cover letter"}'
# Expected: {"success":true}

# Test 4 — check apply queue
curl http://localhost:3001/api/apply-queue
# Expected: 1 item with status 'ready'

# Test 5 — mark applied
curl -X POST http://localhost:3001/api/apply-queue/{id}/mark-applied
# Expected: {"success":true}
```

Phase 13 complete when full approval → apply queue flow works.
