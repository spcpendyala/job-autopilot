# Phase 10 — Dashboard Redesign
## Goal
Replace the current basic dashboard with a complete, self-explanatory product UI.
Anyone opens it for the first time and knows exactly what to do.
No terminal knowledge required after initial setup.

---

## New Dependencies
```bash
npm install --save-dev react-router-dom
```
Add to dashboard package or handle with simple state-based routing (no react-router needed if using tab state).

---

## Design System (keep from Phase 5, add these)

### Colors
- Background: `#0a0a0a`
- Surface: `#111111`
- Card: `#1a1a1a`
- Card hover: `#222222`
- Border: `#2a2a2a`
- Border highlight: `#3a3a3a`
- Text primary: `#f0f0f0`
- Text secondary: `#888888`
- Text muted: `#555555`
- Green: `#22c55e`
- Yellow: `#eab308`
- Red: `#ef4444`
- Blue: `#3b82f6`
- Purple: `#a855f7`
- Orange: `#f97316`

### Typography
- Font: system-ui, -apple-system, sans-serif
- Heading large: 28px, weight 700
- Heading medium: 20px, weight 600
- Body: 14px, weight 400
- Small: 12px, weight 400
- Mono: 'SF Mono', 'Fira Code', monospace, 13px

### Spacing
- Base unit: 8px
- Card padding: 24px
- Section gap: 32px
- Border radius cards: 12px
- Border radius buttons: 8px
- Border radius badges: 6px

### Component Patterns
- Primary button: green background, dark text, 10px 20px padding
- Secondary button: transparent, border #2a2a2a, text #f0f0f0
- Danger button: red background
- Input fields: background #1a1a1a, border #2a2a2a, focus border #3b82f6, 12px padding
- Empty states: centered, icon (emoji), heading, subtext, action button
- Loading: skeleton shimmer animation OR simple spinner with label
- Toast notifications: bottom-right, auto-dismiss 4s

---

## App Structure

### `dashboard/src/App.jsx` — Complete rewrite

State:
- `activePage`: 'home' | 'pipeline' | 'find' | 'settings'
- `setupComplete`: boolean — check if profile + API key configured
- `morningBrief`: object from API
- `toasts`: array of { id, message, type }

On mount:
- Fetch GET /api/health
- Fetch GET /api/setup-status (new endpoint)
- Fetch GET /api/morning-brief (new endpoint)
- If setupComplete is false → show Onboarding overlay

Layout:
```
┌─────────────────────────────────────────────┐
│  SIDEBAR (left, 220px wide, fixed)          │
│  Logo + nav items                           │
├─────────────────────────────────────────────┤
│  MAIN CONTENT (right, fills remaining)      │
│  Page component renders here                │
└─────────────────────────────────────────────┘
```

### Sidebar (`dashboard/src/components/Sidebar.jsx`)

Top:
- 🚀 Job AutoPilot logo + name
- Subtitle: "Your AI job search co-pilot"

Nav items (icon + label, active = green left border):
- 🌅 Morning Brief (home)
- 📋 Pipeline
- 🔍 Find a Job
- ⚙️ Settings

Bottom of sidebar:
- Small stats: "X applied this week"
- Version: "v1.0"

### Toast System (`dashboard/src/components/Toast.jsx`)
- Fixed bottom-right
- Stack up to 3 toasts
- Green for success, red for error, yellow for warning
- Auto-dismiss after 4 seconds
- X button to dismiss manually

---

## Page 1 — Morning Brief (Home)

`dashboard/src/pages/MorningBrief.jsx`

This is what you see every morning. Auto-refreshes every 60 seconds.

### Layout: 3 sections stacked

**Section 1 — Status Bar (top)**
```
Good morning, Sai ☀️          Thursday, May 22, 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[X Applied]  [X Responses]  [X Interviews]  [X% Response Rate]
```
Each stat is a colored pill. Response Rate shows green if >15%, yellow if 5-15%, red if <5%.

