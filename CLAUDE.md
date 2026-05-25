# Job AutoPilot — CLAUDE.md

> This file is the authoritative architecture reference. Read it completely before
> writing any code, creating any file, or making any architectural decision.
> If anything here conflicts with a phase spec or a user instruction, THIS FILE WINS.

---

## WHAT THIS IS

AI-powered job search co-pilot. Helps one candidate find, apply to, and track jobs.

Core loop:
```
Profile built → Jobs discovered → User selects → System tailors →
User edits & approves → User applies → System tracks → System learns → Loop improves
```

The tool never auto-submits applications. It prepares materials and tracks manually.

---

## STACK — NON-NEGOTIABLE

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+, CommonJS only (`require` / `module.exports`). No ESM. No TypeScript. |
| API | Express.js |
| Database | better-sqlite3 at `data/autopilot.db` — single source of truth |
| Scraping | Jina Reader `https://r.jina.ai/{url}` — no auth, no install, primary scraper |
| Auth | Passport.js + Google OAuth2 + express-session + connect-sqlite3 |
| Sessions | Stored in `data/sessions.sqlite` |
| Frontend | React 18 + Vite — lives in `dashboard/` |
| PDF | Puppeteer — markdown → PDF for resume and cover letter |
| Process manager | PM2 — `ecosystem.config.js` |
| Reverse proxy | Nginx on port 80 → Node on port 3001 |
| Package manager | npm |

---

## DEPLOYMENT — ONE SERVER ONLY

**GCP e2-micro VM. No Vercel. No Netlify. No separate frontend host.**

- IP: 34.148.196.49
- User: spcpendyala
- App dir: /home/spcpendyala/job-autopilot
- Dashboard: built with `vite build`, output goes to `dashboard/dist/`
- Dashboard served from: `/home/spcpendyala/job-autopilot/dashboard-dist/` via Nginx
- API: Node on port 3001, Nginx proxies `/api` and `/auth` to it
- Everything runs on one URL: `http://34.148.196.49`

### ❌ VERCEL IS REMOVED — DO NOT REFERENCE IT

- Delete `dashboard/vercel.json` if it exists
- Remove any Vercel references from `package.json` scripts
- Do not add it back under any circumstances
- Reason: Vercel creates a second domain which breaks session cookies set by the GCP server.
  Cross-domain auth does not work without complex CORS + SameSite cookie workarounds.
  One server eliminates the problem entirely.

### Deploy process
```bash
# 1. Build dashboard locally
cd dashboard && npx vite build

# 2. Copy built dashboard to GCP
scp -r dist/* spcpendyala@34.148.196.49:/home/spcpendyala/job-autopilot/dashboard-dist/

# 3. Sync backend code
rsync -avz \
  --exclude 'node_modules' --exclude '.git' --exclude 'data' \
  --exclude 'outputs' --exclude '.env' --exclude 'uploads' \
  . spcpendyala@34.148.196.49:/home/spcpendyala/job-autopilot/

# 4. SSH and restart
ssh spcpendyala@34.148.196.49 "
  cd /home/spcpendyala/job-autopilot &&
  npm install --production &&
  pm2 restart all &&
  pm2 save
"
```

### Nginx config
```nginx
server {
  listen 80;
  server_name _;
  client_max_body_size 50M;

  location /api {
    proxy_pass http://localhost:3001;
    proxy_read_timeout 120s;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /auth {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
  }

  location / {
    root /home/spcpendyala/job-autopilot/dashboard-dist;
    try_files $uri $uri/ /index.html;
  }
}
```

---

## AUTH

- `MULTI_USER=true` → Google OAuth required. All `/api/*` routes protected by `requireAuth`.
- `MULTI_USER=false` → Single-user mode. `req.userId = 'default'`. No login required.
- Admin user: `process.env.ADMIN_USER_ID` — has access to `/api/admin/*` routes.
- Sessions: 30-day cookie, stored in `data/sessions.sqlite`.

