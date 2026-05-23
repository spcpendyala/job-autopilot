# Phase 12 — Resume Upload + Profile Synthesis
## Goal
User uploads up to 6 resumes (PDF/DOCX/TXT). Claude reads all in one call,
synthesizes one master profile.json and one master base-resume.md.
System auto-generates category-specific resume variants.
Profile requires user approval before discovery starts.

---

## New Dependencies
```bash
npm install multer pdf-parse mammoth
```

---

## New DB Tables (add to services/db.js initDB)

```sql
CREATE TABLE IF NOT EXISTS profile_status (
  key TEXT PRIMARY KEY,
  value TEXT
);
-- Keys: 'approved' (true/false), 'pending_review' (true/false)

CREATE TABLE IF NOT EXISTS uploaded_resumes (
  id TEXT PRIMARY KEY,
  filename TEXT,
  uploaded_at TEXT DEFAULT (datetime('now')),
  processed INTEGER DEFAULT 0
);
```

Add to db.js exports:
- `getProfileStatus()` — returns profile_status rows as object
- `setProfileStatus(key, value)` — upsert key/value
- `saveUploadedResume(id, filename)` — insert row
- `markResumesProcessed()` — set all processed=1

---

## Files to Create

### 1. `services/resume-parser.js`
Parse uploaded files to plain text.

```javascript
// Supports: .pdf, .docx, .txt
// Returns: plain text string

async function parseResume(filePath, mimetype) {
  if (mimetype === 'application/pdf' || filePath.endsWith('.pdf')) {
    const pdfParse = require('pdf-parse')
    const buffer = require('fs').readFileSync(filePath)
    const data = await pdfParse(buffer)
    return data.text.trim()
  }
  if (mimetype.includes('officedocument') || filePath.endsWith('.docx')) {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value.trim()
  }
  // Plain text
  return require('fs').readFileSync(filePath, 'utf8').trim()
}

module.exports = { parseResume }
```

---

### 2. `agents/profile-synthesizer.js`
One Sonnet call. Reads all resume texts. Outputs profile + base resume.

Requirements:
- Export: `synthesizeProfile(resumeTexts)` — array of strings
- Use callClaude with tier: 'quality', maxTokens: 4000, useCache: false
- Combine all resume texts with separator: `\n\n===RESUME ${i+1}===\n\n`
- Limit total input: first 3000 chars per resume, max 6 resumes = 18000 chars input

Prompt:
```
You are a professional resume analyst. Analyze these ${n} resumes from the same candidate.
Synthesize the most complete, accurate profile possible.
The candidate may have different versions emphasizing different aspects.
Extract the best from all versions.

RESUMES:
${combinedText}

Return ONLY valid JSON with this exact structure:
{
  "profile": {
    "name": "",
    "location": "",
    "email": "",
    "phone": "",
    "linkedin": "",
    "openToRemote": true,
    "openToHybrid": true,
    "targetRoles": [],
    "yearsExperience": 0,
    "summary": "",
    "coreSkills": [],
    "tools": {
      "itsm": [], "infrastructure": [], "security": [],
      "analytics": [], "collaboration": [], "other": []
    },
    "experience": [
      {
        "title": "", "company": "", "from": "", "to": "",
        "highlights": []
      }
    ],
    "education": [
      { "degree": "", "institution": "" }
    ],
    "certifications": [],
    "languages": []
  },
  "baseResume": "# [Name]\n[full markdown resume — best single version synthesized from all uploads]",
  "categoryVariants": {
    "ops": "brief description of what to emphasize for operations roles",
    "tam": "brief description of what to emphasize for TAM/client-facing roles",
    "consulting": "brief description of what to emphasize for consulting/advisory roles"
  },
  "synthesisNotes": "What you found across the resumes and key decisions made"
}
```

Strip fences, parse JSON. If parse fails throw with raw response.

After parsing:
- Write profile to `core/profiles/${ACTIVE_PROFILE}.json`
- Write baseResume to `core/base-resume.md`
- Generate and write category variants to `core/resumes/` folder

Category variant generation — one Haiku call per variant:
- `core/resumes/${profile}-ops.md`
- `core/resumes/${profile}-tam.md`
- `core/resumes/${profile}-consulting.md`

For each variant, use Haiku (maxTokens: 2000) to reframe the base resume with category emphasis using the categoryVariants description. Keep all facts true.

---

### 3. Upload endpoint — add to `api/server.js`

```javascript
const multer = require('multer')
const upload = multer({
  dest: 'uploads/resumes/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    cb(null, allowed.includes(file.mimetype) || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.docx') || file.originalname.endsWith('.txt'))
  }
})
```

**POST /api/profile/upload**
- Accepts: multipart/form-data, field name: `resumes`, max 6 files
- For each file: parse to text using resume-parser.js
- Call synthesizeProfile(texts)
- Save profile.json and base-resume.md
- Set profile_status: pending_review=true, approved=false
- Return: `{ success: true, profile: {...synthesized profile...}, baseResume: "...", synthesisNotes: "..." }`
- Error if 0 files or > 6 files

**GET /api/profile/status**
- Returns: `{ approved: bool, pendingReview: bool }`

**POST /api/profile/approve**
- Body: `{ profile: {...edited profile...}, baseResume: "edited resume text" }`
- Save edited versions to disk
- Set profile_status: approved=true, pending_review=false
- Return: `{ success: true }`

**POST /api/profile/reject**
- Set profile_status: pending_review=false, approved=false
- Return: `{ success: true }` (user can re-upload)

---

### 4. Update `api/server.js` — `/api/setup-status`
Add profile approval check:
```javascript
profileApproved: getProfileStatus().approved === 'true'
```

---

### 5. Update `.gitignore`
```
uploads/resumes/
core/resumes/
```

---

## Done Test
```bash
# Test 1 — upload resumes via curl
curl -X POST http://localhost:3001/api/profile/upload \
  -F "resumes=@/path/to/resume1.pdf" \
  -F "resumes=@/path/to/resume2.pdf"

# Expected: JSON with profile object and baseResume markdown

# Test 2 — check profile status
curl http://localhost:3001/api/profile/status
# Expected: {"approved":false,"pendingReview":true}

# Test 3 — approve profile
curl -X POST http://localhost:3001/api/profile/approve \
  -H "Content-Type: application/json" \
  -d '{"profile":{...},"baseResume":"# Name..."}'
# Expected: {"success":true}

# Test 4 — verify files created
ls core/profiles/
ls core/resumes/
cat core/base-resume.md | head -5
```

Phase 12 complete when upload → synthesize → approve flow works end to end.
