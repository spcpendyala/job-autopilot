# PHASE 6 — Profile Page (View + Edit)

## Goal
Full profile management — view all extracted data, edit any field, upload more resumes.

---

## Prompt for Claude Code

```
Phases 1–5 complete. Home page works.
Now build the Profile page.

CREATE dashboard/src/pages/Profile.jsx

---

FETCH on mount:
  GET /api/profile
  Response shape: { profile: {...}, completenessScore: number, baseResume: "..." }
  If profile is null: show EmptyState with "Upload your resume to get started"
    action button → navigate to onboarding or POST /api/profile/upload

---

TWO MODES: VIEW (default) and EDIT (toggle)

---

VIEW MODE (top to bottom):

1. HEADER CARD:
   Avatar (initials in green circle) + Name (large bold) + Location
   Email · Phone · LinkedIn URL (if present)
   Tags: years of experience · Full-time · Contract · Remote · Currency
   Completeness bar: "Profile {N}% complete" with color-coded fill
   [Edit Profile] button (secondary, top-right)

2. SKILLS GAP ALERT (conditional):
   Only show if GET /api/skills-gap returns gaps array with length > 0
   Yellow banner: "3 skills appear in your target jobs but aren't in your profile: kubernetes · terraform · sre"
   "Add them in Edit mode if you have this experience"

3. PROFILE SECTIONS (show only non-empty, hide empty in view mode):
   Each section has a label + content

   ABOUT           — profile.about or profile.summary (prose text)
   TARGET ROLES    — tag chips
   EXPERIENCE      — each role: Title (bold) — Company | Date range | Bullets
   CORE SKILLS     — tag chips (grouped if possible)
   TOOLS           — grouped by category (show category label above each group)
   EDUCATION       — degree — institution · year
   CERTIFICATIONS  — name · issuer · year (3 per row)
   ACHIEVEMENTS    — bulleted list
   PROJECTS        — name + short description + link
   LANGUAGES       — language (level)
   VOLUNTEERING    — role — organization · date

4. BASE RESUME:
   Label: "Base Resume"
   Show first 300 chars in a monospace box (background var(--surface))
   Two links: [View Full ↗] (opens Modal with full content)  [Download .md]
   Download .md: create Blob and trigger download

5. UPLOAD MORE RESUMES:
   Small compact drop zone (height 70px)
   "Upload more resumes to improve your profile"
   [Re-synthesize Profile →]
   On upload: POST /api/profile/upload → re-fetch → toast "Profile updated"

---

EDIT MODE (toggle with Edit/Done Editing button):

All sections become editable. Changes are held in local state until [Save All].

   Text/textarea fields: name, location, email, phone, linkedin, summary
   Tag fields (targetRoles, coreSkills): existing tags with × to remove, type + Enter to add
   
   EXPERIENCE section:
     Each role: title, company, from, to, location, bullets (textarea, one per line)
     [Remove role] button per item
     [+ Add Experience] at bottom

   EDUCATION section:
     degree, institution, year per entry
     [Remove] per item + [+ Add Education]

   Toggle switches (true/false):
     Open to Remote | Open to Hybrid | Full-time | Contract | Part-time
   
   Salary:
     Min salary input + currency selector (CAD / USD / GBP / EUR / AUD)

[Save All Changes] button — sticky at bottom in edit mode
On save: POST /api/profile { profile } → toast "Saved ✓" → switch to view mode

---

WIRE INTO App.jsx:
  Import Profile from './pages/Profile'
  case 'profile': return <Profile navigate={navigate} />

---

TEST:
  Navigate to Profile.
  View mode: all non-empty sections visible, completeness bar correct.
  Edit mode: click Edit → fields editable → change a target role → Save → view mode shows change.
  Upload more: drop a PDF → profile refreshes.
  Base resume: View Full opens modal with full content.
  Stop here.
```

---

## ✅ Phase 6 Complete When
- [ ] View mode shows all non-empty sections
- [ ] Completeness bar accurate
- [ ] Edit mode works for all field types
- [ ] Save persists changes
- [ ] No console errors

---
---

# PHASE 7 — Approval Screen (Split-View Review)

