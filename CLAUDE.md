# Job AutoPilot — CLAUDE.md

## What This Is
AI-powered job search assistant for active job seekers.
Discovers, scores, prepares, tracks, and follows up on job applications.
Node.js backend. Runs locally. Multi-user from day one.

---

## Stack
- Runtime: Node.js 18+
- AI: @anthropic-ai/sdk
- DB: better-sqlite3 (source of truth) — Google Sheets added in Phase 3
- Scraping: Jina Reader API (https://r.jina.ai/[URL]) — primary, no auth, no install
- Playwright: fallback only, added in Phase 2 if needed
- Google APIs: googleapis package — Drive, Sheets, Gmail (Phase 3+)
- Package manager: npm
- Module system: CommonJS (require/module.exports) — NOT ESM

---

## Model Rules — ALWAYS FOLLOW (cost control)

### Which model to use:
| Task | Model |
|---|---|
| Fit scoring | BETA: haiku / PROD: sonnet |
| ATS keyword scan | BETA: haiku / PROD: sonnet |
| Resume tailoring | BETA: haiku / PROD: sonnet |
| Cover letter | BETA: haiku / PROD: sonnet |
| Interview prep | BETA: haiku / PROD: sonnet |
| Email classification | haiku always |
| Status checks | haiku always |
| Any output < 100 tokens | haiku always |

### Model IDs:
- Sonnet: claude-sonnet-4-20250514
- Haiku: claude-haiku-4-5-20251001
- NEVER use Opus

### Rules:
- Read BETA_MODE from .env — if true, use haiku for everything
- Set max_tokens to minimum viable per task (see each agent for its limit)
- ALWAYS use prompt caching for profile + base resume (cache_control: ephemeral)
- ALL Claude calls go through services/claude.js — never import SDK directly in agents

---

## Key Architectural Decisions
- SQLite is the single source of truth — never treat Sheets as the DB
- URL deduplication via MD5 hash — never process the same job URL twice
- Each user has their own profile file: core/profiles/[name].json
- Active profile set via --profile flag or ACTIVE_PROFILE in .env
- Jina fetcher first — if response < 500 chars, fall back to paste prompt
- Google OAuth uses localhost:8888 redirect — OOB flow is deprecated and broken

---

## Folder Structure
```
job-autopilot/
├── CLAUDE.md                     ← you are here
├── .env
├── .env.example
├── package.json
├── core/
│   ├── profiles/
│   │   └── sai.json              ← master profile
│   └── base-resume.md            ← base resume in markdown
├── services/
│   ├── claude.js                 ← SDK wrapper (model switch + caching)
│   ├── db.js                     ← SQLite: schema + all queries
│   └── fetcher.js                ← Jina scraper
├── agents/
│   ├── fit-scorer.js
│   ├── ats-scanner.js
│   ├── resume-tailor.js          ← Phase 2
│   ├── cover-letter.js           ← Phase 2
│   ├── company-brief.js          ← Phase 2
│   ├── other-roles.js            ← Phase 2
│   ├── follow-up.js              ← Phase 3
│   ├── response-watcher.js       ← Phase 3
│   └── interview-prep.js         ← Phase 4
├── services/
│   ├── drive.js                  ← Phase 3
│   ├── sheets.js                 ← Phase 3
│   └── gmail.js                  ← Phase 3
├── scripts/
│   ├── apply.js                  ← CLI: process one job
│   ├── daily-scan.js             ← Phase 3: morning brief
│   └── setup-google.js           ← Phase 3: OAuth wizard
├── api/
│   └── server.js                 ← Phase 5: Express API
├── dashboard/                    ← Phase 5: React app
├── specs/                        ← phase specs — DO NOT DELETE
└── outputs/
    └── [company-role-date]/      ← generated application files
```

---

## Current Phase
**PHASE 5 — Dashboard**
Spec: specs/phase-5-dashboard.md
Goal: Express API + React/Vite dashboard — visual command center for all applications

---

## Coding Conventions
- async/await throughout — no callbacks, no .then chains
- All errors: console.error the message, then throw — let scripts handle exit
- No TypeScript — plain JS
- No test framework — validation is a manual `node scripts/apply.js [url]` run
- Comments only on non-obvious logic — not on every line
- Env vars: always validate at startup, throw clear error if missing

---

## Do Not Touch
- core/profiles/*.json — user data, never log
- .env — never log contents, never commit
- outputs/ — generated files, gitignored
- specs/ — reference documents, never modify during implementation
