# Phase 5 — Dashboard
## Goal
Visual command center. See all applications, scores, statuses at a glance.
Analyze a new job from the UI. View generated documents in-browser.
Express API backend + React frontend via Vite.

---

## New Dependencies
```bash
npm install express cors
npm install --save-dev vite @vitejs/plugin-react concurrently
```

---

## Part A — Express API (`api/server.js`)

### Endpoints

**GET /api/health**
Returns `{ status: 'ok', timestamp }` — used to check if server is running.

**GET /api/applications**
Returns all applications from SQLite ordered by created_at DESC.
Each row includes all columns. Transform `raw_score_json` by parsing it into `scoreDetails`.

**GET /api/applications/:id**
Returns single application by ID + reads all files from its outputs folder if it exists.
Returns: `{ ...application, files: { resume, coverLetter, companyBrief, otherRoles, interviewPrep } }`
Each file value is the file content as string, or null if file doesn't exist.

**GET /api/stats**
Returns from `getStats()`:
```json
{
  "total": 12,
  "applied": 8,
  "responded": 2,
  "interviews": 1,
  "rejections": 1,
  "offers": 0,
  "avgFitScore": 7.4,
  "responseRate": "25%"
}
```

**POST /api/analyze**
Body: `{ jobUrl, jobDescription, jobTitle, company }`
- If jobUrl provided and no jobDescription: fetch via Jina
- Run scoreJobFit + scanATSGaps in parallel
- Return: `{ fitScore, atsGaps, jobDescription }`
- Do NOT save to DB yet — that happens on /api/apply

**POST /api/apply**
Body: `{ jobUrl, jobDescription, jobTitle, company, fitScore, atsGaps, generateDocs }`
- Check isDuplicate — return `{ duplicate: true }` if already processed
- If generateDocs: run resume tailor + cover letter + company brief + other roles
- Save to outputs folder
- Save to SQLite
- Sync to Sheets if configured
- Return: `{ success: true, applicationId, outputFolder, files }`

**PATCH /api/applications/:id/status**
Body: `{ status, notes }`
- Update SQLite status
- Update Sheets status
- Return `{ success: true }`

**POST /api/prep/:id**
- Trigger interview prep for application ID
- Return `{ success: true, briefPath }`

### Middleware
- `cors()` — allow all origins (localhost dev)
- `express.json({ limit: '100kb' })`
- Request logger: `[METHOD] /path — Xms` on every request
- Error handler: catch all thrown errors, return `{ error: message }` with 500 status — never send HTML errors

Server listens on `process.env.PORT || 3001`

---

## Part B — React Dashboard (`dashboard/`)

### Setup
Create `dashboard/` as a Vite React app.
Create `dashboard/vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } }
})
```

Create `dashboard/index.html` (standard Vite entry with `<div id="root">`)
Create `dashboard/src/main.jsx` (standard React 18 root render)

### Design System (apply consistently across all components)
- Background: `#0a0a0a`
- Surface: `#111111`
- Card: `#1a1a1a`
- Border: `#2a2a2a`
- Text primary: `#f0f0f0`
- Text secondary: `#888888`
- Green (strong match / success): `#22c55e`
- Yellow (good match / warning): `#eab308`
- Red (weak / rejection): `#ef4444`
- Blue (accent / interview): `#3b82f6`
- Font: system-ui, -apple-system, sans-serif
- No external UI libraries

All CSS written as inline styles or a single `dashboard/src/styles.css`.

### Components

**`dashboard/src/App.jsx`** — root component
- State: `activeTab` ('pipeline' | 'analyze' | 'stats')
- Renders: Header + TabNav + active tab content
- Fetches `/api/stats` on mount, passes to StatsBar

**`dashboard/src/components/Header.jsx`**
- Shows: "🚀 Job AutoPilot" title
- Shows: stats bar — Total: X | Applied: X | Interviews: X | Response Rate: X%
- Clean dark bar across top

**`dashboard/src/components/TabNav.jsx`**
- Three tabs: Pipeline | Analyze | Stats
- Active tab has green bottom border

**`dashboard/src/components/Pipeline.jsx`**
- Fetches `/api/applications` on mount, refetches every 30s
- Shows applications in a table:
  Columns: Company | Role | Score | Verdict | Status | Applied | Actions
- Score shown as colored number: green ≥8, yellow 6-7.9, red <6
- Verdict shown as colored badge
- Status shown as colored pill:
  discovered=gray, applied=blue, responded=yellow, interview=green, rejected=red, offer=purple
- Actions column: "View" button → opens ApplicationDetail modal
- Click anywhere on row → same as View

**`dashboard/src/components/ApplicationDetail.jsx`**
- Modal overlay, full details for one application
- Fetches `/api/applications/:id` when opened
- Tabs inside modal: Score | Resume | Cover Letter | Company Brief | Interview Prep
- Score tab: shows full breakdown + gaps + tailoring tips
- Doc tabs: render markdown content as preformatted text (no markdown parser needed)
- Status dropdown: can change status, calls PATCH /api/applications/:id/status
- "Generate Interview Prep" button: calls POST /api/prep/:id, shows loading state

**`dashboard/src/components/Analyze.jsx`**
- Form: Job URL field + Company field + Role field + large textarea for paste
- "Score Job" button → POST /api/analyze → shows FitScoreDisplay
- After scoring: "Generate Full Package" button → POST /api/apply with generateDocs:true
- Shows loading spinners during API calls
- Shows error messages if API fails

**`dashboard/src/components/FitScoreDisplay.jsx`**
- Large score number (e.g. "8.2") with verdict below
- Four mini bars for breakdown (skills/experience/tools/alignment)
- Two columns: matching skills (green) | gaps (red)
- ATS keywords section: critical (red badges) | nice to have (yellow badges)
- Tailoring tips as numbered list

**`dashboard/src/components/Stats.jsx`**
- Fetches /api/stats
- Shows: donut or bar chart of application statuses (pure CSS or SVG — no chart library)
- Shows: avg fit score, response rate, total applications
- Shows: "Applications by verdict" breakdown

---

## Update `package.json` scripts
```json
"start": "node api/server.js",
"dev": "concurrently \"npm start\" \"vite dashboard\"",
"dashboard": "vite dashboard"
```

---

## Done Test
```bash
# Start everything
npm run dev

# Terminal should show:
# 🚀 JobPilot API running on port 3001
# VITE v5.x.x ready at http://localhost:5173

# Open http://localhost:5173
# Should see: dark dashboard with Header showing your stats
# Pipeline tab: shows the Anthropic application scored in Phase 1/2
# Click on it: modal opens with Score tab showing 7/10 details
# Analyze tab: paste a job URL, click Score Job, see fit score appear
# Stats tab: shows total=1, avg score=7
```

Phase 5 is complete when:
- `npm run dev` starts both servers without error
- Dashboard loads at localhost:5173
- Anthropic application visible in Pipeline with correct score
- Clicking application opens detail modal
- Analyze tab successfully scores a new job URL