## Goal
Side-by-side view: job details on the left, editable resume + cover letter on the right.
User approves or skips. Approved items move to the apply queue.

---

## Prompt for Claude Code

```
Phases 1–6 complete. Profile page works.
Now build the Approval Screen.

CREATE dashboard/src/pages/ApprovalScreen.jsx

Props: approvalId (string|null), navigate (function)

---

FETCH on mount:
  If approvalId: GET /api/approval-queue/:approvalId
  Else: GET /api/approval-queue → use first pending item
  Also: GET /api/approval-queue/stats → total pending count

If queue is empty: EmptyState "✓ Nothing to review" + button "Back to Home" → navigate('home')

---

LAYOUT:
  Two columns, 50/50 split
  Mobile (<768px): stack vertically (job on top, materials below)

---

LEFT COLUMN (read-only, scrollable):

  Company name (20px bold)
  Role title (16px, text-2)

  Score row:
    ScoreDots + score number + verdictLabel badge (verdictClass color)

  One-line summary (item.verdict or item.raw_score_json?.oneLineSummary)

  "Why you match" section (if topMatchingSkills exists):
    Green checkmarks for each skill

  "ATS Keywords to Add" (if missingKeywords exists):
    Red badge-red chips
    Hint: "Add these naturally if you have the experience"

  "Tailoring Tips" (if tailoringTips exists):
    Numbered list, one tip per line

  "Company Brief" (if companyBrief exists):
    One-paragraph description

  "Job Description" (full text):
    Scrollable box, max-height 350px, monospace 12px, background var(--surface)

---

RIGHT COLUMN (editable):

  Two tabs: [RESUME]  [COVER LETTER]
  Active tab: green bottom border

  RESUME TAB:
    Parse tailored_resume markdown into sections (split on ## headings)
    Each section = heading + content block
    View sub-mode: styled text
    Click a section → that section becomes a textarea (auto-height, monospace)
    "Unsaved changes •" indicator in tab when edits exist
    [Reset to AI Version] → revert all edits to original tailored_resume text
    [Show Diff] toggle → highlight lines changed from original (yellow bg on modified lines)

  COVER LETTER TAB:
    Single textarea with full cover letter
    Monospace, min-height 280px
    Character count: "{N} characters"
    [Regenerate] → POST /api/approval-queue/:id/regenerate-cover → spinner → update text
    [Reset] → revert to original cover letter

---

BOTTOM BAR (sticky):
  Left:  [← Skip] → POST /api/approval-queue/:id/skip → load next or go home → toast "Skipped"
  Center: "Job {current} of {total} pending" (grey 13px)
         If multiple items: [← Prev]  [Next →] arrows
  Right: [Approve & Add to Apply Queue →] (green, bold)

---

ON APPROVE:
  1. Collect final resume + cover letter from component state
  2. POST /api/approval-queue/:id/approve { resume, coverLetter }
  3. Toast "✓ Added to apply queue"
  4. Load next pending item or navigate('home') if none left

---

WIRE INTO App.jsx:
  Import ApprovalScreen from './pages/ApprovalScreen'
  case 'approval': return <ApprovalScreen approvalId={pageParam} navigate={navigate} />

---

TEST:
  From Home → "Review & Approve →" on a package card
  Left panel: job details, score, keywords, JD visible
  Right panel: resume text shows, click section to edit, cover letter in tab 2
  Approve: toast shows, next item loads or Home appears
  Skip: item disappears, next loads
  Stop here.
```

---

## ✅ Phase 7 Complete When
- [ ] Split-view renders correctly
- [ ] Resume sections are click-to-edit
- [ ] Cover letter tab works with regenerate
- [ ] Approve moves item to apply queue
- [ ] Skip removes item and loads next
- [ ] No console errors

---
---

# PHASE 8 — Pipeline (Kanban + Table + Detail Modal)

## Goal
Full overview of every application across every status.
Kanban for visual thinkers, table for data people, detail modal for deep dives.

---

## Prompt for Claude Code

