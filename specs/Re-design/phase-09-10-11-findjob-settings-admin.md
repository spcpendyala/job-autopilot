# PHASE 9 — Find a Job (3-Step Wizard)

## Goal
Let users score any job URL or pasted JD instantly, then generate a full tailored package.

---

## Prompt for Claude Code

```
Phases 1–8 complete.
Now build the Find a Job page.

CREATE dashboard/src/pages/FindJob.jsx

Props: navigate (fn), pageParam (string — may be "url=encodedURL" from Home quick-score bar)

On mount: if pageParam starts with "url=", decode it into the URL field and auto-submit.

---

3-STEP WIZARD:
  Progress: 3 dots at top, filled as steps complete.

---

STEP 1 — INPUT:

  Title: "Score Any Job"
  Subtitle: "Paste a job URL or the full job description. We'll score it against your profile."

  URL input (full width):
    Label: "Job URL"
    Placeholder: "https://jobs.lever.co/company/role-title"
    Hint: "Works with LinkedIn, Greenhouse, Lever, Indeed, most boards"

  Divider: "─── or paste the job description ───"

  Textarea (5 rows):
    Placeholder: "Paste the full job description here..."

  Two optional fields side by side:
    Company (half width): "Company name"
    Role title (half width): "Role title (optional)"

  [Score This Job →] button (green, full-width, large)
    Disabled if URL and description are both empty

  On submit:
    Show loading state: "🧠 Reading and scoring this job... (~15 seconds)"
    POST /api/analyze { jobUrl, jobDescription, jobTitle: role, company }
    On success: save result → advance to step 2
    On error: red error box, stay on step 1

---

STEP 2 — SCORE RESULTS:

  Score display (centered):
    Score number (48px, scoreColor())
    ScoreDots (size=14)
    verdictLabel badge (verdictClass color)
    Company + Role (grey, 14px)

  Two-column grid:
    Left — "✓ What matches" (green):
      List from topMatchingSkills
    Right — "✗ Gaps" (red):
      List from keyGaps

  ATS Keywords section:
    Badge-red chips for each keyword in missingKeywords
    Label: "Missing from your resume — add naturally if relevant"

  Tailoring Tips:
    Numbered list from tailoringTips

  Two buttons (stacked, full-width):
    [Generate Full Package — Resume + Cover Letter →] (primary, green)
      POST /api/apply {jobUrl, jobDescription, jobTitle, company, fitScore, atsGaps, generateDocs: true}
      Loading: "✍️ Writing tailored resume and cover letter..."
      On success: advance to step 3
    [Not the right fit — try another] (ghost)
      Reset state → back to step 1

---

STEP 3 — PACKAGE READY:

  Header: "✅ Package Ready"
  Company · Role (grey)

  Three rows:
    📄 Resume
      [Copy] [Download PDF] [Preview]
    ✉️ Cover Letter
      [Copy] [Download PDF] [Preview]
    🏢 Company Brief (if generated)
      [View]

  Copy: copyToClipboard() from lib/api.js → show "Copied! ✓" for 2s
  Download PDF: GET /api/applications/:id/resume.pdf → open in new tab
  Preview: open Modal with content in monospace scrollable box

  [Add to Apply Queue] button (green, full width):
    POST /api/apply-queue if not already added
    Then show [✓ Added to Queue] (disabled green)

  [Score Another Job →] button (secondary, full width):
    Reset all state → step 1

---

WIRE INTO App.jsx:
  Import FindJob from './pages/FindJob'
  case 'find-job': return <FindJob navigate={navigate} pageParam={pageParam} />

  Also: confirm Home page score bar navigates correctly:
    navigate('find-job?url=' + encodeURIComponent(url))

---

TEST:
  Navigate to Find a Job.
  Step 1: paste a job URL → Score → loading → step 2 with score.
  Step 2: score + matching/gaps visible → Generate Package → step 3.
  Step 3: copy works (clipboard), Preview opens modal, Add to Queue shows success state.
  Pre-fill: paste URL in Home score bar → Find a Job opens with URL pre-filled + auto-submits.
  Stop here.
```

---

## ✅ Phase 9 Complete When
- [ ] All 3 steps work end to end
- [ ] Score display is color-coded correctly
- [ ] Package download/copy/preview all work
- [ ] Pre-fill from Home score bar works
- [ ] No console errors

---
---

# PHASE 10 — Settings Page

## Goal
Account info, Gmail/Drive connections, discovery configuration, export.

---

## Prompt for Claude Code