**Section 2 — Three columns**

Column A: 🔍 NEW JOBS (from discovery)
- Each job as a card: company logo initial, role title, fit score badge
- Score color: green ≥8, yellow 6-7, red <6
- Two buttons per card: "Score Details" (expand inline) | "Generate Package →"
- If no new jobs: empty state with emoji 🔭 and text "No new jobs found today. Add companies to watch in Settings → Discovery."
- Loading skeleton while fetching

Column B: 📅 FOLLOW-UPS DUE
- Each item: company name, role, days since applied, "View Draft" button
- View Draft expands to show the drafted follow-up email inline
- "Copy Email" button copies to clipboard
- "Mark as Sent" button updates status
- If none due: empty state 🎉 "You're all caught up! No follow-ups needed."

Column C: 📬 RESPONSES
- Each item: company, classification badge (INTERVIEW/REJECTION/etc), date
- INTERVIEW_REQUEST: green card, "View Interview Prep →" button
- REJECTION: red card, "Log & Move On" button
- APPLICATION_RECEIVED: blue card, info only
- If none: empty state 📭 "No new responses today. Keep applying!"

**Section 3 — Quick Apply (bottom)**
```
┌─────────────────────────────────────────────────┐
│  🔍 Found a job? Score it instantly             │
│  [Paste job URL here...              ] [Score →] │
└─────────────────────────────────────────────────┘
```
Submitting navigates to Find a Job page with the URL pre-filled.

---

## Page 2 — Pipeline

`dashboard/src/pages/Pipeline.jsx`

### Kanban board — 5 columns

```
DISCOVERED | APPLIED | RESPONDED | INTERVIEW | OFFER/CLOSED
```

Each application is a card showing:
- Company name (bold)
- Role title
- Fit score badge (colored)
- Days since created
- Status-specific info:
  - DISCOVERED: "Ready to apply →" button
  - APPLIED: "X days ago" + "Follow up" button if >5 days
  - RESPONDED: Classification badge
  - INTERVIEW: "View Prep" button
  - OFFER: "View Comparison" button

Click any card → opens ApplicationDetail modal (keep from Phase 5, enhanced).

Column headers show count: `APPLIED (3)`

Empty column state: dashed border, "Nothing here yet" in muted text.

**Above kanban — filter bar:**
- Search by company or role (filter cards in real time)
- Filter by verdict: All | Strong Match | Good Match | Stretch
- Sort: Newest | Fit Score | Company A-Z

### Enhanced ApplicationDetail Modal

Tabs: Score | Resume | Cover Letter | Company | Interview Prep | Salary | Actions

**Actions tab (new):**
- Status dropdown: change status with one click
- "Open Job URL" button (if stored)
- "Open in Drive" button (if drive_folder_url exists)
- "Generate Interview Prep" button (if not already done)
- "Copy Resume" button
- "Copy Cover Letter" button
- Danger zone: "Remove from tracker" (with confirmation)

---

## Page 3 — Find a Job

`dashboard/src/pages/FindJob.jsx`

This is the core daily action. Replaces the old Analyze tab.

### Step-by-step flow (wizard style)

**Step 1 — Input**
```
┌──────────────────────────────────────────────────┐
│  Find a Job                                      │
│                                                  │
│  Job URL                                         │
│  [https://...                                  ] │
│  We'll fetch the description automatically       │
│                                                  │
│  ── or paste the description directly ──         │
│                                                  │
│  [                                             ] │
│  [  Paste the full job description here...     ] │
│  [                                             ] │
│                                                  │
│  Company Name          Role Title                │
│  [Anthropic          ] [Operations Manager     ] │
│                                                  │
│  [  Score This Job →  ]                          │
└──────────────────────────────────────────────────┘
```

Show loading state: "🧠 Analyzing with Claude... (~15 seconds)"
Progress indicator with steps: Fetching → Scoring → Scanning Keywords

