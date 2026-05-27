# PHASE 16 — Mobile Layout + Final Polish

## Goal
Make the app usable on a phone. Job searching happens everywhere — candidates check
their status on the go, copy follow-up emails from their phone, and need to approve
packages while commuting. This phase makes that seamless.

---

## Prompt for Claude Code

```
Phases 1–15 complete.
Now add mobile responsiveness and final polish across the whole app.

---

PART A — MOBILE NAVIGATION

The sidebar is hidden on mobile (<768px) — set up in Phase 2's CSS (.desktop-sidebar).
We need a mobile bottom tab bar to replace it.

---

STEP A1 — CREATE dashboard/src/components/MobileNav.jsx

A fixed bottom bar, visible only on mobile:

  5 tab items: Home | Pipeline | Find | Inbox | Freelance

  Each item:
    Icon (emoji, 20px)
    Label (10px, below icon)
    Active: green color + green dot above icon
    Badge: small red/yellow dot on icon (not a number, just a dot) for queue/inbox counts

  Style:
    position: fixed, bottom: 0, left: 0, right: 0
    height: 60px
    background: var(--surface)
    border-top: 1px solid var(--border)
    display: grid, grid-template-columns: repeat(5, 1fr)
    z-index: 500

  Only visible via CSS class:
    className="mobile-nav" (already defined in Phase 2 CSS: display: none → display: flex on mobile)

Props: active, navigate, queueCount, inboxCount

---

STEP A2 — Wire MobileNav into App.jsx:

Import MobileNav and render it after the <main> block:

  {user && !onboarding && (
    <MobileNav
      active={page}
      navigate={navigate}
      queueCount={queueCount}
      inboxCount={inboxCount}
    />
  )}

Also: on mobile, main content needs padding-bottom: 70px so content isn't hidden behind the nav bar.
Add to the main style: paddingBottom: window.innerWidth < 768 ? 70 : 0

Or better — add this CSS to index.css:
  @media (max-width: 768px) {
    main { padding-bottom: 70px !important; }
    .sticky-score-bar { bottom: 60px !important; }
  }

---

PART B — RESPONSIVE FIXES FOR EACH PAGE

Go through each page and add these mobile adjustments.
Use @media (max-width: 768px) in inline styles via a useIsMobile() hook:

---

CREATE dashboard/src/lib/useIsMobile.js:

  import { useState, useEffect } from 'react'
  export default function useIsMobile() {
    const [mobile, setMobile] = useState(window.innerWidth < 768)
    useEffect(() => {
      const handler = () => setMobile(window.innerWidth < 768)
      window.addEventListener('resize', handler)
      return () => window.removeEventListener('resize', handler)
    }, [])
    return mobile
  }

---

PAGE-BY-PAGE MOBILE FIXES:

HOME (pages/Home.jsx):
  - Stats row: 2×2 grid on mobile (not 4 in a row)
  - Each section card: full-width, remove horizontal padding
  - Sticky score bar: moves up above mobile nav (already handled by CSS above)
  - Button pairs: stack vertically on mobile

PIPELINE (pages/Pipeline.jsx):
  - Kanban: horizontal scroll (already designed for overflow)
  - Table: hide "Source" and "Applied" columns on mobile; keep Company, Role, Status, Actions
  - Detail modal: full-screen on mobile (width: 100%, height: 100%, border-radius: 0)

FIND A JOB (pages/FindJob.jsx):
  - Two optional fields: stack vertically (full-width each) on mobile
  - Score result two-column grid: stack vertically on mobile
  - Package ready buttons: full-width on mobile

APPROVAL SCREEN (pages/ApprovalScreen.jsx):
  - Split view: already stacks on mobile (< 768px check was in Phase 7)
  - Bottom bar: stack approve/skip vertically, full-width buttons

PROFILE (pages/Profile.jsx):
  - Header card: stack avatar + info vertically
  - Completeness bar: full-width
  - Tag chips: wrap naturally (already flex-wrap)

FREELANCE (pages/Freelance.jsx):
  - Platform tabs: horizontal scroll if overflow (no wrapping)
  - Proposal editor: full-width textarea, buttons stack vertically

INBOX (pages/Inbox.jsx):
  - Message cards: compact on mobile (hide preview text, smaller padding)
  - Type tabs: horizontal scroll if overflow

SETTINGS (pages/Settings.jsx):
  - Slider labels: hide left/right labels on mobile, show only the value
  - Source toggles: single column on mobile

SIGN-IN SCREEN (components/SignInScreen.jsx):
  - Feature grid: 1 column on mobile (not 3 columns)

---

PART C — FINAL POLISH TOUCHES

TOUCH TARGETS:
  All buttons and nav items: min-height 44px and min-width 44px on mobile.
  This is Apple/Google accessibility standard.

  Add to index.css:
    @media (max-width: 768px) {
      .btn { min-height: 44px; }
      button { min-height: 44px; }
    }

LOADING STATES:
  Every page should show a skeleton/spinner while initial data loads.
  For any page that currently shows blank white:
    Show a centered <Spinner size={28} /> while loading === true.

ERROR STATES:
  If a page fetch fails entirely:
    Show: "Something went wrong loading this page."
    [Try Again] button that re-runs the fetch.

PAGE TITLES:
  Add a simple document.title update on each page navigate:
  In App.jsx, add this useEffect:
    useEffect(() => {
      const titles = {
        home: 'Home — Job AutoPilot',
        pipeline: 'Pipeline — Job AutoPilot',
        'find-job': 'Find a Job — Job AutoPilot',
        inbox: 'Inbox — Job AutoPilot',
        freelance: 'Freelance — Job AutoPilot',
        profile: 'Profile — Job AutoPilot',
        settings: 'Settings — Job AutoPilot',
        admin: 'Admin — Job AutoPilot',
      }
      document.title = titles[page] || 'Job AutoPilot'
    }, [page])

---

PART D — RE-DEPLOY

  cd dashboard && npm run build
  scp -r dashboard/dist/* spcpendyala@34.148.196.49:/home/spcpendyala/job-autopilot/dashboard-dist/
  ssh spcpendyala@34.148.196.49 "pm2 restart all && pm2 status"

---

TEST:

Desktop (Chrome, ≥1024px wide):
  → Sidebar visible, mobile nav hidden
  → All pages work as before
  → No regressions from mobile CSS

Mobile (Chrome DevTools → iPhone SE, 375px width):
  → Sidebar hidden
  → Mobile bottom nav visible with 5 tabs
  → Active tab shows green color
  → All 5 tab buttons navigate correctly
  → Home stats show 2×2 grid
  → Pipeline table hides extra columns
  → Sign-in feature cards in 1 column
  → Buttons are large enough to tap comfortably

Page titles:
  → Browser tab shows correct title per page

Error states:
  → With network offline: pages show "Something went wrong" message
  → [Try Again] re-fetches

Stop here.
```