```
Phases 1–7 complete.
Now build the Pipeline page.

CREATE dashboard/src/pages/Pipeline.jsx

---

FETCH on mount + every 30 seconds:
  GET /api/applications (all, no status filter)

---

HEADER:
  Title: "Pipeline"
  Right side: pill toggle [Kanban] [Table] (default: Kanban)
  Below: search input "Filter by company or role..." (client-side filter)

---

KANBAN VIEW:

Columns (in order):
  DISCOVERED | TAILORING | READY | APPLIED | INTERVIEW | OFFER | REJECTED

Group applications by status. 'responded' goes into APPLIED column.

Column header: "STATUS (count)"
  INTERVIEW/OFFER count badge: green
  APPLIED with items > 5 days old: amber
  Otherwise: plain text

Each application card:
  Company (bold, 14px)
  Role (13px, text-2)
  ScoreDots (if fit_score)
  
  Status-specific content:
    DISCOVERED:  [Tailor & Review →] (primary button)
    TAILORING:   "⏳ Preparing..." + Spinner (no action)
    READY:       [Apply Now →] (green)
    APPLIED:     "Applied {daysAgo}" colored by daysAgoColor()
    INTERVIEW:   [View Prep →] (green)
    OFFER:       [View Details] (secondary)
    REJECTED:    "Not selected" badge-red, card opacity 0.5

  Tailor & Review: POST /api/applications/:id/tailor → toast + re-fetch
  Apply Now:
    window.confirm("Open job listing for {Company} and mark as applied?")
    If yes: window.open(job_url, '_blank') + POST /api/apply-queue/:id/mark-applied → re-fetch

  Click anywhere on card (not the action button) → open ApplicationDetail modal

  Empty column: grey dashed placeholder "No applications here"

Kanban scroll: horizontal scroll on overflow, each column min-width 250px

---

TABLE VIEW:

Columns: Company | Role | Score | Status | Applied | Source | Actions

  Score column: ScoreDots (size=6) + number
  Status column: badge with verdictClass/badge mapping
  Applied: daysAgo(applied_at) colored by daysAgoColor, or "—"
  Source: platformLabel(source) from lib/api.js
  Actions: [···] dropdown with:
    View Details | Download Resume | Update Status | Open Job URL | Archive

Sort: click column header toggles asc/desc

---

APPLICATION DETAIL MODAL (reuse Modal component from Phase 2):

  Header: Company + Role + verdict badge

  6 tabs:
    OVERVIEW | RESUME SENT | COVER LETTER | INTERVIEW PREP | SALARY | ACTIONS

  OVERVIEW:
    Score breakdown (if raw_score_json): skills / experience / tools / alignment each out of 10
    Verdict + one-line summary
    Job description preview (first 500 chars + "Show more" toggle)
    Timeline row: Created → Applied → Responded

  RESUME SENT:
    Monospace scrollable text box (background var(--surface))
    [Copy] button

  COVER LETTER:
    Monospace scrollable text box
    [Copy] button

  INTERVIEW PREP:
    If data exists: render content
    If not: [Generate Interview Prep] button
      → POST /api/applications/:id/interview-prep → spinner → show result

  SALARY:
    If data exists: show salary brief
    If not: [Research Salary Range] button
      → POST /api/applications/:id/salary → spinner → show result

  ACTIONS:
    Status dropdown: select → PATCH /api/applications/:id/status → toast
    [Open Job URL] (if job_url exists)
    [Download Resume PDF] (opens GET /api/applications/:id/resume.pdf in new tab)
    [Download Cover Letter PDF]
    [Archive Application] (PATCH status to 'archived', confirm first)

---

WIRE INTO App.jsx:
  Import Pipeline from './pages/Pipeline'
  case 'pipeline': return <Pipeline navigate={navigate} />

---

TEST:
  Navigate to Pipeline.
  Kanban: cards in correct columns by status.
  Click a card → modal opens with tabs.
  Table view: toggle works, sort works, search filters results.
  Status update in ACTIONS tab: changes badge without page reload.
  Stop here.
```

---

## ✅ Phase 8 Complete When
- [ ] Kanban columns render all 7 statuses
- [ ] Table view toggle works
- [ ] Column sort works
- [ ] Detail modal opens with 6 tabs
- [ ] Status update works from modal
- [ ] No console errors
