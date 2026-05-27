# PHASE 14 — Inbox Monitor (Gmail Auto-Classify)

## Goal
Automatically read the user's Gmail, classify each job-related email (interview invite,
rejection, follow-up request, offer), and surface them as actionable cards.
This is the "close the loop" phase — after applying, users need to know what came back.

## What This Removes (Manual Steps Eliminated)
- Manually scanning inbox for job replies
- Guessing if a vague reply is a rejection or a delay
- Forgetting to respond to an interview invite
- Losing track of which company replied

---

## Backend Endpoints Needed
Add these to api/server.js if they don't exist:

```
GET  /api/inbox/messages          → classified inbox items
GET  /api/inbox/unread-count      → count of unread/unactioned items
POST /api/inbox/sync              → trigger Gmail sync + classify
POST /api/inbox/:id/action        → mark actioned / archive / snooze
GET  /api/inbox/gmail-status      → is Gmail connected, last sync time
```

---

## Prompt for Claude Code

```
Phases 1–13 complete. App is live with freelance flow.
Now build the Inbox Monitor — the page that auto-classifies job-related emails.

---

STEP A — Add backend endpoints to api/server.js

Add these routes if they do not already exist. Use requireAuth on all.

  // Get classified inbox items for this user
  app.get('/api/inbox/messages', requireAuth, (req, res) => {
    try {
      const { type, limit, unread } = req.query
      let msgs = db.getInboxMessages ? db.getInboxMessages(req.userId) : []
      if (type)   msgs = msgs.filter(m => m.type === type)
      if (unread === 'true') msgs = msgs.filter(m => !m.actioned)
      if (limit)  msgs = msgs.slice(0, parseInt(limit) || 50)
      res.json(msgs)
    } catch (e) { res.json([]) }
  })

  // Unread count (used by sidebar badge)
  app.get('/api/inbox/unread-count', requireAuth, (req, res) => {
    try {
      const msgs = db.getInboxMessages ? db.getInboxMessages(req.userId) : []
      const count = msgs.filter(m => !m.actioned && m.type !== 'unknown').length
      res.json({ count })
    } catch (e) { res.json({ count: 0 }) }
  })

  // Trigger Gmail sync
  app.post('/api/inbox/sync', requireAuth, async (req, res) => {
    try {
      // Fire the inbox sync agent if it exists
      if (typeof runInboxSync === 'function') {
        runInboxSync(req.userId).catch(e => console.error('Inbox sync error:', e))
      }
      res.json({ started: true, message: 'Sync started — refresh in ~30 seconds' })
    } catch (e) { res.json({ started: false, error: e.message }) }
  })

  // Mark message as actioned/archived/snoozed
  app.post('/api/inbox/:id/action', requireAuth, (req, res) => {
    try {
      const { action } = req.body // 'actioned' | 'archived' | 'snoozed'
      if (db.updateInboxMessage) db.updateInboxMessage(req.userId, req.params.id, { actioned: true, action })
      res.json({ ok: true })
    } catch (e) { res.json({ ok: false }) }
  })

  // Gmail connection status
  app.get('/api/inbox/gmail-status', requireAuth, (req, res) => {
    try {
      const connected = !!(process.env.GOOGLE_CLIENT_ID && db.getGmailToken?.(req.userId))
      const lastSync = db.getLastInboxSync?.(req.userId) || null
      res.json({ connected, lastSync })
    } catch (e) { res.json({ connected: false, lastSync: null }) }
  })

After adding endpoints, restart: pm2 restart job-autopilot-api
Verify: curl http://localhost:3001/api/inbox/unread-count → { count: 0 }

---

STEP B — CREATE dashboard/src/pages/Inbox.jsx

Props: navigate (fn), user (object)

---

FETCH on mount:
  GET /api/inbox/gmail-status   → { connected, lastSync }
  GET /api/inbox/messages       → all classified messages

---

PAGE HEADER:
  Title: "Inbox" + 📩 emoji
  Subtitle: "Job-related emails, auto-classified and ready to action."
  
  Right side:
    [🔄 Sync Now] button (secondary)
      → POST /api/inbox/sync
      → Show "Syncing..." state for 5 seconds
      → Re-fetch messages
      → Toast "Sync complete — {N} new messages"
    
    "Last synced: {time} ago" in grey below button, or "Never synced"

---

NOT CONNECTED BANNER:
  Show if gmailStatus.connected === false
  
  Large centered empty state:
    📩 emoji
    "Connect Gmail to monitor your inbox"
    "We'll automatically find and classify job-related emails — interview invites, rejections, follow-up requests."
    [Connect Gmail →] link → /auth/google?scope=gmail
    
    Feature list (3 small items):
      ✓ Only reads job-related emails
      ✓ Never sends emails on your behalf without your approval
      ✓ You can disconnect anytime in Settings

  Do NOT show the rest of the page if not connected.

---

CONNECTED STATE:

TYPE FILTER TABS:
  [All] [🎯 Interviews] [❌ Rejections] [📩 Replies] [⏳ Follow-up Needed] [❓ Unknown]
  Show count in each tab, e.g. "Interviews (2)"
  Active tab: green underline

---

MESSAGE CARDS:

Group messages by date: Today | Yesterday | This Week | Older

Each card:
  Left: type emoji + colored left border:
    interview      → 🎯 green border
    rejection      → ❌ red border, opacity 0.7
    reply          → 📩 blue border
    offer          → 🎉 green border (brightest)
    follow_up_request → ⚡ yellow border
    unknown        → 📧 grey border

  Content:
    From: sender name + email (grey)
    Subject line (bold, 14px)
    AI classification: type badge + confidence indicator if < 80%
    Matched application: "Re: {role} at {company}" (grey, linked to pipeline)
    Preview: first 100 chars of email body (grey, italic)
    Time received: relative (2 hours ago / yesterday)

  Actions (right side, based on type):
    interview:
      [Schedule Interview 📅] (green) → copies calendar details / opens calendar link
      [Mark as Actioned] (ghost)
    rejection:
      [Log & Close] (ghost) → PATCH application status to 'rejected' → toast
      [Mark as Read] (ghost)
    offer:
      [🎉 View Offer] (green) → opens modal with full email
      [Mark as Actioned] (ghost)
    reply / unknown:
      [View Full Email] (secondary) → opens email modal
      [Mark as Read] (ghost)

  If actioned: card is dimmed (opacity 0.5), "✓ Done" label, move to bottom

---

EMAIL PREVIEW MODAL (reuse Modal component):
  Title: "Email from {sender}"
  From / Subject / Date (header row)
  
  AI Classification section (card):
    Type badge
    Confidence: "92% confident this is an interview invite"
    Matched to: "{role} at {company}" with link to pipeline
    If < 70% confidence: "⚠️ Low confidence — please verify"

  Email body (scrollable, monospace, background var(--surface))

  Action buttons at bottom:
    Depends on type — same actions as card

---

ZERO UNREAD STATE (when all messages are actioned):
  ✅ "You're all caught up!"
  "New replies will appear here automatically after each sync."
  [Sync Now] button

---

EMPTY STATE (no messages at all, connected):
  📭 "No job emails found yet"
  "Sync your inbox or wait — we check for new emails every hour"
  [Sync Now] button

---

WIRE INTO App.jsx:
  Import Inbox from './pages/Inbox'
  case 'inbox': return <Inbox navigate={navigate} user={user} />

  The sidebar badge for Inbox (inboxCount) was already wired in Phase 3.
  The badge polls /api/inbox/unread-count every 60 seconds.

---

TEST:
  Navigate to Inbox.
  Not connected: shows connection prompt (no message list).
  Connect Gmail in Settings → come back → shows message list (or empty state).
  Sync Now: shows "Syncing..." state → toast on complete.
  If messages exist: cards show with correct type icons and borders.
  Tab filters work.
  Log & Close (on rejection): updates application status → toast.
  Mark as Actioned: dims the card and moves it to bottom.
  Sidebar badge: shows correct unread count, updates when messages actioned.
  Stop here.
```

---

## ✅ Phase 14 Complete When
- [ ] Gmail not-connected banner shows when disconnected
- [ ] Messages classified into correct type tabs
- [ ] Sidebar badge shows unread count
- [ ] Sync Now button works
- [ ] "Log & Close" rejection action updates application status
- [ ] Email preview modal opens
- [ ] No console errors