---

## ✅ Phase 16 Complete When
- [ ] Mobile nav bar visible on screens < 768px
- [ ] Sidebar hidden on mobile
- [ ] All 5 mobile nav tabs navigate correctly
- [ ] Home stats 2×2 on mobile
- [ ] Pipeline table columns collapse on mobile
- [ ] Touch targets are at least 44px
- [ ] Document title changes per page
- [ ] No console errors on desktop or mobile
- [ ] Re-deployed to GCP

---
---

# 🎉 All 16 Phases Complete

## What the system now does end-to-end:

1. **User signs in** with Google → **onboarding** collects resume, preferences, platforms
2. **Discovery** runs every morning → finds matching jobs on 10+ boards (salaried + freelance)
3. **AI scores and tailors** each job automatically → packages wait in Review Queue
4. **Home page** shows daily priorities: review, apply, follow up, check responses
5. **Approval screen** lets user edit and approve tailored resume + cover letter
6. **Pipeline** tracks every application by status (kanban + table)
7. **Find a Job** page lets user score any URL on demand
8. **Freelance page** handles proposals, bids, and gig platform tracking
9. **Inbox monitor** auto-classifies Gmail replies: interview / rejection / reply
10. **Notifications** keep user updated on new packages, responses, follow-ups
11. **Market Intelligence** shows trending skills and salary data for target roles
12. **Settings** controls all platforms, thresholds, connections
13. **Admin panel** manages users and system config
14. **Mobile-first** — full app usable on phone

## Every repetitive step that is now automated:
- ✅ Searching job boards daily
- ✅ Scoring job fit against your profile
- ✅ Tailoring resume per job
- ✅ Writing cover letters
- ✅ Writing freelance proposals
- ✅ Tracking application status
- ✅ Sending follow-up reminders
- ✅ Classifying email replies
- ✅ Generating interview prep notes
- ✅ Researching salary ranges