```
Phases 1–9 complete.
Now build the Settings page.

CREATE dashboard/src/pages/Settings.jsx

---

FETCH on mount:
  GET /auth/me → account info
  GET /api/config → discovery thresholds + source toggles
  GET /api/discover/status → last run timestamp

---

4 SECTIONS:

SECTION 1 — YOUR ACCOUNT:
  Avatar (user.picture or initials green circle)
  Name (bold) + email (grey)
  User ID (truncated, small text, grey — useful for support)
  [Sign out] → /auth/logout

SECTION 2 — CONNECTED SERVICES:
  Gmail:
    If connected: "✓ Connected — user@gmail.com" (green) + [Disconnect] (ghost)
    If not: "Not connected" + [Connect Gmail →] link to /auth/google?scope=gmail
  Google Drive:
    Same pattern
  Note: "Connections let the app monitor your inbox and save documents automatically"

SECTION 3 — DISCOVERY PREFERENCES:

  Subsection: "What I'm looking for" (reads from profile, saves with POST /api/profile):
    Checkboxes: Full-time  Contract  Part-time  Freelance gigs

  Subsection: "Job boards to search":
    Toggle rows (POST /api/config on change):
    Salaried:
      [■] Indeed              — "Your target roles, full-time"
      [■] Remote OK           — "Remote jobs all categories"
      [■] We Work Remotely    — "Curated remote positions"
      [■] Remotive            — "Remote listings"
      [■] LinkedIn            — "Professional network jobs"
      [■] Monster             — "Traditional job board"
    Freelance:
      [■] Upwork              — "Hourly and fixed-price projects"
      [■] Fiverr              — "Gig and project work"
      [■] Freelancer.com      — "Competitive bid projects"
      [■] PeoplePerHour       — "UK-focused freelance"
    Note: "Freelance boards require your Hourly Rate to be set in Profile"

  Subsection: "Scoring thresholds":
    Slider 1: "Auto-tailor when score ≥ {value}"
      Range 5–10, step 0.5, default 7.5
      Left label: "More tailoring"  Right label: "Perfect fits only"
    Slider 2: "Show jobs scoring ≥ {value}"
      Range 1–10, step 0.5, default 6.0
      Left label: "Show everything"  Right label: "Perfect fits only"

  [Run Discovery Now] (green) + [Save Preferences] (secondary) — side by side
  "Last run: {time} ago" or "Never run" in grey below

  Run Discovery: POST /api/discover → toast "Discovery started ✓" → update last run time
  Save Preferences: POST /api/config with { thresholds, sources } → toast "Saved"

SECTION 4 — EXPORT:
  [Export All Applications as CSV] →
    GET /api/applications/export-csv → open in new tab (browser triggers download)
  Small text: "Opens in Excel, Google Sheets, or any spreadsheet app"

  [Export Profile as JSON] →
    GET /api/profile/export → trigger download
  Small text: "Backup your complete profile data"

---

WIRE INTO App.jsx:
  Import Settings from './pages/Settings'
  case 'settings': return <Settings navigate={navigate} />

---

TEST:
  Navigate to Settings.
  Section 1: shows your name, email, truncated user ID.
  Section 2: shows Gmail + Drive rows.
  Section 3: sliders move, both salaried and freelance source toggles visible.
  Run Discovery: shows loading state → toast.
  Section 4: export buttons present.
  Stop here.
```

---

## ✅ Phase 10 Complete When
- [ ] Account info renders correctly
- [ ] Both Gmail and Drive connection rows visible
- [ ] All 10 source toggles visible (both salaried + freelance)
- [ ] Sliders work and save
- [ ] Export buttons present
- [ ] No console errors

---
---

# PHASE 11 — Admin Page

## Goal
Admin-only view: user management, system configuration, model selection, discovery controls.

---

## Prompt for Claude Code

```
Phases 1–10 complete.
Now build the Admin page.

CREATE dashboard/src/pages/Admin.jsx

---

SECURITY: On mount, check isAdmin from UserContext.
If NOT admin: show "🔒 Access denied" message + [Go Home] button. Render nothing else.

---

FETCH on mount (only if isAdmin):
  GET /api/admin/users
  GET /api/config

---

4 SECTIONS:

SECTION 1 — USERS:
  Header: "Users" + count badge

  Stats row: Total Users | Total Applications | Avg Apps/User

  Table:
    User | Email | Joined | Apps | Profile Status | Platforms

    User column: avatar (picture or initials) + name (bold) + truncated userId (grey, 10px)
    Email: as-is
    Joined: formatDate(user.createdAt) or "—"
    Apps: count
    Profile Status: "Active" badge-green (profileApproved) or "Pending" badge-yellow
    Platforms: small grey tags for which platforms they have active

  Default user row: label "Default (legacy)" in italics if present

SECTION 2 — AI MODEL:
  Label: "Current AI Model"

  Two option buttons: [Beta — Haiku (fast, cheap)] [Production — Sonnet (quality)]
  Active: filled green background

  Current model string shown below (e.g. "claude-haiku-4-5-20251001")
  [Save Model] → POST /api/admin/config { model } → toast "Model updated"

SECTION 3 — THRESHOLDS (admin override for ALL users):
  Slider: "Auto-tailor threshold" (default 7.5)
  Slider: "Min score to show" (default 6.0)
  [Save Configuration] → POST /api/admin/config → toast "Configuration saved"

SECTION 4 — DISCOVERY:
  "Last run: {time}" or "Never run"
  [Run Discovery for All Users] (green)
    → POST /api/admin/run-discovery → toast "Discovery started for all users"

  Discovery enabled toggle: [■] Enable scheduled discovery

---

WIRE INTO App.jsx:
  Import Admin from './pages/Admin'
  case 'admin': return <Admin navigate={navigate} />

  The Sidebar already hides Admin link from non-admins (Phase 3).
  Admin.jsx adds a second check as defense-in-depth.

---

TEST:
  Sign in as non-admin → navigate to admin via URL → see "Access denied".
  Sign in as admin → all 4 sections visible.
  Users table shows real names (not raw Google IDs).
  Model toggle switches active state.
  Save config → toast appears.
  Stop here.
```

---

## ✅ Phase 11 Complete When
- [ ] Non-admins see "Access denied"
- [ ] Users table shows real names and emails
- [ ] AI model toggle works
- [ ] All sliders and save buttons functional
- [ ] No console errors
