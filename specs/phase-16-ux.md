# Phase 16 — UI/UX Complete Redesign
## Goal
Best-in-class UI. Inbox mental model. Approval workflow front and center.
Resume upload onboarding. Split-screen approval. Outreach tracking.
Mobile-responsive. Every screen is self-explanatory with clear next actions.

---

## New Dependencies (dashboard only)
```bash
cd dashboard && npm install react-dropzone react-markdown
```

---

## Design System (ENFORCE THROUGHOUT)

```css
/* Colors */
--bg:          #080808
--surface:     #0f0f0f
--card:        #161616
--card-hover:  #1e1e1e
--border:      #242424
--border-hi:   #333333
--text:        #f0f0f0
--text-2:      #999999
--text-3:      #555555
--green:       #22c55e
--green-dim:   #166534
--yellow:      #eab308
--yellow-dim:  #713f12
--red:         #ef4444
--red-dim:     #7f1d1d
--blue:        #3b82f6
--blue-dim:    #1e3a5f
--purple:      #a855f7

/* Typography */
--font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--mono: 'SF Mono', 'Fira Code', monospace

/* Sizes */
--radius-sm: 6px
--radius:    10px
--radius-lg: 16px
```

---

## Pages to Build (complete rewrites)

### 1. `dashboard/src/pages/MorningBrief.jsx` — REWRITE

The inbox. Everything needing attention, in priority order.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Good morning, Sai ☀️        May 23, 2026  ↻   │
│  ─────────────────────────────────────────────  │
│  [Applied: 5] [Responses: 1] [Interviews: 0]   │
│              [Response Rate: 20%]                │
└─────────────────────────────────────────────────┘

NEEDS YOUR ATTENTION
┌─────────────────────────────────────────────────┐
│  ⏳ 3 packages ready for review                 │
│  📅 2 follow-ups due                            │
│  📬 1 new response                              │
│  📨 1 outreach reply                            │
└─────────────────────────────────────────────────┘

REVIEW PACKAGES  (accordion, expanded by default)
┌─────────────────────────────────────────────────┐
│  Shopify · Operations Manager      8.4  ●●●●○  │
│  Tailored resume + cover letter ready           │
│  [Review & Approve →]              [Skip]       │
├─────────────────────────────────────────────────┤
│  Stripe · TAM                      7.8  ●●●●○  │
│  [Review & Approve →]              [Skip]       │
└─────────────────────────────────────────────────┘

NEW DISCOVERIES  (collapsed by default, shows count)
▶ 8 new jobs found today  (click to expand)

FOLLOW-UPS DUE
RESPONSES
OUTREACH
READY TO APPLY  ← approved, waiting for you to submit
```

**Score display:** 5 filled/empty dots + number. Green 8+, yellow 6-7.9, red <6.

**Quick Apply bar at bottom** (always visible):
```
[Paste a job URL to score it instantly...      ] [Score →]
```

---

### 2. `dashboard/src/pages/ApprovalScreen.jsx` — NEW PAGE

Split-screen. Only accessible when reviewing a queued item.

**Layout:**
```
┌──────────────────────┬──────────────────────────┐
│  JOB                 │  YOUR RESUME             │
│                      │  [editing mode toggle]   │
│  Company · Role      │                          │
│  8.4/10 ●●●●○        │  # Sai Pendyala          │
│                      │  Ajax, Ontario...        │
│  ─────────────────── │                          │
│  [job description    │  ## Summary              │
│   scrollable]        │  [inline editable]       │
│                      │                          │
│  ─────────────────── │  ## Experience           │
│  MISSING KEYWORDS    │  [inline editable]       │
│  [kw1] [kw2] [kw3]  │                          │
│                      │  ─────────────────────── │
│  TAILORING TIPS      │  COVER LETTER            │
│  1. Emphasize...     │  [inline editable]       │
│  2. Add...           │                          │
└──────────────────────┴──────────────────────────┘

[← Back]  [Skip This Job]  [Edit]  [Approve & Add to Queue →]
```

**Inline editing:**
- Click any section of resume → becomes a `<textarea>` with monospace font
- Auto-resize to content
- Changes tracked in local state
- "Save edits" button appears when changes detected

**Navigation:**
- Left/right arrows to move between pending approval items
- "1 of 3 pending" indicator
- Skip goes to next, Approve goes to next

---

### 3. `dashboard/src/pages/Pipeline.jsx` — REWRITE

Two views: **Kanban** (default) and **Table** (toggle).

**Kanban columns:**
```
DISCOVERED | APPROVED | APPLIED | RESPONDED | INTERVIEW | OFFER
```

Each card:
```
┌─────────────────────────────┐
│  Shopify                    │
│  Operations Manager         │
│  8.4 ●●●●○  STRONG MATCH  │
│  Added 2h ago               │
│  [Review] or [Apply Now]    │
└─────────────────────────────┘
```

- APPROVED column: shows "Apply Now" button → opens job URL + marks applied
- APPLIED column: shows "Days since applied" + follow-up status
- RESPONDED: shows response type badge (INTERVIEW / REJECTION / etc)

**Table view:**
Sortable columns: Company | Role | Score | Status | Date | Actions

---

### 4. `dashboard/src/pages/FindJob.jsx` — REWRITE

3-step wizard. Cleaner than current.

Step 1 — Input:
```
Find a Job

