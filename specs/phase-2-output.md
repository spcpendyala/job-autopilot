# Phase 2 — The Output
## Goal
After scoring a job, generate the full application package locally:
tailored resume + cover letter + company brief + other open roles at same company.
All saved to `outputs/[Company]-[Role]-[Date]/`.
No Google Drive yet. No new dependencies needed.

---

## Update CLAUDE.md After This Phase
Change Current Phase to:
`PHASE 2 — Output (Resume + Cover Letter + Company Brief + Other Roles)`

---

## Files to Create

### 1. `agents/resume-tailor.js`

Requirements:
- Load profile and base resume same way as fit-scorer (same paths, same caching pattern)
- Export: `tailorResume(jobDescription, jobTitle, company, atsGaps)`
- Use `callClaude` with tier: 'quality', maxTokens: 2500, useCache: true
- System prompt (cached): candidate profile + base resume
- User message: job details + ATS keywords to incorporate + tailoring instructions

Prompt rules to include:
- Keep ALL facts true — never invent experience or skills
- Reorder and reword bullet points to prioritize what this job needs
- Inject missing ATS keywords naturally where truthful
- Mirror language from the job description where possible
- Keep same structure as base resume
- Lead summary with the most relevant strength for THIS role
- Use strong action verbs and keep quantified achievements

Return: complete tailored resume in clean markdown (no explanation, no preamble).
Must start with `# Sai Pendyala` and include all sections.

Strip any markdown fences from response before returning (same pattern as claude.js).

---

### 2. `agents/cover-letter.js`

Requirements:
- Load profile same way as other agents (cached)
- Export: `generateCoverLetter(jobDescription, jobTitle, company, fitScore)`
- Use `callClaude` with tier: 'quality', maxTokens: 600, useCache: true

Prompt rules to include:
- Do NOT open with "I am writing to express my interest" or any generic opener
- Open with a specific hook — something concrete about the company or this role
- Maximum 3 short paragraphs — hiring managers skim
- Reference 2-3 specific things from the job description by name
- End with a direct, confident call to action — not "I look forward to hearing from you"
- Tone: direct, confident, human — not formal, not sycophantic
- Do NOT mention the fit score
- Do NOT include subject line, date, or address block — letter body only

Return: cover letter text only. No preamble, no explanation.
Starts directly with the opening line.

Strip any markdown fences from response before returning.

---

### 3. `agents/company-brief.js`

Requirements:
- Export: `getCompanyBrief(company, jobDescription)`
- No profile needed — this is company research, not candidate matching
- Use `callClaude` with tier: 'cheap', maxTokens: 600, useCache: false

Step 1 — Fetch company info:
  - Try to fetch `https://r.jina.ai/https://www.${domain}/about` where domain is derived from company name
  - If fetch fails or returns < 300 chars, skip and use job description context only
  - Limit fetched content to 3000 chars

Step 2 — Generate brief:
Prompt: given the company name, job description, and any fetched about page content, generate a research brief.

Return parsed JSON:
```json
{
  "oneLiner": "What the company does in one sentence",
  "missionSignals": "What they seem to care about based on JD language",
  "whyThisRole": "Why this role likely exists / what problem it solves",
  "cultureSignals": ["signal1", "signal2"],
  "interviewTalkingPoints": ["point1", "point2", "point3"],
  "redFlags": ["anything concerning from JD language"]
}
```

Strip fences before parsing. If JSON parse fails, return a default object with empty arrays and a note.

---

### 4. `agents/other-roles.js`

Requirements:
- Export: `findOtherRoles(company, currentJobUrl)`
- Use `callClaude` with tier: 'cheap', maxTokens: 500, useCache: false

Step 1 — Try to find careers page:
  - Detect ATS from job URL:
    - `greenhouse.io` → fetch `https://boards.greenhouse.io/[company-slug]`
    - `lever.co` → fetch `https://jobs.lever.co/[company-slug]`
    - `workday.com` → skip (too complex to scrape)
    - Other → try `https://r.jina.ai/https://www.[company].com/careers`
  - Extract company slug from currentJobUrl (second path segment for greenhouse/lever)
  - Fetch the careers page via Jina, limit to 4000 chars

