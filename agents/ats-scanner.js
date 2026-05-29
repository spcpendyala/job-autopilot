const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

const ATS_FALLBACK = {
  criticalMissing: [],
  niceToHaveMissing: [],
  keyPhrasesToUse: [],
  resumeSections: { summary: [], skills: [], bullets: [] },
};

function loadContext() {
  try {
    const profileName = process.env.ACTIVE_PROFILE || 'default';
    const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${profileName}.json`);
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    let resume = '';
    try { resume = fs.readFileSync(path.join(__dirname, '..', 'core', 'base-resume.md'), 'utf8'); } catch {}
    return { profile, resume };
  } catch {
    return { profile: {}, resume: '' };
  }
}

function safeParseATS(raw) {
  if (!raw) return ATS_FALLBACK;
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) {
    console.warn('[ats-scanner] No JSON object found in response, using fallback');
    return ATS_FALLBACK;
  }
  clean = clean.slice(start, end + 1);
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.warn('[ats-scanner] JSON parse failed, returning fallback:', e.message);
    return ATS_FALLBACK;
  }
}

async function scanATSGaps(jobDescription, jobTitle) {
  const { profile, resume } = loadContext();

  const systemPrompt = `You are an ATS (Applicant Tracking System) optimization expert. Analyze keyword gaps between job descriptions and candidate profiles.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

BASE RESUME:
${resume}`;

  const userMessage = `Analyze this job description for ATS keyword gaps against the candidate's profile.

Job Description:
${jobDescription}

Return ONLY valid JSON (no markdown fences, no explanation) in exactly this shape:
{
  "criticalMissing": [<must-have keywords candidate lacks>],
  "niceToHaveMissing": [<good-to-have keywords candidate lacks>],
  "keyPhrasesToUse": [<exact phrases from JD to inject into resume>],
  "resumeSections": {
    "summary": [<phrases to add to summary>],
    "skills": [<skills to highlight or add>],
    "bullets": [<phrases to work into experience bullets>]
  }
}`;

  try {
    const raw = await callClaude(userMessage, {
      tier: 'quality',
      maxTokens: 800,
      systemPrompt,
      useCache: true,
    });
    return safeParseATS(raw);
  } catch (err) {
    console.warn('[ats-scanner] Claude call failed:', err.message);
    return ATS_FALLBACK;
  }
}

module.exports = { scanATSGaps, safeParseATS };