┌────────────────────────────────────────┐
│ Job URL                                │
│ [https://...                         ] │
│ We'll fetch the description            │
│                                        │
│ ─── or paste description directly ─── │
│                                        │
│ [                                    ] │
│ [  Paste full job description...     ] │
│ [                                    ] │
│                                        │
│ Company          Role                  │
│ [              ] [                   ] │
│                                        │
│            [Score This Job →]          │
└────────────────────────────────────────┘
```

Step 2 — Score:
- Large score with dots
- Two columns: Matching (green checkmarks) | Gaps (red X)
- ATS keywords as colored badges (critical=red, nice=yellow)
- Tailoring tips numbered list
- [Generate Full Package] | [Not Worth It]

Step 3 — Package Ready:
```
✅ Package Ready

📄 Resume      [Copy] [Preview]
✉️  Cover Letter [Copy] [Preview]  
🏢 Company     [View Brief]
☁️  Saved to Drive

[Add to Apply Queue]    [Find Another →]
```

---

### 5. `dashboard/src/pages/Outreach.jsx` — NEW PAGE

Outreach tracking. Add to sidebar nav.

**Layout:**
```
Outreach                           [+ New Outreach]

Stats: 12 sent · 3 replied · 25% rate

┌──────────────────────────────────────────────────┐
│  DRAFT (3)                                       │
├──────────────────────────────────────────────────┤
│  Anthropic · Sarah Chen (Recruiter)              │
│  Operations Manager                              │
│  Draft ready · [Review] [Mark Sent] [Delete]    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  SENT (8) — Follow-up due: 2                    │
├──────────────────────────────────────────────────┤
│  Shopify · Hiring Team                          │
│  Sent 8 days ago · No reply yet                 │
│  [Send Follow-up] [Mark Replied] [Archive]      │
└──────────────────────────────────────────────────┘
```

**New Outreach modal:**
```
Find Recruiter
Company: [              ]
Role:    [              ]
[Find Recruiter Info →]

Found: Sarah Chen · Talent Acquisition · sarah@...
[Use This] or [Enter Manually]

Draft Message:
[generated email body — editable]
Subject: [editable]

[Save Draft]  [Copy & Mark Sent]
```

---

### 6. `dashboard/src/pages/Settings.jsx` — REWRITE

4 clean sections. Profile section redesigned for synthesis.

**Profile section:**
```
YOUR PROFILE

┌─────────────────────────────────────────────────┐
│  📄 Upload Resumes to Improve Profile           │
│                                                  │
│  [Drop resumes here — PDF, DOCX, TXT]           │
│  Upload up to 6 · AI synthesizes automatically │
│                                                  │
│  [Choose Files]                    [Synthesize] │
└─────────────────────────────────────────────────┘

Current Profile:
Name:          [Sai Pendyala        ]
Years Exp:     [10                  ]
Location:      [Ajax, Ontario       ]
Min Salary:    [$80,000 CAD         ]

Target Roles: (click to remove)
[Operations Manager ×] [IT Manager ×] [TAM ×] [+ Add]

Open to: [■ Remote] [■ Hybrid] [□ Office only]

Core Skills: [Incident Management ×] [ITIL ×] [+ Add]

[Save Profile Changes]
```

**Discovery section:**
```
DISCOVERY

What I'm looking for:
[■ Full-time] [■ Contract] [■ Remote] [□ Freelance]

Sources (auto-configured from your profile):
■ Indeed          ■ Remote OK
■ We Work Remotely ■ Remotive
□ Upwork          □ AngelList (coming soon)

Auto-tailor for jobs scoring ≥ [7.5──●────10]
Show jobs scoring ≥             [6.0──●────10]

[Run Discovery Now]        [Last run: 2h ago]
```

**Integrations showcase:**
```
POWERED BY

Job Discovery
[Indeed] [Remote OK] [We Work Remotely] [Remotive]

Salary Intel          Company Research
[Glassdoor] [Levels]  [Crunchbase] [News API]

AI Engine
[Anthropic Claude] — Sonnet 4 + Haiku 4.5
```

---

### 7. Update `dashboard/src/App.jsx`

Add new pages and sidebar items:

```javascript
// New nav items
{ id: 'approval', icon: '⏳', label: 'Review Queue', badge: pendingCount },
{ id: 'outreach', icon: '📨', label: 'Outreach' },
```

Route `approval` to ApprovalScreen.
Route `outreach` to Outreach page.

Badge on "Review Queue" shows count of pending approval items.
Red dot if > 0.

---

### 8. Profile Approval Gate

If profile not approved, show overlay on first load (before onboarding):

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  🚀 Welcome to Job AutoPilot                    │
│                                                  │
│  Upload your resumes to get started.            │
│  We'll build your profile automatically.        │
│                                                  │
│  [Upload Resumes →]                             │
│                                                  │
│  Have a profile already? [Import Profile]       │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Done Test
```bash
npm run dev
# Open http://34.148.196.49

# Test 1 — Morning Brief
# Should show inbox layout with sections
# Score dots visible, colored correctly
# Quick apply bar at bottom

# Test 2 — Approval Screen
# Add test item to approval queue via API
# Click Review → approval screen opens
# Job on left, resume on right
# Click resume text → becomes editable
# Approve → moves to apply queue → appears in Pipeline APPROVED column

# Test 3 — Outreach page
# Shows in sidebar
# New Outreach modal works
# Draft saves, mark sent works

# Test 4 — Settings upload
# Drop zone visible in Profile section
# Upload triggers synthesis (with real resumes)

# Test 5 — Mobile
# Open on iPhone or resize to 375px width
# All pages usable — no horizontal scroll, text readable
# Approve/Skip buttons tappable

# Test 6 — Self-explanatory check
# Every empty state has clear explanation + action button
# No screen requires instructions to understand
```

Phase 16 complete when all 6 tests pass and UI looks polished and professional.