**Step 2 — Score Results**
Show FitScoreDisplay (from Phase 5) with:
- Score + verdict prominently
- Match breakdown bars
- Missing keywords as copyable badges
- Tailoring tips numbered list

Two action buttons:
- "Generate Full Package" (primary, green) — triggers resume + cover letter + company brief
- "Skip — Not Worth Applying" (secondary) — goes back to Step 1

**Step 3 — Package Ready**
```
✅ Your application package is ready

📄 Resume          [Copy] [View]
✉️  Cover Letter    [Copy] [View]  
🏢 Company Brief   [View]
🔍 Other Roles (3) [View]
☁️  Saved to Drive  [Open →]

[  Mark as Applied  ]    [ Find Another Job ]
```

"Mark as Applied" updates status to 'applied' in DB.
"Find Another Job" resets to Step 1.

If any step fails: show clear error with what went wrong and a "Try Again" button.

---

## Page 4 — Settings

`dashboard/src/pages/Settings.jsx`

Four sections. Each section is a card with a header.

### Section 1 — Your Profile
Shows: name, email, years experience, target roles list
"Edit Profile" button → opens modal with a form to edit profile.json fields:
- Name, email, phone, LinkedIn URL
- Target roles (add/remove tags)
- Core skills (add/remove tags)
- Years experience (number input)
- Open to remote / hybrid (toggles)

Save button calls POST /api/profile to update core/profiles/[name].json

### Section 2 — Discovery

**RSS Feeds**
- List of current feeds with delete button per feed
- "Add RSS Feed" input + button
  - Placeholder: "https://www.indeed.com/rss?q=operations+manager&l=Toronto"
  - Below input: "Get LinkedIn RSS: LinkedIn → Jobs → Job Alerts → ··· → Get RSS link"
- Empty state: "No RSS feeds configured. Add one to discover jobs automatically."

**Watched Companies**
- List of current companies being monitored with delete button
- "Add Company" input + button
  - Placeholder: "https://boards.greenhouse.io/shopify"
  - Below: "Works with Greenhouse, Lever, and most company career pages"
- "Run Discovery Now" button → calls POST /api/discover → shows results inline

### Section 3 — Connections

**Google Account**
- Status indicator: green "Connected" or red "Not connected"
- Connected: shows which Gmail is connected, "Disconnect" button
- Not connected: "Connect Google Account" button → triggers OAuth flow in new tab

**Google Drive**
- If DRIVE_FOLDER_ID set: "Connected — Job AutoPilot Applications folder" with link
- If not: input for folder URL + "Connect" button
  - Instruction: "1. Create a folder in Google Drive called 'Job AutoPilot Applications'. 2. Copy the link. 3. Paste it here."
  - Parse folder ID from URL automatically

**Anthropic API**
- Status: "Connected ✓" (if API key works) or "Not connected"
- Mode: "Beta Mode (Haiku)" or "Production Mode (Sonnet)"
- Toggle for BETA_MODE
- Shows estimated cost this week

### Section 4 — Preferences
- Follow-up reminder: toggle + number of days (default 5)
- Minimum score to show in morning brief (slider 1-10, default 6)
- Daily scan time (input, default "08:00")
- "Save Preferences" button

---

## New API Endpoints (add to `api/server.js`)

**GET /api/setup-status**
Returns:
```json
{
  "complete": true|false,
  "checks": {
    "profile": true,
    "anthropicKey": true,
    "googleConnected": false,
    "driveConfigured": false,
    "rssFeeds": false,
    "watchedCompanies": true
  }
}
```

**GET /api/morning-brief**
Runs the same logic as daily-scan.js but returns JSON instead of printing:
```json
{
  "date": "May 22, 2026",
  "newJobs": [...],
  "followUpsDue": [...],
  "newResponses": [...],
  "stats": { total, applied, responded, interviews, rejections }
}
```
Note: does NOT scan Gmail on every page load (too slow). Cache result for 30 minutes.
Store last scan result in memory. Re-scan only when user clicks "Refresh".

