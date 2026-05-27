# Job AutoPilot

AI-powered job search co-pilot. Finds, tailors, and tracks job applications for one candidate.

**Stack:** Node.js 18 · Express · SQLite (better-sqlite3) · React 18 + Vite · Claude API  
**Deployment:** Single GCP VM (Nginx + PM2) at `34.148.196.49`

---

## Quick Start (local dev)

```bash
cp .env.example .env        # fill in ANTHROPIC_API_KEY at minimum
npm install
npm run dev                  # API on :3001, Vite on :5173
```

See `CLAUDE.md` for full architecture, deployment, and coding conventions.

---

## Testing

### 1 · API Tests (Jest + Supertest) — fast, no real AI

Runs 33 integration tests against a dedicated test server and test DB.  
No Anthropic API calls — all AI is stubbed by `TEST_MODE=true`.

```bash
# Terminal 1 — start the test server (port 3002, test DB)
npm run test:server

# Terminal 2 — seed the DB then run tests
npm run test:seed
npm test
```

**What's covered:**

| Group | Tests |
|---|---|
| Health & Auth | `/api/health`, `/auth/me`, `/api/setup-status` |
| Applications | CRUD, status updates, CSV export |
| Stats & Brief | `/api/stats`, `/api/morning-brief`, discovery status |
| Profile | GET / POST / approve / reject |
| Config | GET / POST config |
| Approval Queue | list, skip, approve, stats |
| Apply Queue | list, mark applied |
| Outreach | list, stats, mark-sent |
| Misc | skills gap, inbox unread count |
| Session helpers | `POST /api/test-helpers/session` returns `Set-Cookie` |

### 2 · E2E Tests (Playwright + Chromium) — browser UI

Runs 5 end-to-end tests against the built dashboard served by the test server.

```bash
# Test server must be running (see above)
npx playwright test
```

**Scenarios covered:**

| Test | What it checks |
|---|---|
| Sign-in screen | `h1 Job AutoPilot` + Google button visible when not auth'd |
| Home page | Sidebar shows all nav items after mock auth |
| Pipeline kanban | Column headers DISCOVERED, APPLIED, TAILORING, INTERVIEW visible |
| Find a Job | Paste description → click "Analyze Job" → score + verdict appear |
| Profile page | Page loads, no JS console errors |

### 3 · AI Quality Tests (Jest, real Claude API) — nightly CI only

Runs 4 quality checks using the real Anthropic API (Haiku model as judge).  
**Cost: ~$0.02–0.08 per run. Do not run during development.**

```bash
# Only run with a real API key and intentionally:
ANTHROPIC_API_KEY=sk-ant-... npx jest tests/ai-quality --forceExit
```

| Test | Asserts |
|---|---|
| P1 Score discrimination | Strong (Node/AWS) score ≥ 7, weak (Marketing) score ≤ 4, delta ≥ 3 |
| P3 Cover letter rubric | No cliché opener, names company, < 300 words, has concrete achievement |
| P5 Interview prep | ≥ 5 questions, STAR format present, role-specific content |
| P9 Outreach draft | < 150 words, names recruiter, clear CTA |

### 4 · Manual Checklist — features that need a human eye

Walk through 21 scenarios across Freelance, Outreach, Notifications, and Mobile.  
Results saved to `tests/manual-checklist/results-TIMESTAMP.json`.

```bash
npm run test:manual
```

| Group | Scenarios |
|---|---|
| J · Freelance (J1–J7) | Platform tabs, proposal generation, draft save, mark-sent, status dropdown, disabled platforms |
| K · Outreach (K1–K4) | Recruiter finder, personalised draft, mark-sent, follow-up suppression |
| N · Notifications (N1–N4) | Bell badge count, mark-all-read, market intel, skills gap |
| O · Mobile (O1–O6) | Nav at 768px, card layout at 375px, kanban scroll, textarea + keyboard, approval stacking, touch targets |

### CI

GitHub Actions: [`.github/workflows/test.yml`](.github/workflows/test.yml)

| Job | Trigger | Runs |
|---|---|---|
| `api-tests` | Every push + every PR | Jest 33 API tests |
| `e2e-tests` | Push to `main` only | Playwright 5 E2E tests |
| `ai-quality` | Daily cron 03:00 UTC | Real-API quality checks |

### What is manual-only (not automated)

- Freelance proposal AI content quality (J3) — hard to assert "good writing" without a judge run
- Outreach personalization (K2) — visual check
- Mobile layout and touch targets (O1–O6) — requires real device or emulator
- Gmail sync and inbox classification — requires live Google OAuth
- PDF generation — Puppeteer smoke test pending
