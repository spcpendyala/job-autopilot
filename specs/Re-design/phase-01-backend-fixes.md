# PHASE 1 — Clean Slate + Backend Fixes

## Goal
Verify backend is alive. Delete old frontend. Fix 3 specific API routes.
Do NOT move to Phase 2 until all curl tests pass.

---

## Prompt for Claude Code

```
We are rebuilding the Job AutoPilot dashboard frontend from scratch.
The backend (Node.js, Express, SQLite, AI agents) is working and must not be touched
except for the 3 specific fixes listed below.

---

STEP A — Verify backend is running:

  Run: curl http://localhost:3001/api/health
  Expected: { "status": "ok" }
  If it fails: run `pm2 start job-autopilot-api` and retry.
  If pm2 doesn't exist: run `node api/server.js &` and retry.

---

STEP B — Clean the frontend:

  rm -rf dashboard/src
  mkdir -p dashboard/src/pages dashboard/src/components dashboard/src/lib
  Confirm: dashboard/src is empty except those three empty folders.

---

STEP C — Fix /auth/me in api/server.js

Find the existing GET /auth/me route. Replace its handler with:

  app.get('/auth/me', requireAuth, (req, res) => {
    const adminId = process.env.ADMIN_USER_ID
    res.json({
      user: req.user,
      userId: req.userId,
      isAdmin: !!(adminId && adminId.length > 0 && req.userId === adminId)
    })
  })

---

STEP D — Fix /api/setup-status in api/server.js

Find the existing GET /api/setup-status route. Replace its handler with:

  app.get('/api/setup-status', requireAuth, (req, res) => {
    try {
      let profileApproved = false
      let profileExists = false
      try {
        const status = db.getProfileStatus ? db.getProfileStatus(req.userId) : {}
        profileApproved = status?.approved === 'true' || status?.approved === true
      } catch {}
      try {
        const { getProfilePath } = require('./services/user-paths')
        const fs = require('fs')
        profileExists = fs.existsSync(getProfilePath(req.userId))
      } catch {}
      res.json({
        profileApproved,
        profileExists,
        userId: req.userId,
        checks: {
          apiKey: !!process.env.ANTHROPIC_API_KEY,
          google: !!process.env.GOOGLE_CLIENT_ID,
        }
      })
    } catch (e) {
      res.json({ profileApproved: false, profileExists: false, checks: {} })
    }
  })

---

STEP E — Fix /api/applications in api/server.js

Find the existing GET /api/applications route. Add query param filtering at the top
of its handler, before returning results:

  const { status, limit, followupDue } = req.query
  let apps = db.getAllApplications(req.userId)
  if (status) {
    const statuses = status.split(',')
    apps = apps.filter(a => statuses.includes(a.status))
  }
  if (followupDue === 'true') {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString()
    apps = apps.filter(a =>
      a.applied_at && a.applied_at < fiveDaysAgo && a.status === 'applied'
    )
  }
  if (limit) apps = apps.slice(0, parseInt(limit) || 20)
  res.json(apps)

---

STEP F — Also add these two missing endpoints to api/server.js if they do not exist:

  // Returns pending approval queue count
  app.get('/api/approval-queue/stats', requireAuth, (req, res) => {
    try {
      const queue = db.getApprovalQueue ? db.getApprovalQueue(req.userId) : []
      const pending = queue.filter(i => i.status === 'pending').length
      res.json({ pending, total: queue.length })
    } catch (e) {
      res.json({ pending: 0, total: 0 })
    }
  })

  // Health check (if not already present)
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

---

STEP G — Restart and verify:

  pm2 restart job-autopilot-api
  (or: kill the node process and restart with `node api/server.js &`)

Run all verification tests:

  curl http://localhost:3001/api/health
  → must return: { "status": "ok" }

  curl http://localhost:3001/auth/me
  → must return { user: {...}, userId: "...", isAdmin: bool } OR 401 (both are correct)

  curl http://localhost:3001/api/setup-status
  → must return { profileApproved: bool, profileExists: bool, checks: {...} }
  → must NOT return 500 or crash

  curl "http://localhost:3001/api/applications?status=discovered&limit=5"
  → must return [] or a filtered array, NOT crash

  curl http://localhost:3001/api/approval-queue/stats
  → must return { pending: 0, total: 0 } or real numbers

Do NOT touch any other file.
Stop when all 5 curl tests pass.
```

---

## ✅ Phase 1 Complete When
- [ ] `curl /api/health` → `{ "status": "ok" }`
- [ ] `curl /auth/me` → user object or 401
- [ ] `curl /api/setup-status` → object with profileApproved key
- [ ] `curl /api/applications?status=discovered&limit=5` → array
- [ ] `curl /api/approval-queue/stats` → object with pending key
