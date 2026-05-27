# PHASE 15 — Notifications + Market Intelligence

## Goal
Two additions:
1. **In-app notification center** — so users never miss a score result, tailored package, or response
2. **Market Intelligence panel** — trending skills in their target roles, salary data, demand signals

---

## Prompt for Claude Code

```
Phases 1–14 complete.
Now add the notification center and a market intelligence widget.

---

PART A — NOTIFICATION CENTER

---

STEP A1 — Add backend endpoint to api/server.js:

  app.get('/api/notifications', requireAuth, (req, res) => {
    try {
      const notifs = db.getNotifications ? db.getNotifications(req.userId) : []
      res.json(notifs)
    } catch (e) { res.json([]) }
  })

  app.post('/api/notifications/:id/read', requireAuth, (req, res) => {
    try {
      if (db.markNotificationRead) db.markNotificationRead(req.userId, req.params.id)
      res.json({ ok: true })
    } catch (e) { res.json({ ok: false }) }
  })

  app.post('/api/notifications/read-all', requireAuth, (req, res) => {
    try {
      if (db.markAllNotificationsRead) db.markAllNotificationsRead(req.userId)
      res.json({ ok: true })
    } catch (e) { res.json({ ok: false }) }
  })

Restart: pm2 restart job-autopilot-api
Verify: curl http://localhost:3001/api/notifications → []

---

STEP A2 — CREATE dashboard/src/components/NotificationBell.jsx

This is a small bell icon with a badge that sits in the sidebar header area.
Clicking it opens a dropdown panel of recent notifications.

Props: none (fetches its own data)

State:
  notifications[]
  open (bool) — dropdown visible
  unreadCount (number)

Fetch on mount + every 90 seconds:
  GET /api/notifications → set notifications, unreadCount = count where !read

Bell icon (🔔):
  If unreadCount > 0: red dot badge with count
  onClick: toggle open

Dropdown panel (position: absolute, z-index 1000, right-aligned):
  Header: "Notifications" + [Mark all read] (ghost, tiny)
    Mark all: POST /api/notifications/read-all → set all to read

  Notification list (max 8, scrollable):
    Each notification:
      Icon based on type:
        new_package   → ✍️
        discovery     → 🔍
        response      → 📩
        interview     → 🎯
        follow_up_due → ⏰
        system        → ℹ️
      Title (bold, 13px)
      Message (grey, 12px, 2 lines max)
      Time (grey, 11px, right-aligned)
      Unread: left border 2px solid var(--green)
      
      On click:
        POST /api/notifications/:id/read
        Navigate to relevant page (new_package → 'home', response → 'inbox', etc.)
        Close dropdown

  Footer: [View all] → could navigate to a future full notifications page (placeholder for now)

  Empty: "No notifications yet"

Close dropdown: click anywhere outside → onBlur or document click listener

---

STEP A3 — Wire NotificationBell into Sidebar.jsx:

In the Sidebar header area (below the logo row), add:
  import NotificationBell from './NotificationBell'
  
  Add NotificationBell to the logo section, right-aligned:
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ... }}>
      <div>... existing logo ...</div>
      <NotificationBell />
    </div>

---

PART B — MARKET INTELLIGENCE WIDGET

---

STEP B1 — Add backend endpoint:

  app.get('/api/market-intelligence', requireAuth, (req, res) => {
    try {
      const data = db.getMarketIntelligence ? db.getMarketIntelligence(req.userId) : null
      res.json(data || {
        trendingSkills: [],
        salaryRange: null,
        demandSignal: null,
        topCompanies: [],
        lastUpdated: null
      })
    } catch (e) { res.json({ trendingSkills: [], salaryRange: null }) }
  })

---

STEP B2 — CREATE dashboard/src/components/MarketIntel.jsx

A compact, self-contained widget. Designed to be dropped into the Home page sidebar or
as a section at the bottom of the Home page.

Props: targetRoles (array from profile, passed from parent)

Fetch on mount: GET /api/market-intelligence

If no data or lastUpdated is null:
  Show: "📊 Market Intelligence not available yet — runs after first discovery"

If data exists:

  Title: "📊 Market Pulse" + "Updated {daysAgo(lastUpdated)}"

  SECTION 1 — Trending Skills:
    Label: "HOT RIGHT NOW" (uppercase, text-3)
    Up to 6 skill chips with a 🔥 indicator if newly trending
    Data from trendingSkills array

  SECTION 2 — Salary Range (if salaryRange exists):
    Label: "TYPICAL RANGE" (uppercase, text-3)
    "{currency}{min}k – {currency}{max}k" (large, green)
    "For: {targetRole}" (grey)
    Source note: "Based on recent job postings" (grey, 11px)

  SECTION 3 — Demand Signal (if demandSignal exists):
    Label: "DEMAND"
    Simple indicator:
      'high'   → 🟢 "High demand — lots of active listings"
      'medium' → 🟡 "Moderate — normal market activity"
      'low'    → 🔴 "Low demand — competitive market"

  SECTION 4 — Top Hiring Companies (if topCompanies.length > 0):
    Label: "ACTIVELY HIRING"
    Up to 4 company names as grey tags

---

STEP B3 — Add MarketIntel to Home page (Phase 5's Home.jsx):

Import MarketIntel.
Add it at the bottom of the page, above the sticky score bar:

  import MarketIntel from '../components/MarketIntel'

  In Home.jsx render, after the 5 sections:
    {profile?.targetRoles && (
      <div style={{ padding: '0 20px 80px' }}>
        <MarketIntel targetRoles={profile.targetRoles} />
      </div>
    )}

Also fetch profile in Home.jsx:
  GET /api/profile → store in profile state (add to Promise.allSettled block)

---

TEST:

PART A:
  Bell icon visible in sidebar header area.
  Clicking bell: dropdown opens.
  If notifications exist: list renders with icons and timestamps.
  Mark all read: unread count goes to 0.
  Click a notification: navigates to correct page.

PART B:
  MarketIntel widget visible at bottom of Home page.
  If no data: "not available yet" message shows.
  If data exists: trending skills, salary, demand all render.
  Widget does not block or crash if API returns empty.

Stop here.
```

---

## ✅ Phase 15 Complete When
- [ ] Notification bell appears in sidebar
- [ ] Badge shows correct unread count
- [ ] Notifications dropdown opens/closes
- [ ] Mark all read works
- [ ] MarketIntel widget shows at bottom of Home
- [ ] Widget renders gracefully when no data
- [ ] No console errors