```javascript
// requireAuth middleware — add to ALL /api/* routes
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) { req.userId = req.user.id; return next() }
  if (process.env.MULTI_USER !== 'true') { req.userId = 'default'; return next() }
  res.status(401).json({ error: 'Not authenticated', loginUrl: '/auth/google' })
}
```

### Google OAuth setup (required before first use)
1. console.cloud.google.com → Create project "Job AutoPilot"
2. Enable: Gmail API, Google Drive API
3. OAuth consent screen → External → scopes: gmail.readonly, drive.file, profile, email
4. Create OAuth 2.0 Client ID → Web application
5. Authorized redirect URI: `http://34.148.196.49/auth/google/callback`
6. Add to `.env` on GCP server:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_CALLBACK_URL=http://34.148.196.49/auth/google/callback
MULTI_USER=true
SESSION_SECRET=<64 random chars>
ADMIN_USER_ID=<your Google sub ID — get from /auth/me after first sign-in>
```

---

## AI MODELS

All Claude calls go through `services/claude.js`. Never import the SDK directly in agents.

| Task | Model |
|---|---|
| Fit scoring, ATS scan, resume tailoring, cover letter, profile synthesis, interview prep, salary | `BETA_MODE=true` → Haiku / `BETA_MODE=false` → Sonnet |
| Pre-filter YES/NO, email classification, recruiter finding, outreach drafts, preference learning | Haiku always |

### Model IDs
- Sonnet: `claude-sonnet-4-20250514`
- Haiku: `claude-haiku-4-5-20251001`
- Never use Opus

### Rules
- Set `max_tokens` to minimum viable per task — never use 4096 as a default
- Always use prompt caching (`cache_control: ephemeral`) for profile + base resume
- `BETA_MODE=true` → Haiku for everything (cost control in dev/testing)

---

## FILE PATHS — PER USER

Never hardcode paths. Always use helper functions from `services/user-paths.js`.

```javascript
// services/user-paths.js
const path = require('path')
const fs = require('fs')
const DATA_DIR = path.join(__dirname, '..', 'data')

function getUserDir(userId)    { return path.join(DATA_DIR, 'users', userId) }
function getProfilePath(userId){ return path.join(getUserDir(userId), 'profile.json') }
function getResumePath(userId) { return path.join(getUserDir(userId), 'base-resume.md') }
function getOutputsDir(userId) { return path.join(getUserDir(userId), 'outputs') }
function ensureUserDir(userId) {
  ['', 'resumes', 'outputs'].forEach(sub =>
    fs.mkdirSync(path.join(getUserDir(userId), sub), { recursive: true }))
}
module.exports = { getUserDir, getProfilePath, getResumePath, getOutputsDir, ensureUserDir }
```

### Path rules
- All user data: `data/users/{userId}/`
- Profile: `data/users/{userId}/profile.json`
- Base resume: `data/users/{userId}/base-resume.md`
- Category resumes: `data/users/{userId}/resumes/`
- Application outputs: `data/users/{userId}/outputs/Company-Role-Date/`
- Resume uploads: `uploads/resumes/{userId}/`
- Legacy single-user data: `data/users/default/` — never delete, remains accessible

---

## DATABASE

SQLite at `data/autopilot.db`. All tables have `user_id TEXT DEFAULT 'default'`.

Run `migrateAddUserId()` on startup — adds `user_id` to any table missing it.
Function must be idempotent (safe to run multiple times).

Every query function accepts `userId` as a parameter. Never query without filtering by `userId`.

### Key tables
- `applications` — every job ever seen, with status lifecycle
- `approval_queue` — tailored packages awaiting user review
- `apply_queue` — approved packages ready to submit
- `preference_signals` — behavioral signals (deselected, edited, applied)
- `user_preferences` — aggregated learned preferences per user
- `application_versions` — snapshot of exact content submitted to each company
- `skills_gap` — skill frequency analysis across target job postings
- `email_responses` — classified Gmail responses
- `metadata` — key-value store per user (last_discovery_at, etc.)

### Application status lifecycle
```
discovered → selected → tailoring → ready → applied → responded → interview → offer
                                                    ↘ rejected
                                                    ↘ closed
