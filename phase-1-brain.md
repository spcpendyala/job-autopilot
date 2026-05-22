# Phase 1 — Brain
## Goal
URL in → fit score + ATS gaps out → logged to SQLite. Nothing else.

---

## Install These Dependencies First
```bash
npm init -y
npm install @anthropic-ai/sdk better-sqlite3 dotenv axios
```

---

## Files to Create (in this order)

### 1. `.env.example`
```
ANTHROPIC_API_KEY=sk-ant-...
BETA_MODE=true
ACTIVE_PROFILE=sai
PORT=3001
```
Then copy to `.env` and fill in the real key.

---

### 2. `core/profiles/sai.json`
Full profile object. Use exactly this structure:
```json
{
  "name": "Sai Pendyala",
  "location": "Ajax, Ontario, Canada",
  "email": "spcpendyala@gmail.com",
  "phone": "+1 403 992 2036",
  "linkedin": "linkedin.com/in/saipendyala",
  "openToRemote": true,
  "openToHybrid": true,
  "targetRoles": [
    "Operations Manager",
    "Technical Account Manager",
    "IT Operations Lead",
    "Service Operations Manager",
    "Network Operations Manager",
    "Application Manager",
    "IT Manager",
    "SOC Manager",
    "Delivery Manager",
    "Infrastructure Manager"
  ],
  "yearsExperience": 10,
  "summary": "Operations and technology leader with 10+ years stabilizing high-change environments across IT support, infrastructure, security operations, and early-stage product teams.",
  "coreSkills": [
    "24x7 Service Operations",
    "SLA & KPI Ownership",
    "Incident Management",
    "Major Incident Response",
    "Root Cause Analysis",
    "Change Management",
    "ITIL Framework",
    "Team Leadership",
    "Stakeholder Management",
    "Escalation Management",
    "SOC Operations",
    "Vendor Management"
  ],
  "tools": {
    "itsm": ["ServiceNow", "Jira", "Zendesk", "Freshdesk", "Remedy"],
    "infrastructure": ["Linux", "Unix", "Windows Server", "Active Directory", "Azure", "AWS"],
    "security": ["Splunk", "QRadar", "SIEM", "IAM"],
    "analytics": ["Power BI", "Tableau", "SQL", "Python"],
    "collaboration": ["Confluence", "Notion", "Microsoft Teams", "Slack"]
  },
  "experience": [
    {
      "title": "Application Manager",
      "company": "Palaemon Systems",
      "from": "Jul 2021",
      "to": "Present",
      "highlights": [
        "End-to-end operational stability for multiple early-stage applications",
        "Primary escalation point for high-severity incidents",
        "Reduced resolution time by ~25% through structured workflows",
        "Manage globally distributed team of 15+"
      ]
    },
    {
      "title": "Network Operations Manager",
      "company": "Parity Technology Solutions",
      "from": "Jul 2018",
      "to": "Jul 2021",
      "highlights": [
        "Multi-site network and IT operations",
        "Improved SLA compliance by ~20%",
        "Reduced MTTR by ~25%",
        "Team of 10-15 engineers"
      ]
    },
    {
      "title": "Information Security Team Lead",
      "company": "Herjavec Group",
      "from": "Aug 2017",
      "to": "May 2018",
      "highlights": [
        "Led 24x7 SOC team",
        "Enterprise and hospitality security monitoring",
        "Incident reviews and trend analysis"
      ]
    },
    {
      "title": "Network Operations Support Lead",
      "company": "Guest Tek Interactive Entertainment",
      "from": "Mar 2013",
      "to": "Jul 2016",
      "highlights": [
        "Large-scale hospitality networks — IPTV, internet, telephony",
        "Resolved 50+ high-priority incidents weekly",
        "Reduced service downtime by ~30%"
      ]
    }
  ],
  "education": [
    {
      "degree": "Master of Engineering (M.Eng.), Computer Networking",
      "institution": "Dalhousie University, Canada"
    },
    {
      "degree": "Bachelor of Engineering (B.Eng.), Electronics & Communications",
      "institution": "Anna University, India"
    }
  ]
}
```

---

