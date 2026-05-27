const fs = require('fs');
const path = require('path');
const { callClaude } = require('../services/claude');

async function synthesizeProfile(resumeTexts, userId = 'default') {
  const profileName = process.env.ACTIVE_PROFILE || 'sai';
  const n = resumeTexts.length;

  const combinedText = resumeTexts
    .slice(0, 6)
    .map((text, i) => `===RESUME ${i + 1}===\n\n${text.slice(0, 2500)}`)
    .join('\n\n');

  const prompt = `You are a professional resume analyst. Analyze these ${n} resumes from the same candidate.
Synthesize the most complete, accurate profile possible.
The candidate may have different versions emphasizing different aspects.
Extract the best from all versions.

RESUMES:
${combinedText}

Return ONLY valid JSON with this exact structure (no extra commentary):
{
  "profile": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "website": "",
    "openToRemote": true,
    "openToHybrid": true,
    "openTo": { "fullTime": true, "contract": false, "partTime": false, "freelance": false },
    "targetRoles": [],
    "yearsExperience": 0,
    "minSalary": "",
    "summary": "",
    "about": "",
    "coreSkills": [],
    "experience": [
      {
        "title": "", "company": "", "from": "", "to": "Present",
        "location": "", "description": "", "highlights": [], "skills": []
      }
    ],
    "education": [
      { "degree": "", "institution": "", "year": "" }
    ],
    "certifications": [
      { "name": "", "issuer": "", "year": "", "expires": "" }
    ],
    "achievements": [],
    "projects": [
      { "name": "", "description": "", "url": "", "techUsed": [] }
    ],
    "languages": [
      { "language": "", "level": "" }
    ],
    "volunteering": [
      { "role": "", "organization": "", "from": "", "to": "", "description": "" }
    ],
    "tools": {
      "itsm": [], "infrastructure": [], "security": [],
      "analytics": [], "collaboration": [], "other": []
    }
  },
  "baseResume": "# [Name]\\n[full markdown resume — best single version synthesized from all uploads]",
  "categoryVariants": {
    "ops": "brief description of what to emphasize for operations roles",
    "tam": "brief description of what to emphasize for TAM/client-facing roles",
    "consulting": "brief description of what to emphasize for consulting/advisory roles"
  },
  "synthesisNotes": "What you found across the resumes and key decisions made"
}`;

  const raw = await callClaude(prompt, { tier: 'quality', maxTokens: 8000, useCache: false });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Response may be truncated — extract the profile object and regenerate baseResume separately
    console.warn('[profile-synthesizer] JSON parse failed, attempting partial extraction...');
    const profileMatch = raw.match(/"profile"\s*:\s*(\{[\s\S]+)/);
    if (!profileMatch) throw new Error(`Failed to parse synthesis response: ${raw.slice(0, 500)}`);

    // Close any unclosed braces to make it parseable
    let fragment = profileMatch[1];
    let opens = (fragment.match(/\{/g) || []).length;
    let closes = (fragment.match(/\}/g) || []).length;
    while (closes < opens) { fragment += '}'; closes++; }
    // Remove trailing comma/bracket artifacts
    fragment = fragment.replace(/,\s*$/, '').replace(/,(\s*[\}\]])/g, '$1');

    let profile;
    try { profile = JSON.parse(fragment); }
    catch { throw new Error(`Failed to parse synthesis response: ${raw.slice(0, 500)}`); }

    // Generate a base resume separately since it was cut off
    const resumePrompt = `Write a professional markdown resume for this candidate:
${JSON.stringify({ name: profile.name, summary: profile.summary, experience: profile.experience, education: profile.education, coreSkills: profile.coreSkills }, null, 2)}

Return only the markdown resume (no JSON wrapper).`;
    const baseResume = await callClaude(resumePrompt, { tier: 'quality', maxTokens: 3000, useCache: false });
    parsed = { profile, baseResume, synthesisNotes: 'Profile recovered from partial synthesis response.' };
  }

  // Write profile to per-user directory
  const userDir = path.join(__dirname, '..', 'data', 'users', userId);
  const resumesDir = path.join(userDir, 'resumes');
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

  fs.writeFileSync(path.join(userDir, 'profile.json'), JSON.stringify(parsed.profile, null, 2));
  fs.writeFileSync(path.join(userDir, 'base-resume.md'), parsed.baseResume);

  // Generate category variants
  const variants = ['ops', 'tam', 'consulting'];
  await Promise.all(variants.map(async (variant) => {
    const emphasis = parsed.categoryVariants[variant] || '';
    const variantPrompt = `Reframe this resume to emphasize: ${emphasis}

Keep all facts 100% accurate. Only change emphasis, ordering, and framing.

BASE RESUME:
${parsed.baseResume}

Return only the reframed markdown resume.`;

    const variantMd = await callClaude(variantPrompt, { tier: 'cheap', maxTokens: 2000, useCache: false });
    fs.writeFileSync(path.join(resumesDir, `${profileName}-${variant}.md`), variantMd);
  }));

  return parsed;
}

module.exports = { synthesizeProfile };
