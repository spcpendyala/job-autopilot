# Phase 7 — Salary Researcher
## Goal
Before every interview, generate a data-driven salary brief for the specific role,
company, and location. Pulls real data from public sources via Jina scraping.
Saves to the application outputs folder alongside interview-prep.md.

---

## No New Dependencies
Uses existing axios, fetcher (Jina), claude.js, output-writer.js.

---

## Files to Create

### 1. `agents/salary-researcher.js`

Requirements:
- Load profile (cached for system prompt)
- Export: `researchSalary(role, company, location)`
- location defaults to profile.location if not provided
- Use callClaude with tier: 'quality', maxTokens: 1000, useCache: true

Step 1 — Scrape salary sources in parallel (Promise.all):
Each fetch via Jina, timeout 10s, catch individually — failure on one doesn't stop others.

Sources to scrape:
```javascript
const sources = [
  `https://www.glassdoor.com/Salaries/${role.replace(/\s+/g,'-')}-Salary-SRCH_KO0,${role.length}.htm`,
  `https://www.levels.fyi/t/${role.replace(/\s+/g,'-')}/`,
  `https://www.payscale.com/research/CA/Job=${role.replace(/\s+/g,'_')}/Salary`,
];
```

For each: fetch via `https://r.jina.ai/[url]`, take first 2000 chars of response.
Label each chunk: `=== Glassdoor ===`, `=== Levels.fyi ===`, `=== PayScale ===`
Combine all fetched content into one string. If all fail: use empty string.

Step 2 — Generate salary brief:
System prompt (cached): candidate profile — name, years experience, location, target roles, skills

User message prompt:
```
Research salary for this role and generate a negotiation brief.

ROLE: [role]
COMPANY: [company]  
LOCATION: [location]
CANDIDATE EXPERIENCE: [yearsExperience] years

MARKET DATA SCRAPED:
[combined source content or "No data retrieved — use your training knowledge"]

Generate a salary negotiation brief. Return ONLY valid JSON:
{
  "marketRange": {
    "low": "$X",
    "mid": "$Y", 
    "high": "$Z",
    "currency": "CAD or USD",
    "dataQuality": "scraped|estimated"
  },
  "recommendedAsk": "$X",
  "anchorPoint": "$X",
  "walkAwayNumber": "$X",
  "reasoning": "Why these numbers for this candidate at this company",
  "negotiationScript": {
    "openingLine": "Exact line to say when asked about salary expectations",
    "counterOffer": "Exact line to use when countered below ask",
    "closingLine": "Exact line to accept or defer gracefully"
  },
  "equityNote": "What to know about equity at this company type",
  "benefitsToNegotiate": ["item1", "item2", "item3"],
  "redLines": ["never accept X", "reject if Y"],
  "marketContext": "One paragraph on salary trends for this role/location in 2026"
}
```

Strip fences, parse JSON. If parse fails: throw with raw response.

---

### 2. Update `services/output-writer.js`

Add new export: `saveSalaryBrief(applicationFolder, brief, role, company)`

Requirements:
- If folder doesn't exist: throw clear error
- Write `salary-brief.md` to the folder:

```markdown
# Salary Brief — [Role] at [Company]
Generated: [date]

## Market Range
Low: [low] | Mid: [mid] | High: [high] ([currency])
Data: [dataQuality]

## Your Numbers
**Ask:** [recommendedAsk]
**Anchor:** [anchorPoint]  
**Walk Away:** [walkAwayNumber]

## Why These Numbers
[reasoning]

## What to Say

**When asked "What are your salary expectations?"**
[openingLine]

**When they counter below your ask:**
[counterOffer]

**To close or defer:**
[closingLine]

## Equity
[equityNote]

## Also Negotiate
[benefitsToNegotiate as bullet list]

## Red Lines
[redLines as bullet list]

## Market Context
[marketContext]
```

---

### 3. Update `scripts/prep.js`

After generating the interview brief, automatically run salary research:

```javascript
// After saveInterviewBrief() call:
console.log('Researching salary...');
const { researchSalary } = require('../agents/salary-researcher');
const { saveSalaryBrief } = require('../services/output-writer');

const salaryBrief = await researchSalary(
  application.role,
  application.company,
  null // defaults to profile location
);
saveSalaryBrief(outputFolder, salaryBrief, application.role, application.company);
console.log('💰 Salary brief saved.');
```

Add to the terminal output at the end:
```
💰 Salary range: [recommendedAsk] (market: [low] – [high])
```

---

### 4. Update `api/server.js`

Add new endpoint:

**POST /api/salary**
Body: `{ role, company, location }`
- Call researchSalary(role, company, location)
- Return the salary brief JSON
- If applicationId provided in body: also save to that application's outputs folder

---

### 5. Update `dashboard/src/components/ApplicationDetail.jsx`

Add "Salary" tab to the modal tabs (after Interview Prep):
- Fetches salary data from the `salary-brief.md` file content
- Shows: market range as three colored boxes (low=red, mid=yellow, high=green)
- Shows: "Your Ask" prominently in large text
- Shows: negotiation scripts in a copy-to-clipboard card
- Shows: benefits to negotiate as checklist

---

## Update `package.json`
No new scripts needed — salary runs automatically as part of `npm run prep`.

---

## Done Test
```bash
# Test 1 — runs as part of prep
npm run prep J-[your-anthropic-job-id]

# Expected additional output:
# Researching salary...
# 💰 Salary brief saved.
# 💰 Salary range: $145,000 CAD (market: $110,000 – $175,000 CAD)

# Test 2 — check the file
cat outputs/Anthropic-*/salary-brief.md

# Expected: full markdown brief with market range, ask price,
# exact negotiation scripts, equity note, benefits list

# Test 3 — API endpoint
# Start server: npm start
# curl -X POST http://localhost:3001/api/salary \
#   -H "Content-Type: application/json" \
#   -d '{"role":"Operations Manager","company":"Anthropic","location":"Toronto, Canada"}'
# Expected: JSON salary brief
```

Phase 7 is complete when:
- salary-brief.md is generated automatically when running npm run prep
- File contains a specific dollar figure for recommendedAsk (not a range)
- negotiationScript has all three lines populated
- API endpoint returns valid JSON