### 3. `core/base-resume.md`
Create a placeholder file with this exact content:
```markdown
# Sai Pendyala
Ajax, Ontario | spcpendyala@gmail.com | +1 403 992 2036 | linkedin.com/in/saipendyala

## Summary
Operations and technology leader with 10+ years stabilizing high-change environments across IT support, infrastructure, security operations, and early-stage product teams. Consistent record of improving SLA compliance, reducing MTTR, and leading distributed teams through operational transformation.

## Core Skills
24x7 Service Operations · SLA & KPI Ownership · Incident Management · Major Incident Response · Root Cause Analysis · Change Management · ITIL · Team Leadership · Stakeholder Management · Escalation Management · SOC Operations · Vendor Management

## Tools & Technologies
**ITSM:** ServiceNow · Jira · Zendesk · Freshdesk · Remedy
**Infrastructure:** Linux · Unix · Windows Server · Active Directory · Azure · AWS
**Security:** Splunk · QRadar · SIEM · IAM
**Analytics:** Power BI · Tableau · SQL · Python
**Collaboration:** Confluence · Notion · Microsoft Teams · Slack

## Experience

### Application Manager — Palaemon Systems (Jul 2021 – Present)
- Owned end-to-end operational stability for multiple early-stage applications
- Served as primary escalation point for high-severity incidents across global teams
- Reduced incident resolution time by ~25% by introducing structured triage workflows
- Managed and mentored a globally distributed team of 15+ engineers

### Network Operations Manager — Parity Technology Solutions (Jul 2018 – Jul 2021)
- Led multi-site network and IT operations across 3 locations
- Improved SLA compliance by ~20% through process redesign and reporting automation
- Reduced Mean Time to Resolve (MTTR) by ~25% via proactive monitoring enhancements
- Managed a team of 10–15 network and systems engineers

### Information Security Team Lead — Herjavec Group (Aug 2017 – May 2018)
- Led a 24x7 SOC team monitoring enterprise and hospitality sector clients
- Managed security incident reviews and conducted trend analysis for recurring threats
- Coordinated cross-functional response during high-severity security events

### Network Operations Support Lead — Guest Tek Interactive Entertainment (Mar 2013 – Jul 2016)
- Managed large-scale hospitality network infrastructure: IPTV, internet, telephony
- Resolved 50+ high-priority incidents weekly with consistent SLA adherence
- Reduced service downtime by ~30% through proactive fault detection improvements

## Education
- M.Eng., Computer Networking — Dalhousie University, Canada
- B.Eng., Electronics & Communications — Anna University, India
```

---

### 4. `services/db.js`
SQLite service. Single source of truth.

Requirements:
- Initialize DB file at `./data/autopilot.db` (create `data/` dir if missing)
- On startup, run `CREATE TABLE IF NOT EXISTS` — never crash if table exists
- Export these functions only: `initDB`, `isDuplicate`, `saveApplication`, `getAllApplications`

Schema:
```sql
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  url_hash TEXT UNIQUE,
  company TEXT,
  role TEXT,
  job_url TEXT,
  fit_score REAL,
  verdict TEXT,
  apply_recommendation INTEGER,
  status TEXT DEFAULT 'discovered',
  applied_at TEXT,
  drive_folder_url TEXT,
  notes TEXT,
  raw_score_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)
```

`isDuplicate(url)`: MD5 hash the URL (use Node crypto, no extra package), check if url_hash exists, return boolean.

`saveApplication(data)`: Insert row. id = `J-${Date.now()}`. url_hash = MD5 of job_url. raw_score_json = JSON.stringify of the full fit score result.

`getAllApplications()`: Return all rows ordered by created_at DESC.

---

### 5. `services/fetcher.js`
Jina Reader scraper. No browser, no install.

Requirements:
- `fetchJobDescription(url)` — async function, one export
- Call `https://r.jina.ai/${url}` with axios, GET request, no auth
- Set headers: `{ 'Accept': 'text/plain' }`
- Timeout: 15000ms
- If response text length < 500: throw Error("Could not extract job description. Please paste it manually.")
- Trim and return first 8000 chars of response text
- No Playwright in this phase

---

### 6. `services/claude.js`
Central Claude SDK wrapper. All agents use this, never the SDK directly.

Requirements:
- Read `ANTHROPIC_API_KEY` and `BETA_MODE` from process.env on module load
- Throw clear error if `ANTHROPIC_API_KEY` is missing
- Export two functions: `callClaude(prompt, options)` and `getModel(tier)`

`getModel(tier)`:
- tier = 'quality' or 'cheap'
- if BETA_MODE === 'true': always return haiku model ID
- if tier === 'quality': return sonnet model ID
- if tier === 'cheap': return haiku model ID

`callClaude(prompt, options)`:
- options: `{ tier, maxTokens, systemPrompt, useCache }`
- if useCache is true AND systemPrompt is provided: send systemPrompt as a system array block with `cache_control: { type: "ephemeral" }`
- Always return the text content of the first content block
- Wrap in try/catch, throw with message: `Claude API error: ${err.message}`

Model IDs:
- Sonnet: `claude-sonnet-4-20250514`
- Haiku: `claude-haiku-4-5-20251001`

---

### 7. `agents/fit-scorer.js`
Scores job fit against candidate profile.

