# PHASE 5 — Home Page (Daily Inbox)

## Goal
The Home page is the user's daily command center — the first thing they see every morning.
It shows exactly what needs attention today, in priority order, with one-click actions.

---

## Prompt for Claude Code

```
Phases 1–4 complete. Onboarding works.
Now build the Home page — the daily inbox and action center.

CREATE dashboard/src/pages/Home.jsx

---

DATA FETCHING:
Fetch all data in parallel on mount using Promise.allSettled.
Never crash if one fetch fails — use empty array as fallback.

  const [stats, queue, discoveries, followups, responses, readyApply] = await Promise.allSettled([
    api('/api/stats'),
    api('/api/approval-queue'),
    api('/api/applications?status=discovered&limit=20'),
    api('/api/applications?status=applied&followupDue=true'),
    api('/api/applications?status=responded'),
    api('/api/apply-queue?status=ready')
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []))

Add a Refresh button that re-runs all fetches.

---

PAGE HEADER:
  Left side:
    Greeting from greetingTime() — "Good morning, Sai ☀️" (first name only from user.name)
    Below: formatDate() + "  ·  " + user.email in grey (12px)

  Right side:
    [⟳ Refresh] ghost button — re-fetches all data, shows "Refreshing..." while loading

---

STATS ROW:
  4 cards in a grid (equal width):

  Card 1: "Applied"
    Number (blue): stats.applied || 0
  Card 2: "Responses"
    Number (yellow): stats.responses || 0
  Card 3: "Interviews"
    Number (green): stats.interviews || 0
  Card 4: "Response Rate"
    Number (green if ≥20% else yellow): stats.responseRate + "%" or "0%"

  Each card: large colored number (28px, bold), grey label below (11px uppercase)
  Show all 4 cards even when all zeros.

---

ATTENTION BANNER:
  Only show if queue.filter(i => i.status === 'pending').length > 0
  Style: amber background, border-left 3px solid var(--yellow)
  Text: "⚡ {N} application package(s) ready for your review"

---

5 COLLAPSIBLE SECTIONS:

Each section:
  Header: [▼ / ▶] + title + count badge + optional action button
  Clicking header toggles open/closed
  Default expanded: "Review Packages", "New Discoveries"
  Default collapsed: "Follow-ups Due", "Responses", "Ready to Apply"

---

SECTION A — "Review Packages":
  Data: queue filtered to status === 'pending' with score >= 7.5

  Each card:
    Company (bold 14px)  ·  Role (grey)
    ScoreDots + "Resume + cover letter ready"  ·  Source badge
    Two buttons: [Skip] (ghost)  [Review & Approve →] (primary)

  Skip:
    POST /api/approval-queue/:id/skip
    Remove card from UI instantly
    Toast: "Skipped"

  Review & Approve:
    navigate('approval?' + item.id)

  Empty: "✓ Nothing to review right now" in grey, centered

---

SECTION B — "New Discoveries":
  Data: applications with status=discovered

  Each card:
    Company (bold)  ·  Role
    ScoreDots  ·  platformLabel(source) badge  ·  daysAgo(created_at) in grey
    Two buttons: [Not Interested] (ghost)  [Tailor & Review →] (primary)

  Not Interested:
    POST /api/preference/signal { signal_type:'deselected', applicationId, company, role }
    Remove card from UI immediately
    Toast: "Hidden — we won't show similar jobs"

  Tailor & Review:
    POST /api/applications/:id/tailor
    Remove card from UI
    Toast: "Tailoring started for {Company} — check Review Packages in ~30 seconds"
    Re-fetch approval queue after 35 seconds

  Empty:
    EmptyState component: 🔭 "No new jobs yet"
    Subtitle: "Jobs appear here after each discovery run (daily at 8am)"
    Action button: "Run Discovery Now" → POST /api/discover → re-fetch after 5s
    Toast: "Discovery started — check back in a minute"

---

SECTION C — "Follow-ups Due":
  Data: applications where applied_at was 5+ days ago, status=applied

  Each row (horizontal, not a big card):
    Company  ·  Role  ·  "Applied {daysAgo}" colored by daysAgoColor()
    [Copy Follow-up Email] button (secondary, small)

  Copy Follow-up:
    Build this template string:
      Subject: Following up — {role} at {company}

      Hi [Hiring Manager's Name],

      I wanted to follow up on my application for the {role} position at {company}.
      I remain very interested in this opportunity and would love to connect.

      Please let me know if you need anything else from me.

      Best regards,
      {user.name}

    copyToClipboard(template) from lib/api.js
    Toast: "Copied! Paste into your email client."

  Empty: "✓ No follow-ups needed today"

---

SECTION D — "Responses":
  Data: applications with status in [responded, interview, rejected]

  Each card based on status:
    interview: 🎯 green-tinted border, "[Company] — interview scheduled"  [View Interview Prep]
    rejected:  ❌ dimmed (opacity 0.6), "[Company] — not moving forward"  [Log & Close]
    responded: 📩 blue border, "[Company] — replied"  [View]

  View Interview Prep: navigate('pipeline?app=' + app.id) (pipeline modal opens)
  Log & Close: PATCH /api/applications/:id/status { status: 'closed' } → remove card

  Empty: "📭 No responses yet — keep applying!"

---

SECTION E — "Ready to Apply":
  Data: items from /api/apply-queue?status=ready

  Each card:
    Company  ·  Role  ·  ScoreDots
    [Apply Now →] (green)

  Apply Now:
    window.confirm("Open {Company}'s job listing and mark as applied?")
    If confirmed:
      window.open(item.job_url, '_blank')
      POST /api/apply-queue/:id/mark-applied
      Remove from list + toast "Marked as applied ✓"

  Empty: "📋 Nothing approved yet — review packages above to add items here"

---

STICKY BOTTOM BAR:
  Always visible, stuck to bottom of the page
  Background: var(--surface), border-top 1px solid var(--border), padding 12px 20px
  Layout: input + button, full width

  Input: placeholder "Paste a job URL to score it instantly..."
  [Score →] button (green)

  On Enter or click:
    if URL is not empty: navigate('find-job?url=' + encodeURIComponent(url))
    Clear input

---

GLOBAL EMPTY STATE:
  Show only when ALL 5 sections have zero items AND stats are all zero
  Center of page (above sticky bar)

  🚀 (large emoji)
  "Ready to find your next job"
  "We'll search job boards matching your profile every morning at 8am"
  [Find My First Jobs →] (green) → POST /api/discover → show spinner → toast → re-fetch

---

WIRE INTO App.jsx:
  Import Home from './pages/Home'
  In renderPage(): case 'home': return <Home navigate={navigate} user={user} />

---

TEST:
  Navigate to Home in sidebar.
  Empty state: all sections show their empty messages (not blank, not crash).
  Stats row: 4 cards visible even at all zeros.
  Score bar at bottom: type a URL and press Enter → navigates to Find a Job.
  With seed data (if any): cards appear in correct sections.
  "Not Interested" hides a card immediately without page reload.
  Refresh button re-fetches data and updates counts.
  Stop here.
```

---

## ✅ Phase 5 Complete When
- [ ] All 5 sections render with correct empty states
- [ ] Stats row shows 4 cards
- [ ] Follow-up copy template includes user name
- [ ] Quick score bar navigates to Find a Job
- [ ] Refresh works
- [ ] No console errors
