# PHASE 13 — Freelance Flow (Upwork, Fiverr, Freelancer, PeoplePerHour)

## Goal
Freelance platforms are completely different from salaried jobs — they need proposals, bid
amounts, and gig-style tracking. This phase builds a dedicated Freelance page that handles
all four platforms in one clean view.

## What's Different About Freelance
- No "resume" — you write a **proposal** (shorter, more direct)
- No "cover letter" — the proposal IS the pitch
- You set a **bid price** (hourly or fixed), not just apply
- You track **proposals sent**, not just applications
- Response is often a direct message or interview invite on the platform
- Follow-ups are platform-specific (Upwork messages, Fiverr inbox, etc.)

---

## Backend Endpoints Needed
Add these to api/server.js if they don't exist:

```
GET  /api/freelance/gigs              → all freelance opportunities
GET  /api/freelance/proposals         → all proposals sent
POST /api/freelance/gigs/:id/propose  → generate a proposal for a gig
POST /api/freelance/gigs/:id/skip     → mark gig as not interested
POST /api/freelance/proposals/:id/mark-sent  → record a proposal as sent
PATCH /api/freelance/proposals/:id/status    → update proposal status
GET  /api/freelance/stats             → response rate, win rate, avg hourly
```

---

## Prompt for Claude Code