```

---

## GOOGLE INTEGRATIONS

### Google Drive — OPTIONAL
- Only syncs if user has completed Google OAuth with drive scope
- `services/drive.js` wraps `getAuthClient()` in try/catch
- If auth fails or `DRIVE_FOLDER_ID` not set: return null, log once, never crash
- Never throw from drive functions — callers check for null result

### Google Sheets — REMOVED
- Not a core feature. Never crash or warn if `TRACKING_SHEET_ID` is missing.
- Replaced by: `GET /api/applications/export-csv`
- Remove any Sheets dependency from critical paths

### Gmail — OPTIONAL
- Used in daily-scan.js to classify responses
- If `core/google-token.json` missing: skip Gmail scan, log "Gmail not connected", continue

---

## CODING CONVENTIONS

- `async/await` throughout. No callbacks. No `.then()` chains.
- All errors: `console.error()` the message, then `throw` — let callers handle
- Env vars validated at module load time. Throw clear error if critical vars missing.
- `requireAuth` on ALL `/api/*` routes — no exceptions
- Pass `req.userId` to every DB function and path helper
- Comments only on non-obvious logic
- No unused variables, no dead code
- `console.log` with descriptive prefix: `[discovery]`, `[auth]`, `[tailor]` etc.

---

## FOLDER STRUCTURE

```
job-autopilot/
├── CLAUDE.md                         ← THIS FILE — read before everything
├── .env                              ← never commit, never log
├── .env.example
├── package.json
├── ecosystem.config.js               ← PM2
├── nginx.conf
├── core/
│   └── config.json                   ← app settings (thresholds, discovery config)
├── data/
│   ├── autopilot.db
│   ├── sessions.sqlite
│   └── users/
│       └── {userId}/
│           ├── profile.json
│           ├── base-resume.md
│           ├── resumes/              ← category variants
│           └── outputs/
│               └── Company-Role-Date/
│                   ├── resume.md
│                   ├── resume.pdf
│                   ├── cover-letter.md
│                   ├── cover-letter.pdf
│                   ├── job-description.md
│                   ├── company-brief.json
│                   ├── score-report.md
│                   ├── interview-prep.md
│                   └── salary-brief.md
├── uploads/
│   └── resumes/{userId}/             ← gitignored
├── services/
│   ├── claude.js                     ← SDK wrapper (only entry point for AI)
│   ├── db.js                         ← all SQLite operations
│   ├── user-paths.js                 ← path helpers (never hardcode paths)
│   ├── fetcher.js                    ← Jina scraper
│   ├── auth.js                       ← Passport + Google OAuth strategy
│   ├── google-auth.js                ← shared OAuth client
│   ├── gmail.js                      ← Gmail reader (optional)
│   ├── drive.js                      ← Google Drive sync (optional)
│   ├── output-writer.js              ← saves packages to per-user paths
│   ├── resume-parser.js              ← PDF/DOCX/TXT → plain text
│   └── pdf-generator.js             ← Puppeteer: markdown → PDF
├── agents/
│   ├── fit-scorer.js
│   ├── ats-scanner.js
│   ├── resume-tailor.js
│   ├── cover-letter.js
│   ├── company-brief.js
│   ├── other-roles.js
│   ├── follow-up-drafter.js
│   ├── response-classifier.js
│   ├── interview-prep.js
│   ├── salary-researcher.js
│   ├── rejection-analyzer.js
│   ├── profile-synthesizer.js
│   ├── recruiter-finder.js
│   ├── outreach-drafter.js
│   ├── preference-learner.js        ← learns from user behavior signals
│   └── skills-gap-analyzer.js       ← aggregates skill gaps across job postings
├── discovery/
│   ├── auto-scorer.js               ← orchestrator: fetch → filter → score → queue
│   ├── query-builder.js             ← builds source URLs from profile + preferences
│   ├── source-fetcher.js            ← RSS + JSON sources
│   └── pre-filter.js               ← Haiku YES/NO gate before Sonnet scoring
├── scripts/
│   ├── daily-scan.js               ← PM2 cron at 08:00: Gmail + discovery + brief
│   ├── discover.js                 ← CLI: run discovery manually
│   ├── apply.js                    ← CLI: score one job URL
│   ├── analyze.js                  ← CLI: rejection pattern analysis
│   ├── setup-google.js             ← one-time Google OAuth wizard
│   ├── migrate-to-multiuser.js     ← migrate legacy data → data/users/default/
│   └── deploy.sh                   ← rsync + SSH + pm2 restart
├── api/
│   └── server.js                   ← all Express routes and middleware
└── dashboard/
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx                 ← routing, sidebar, AuthGate
        ├── components/
        │   ├── Sidebar.jsx         ← 5 nav items + admin (conditional)
        │   ├── Toast.jsx           ← bottom-right notifications
        │   └── AuthGate.jsx        ← shows sign-in if unauthenticated
        └── pages/
            ├── Home.jsx            ← inbox: approvals, new jobs, follow-ups, responses
            ├── Pipeline.jsx        ← kanban board + ApplicationDetail modal
            ├── FindJob.jsx         ← 3-step: input → score → package ready
            ├── Profile.jsx         ← all 12 fields, view + edit mode
            ├── Settings.jsx        ← connections, discovery config, export
            └── Admin.jsx           ← users list, system config (admin only)
```

---

## NAVIGATION — 5 PAGES ONLY

```
🏠  Home         — The inbox. What needs attention right now.
📋  Pipeline     — Kanban of all applications.
🔍  Find a Job   — Paste URL or JD → score → generate package.
👤  Profile      — All 12 fields. The source of truth for all AI output.
⚙️  Settings     — Connections, discovery sources, preferences.
---
🛡  Admin        — Visible only when req.user.id === ADMIN_USER_ID
```

No other top-level pages. No Outreach tab at top level (accessible from application cards).
No separate "Stats" page (stats live in Pipeline header).
No "Morning Brief" naming — it's just "Home".

---

## PROFILE — 12 REQUIRED FIELDS

These fields drive every piece of AI output. An incomplete profile = poor AI output.
Discovery is blocked if completeness score < 60%.

```
1.  name, email, phone, location, linkedin, website
2.  summary
3.  core skills (add/remove tags)
4.  target roles (add/remove tags)
5.  certifications (name, issuer, year)
6.  achievements (bullet list)
7.  education (degree, institution, year)
8.  projects (name, description, url, techUsed)
9.  about (free text, different from summary)
10. experience (title, company, from, to, description, highlights[], skillsUsed[])
11. languages (language, level)
12. volunteering (role, organization, from, to, description)
```

Profile completeness score (show as % in Profile page header):
- name + email + location: 15 points each
- summary: 10 points
- targetRoles (3+): 10 points
- experience (1+): 10 points
- coreSkills (5+): 10 points
- education: 5 points
- certifications: 5 points
- achievements (2+): 5 points
- languages: 5 points

---

## USER FLOW SUMMARY

```
1. Sign in with Google
2. Onboarding overlay (cannot be dismissed until profile approved)
   a. Upload resumes (PDF/DOCX/TXT, up to 6) → AI synthesizes profile
   b. Review synthesized profile → approve or edit
   c. Connect Google (optional) for Gmail + Drive
3. Discovery runs immediately after approval
   - Pulls from Indeed, Remote OK, We Work Remotely, Remotive, watched companies
   - Pre-filtered with Haiku, scored with Sonnet
   - 6.0-7.4 → shown in Home as "New Jobs Found"
   - 7.5+ → auto-tailored → shown in Home as "Pending Review"
4. User reviews new jobs in Home
   - "Tailor & Review →" → triggers tailoring → Approval Screen
   - "Not Interested" → logs preference signal → hidden permanently
5. Approval Screen (split view)
   - Left: job details, score, missing keywords, tailoring tips
   - Right: editable resume + cover letter (click to edit inline)
   - Approve → generates PDF → adds to Apply Queue
   - User edits are logged as preference signals
6. Apply Queue
   - User opens job URL manually, uploads PDF, submits application
   - Marks as "Applied" in the tool
7. Tracking
   - Daily Gmail scan classifies responses
   - Follow-up drafts generated after 5 days with no response
   - Interview prep + salary brief generated on interview request
8. Learning loop
   - Every deselect/skip/edit/apply is a preference signal
   - preference-learner.js aggregates signals → updates user_preferences
   - Discovery and tailoring use preferences on next run
```

---

## WHAT IS EXPLICITLY REMOVED

| Feature | Replacement |
|---|---|
| Vercel deployment | GCP Nginx serves everything |
| Google Sheets sync | `GET /api/applications/export-csv` |
| `WATCH_COMPANIES` env var | Watched companies managed in Settings UI |
| `JOB_RSS_FEEDS` env var | RSS feeds managed in Settings UI |
| Separate "Stats" page | Stats in Pipeline page header |
| "Morning Brief" page name | Renamed to "Home" |
| Outreach as top-level nav item | Accessible from application cards in Pipeline |
| ACTIVE_PROFILE env var | Per-user profile at data/users/{userId}/profile.json |
| core/profiles/ folder | Migrated to data/users/default/ |
| core/base-resume.md | Migrated to data/users/default/base-resume.md |

---

## PM2 CONFIG

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'job-autopilot-api',
      script: 'api/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production', PORT: 3001 },
      error_file: '/var/log/job-autopilot/error.log',
      out_file: '/var/log/job-autopilot/out.log',
    },
    {
      name: 'job-autopilot-cron',
      script: 'scripts/daily-scan.js',
      instances: 1,
      autorestart: false,
      cron_restart: '0 8 * * *',
      watch: false,
      env: { NODE_ENV: 'production' },
    },
  ],
}
```

---

## .env.example

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
NODE_ENV=development

# Auth
MULTI_USER=false
SESSION_SECRET=change-this-to-64-random-chars
AUTH_CALLBACK_URL=http://localhost:3001/auth/google/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_USER_ID=

# Optional integrations
DRIVE_FOLDER_ID=

# AI mode
BETA_MODE=true
# true = Haiku for everything (development/testing)
# false = Sonnet for quality tasks (production)
```

---

## GITIGNORE

```
.env
.env.production
data/
uploads/
dashboard/dist/
dashboard-dist/
node_modules/
core/google-token.json
.DS_Store
```

---

## QUICK REFERENCE — COMMON MISTAKES TO AVOID

1. **Do not import Anthropic SDK directly in agents.** Always use `services/claude.js`.
2. **Do not hardcode file paths.** Always use `services/user-paths.js` helpers.
3. **Do not query DB without userId.** Every query filters by `user_id`.
4. **Do not write to .env programmatically.** App config goes in `core/config.json`.
5. **Do not reference Vercel.** It is gone. Nginx serves the dashboard.
6. **Do not skip `requireAuth` on any `/api/*` route.**
7. **Do not crash if Google Drive or Gmail is not configured.** Always graceful fallback.
8. **Do not run discovery if profile.approved !== 'true'.** Gate is in auto-scorer.js.
9. **Do not use Haiku for resume tailoring or fit scoring in production.** Quality tasks need Sonnet.
10. **Do not show raw AI output without user review.** Approval screen is mandatory.

---

## CURRENT STATUS

All 17 phases from the specs/ folder have been designed.

Active gaps to fix (in priority order):
1. Google OAuth credentials not configured on GCP server
2. Vercel references not fully removed from codebase
3. Per-user file paths not fully wired (some routes still read from core/)
4. Profile page missing 6 of 12 fields (certifications, achievements, projects, languages, volunteering, about)
5. Morning Brief loading state never resolves (fetch error not handled)
6. Data migration (core/ → data/users/default/) not run
7. PDF generation not implemented
8. preference-learner.js and skills-gap-analyzer.js not implemented
9. Admin page not built