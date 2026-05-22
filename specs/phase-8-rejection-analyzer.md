# Phase 8 — Rejection Analyzer
## Goal
After 5+ applications, analyze patterns across all applications to tell the
candidate WHY their response rate is low and WHAT to change. Strategic intelligence
layer — turns data into actionable career advice.

---

## No New Dependencies
Uses existing better-sqlite3, claude.js, db.js.

---

## Files to Create

### 1. `agents/rejection-analyzer.js`

Requirements:
- Load profile (cached)
- Export: `analyzeApplicationPatterns()`
- Fetch all applications from SQLite
- If fewer than 5 applications: return `{ insufficientData: true, message: "Need at least 5 applications for pattern analysis. You have [n]." }`
- Use callClaude with tier: 'quality', maxTokens: 2000, useCache: true

Build analysis data from SQLite rows:
```javascript
const analysisData = applications.map(app => ({
  company: app.company,
  role: app.role,
  fitScore: app.fit_score,
  verdict: app.verdict,
  status: app.status,
  daysAgo: Math.floor((Date.now() - new Date(app.created_at)) / 86400000),
  appliedAt: app.applied_at,
  responded: ['responded','interview','offer','rejected'].includes(app.status)
}));
```

Compute these stats locally (no Claude needed):
```javascript
const stats = {
  total: applications.length,
  responseRate: (applications.filter(a => a.responded).length / applications.length * 100).toFixed(1),
  avgFitScore: (applications.reduce((s,a) => s + a.fit_score, 0) / applications.length).toFixed(1),
  avgDaysToApply: 'N/A', // can't compute without posting date
  highFitNoResponse: applications.filter(a => a.fit_score >= 8 && !a.responded).length,
  verdictBreakdown: {
    strongMatch: applications.filter(a => a.verdict === 'STRONG MATCH').length,
    goodMatch: applications.filter(a => a.verdict === 'GOOD MATCH').length,
    stretch: applications.filter(a => a.verdict === 'STRETCH').length,
    weakMatch: applications.filter(a => a.verdict === 'WEAK MATCH').length,
  }
};
```

Prompt — pass all application data + stats:
```
You are a career strategist analyzing a job seeker's application data.

CANDIDATE: [profile.name], [profile.yearsExperience] years experience
TARGET ROLES: [profile.targetRoles.join(', ')]
LOCATION: [profile.location]

APPLICATION DATA:
[JSON.stringify(analysisData, null, 2)]

COMPUTED STATS:
[JSON.stringify(stats, null, 2)]

Analyze these patterns and generate strategic insights.
Return ONLY valid JSON:
{
  "overallGrade": "A|B|C|D — one letter grade for their job search strategy",
  "responseRate": "[x]%",
  "keyFindings": [
    {
      "finding": "Specific observation about their application pattern",
      "severity": "critical|warning|info",
      "evidence": "What in the data shows this"
    }
  ],
  "topIssues": [
    {
      "issue": "The main problem in one sentence",
      "impact": "How this is hurting their chances",
      "fix": "Specific actionable fix — not generic advice"
    }
  ],
  "whatIsWorking": ["thing1", "thing2"],
  "roleAlignmentAnalysis": "Are they targeting the right roles given their profile?",
  "recommendations": {
    "immediate": ["Do this today", "Do this this week"],
    "thisWeek": ["Change X in resume", "Start applying to Y type of companies"],
    "strategic": ["Consider pivoting toward X", "Build skill Y to unlock Z% more roles"]
  },
  "predictedResponseRateIfFixed": "X% — what response rate they could achieve with fixes",
  "motivationalNote": "One honest, direct sentence acknowledging the difficulty and what's actually in their control"
}
```

Strip fences, parse JSON. Return object with stats merged in:
```javascript
return { ...parsed, computedStats: stats };
```

---

### 2. `scripts/analyze.js`
Standalone CLI for pattern analysis.

Requirements:
- `require('dotenv').config()`
- Call `initDB()`, then `analyzeApplicationPatterns()`
- If insufficientData: print message and exit
- Print formatted report to terminal:

```
══════════════════════════════════════════
📊 APPLICATION PATTERN ANALYSIS
   [total] applications | [responseRate]% response rate
   Overall Grade: [overallGrade]
══════════════════════════════════════════

🔍 KEY FINDINGS

  [🔴 for critical, 🟡 for warning, 🔵 for info] [finding]
  Evidence: [evidence]

  [repeat for each finding]

⚠️  TOP ISSUES TO FIX

  1. [issue]
     Impact: [impact]
     Fix: [fix]

  [repeat]

✅ WHAT IS WORKING
  • [item]

🎯 ROLE ALIGNMENT
  [roleAlignmentAnalysis]

📋 RECOMMENDATIONS

  Do Today:
  • [immediate items]

  This Week:
  • [thisWeek items]

  Strategic:
  • [strategic items]

📈 PREDICTED RESPONSE RATE IF FIXED: [predictedResponseRateIfFixed]

💬 [motivationalNote]
══════════════════════════════════════════
```

Save report to `outputs/pattern-analysis-[YYYY-MM-DD].md`
Print: `Report saved to outputs/pattern-analysis-[date].md`

Add to package.json scripts: `"analyze": "node scripts/analyze.js"`

---

### 3. Update `scripts/daily-scan.js`
At the end of the morning brief, if total applications >= 5:
- Call analyzeApplicationPatterns()
- Print a condensed version — just grade + top issue + one recommendation:

```
📊 STRATEGY CHECK
   Grade: B | Response Rate: 12%
   Top Issue: [topIssues[0].issue]
   Fix: [topIssues[0].fix]
   Full report: npm run analyze
```

Only show this if something changed since last scan (check if new applications were added since last analysis). Don't run the full Claude call every morning — only if application count changed.

Track last analyzed count in SQLite. Add to db.js:
- `getMetadata(key)` — get a key-value from a metadata table
- `setMetadata(key, value)` — set a key-value in metadata table
- Create metadata table in initDB: `CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)`

In daily-scan.js:
```javascript
const lastAnalyzedCount = parseInt(getMetadata('last_analyzed_count') || '0');
const currentCount = stats.total;
if (currentCount >= 5 && currentCount !== lastAnalyzedCount) {
  // run analysis
  setMetadata('last_analyzed_count', String(currentCount));
}
```

---

### 4. Update `api/server.js`
Add endpoint:

**GET /api/analyze-patterns**
- Call analyzeApplicationPatterns()
- Return full analysis JSON

---

### 5. Update Dashboard — Add Insights Panel

Add new tab to the main dashboard: **"Insights"** (after Stats tab)

`dashboard/src/components/Insights.jsx`:
- Fetches `/api/analyze-patterns` on mount
- If insufficientData: shows "Apply to 5+ jobs to unlock pattern analysis"
  with a progress bar showing current count / 5
- Otherwise shows:
  - Large grade letter (A/B/C/D) with color (A=green, B=yellow, C/D=red)
  - Response rate vs benchmark (12% is average — show if above or below)
  - Key findings as colored cards (red/yellow/blue)
  - Top issues as expandable cards with issue + fix
  - Recommendations in three columns: Today | This Week | Strategic
  - Predicted response rate if fixed

---

## Done Test
```bash
# Test 1 — insufficient data (if < 5 apps)
npm run analyze
# Expected: "Need at least 5 applications for pattern analysis. You have 2."

# Add more test applications to DB to reach 5+:
node scripts/apply.js "https://job-boards.greenhouse.io/anthropic/jobs/5205495008" "Anthropic" "IR Manager P&E"
node scripts/apply.js "https://job-boards.greenhouse.io/shopify/jobs/some-id" "Shopify" "Operations Manager"
# ... add a few more via paste mode or real URLs

# Test 2 — full analysis
npm run analyze
# Expected: formatted report printed + saved to outputs/pattern-analysis-[date].md
# Grade should be a letter (A/B/C/D)
# At least 2 key findings
# At least 1 top issue with specific fix

# Test 3 — API
curl http://localhost:3001/api/analyze-patterns
# Expected: JSON with overallGrade, keyFindings array, topIssues array

# Test 4 — daily scan includes condensed analysis
npm run scan
# Expected: STRATEGY CHECK section at bottom of brief (only if 5+ apps)
```

Phase 8 complete when:
- npm run analyze prints a real grade and at least 2 specific findings
- Report saved to outputs/ folder
- Daily scan shows condensed strategy check
- Dashboard Insights tab shows grade + findings