Step 2 — Extract and score roles:
Prompt: given this list of job titles from the careers page, identify which ones could be a strong match for this candidate profile (ops, IT, service management, incident response, technical account management roles). Return up to 5 relevant roles.

Return parsed JSON:
```json
{
  "otherRoles": [
    {
      "title": "Role Title",
      "url": "full job URL if extractable, else empty string",
      "whyRelevant": "one sentence"
    }
  ]
}
```

If careers page fetch fails entirely, return `{ "otherRoles": [] }` — do not throw.

---

### 5. `services/output-writer.js`

New file. Handles saving all generated content to the local outputs folder.

Requirements:
- Export: `saveApplicationPackage(data)`
- data shape:
  ```javascript
  {
    company,        // string
    role,           // string  
    jobUrl,         // string
    jobDescription, // string
    fitScore,       // full score object
    atsGaps,        // full gaps object
    resume,         // markdown string
    coverLetter,    // string
    companyBrief,   // object
    otherRoles      // object
  }
  ```
- Create folder: `outputs/[Company]-[Role]-[YYYY-MM-DD]/`
  - Sanitize folder name: replace spaces with `-`, remove special chars
  - If folder exists, append `-2`, `-3` etc
- Write these files into the folder:
  - `resume.md` — tailored resume markdown
  - `cover-letter.md` — cover letter text
  - `job-description.md` — original JD
  - `company-brief.json` — pretty-printed JSON
  - `other-roles.md` — markdown list of other roles with URLs
  - `score-report.md` — formatted version of the fit score + ATS gaps (same format as terminal output)
- Return the folder path

---

## Update `scripts/apply.js`

Add a `--full` flag. When present, run the complete Phase 2 pipeline after scoring.

Updated pipeline when `--full` is passed:
1. Dedup check (same as before)
2. Fetch job description
3. Run in parallel (Promise.all):
   - scoreJobFit
   - scanATSGaps
4. Print fit score (same as before)
5. If `--full`:
   - Print "Generating application package..."
   - Run in parallel (Promise.all):
     - tailorResume (needs fitScore + atsGaps)
     - generateCoverLetter (needs fitScore.score)
     - getCompanyBrief
     - findOtherRoles
   - Print "Saving to outputs folder..."
   - Call saveApplicationPackage
   - Print folder path
   - Print other roles found (if any)
6. saveApplication to SQLite (always, with or without --full)

Add to `package.json` scripts:
```json
"full": "node scripts/apply.js --full"
```

Note: argv parsing needs to handle --full flag anywhere in args.
Suggested: check if process.argv includes '--full', then remove it from argv before extracting url/company/role.

---

## Done Test

```bash
# Test 1 — score only (existing behavior unchanged)
node scripts/apply.js "https://job-boards.greenhouse.io/anthropic/jobs/5205495008" "Anthropic" "Incident Response Manager P&E"

# Should: print score, save to DB, no outputs folder created

# Test 2 — full package
node scripts/apply.js --full "https://job-boards.greenhouse.io/anthropic/jobs/5205495008" "Anthropic" "Incident Response Manager P&E"

# Should: print score, then generate all docs, then print:
# ✅ Package saved to: outputs/Anthropic-Incident-Response-Manager-PE-2026-05-21/
# 📁 Files: resume.md, cover-letter.md, job-description.md, company-brief.json, other-roles.md, score-report.md
# 🔍 Other open roles at Anthropic: [list]

# Test 3 — check the files exist
ls outputs/Anthropic-Incident-Response-Manager-PE-2026-05-21/
cat outputs/Anthropic-Incident-Response-Manager-PE-2026-05-21/cover-letter.md
```

Phase 2 is complete when:
- All 6 files exist in the outputs folder
- resume.md starts with "# Sai Pendyala"
- cover-letter.md does NOT start with "I am writing to"
- other-roles.md has at least 1 other Anthropic role listed
- score-only mode still works without generating files

Do not start Phase 3 until all checks pass.