Requirements:
- Load profile from `core/profiles/${process.env.ACTIVE_PROFILE || 'sai'}.json`
- Load base resume from `core/base-resume.md`
- Export: `scoreJobFit(jobDescription, jobTitle, company)`
- Use `callClaude` with tier: 'quality', maxTokens: 1000, useCache: true
- Build the system prompt from profile + resume (this gets cached)
- User message = the job description + title + company + JSON output instruction

Return parsed JSON with this shape:
```json
{
  "score": 8.2,
  "verdict": "STRONG MATCH",
  "applyRecommendation": true,
  "topMatchingSkills": ["skill1", "skill2", "skill3"],
  "keyGaps": ["gap1", "gap2"],
  "missingKeywords": ["kw1", "kw2", "kw3"],
  "tailoringTips": ["tip1", "tip2", "tip3"],
  "scoringBreakdown": {
    "skillsMatch": 9,
    "experienceLevel": 8,
    "toolsMatch": 7,
    "roleAlignment": 9
  },
  "oneLineSummary": "Strong ops background matches well, missing cloud-native emphasis."
}
```

Prompt must instruct: return ONLY valid JSON, no markdown fences, no explanation.
Parse response with JSON.parse. If parse fails, throw with the raw response for debugging.

---

### 8. `agents/ats-scanner.js`
Finds keyword gaps between job description and candidate profile.

Requirements:
- Load same profile as fit-scorer
- Export: `scanATSGaps(jobDescription)`
- Use `callClaude` with tier: 'quality', maxTokens: 800, useCache: true
- Same caching pattern as fit-scorer (profile as system prompt)

Return parsed JSON:
```json
{
  "criticalMissing": ["must-have keywords candidate lacks"],
  "niceToHaveMissing": ["good-to-have keywords candidate lacks"],
  "keyPhrasesToUse": ["exact phrases from JD to inject into resume"],
  "resumeSections": {
    "summary": ["phrases to add to summary"],
    "skills": ["skills to highlight or add"],
    "bullets": ["phrases to work into experience bullets"]
  }
}
```

---

### 9. `scripts/apply.js`
Main CLI entry point. Orchestrates Phase 1 pipeline.

Requirements:
- `require('dotenv').config()` at the top
- Call `initDB()` on startup
- Accept job URL as `process.argv[2]`
- Accept optional company as `process.argv[3]`
- Accept optional role title as `process.argv[4]`
- If no URL argument: print usage and exit

Pipeline:
1. Check `isDuplicate(url)` → if true: print "Already processed. Skipping." and exit 0
2. Print "Fetching job description..."
3. Call `fetchJobDescription(url)` 
4. Print "Scoring fit with Claude..." 
5. Call `scoreJobFit(jd, role, company)` and `scanATSGaps(jd)` in parallel with Promise.all
6. Print formatted results to terminal (see format below)
7. Call `saveApplication(...)` to SQLite
8. Print "Saved to database."

Terminal output format:
```
══════════════════════════════════════════
🎯 FIT SCORE: 8.2/10 — STRONG MATCH
💡 Strong ops background matches well, missing cloud-native emphasis.
══════════════════════════════════════════

✅ APPLY: YES

🎯 Top Matching Skills:
  • 24x7 Service Operations
  • Incident Management
  • ITIL Framework

⚠️  Key Gaps:
  • Cloud-native infrastructure experience
  • Kubernetes exposure

🔍 Missing Keywords:
  cloud-native, kubernetes, SRE, observability

📝 Tailoring Tips:
  1. Emphasize Azure AKS experience from Palaemon Systems
  2. Add "observability" framing around your Splunk/Power BI work
  3. Lead summary with "service reliability" language

📊 Score Breakdown:
  Skills Match:       9/10
  Experience Level:   8/10
  Tools Match:        7/10
  Role Alignment:     9/10

🔑 ATS Keywords to Add:
  Critical: cloud-native, SRE
  Nice to have: OpenTelemetry, chaos engineering

══════════════════════════════════════════
```

---

## package.json Scripts to Include
```json
"scripts": {
  "apply": "node scripts/apply.js",
  "start": "node api/server.js"
}
```

---

## Done Test
Phase 1 is complete when this works without error:

```bash
# Test 1 — URL fetch + score
node scripts/apply.js "https://www.linkedin.com/jobs/view/some-job-id" "Acme Corp" "Operations Manager"

# Expected: formatted score output in terminal, row in SQLite

# Test 2 — Deduplication
node scripts/apply.js "https://www.linkedin.com/jobs/view/some-job-id" "Acme Corp" "Operations Manager"

# Expected: "Already processed. Skipping." — no API call made

# Test 3 — Bad URL
node scripts/apply.js "https://this-will-fail.xyz/nothing"

# Expected: clear error message asking user to paste JD manually
```

If all three pass, Phase 1 is done. Do not start Phase 2.