**GET /api/config**
Returns current config (RSS feeds, watched companies, drive folder, beta mode).
Reads from .env and core/config.json.

**POST /api/config**
Updates config. Writes to core/config.json (not .env — never write to .env programmatically).
Body: `{ rssFeeds: [], watchedCompanies: [], betaMode: bool, followUpDays: 5, minScore: 6 }`

**POST /api/profile**
Updates profile. Writes to core/profiles/[ACTIVE_PROFILE].json.
Body: partial profile object — merge with existing.

**POST /api/discover**
Runs discovery (RSS + watched companies) and returns results.
Returns: `{ discovered: [{ title, url, company, fitScore }] }`

**POST /api/applications/:id/mark-applied**
Updates status from 'discovered' to 'applied', sets applied_at to now.

---

## Onboarding Overlay

`dashboard/src/components/Onboarding.jsx`

Shows on first launch if setup is incomplete. Full-screen overlay, dark background.

4-step wizard:

**Step 1 — Welcome**
```
🚀 Welcome to Job AutoPilot

Your AI-powered job search co-pilot.
Here's what it does:

✦ Scores any job against your profile in 30 seconds
✦ Generates tailored resume + cover letter automatically  
✦ Tracks every application and follows up for you
✦ Preps you for interviews with STAR answers

Let's get you set up. Takes about 3 minutes.

[Get Started →]
```

**Step 2 — Profile Check**
- Shows current profile data (name, experience, skills)
- "This looks right" → proceed
- "I need to update this" → opens profile editor inline
- Can't skip

**Step 3 — Connect Google**
- Explains: "Connect Google to scan Gmail for responses and save files to Drive"
- "Connect Google Account" button
- "Skip for now — I'll connect later" (allowed, shows warning about missing features)
- Status indicator updates in real time when connected

**Step 4 — Discovery Setup**
- "Add at least one job source to get started"
- RSS feed input OR watched company input — at least one required
- Pre-filled suggestion: `https://boards.greenhouse.io/anthropic` as an example
- "Add more later in Settings"
- "Finish Setup →" button

After completing: overlay closes, morning brief loads.

---

## `core/config.json` (new file)

Create this file to store user-configurable settings that aren't secrets:
```json
{
  "rssFeeds": [],
  "watchedCompanies": [],
  "betaMode": true,
  "followUpDays": 5,
  "minScoreToShow": 6,
  "dailyScanTime": "08:00",
  "activeProfile": "sai",
  "lastMorningBriefAt": null,
  "morningBriefCache": null
}
```

API reads/writes this file. .env is never touched by the API.

---

## Done Test

```bash
npm run dev
# Open http://localhost:5173
```

Test 1 — Onboarding:
- First load shows welcome overlay
- Can navigate all 4 steps
- After finish: overlay gone, morning brief shows

Test 2 — Morning Brief:
- Shows "Good morning, Sai" with today's date
- Quick apply bar at bottom accepts a URL
- Empty states show helpful messages (not blank screens)

Test 3 — Find a Job:
- Paste URL → shows loading → shows score
- "Generate Full Package" → shows progress → shows package ready with copy buttons
- "Mark as Applied" → card appears in Pipeline under APPLIED

Test 4 — Pipeline:
- Shows all applications as Kanban cards
- Search filters cards in real time
- Click card → modal opens with all tabs

Test 5 — Settings:
- All 4 sections visible
- Add an RSS feed → appears in list → persists on refresh
- Add a watched company → appears in list
- Edit profile name → saves → shows updated name in sidebar

Test 6 — Self-explanatory check:
- Every empty state has a clear explanation and action button
- No section requires reading docs to understand
- A non-technical person can navigate all pages without help

Phase 10 complete when all 6 tests pass and there is no empty screen without explanation text and a next action.
