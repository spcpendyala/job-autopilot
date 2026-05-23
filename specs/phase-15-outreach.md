# Phase 15 — Outreach Layer
## Goal
Active outreach to recruiters at target companies.
System finds recruiter info, drafts personalized cold outreach,
tracks outreach separately from applications.
Morning brief includes outreach status.
Maximize candidate visibility to employers.

---

## No New Dependencies (uses existing axios, claude.js)

---

## New DB Table (add to initDB)

```sql
CREATE TABLE IF NOT EXISTS outreach (
  id TEXT PRIMARY KEY,
  company TEXT,
  role TEXT,
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT,
  contact_linkedin TEXT,
  outreach_type TEXT DEFAULT 'recruiter_cold',
  -- recruiter_cold | warm_intro | direct_hiring_manager
  draft_message TEXT,
  status TEXT DEFAULT 'draft',
  -- draft | sent | replied | ignored
  application_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT,
  replied_at TEXT,
  notes TEXT
);
```

Add to db.js exports:
- `saveOutreach(data)` — insert outreach row
- `getOutreach(status)` — get by status
- `updateOutreachStatus(id, status, notes)` — update status
- `getOutreachStats()` — { total, sent, replied, replyRate }

---

## Files to Create

### 1. `agents/recruiter-finder.js`
Find recruiter info for a company using Jina scraping.
No Hunter.io needed — use public LinkedIn/company info.

Requirements:
- Export: `findRecruiter(company, role)`
- Use Haiku, maxTokens: 300
- No profile caching needed

Step 1: Scrape company LinkedIn page via Jina:
```
https://r.jina.ai/https://www.linkedin.com/company/${slug}/people
```
Where slug = company name lowercased, spaces replaced with hyphens.
Take first 2000 chars of result.

Step 2: Also try company careers/about page:
```
https://r.jina.ai/https://www.${domain}/about
```
Take first 1000 chars.

Step 3: Claude Haiku extracts recruiter info:
```
From this content about ${company}, extract recruiter or HR contact info.
Return JSON: {
  "name": "first name only or empty string",
  "title": "Recruiter/HR Manager/Talent Acquisition/etc or empty",
  "email": "if found, else empty string",
  "linkedin": "linkedin URL if found, else empty",
  "confidence": "high|medium|low"
}
If no recruiter found, return all empty strings with confidence: "low".
Return ONLY valid JSON.
```

Strip fences, parse JSON. Return object.
If all empty: return `{ name: '', title: 'Hiring Team', email: '', linkedin: '', confidence: 'low' }`

---

### 2. `agents/outreach-drafter.js`
Draft personalized cold outreach email.

Requirements:
- Load profile (cached)
- Export: `draftOutreach(company, role, recruiterInfo, jobDescription)`
- Use Haiku, maxTokens: 300, useCache: true (profile cached)

Prompt rules:
- 3 sentences maximum
- Address by first name if available, "Hiring Team" otherwise
- Reference the specific role and one thing about the company from the JD
- End with a clear ask: schedule a call or review attached resume
- Do NOT say "I am writing to express my interest"
- Do NOT say "I wanted to reach out"
- Tone: direct, confident, human
- Include candidate name and one key credential at the end (no full signature block)

Return: email body text only. No subject line, no sign-off beyond name.

Also return a subject line as separate field.

Return JSON:
```json
{
  "subject": "Operations Manager — 10 Years Building 24x7 Ops Teams",
  "body": "email body here"
}
```

---

### 3. New API endpoints (add to server.js)

**POST /api/outreach/find**
Body: `{ company, role, applicationId }`
- Call findRecruiter(company, role)
- Return recruiter info

**POST /api/outreach/draft**
Body: `{ company, role, recruiterInfo, jobDescription }`
- Call draftOutreach(...)
- Save to outreach table with status='draft'
- Return: `{ success: true, outreachId, subject, body, recruiterInfo }`

**GET /api/outreach**
Returns all outreach items, ordered by created_at DESC.
Include stats: total, sent, replied, replyRate.

**POST /api/outreach/:id/mark-sent**
- Update status to 'sent', sent_at to now
- Return: `{ success: true }`

**POST /api/outreach/:id/mark-replied**
- Update status to 'replied', replied_at to now
- Return: `{ success: true }`

**GET /api/outreach/stats**
Returns: `{ total, sent, replied, replyRate, draftsPending }`

---

### 4. Update `scripts/daily-scan.js`
Add outreach section to morning brief:

After follow-ups section, add:

```javascript
// Outreach due: sent 7+ days ago, no reply
const outreachDue = getOutreach('sent').filter(o => {
  const sentDaysAgo = Math.floor((Date.now() - new Date(o.sent_at)) / 86400000)
  return sentDaysAgo >= 7
})

if (outreachDue.length > 0) {
  console.log('\n📨 OUTREACH FOLLOW-UP DUE')
  outreachDue.forEach(o => {
    const days = Math.floor((Date.now() - new Date(o.sent_at)) / 86400000)
    console.log(`  → ${o.company} (${o.contact_name || 'Hiring Team'}) — sent ${days} days ago`)
  })
}

const outreachStats = getOutreachStats()
if (outreachStats.total > 0) {
  console.log(`\n📊 OUTREACH: ${outreachStats.sent} sent | ${outreachStats.replied} replied | ${outreachStats.replyRate}% reply rate`)
}
```

---

### 5. Update `api/server.js` — morning brief endpoint
Add outreach data to /api/morning-brief response:
```javascript
const outreachStats = getOutreachStats()
const outreachDue = getOutreach('sent').filter(o => {
  const days = Math.floor((Date.now() - new Date(o.sent_at)) / 86400000)
  return days >= 7
})
// Add to morningBriefCache: outreachStats, outreachDue
```

---

## Done Test
```bash
# Test 1 — find recruiter
curl -X POST http://localhost:3001/api/outreach/find \
  -H "Content-Type: application/json" \
  -d '{"company":"Anthropic","role":"Operations Manager","applicationId":"J-test"}'
# Expected: recruiter info object (may have low confidence but no crash)

# Test 2 — draft outreach
curl -X POST http://localhost:3001/api/outreach/draft \
  -H "Content-Type: application/json" \
  -d '{"company":"Anthropic","role":"Operations Manager","recruiterInfo":{"name":"Sarah","title":"Recruiter"},"jobDescription":"We are looking for..."}'
# Expected: { outreachId, subject, body } — body under 300 tokens

# Test 3 — get outreach list
curl http://localhost:3001/api/outreach
# Expected: array with 1 draft item

# Test 4 — mark sent
curl -X POST http://localhost:3001/api/outreach/{id}/mark-sent
# Expected: {"success":true}

# Test 5 — daily scan shows outreach section
node scripts/daily-scan.js
# Expected: outreach section visible in morning brief
```

Phase 15 complete when recruiter finding + outreach drafting + tracking all work.
