# Job AutoPilot — CLAUDE.md

## What This Is
AI-powered job search assistant for active job seekers.
Discovers, scores, prepares, tracks, and follows up on job applications.
Multi-user. Google OAuth sign-in. Dashboard-first — no Google Drive dependency for core functionality.
Node.js backend on GCP (34.148.196.49). React dashboard served via Nginx.

---

## Stack
- Runtime: Node.js 18+
- AI: @anthropic-ai/sdk — all calls go through services/claude.js only
- DB: better-sqlite3 at data/autopilot.db — single source of truth
- Scraping: Jina Reader API (https://r.jina.ai/[URL]) — primary, no auth, no install
- Auth: Passport.js + Google OAuth2 + express-session + connect-sqlite3
- Google APIs: googleapis — Drive (optional), Gmail (optional). Sheets dropped as core feature.
- Package manager: npm
- Module system: CommonJS (require/module.exports) — NOT ESM
- Frontend: React 18 + Vite — dashboard/ folder
- Reverse proxy: Nginx on port 80 → Node on port 3001
- Process manager: PM2 — ecosystem.config.js

---

## Model Rules — ALWAYS FOLLOW

| Task | Model |
|---|---|
| Fit scoring, ATS scan, resume tailor, cover letter, interview prep | BETA: haiku / PROD: sonnet |
| Email classification, pre-filter YES/NO, status checks, short outputs | haiku always |

### Model IDs
- Sonnet: claude-sonnet-4-20250514
- Haiku: claude-haiku-4-5-20251001
- NEVER use Opus

### Rules
- Read BETA_MODE from .env — if true, use haiku for everything except where hardcoded
- Set max_tokens to minimum viable per task (see each agent file)
- ALWAYS use prompt caching for profile + base resume (cache_control: ephemeral)
- ALL Claude calls go through services/claude.js — never import SDK directly in agents

---

## Architecture — Critical Decisions

### Multi-User File Storage (per-user paths)
All user data lives under data/users/{userId}/. Never read/write core/profiles/ or core/base-resume.md directly in API routes — always use helper functions:
- getProfilePath(userId) → data/users/{userId}/profile.json
- getResumePath(userId) → data/users/{userId}/base-resume.md
- getOutputsDir(userId) → data/users/{userId}/outputs/
- ensureUserDir(userId) → creates the directory tree if missing

### Auth
- MULTI_USER=true → Google OAuth required, all routes protected via requireAuth middleware
- MULTI_USER=false → single-user mode, req.userId = 'default', no login required
- Admin user = process.env.ADMIN_USER_ID — has access to /api/admin/* and /admin dashboard page
- Sessions stored in data/sessions.sqlite via connect-sqlite3

### Database
- SQLite at data/autopilot.db
- ALL tables have user_id column (added via migration in Phase 17)
- user_id='default' = legacy single-user data
- url_hash TEXT UNIQUE — deduplication, never process same job URL twice
- Metadata table for key-value storage (last_analyzed_count, etc.)

### Google Drive
- Optional. Only syncs if user has connected Google account (core/google-token.json exists)
- getAuthClient() wrapped in try/catch — returns null if no token, never crashes
- New users can use the system fully without Drive connected

### Google Sheets
- Dropped as core feature. Never crash or warn if TRACKING_SHEET_ID is not set.
- Replaced by CSV export: GET /api/applications/export-csv

### Discovery
- Profile must be approved (profile_status.approved = 'true') before discovery runs
- Auto-tailor threshold: 7.5 (from core/config.json)
- Pre-filter with Haiku before Sonnet scoring to save cost
- Sources auto-generated from profile.targetRoles — no manual RSS config required

---

## Folder Structure

job-autopilot/
├── CLAUDE.md
├── .env
├── .env.example
├── .env.production.example
├── package.json
├── ecosystem.config.js
├── Dockerfile
├── nginx.conf
├── core/
│   ├── config.json
│   └── profiles/
│       └── sai.json
├── data/
│   ├── autopilot.db
│   ├── sessions.sqlite
│   └── users/
│       └── {userId}/
│           ├── profile.json
│           ├── base-resume.md
│           ├── resumes/
│           └── outputs/
├── uploads/
│   └── resumes/
│       └── {userId}/
├── services/
│   ├── claude.js
│   ├── db.js
│   ├── fetcher.js
│   ├── drive.js
│   ├── sheets.js
│   ├── gmail.js
│   ├── google-auth.js
│   ├── auth.js
│   ├── output-writer.js
│   └── resume-parser.js
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
│   └── outreach-drafter.js
├── discovery/
│   ├── auto-scorer.js
│   ├── query-builder.js
│   ├── source-fetcher.js
│   └── pre-filter.js
├── scripts/
│   ├── apply.js
│   ├── discover.js
│   ├── daily-scan.js
│   ├── prep.js
│   ├── analyze.js
│   ├── setup-google.js
│   ├── deploy.sh
│   └── migrate-to-multiuser.js
├── api/
│   └── server.js
├── dashboard/
│   ├── vite.config.js
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── Insights.jsx
│   │   │   └── AuthGate.jsx
│   │   └── pages/
│   │       ├── MorningBrief.jsx
│   │       ├── ApprovalScreen.jsx
│   │       ├── Pipeline.jsx
│   │       ├── FindJob.jsx
│   │       ├── Outreach.jsx
│   │       ├── Profile.jsx
│   │       ├── Settings.jsx
│   │       └── AdminDashboard.jsx
│   └── dist/
├── specs/
└── outputs/

---

## Current Phase
ALL 17 PHASES COMPLETE + Multi-User Architecture Overhaul

Active work: Per-user file system, admin dashboard, profile LinkedIn view, UX polish.

---

## Coding Conventions
- async/await throughout — no callbacks, no .then chains
- All errors: console.error the message, then throw — let callers handle
- No TypeScript — plain JS
- Comments only on non-obvious logic
- Env vars validated at startup — throw clear error if critical vars missing
- requireAuth middleware on ALL /api/* routes
- Pass req.userId to all DB functions and file path helpers

---

## GCP Deployment
- Server IP: 34.148.196.49
- User: spcpendyala
- App dir: /home/spcpendyala/job-autopilot
- Dashboard served from: /home/spcpendyala/job-autopilot/dashboard-dist/
- Deploy command: bash scripts/deploy.sh
- PM2 processes: job-autopilot-api (always on), job-autopilot-cron (8am daily)

## Do Not Touch
- specs/ — reference documents, never modify
- data/users/ — user data, never log contents
- .env — never log, never commit
- uploads/ — uploaded files, gitignored
