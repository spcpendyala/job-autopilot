# Phase 4 — Interview Prep
## Goal
When a positive response is detected (or manually triggered), generate a complete
interview preparation brief and save it to the application's outputs folder.
This is the highest-value output the tool produces.

---

## No New Dependencies
Uses existing SDK, db, output-writer.

---

## Files to Create

### 1. `agents/interview-prep.js`

Requirements:
- Load profile (cached)
- Export: `generateInterviewBrief(jobDescription, company, role, companyBrief)`
- Use callClaude with tier: 'quality', maxTokens: 2000, useCache: true
- companyBrief can be null — prompt handles missing context gracefully

Prompt must produce a comprehensive brief. Instruct Claude to return ONLY valid JSON:

```json
{
  "roleInContext": "Why this role exists at this company right now — what problem it solves",
  "likelyQuestions": [
    {
      "question": "Tell me about a time you managed a high-severity incident with multiple stakeholders",
      "category": "behavioral",
      "whyTheyAsk": "Testing incident command experience",
      "suggestedAnswer": "STAR format answer using Sai's actual experience — be specific about which role"
    }
  ],
  "technicalTopics": ["topic1", "topic2"],
  "questionsToAskThem": [
    {
      "question": "What does the on-call rotation look like today, and what does the team want it to look like in 12 months?",
      "whyAsk": "Shows operational thinking and signals you'll own the program, not just run it"
    }
  ],
  "salaryContext": {
    "estimatedRange": "$X - $Y CAD/USD",
    "anchorAdvice": "Where to anchor and why",
    "negotiationNote": "One sentence on leverage"
  },
  "thirtyDayPlan": "What you'd realistically focus on in the first 30 days in this role",
  "redFlags": ["things to probe in the interview"],
  "keyThemesToEmphasize": ["theme1", "theme2", "theme3"],
  "doNotMention": ["avoid these unless asked"]
}
```

likelyQuestions: generate 8-10 questions across behavioral, situational, and role-specific categories.
STAR answers must reference Sai's actual experience from the profile — not generic.
Strip fences, parse JSON. If parse fails, throw with raw response.

---

### 2. `services/output-writer.js` — UPDATE (add to existing file)

Add new export: `saveInterviewBrief(applicationFolder, brief)`

Requirements:
- applicationFolder: path to existing outputs/[Company-Role-Date]/ folder
- If folder doesn't exist: throw clear error
- Write `interview-prep.md` to the folder in this format:

```markdown
# Interview Prep — [Role] at [Company]
Generated: [date]

## Why This Role Exists
[roleInContext]

## Likely Questions

### Behavioral
**Q: [question]**
*Why they ask: [whyTheyAsk]*
[suggestedAnswer]

[repeat for all questions, grouped by category]

## Technical Topics to Brush Up On
- topic1
- topic2

## Questions to Ask Them
**[question]**
→ [whyAsk]

[repeat]

## Salary Context
Range: [estimatedRange]
[anchorAdvice]
[negotiationNote]

## First 30 Days
[thirtyDayPlan]

## Key Themes to Emphasize
- theme1

## Watch For
- redFlag1

## Don't Bring Up Unless Asked
- item1
```

---

### 3. `scripts/prep.js`
CLI trigger for interview prep. Can be run manually or called from daily-scan.

Requirements:
- `require('dotenv').config()`
- Accept job ID as process.argv[2]: `node scripts/prep.js J-1234567890`
- Look up the application from SQLite by ID
- If not found: print error and exit
- Load job description from `outputs/[folder]/job-description.md` — read from file
- Load company brief from `outputs/[folder]/company-brief.json` — read and parse
- If either file missing: continue with null (don't crash)
- Call generateInterviewBrief
- Call saveInterviewBrief
- Update application status to 'interview-prep-ready' in SQLite
- Print:
  ```
  ✅ Interview brief ready: outputs/[folder]/interview-prep.md
  
  Quick preview:
  — [number] questions generated
  — Key themes: [theme1], [theme2]
  — Salary range: [range]
  ```

Add to package.json scripts: `"prep": "node scripts/prep.js"`

---

## Update `scripts/daily-scan.js`
When an INTERVIEW_REQUEST email is detected:
- Find the matching application in SQLite by company name (fuzzy match — lowercase both)
- If found: automatically trigger interview prep
  - Call generateInterviewBrief
  - Call saveInterviewBrief
  - Print: "🎯 Interview prep brief auto-generated for [Company]"
- If not found: print "⚠️ Couldn't match email to application — run: npm run prep [job-id]"

---

## Done Test
```bash
# Test 1 — manual trigger
# Get a real job ID from your SQLite DB:
# sqlite3 data/autopilot.db "SELECT id, company, role FROM applications LIMIT 5;"

node scripts/prep.js J-[your-job-id]

# Expected output:
# ✅ Interview brief ready: outputs/Anthropic-.../interview-prep.md
# Quick preview:
# — 9 questions generated
# — Key themes: Incident Command, Cross-functional Escalation, Process Automation
# — Salary range: $120,000 - $160,000 CAD

# Test 2 — check the file
cat outputs/Anthropic-Incident-Response-Manager-*/interview-prep.md

# Expected: full markdown brief starting with "# Interview Prep"
# Should have real STAR answers referencing Herjavec Group, Guest Tek, Parity etc
# Questions to Ask section should have at least 3 questions
```

Phase 4 is complete when interview-prep.md exists with real content and the salary range is populated.