```
Phases 1–12 complete. App is live.
Now add the Freelance page — a dedicated flow for Upwork, Fiverr, Freelancer, and PeoplePerHour.

---

STEP A — Add backend endpoints to api/server.js

Add these routes if they do not already exist. Each must use requireAuth and filter by req.userId.
Use the same db pattern as other routes (db.getAllApplications style).

  // Get all freelance gigs (discovered from freelance platforms)
  app.get('/api/freelance/gigs', requireAuth, (req, res) => {
    try {
      const { status, platform, limit } = req.query
      let gigs = (db.getFreelanceGigs ? db.getFreelanceGigs(req.userId) : [])
      if (status) gigs = gigs.filter(g => g.status === status)
      if (platform) gigs = gigs.filter(g => g.platform?.toLowerCase() === platform.toLowerCase())
      if (limit) gigs = gigs.slice(0, parseInt(limit) || 20)
      res.json(gigs)
    } catch (e) { res.json([]) }
  })

  // Get all sent proposals
  app.get('/api/freelance/proposals', requireAuth, (req, res) => {
    try {
      const proposals = db.getFreelanceProposals ? db.getFreelanceProposals(req.userId) : []
      res.json(proposals)
    } catch (e) { res.json([]) }
  })

  // Get stats
  app.get('/api/freelance/stats', requireAuth, (req, res) => {
    try {
      const proposals = db.getFreelanceProposals ? db.getFreelanceProposals(req.userId) : []
      const won   = proposals.filter(p => p.status === 'won').length
      const total = proposals.filter(p => p.status !== 'draft').length
      const rate  = total > 0 ? Math.round((won / total) * 100) : 0
      res.json({ total, won, rate, pending: proposals.filter(p => p.status === 'pending').length })
    } catch (e) { res.json({ total: 0, won: 0, rate: 0, pending: 0 }) }
  })

After adding endpoints, restart: pm2 restart job-autopilot-api
Verify: curl http://localhost:3001/api/freelance/gigs → [] or array

---

STEP B — CREATE dashboard/src/pages/Freelance.jsx

Props: navigate (fn), user (object)

---

FETCH on mount:
  GET /api/freelance/gigs?status=discovered&limit=20  → newGigs
  GET /api/freelance/proposals                        → proposals
  GET /api/freelance/stats                            → stats
  GET /api/profile → to get hourlyRate and freelanceBio

---

PAGE HEADER:
  Title: "Freelance" + 💼 emoji
  Subtitle: "Proposals, bids, and gig opportunities — all in one place."
  [⟳ Refresh] ghost button

---

PROFILE QUICK CHECK BANNER:
  If profile.hourlyRate is missing OR profile.freelanceBio is missing:
    Yellow banner: "⚡ Complete your freelance profile — add your hourly rate and bio for better proposals"
    [Update Profile →] button → navigate('profile')

---

STATS ROW (4 cards):
  Proposals Sent  |  Won  |  Win Rate  |  Pending Response
  Colors: Sent=blue, Won=green, Win Rate=green if ≥20% else yellow, Pending=yellow

---

PLATFORM FILTER TABS:
  [All] [Upwork] [Fiverr] [Freelancer] [PeoplePerHour]
  Active tab: green underline
  Filters the gig list below

---

2 SECTIONS:

SECTION A — "New Gig Opportunities":
  Filter newGigs by activeTab (all or specific platform)

  Each gig card:
    Platform badge (badge-purple for Upwork, badge-blue for Fiverr, badge-grey for others)
    Gig title (bold, 14px)
    Budget: "$X fixed" or "$X/hr" (green)
    Client info if available: client name, review count, location (grey 12px)
    Description preview: first 120 chars + "..."
    Posted: daysAgo(created_at) in grey
    
    Two buttons:
      [Skip] (ghost) → POST /api/freelance/gigs/:id/skip → remove from UI → toast "Skipped"
      [Write Proposal →] (purple: background var(--purple-dim), color var(--purple))
    
    Write Proposal flow (inline, not a new page):
      1. Show loading state on card: "✍️ Writing proposal... (~15s)"
      2. POST /api/freelance/gigs/:id/propose { hourlyRate: profile.hourlyRate }
      3. On success: card expands to show ProposalEditor (see below)

  Empty: "🔭 No new gigs yet" + subtitle "Freelance gigs appear here after discovery runs"
    Action: "Run Discovery Now" → POST /api/discover

---

PROPOSAL EDITOR (inline expansion when a proposal is generated):

  Expanded section below the gig card header
  Bid amount row:
    "$" + input (number, default from profile.hourlyRate or budget)
    Toggle: [Hourly] [Fixed Price]
    Estimated hours (if hourly): input for number

  Proposal textarea:
    The AI-generated proposal text
    Monospace font, min-height 160px, full-width
    Character count below: "{N} / 1500 characters" (1500 = Upwork limit)

  Freelance bio preview (collapsed by default):
    Toggle: "Show profile bio ▼"
    The bio that was appended to the proposal

  Three buttons (inline, right-aligned):
    [Regenerate] (ghost) → POST /api/freelance/gigs/:id/propose again → update text
    [Copy to Clipboard] → copyToClipboard(proposal) → toast "Copied! Paste into {platform}"
    [Mark as Sent →] (purple)
      → POST /api/freelance/proposals/:id/mark-sent { bidAmount, proposalText, platform }
      → Move gig from "New" section to "Proposals Sent" section
      → Toast: "Proposal recorded ✓ — good luck!"

  Note at bottom (grey 12px):
    "After copying, go to {platform} and paste in the proposal field"
    Link: "Open {platform} →" → window.open(gig.url, '_blank')

---

SECTION B — "Proposals Sent":
  Filter proposals by activeTab

  Each proposal card:
    Platform badge + Gig title (bold) + Bid amount (grey)
    Status badge:
      pending    → badge-yellow "Awaiting Response"
      viewed     → badge-blue   "Viewed by client"
      interview  → badge-green  "Interview / Discussion"
      won        → badge-green  "Won 🎉"
      lost       → badge-grey   "Not selected"
    
    Sent: daysAgo(sent_at)
    
    If pending and > 5 days old:
      "Follow-up due" amber text
      [Copy Follow-up Message] → template copied to clipboard

    Follow-up template:
      "Hi [Name], I wanted to follow up on my proposal for [Gig Title].
      I'm still very interested and available to start immediately.
      Please let me know if you have any questions about my approach.
      Best, {user.name}"

    Action buttons (based on status):
      pending:   [Update Status ▾] dropdown
      interview: [Won It! 🎉] (green) [Not This Time] (ghost)
      won:       celebration display, no actions needed

    [Update Status ▾] dropdown options:
      Mark as Viewed | Interview Started | Won | Lost
      → PATCH /api/freelance/proposals/:id/status { status } → update card → toast

  Empty: "📬 No proposals sent yet — write your first one above"

---

WIRE INTO App.jsx:
  Import Freelance from './pages/Freelance'
  case 'freelance': return <Freelance navigate={navigate} user={user} />

---

TEST:
  Navigate to Freelance in sidebar.
  Stats row: 4 cards visible.
  Platform tabs: All, Upwork, Fiverr, Freelancer, PeoplePerHour clickable.
  If no gigs: empty state with discover button.
  Profile banner appears if hourlyRate is missing.
  Write Proposal: shows loading then expands the card with editable text.
  Copy → toast appears.
  Mark as Sent → card moves to Proposals Sent section.
  Follow-up copy works on old pending proposals.
  Stop here.
```

---

## ✅ Phase 13 Complete When
- [ ] Freelance page renders with 4 stats cards
- [ ] Platform filter tabs work
- [ ] Write Proposal generates and shows in-card editor
- [ ] Copy to clipboard works
- [ ] Mark as Sent moves proposal to Sent section
- [ ] Follow-up copy works for old proposals
- [ ] No console errors
