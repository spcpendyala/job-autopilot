# Phase 6 — Discovery
## Goal
AutoPilot finds jobs for you. Monitor RSS feeds and saved company career pages
for new postings. Score them automatically. Surface high-fit roles every morning.

---

## No New Dependencies
Uses existing axios, node-cron, db, fetcher, fit-scorer.

---

## New `.env` Keys to Add to `.env.example`
```
# Comma-separated list of RSS feed URLs for job alerts
JOB_RSS_FEEDS=

# Comma-separated list of company career page URLs to monitor weekly
WATCH_COMPANIES=
```

---

## Files to Create

### 1. `discovery/rss-scanner.js`

Requirements:
- Export: `scanRSSFeeds()`
- Read JOB_RSS_FEEDS from env, split by comma, trim each
- If empty: log "No RSS feeds configured. Add JOB_RSS_FEEDS to .env" and return []
- For each feed URL: fetch raw XML via axios with 10s timeout
- Parse XML manually (no xml parser package):
  - Extract `<item>` blocks using regex: `/<item>([\s\S]*?)<\/item>/g`
  - From each item extract: title, link, pubDate, description
  - Use simple regex per field: `/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/`
- Filter items: only include jobs posted in the last 48 hours
  - Parse pubDate with `new Date(pubDate)` — skip if invalid
- For each new item: check `isDuplicate(link)` — skip if already in DB
- Return array of: `{ title, url, pubDate, description }`

### How to get RSS feeds (document in a comment at top of file):
```
LinkedIn: Go to Jobs > Saved Searches > ... > Get RSS feed link
Indeed: https://www.indeed.com/rss?q=[title]&l=[location]
Google Jobs (via SerpAPI): needs API key — skip for now
```

---

### 2. `discovery/careers-monitor.js`

Requirements:
- Export: `checkWatchedCompanies()`
- Read WATCH_COMPANIES from env, split by comma, trim each
- If empty: return []
- For each company URL:
  - Detect ATS type from URL pattern (greenhouse/lever/workday/custom)
  - Fetch the careers listing page via Jina (limit 5000 chars)
  - Extract job titles and URLs from the content using Claude (tier: 'cheap', maxTokens: 400)
  - Prompt: "Extract all job titles and their URLs from this careers page content. Return JSON array: [{title, url}]. If no URL found, use empty string."
  - For each extracted job: check isDuplicate — skip if seen before
  - Return new jobs as: `{ company: derivedFromUrl, title, url, source: 'careers-monitor' }`
- Wrap each company in try/catch — failure on one company doesn't stop others

---

### 3. `discovery/auto-scorer.js`

Requirements:
- Export: `scoreAndSaveDiscoveredJobs(jobs)`
- jobs: array from rss-scanner or careers-monitor
- For each job (process sequentially, not parallel — avoid rate limits):
  - If job.url is empty: skip
  - Fetch job description via fetchJobDescription — if fails, skip this job
  - Run scoreJobFit (use job.title and derived company name)
  - Save to SQLite with status: 'discovered' (not 'applied')
  - Print: `  [score/10] [title] — [company]`
  - Add 1 second delay between jobs: `await new Promise(r => setTimeout(r, 1000))`
- Return array of scored jobs sorted by score descending

---

### 4. Update `scripts/daily-scan.js`

Add discovery section at the TOP of the morning brief (before Gmail scan):

```
🔍 NEW JOBS DISCOVERED
  Scanning RSS feeds...
  Scanning watched companies...
  [score] [title] at [company] — [verdict]
  [score] [title] at [company] — [verdict]
  
  High-fit jobs (≥8.0): X found
  Run: node scripts/apply.js --full "[url]" "[company]" "[role]"
    to generate full package for any of these.
```

Only show jobs scoring ≥ 6.0 in the morning brief.
Always show count of total discovered even if filtered.

---

### 5. `scripts/discover.js`
Standalone discovery script — run on demand.

Requirements:
- `require('dotenv').config()`
- Run rss-scanner + careers-monitor
- Run auto-scorer on all found jobs
- Print full results sorted by score
- For jobs scoring ≥ 8.0: print in green with ⭐
- At end: print "Run `npm run apply:full -- [url] [company] [role]` to generate package"

Add to package.json scripts: `"discover": "node scripts/discover.js"`

---

## Update `.env.example` with Instructions

Add commented examples:
```
# LinkedIn RSS (get from: LinkedIn > Jobs > Job Alerts > RSS)
# Indeed RSS example:
# JOB_RSS_FEEDS=https://www.indeed.com/rss?q=operations+manager&l=Toronto,+ON

# Company career pages to monitor weekly (comma-separated)
# WATCH_COMPANIES=https://boards.greenhouse.io/shopify,https://boards.greenhouse.io/stripe
```

---

## Done Test
```bash
# Test 1 — discover with no feeds configured (safe default)
node scripts/discover.js
# Should: print "No RSS feeds configured" and "No companies watched"
# Should NOT crash

# Test 2 — add an Indeed RSS to .env and run
# Add to .env: JOB_RSS_FEEDS=https://www.indeed.com/rss?q=operations+manager&l=Toronto
node scripts/discover.js
# Should: fetch feed, score any jobs found in last 48h, print scored results

# Test 3 — add a greenhouse company to watch
# Add to .env: WATCH_COMPANIES=https://boards.greenhouse.io/anthropic
node scripts/discover.js
# Should: fetch Anthropic careers page, extract roles, score them, print results

# Test 4 — daily scan includes discovery
node scripts/daily-scan.js
# Discovery section should appear at top before Gmail section
```

Phase 6 is complete when:
- `npm run discover` runs without crashing with no feeds configured
- Adding an Indeed RSS or greenhouse URL produces scored job results
- Daily scan shows discovery section at top
