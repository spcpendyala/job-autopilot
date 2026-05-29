const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

const DATA_DIR = path.join(__dirname, '..', 'data');
function profilePath(userId) { return path.join(DATA_DIR, 'users', userId, 'profile.json'); }
function resumePath(userId)  { return path.join(DATA_DIR, 'users', userId, 'base-resume.md'); }

function loadUserContext(userId) {
  let profile = {};
  let resume = '';

  try {
    profile = JSON.parse(fs.readFileSync(profilePath(userId), 'utf8'));
  } catch {
    // Legacy fallback for single-user installs
    try {
      const legacyPath = path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'default'}.json`);
      profile = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    } catch {}
  }

  try {
    resume = fs.readFileSync(resumePath(userId), 'utf8');
  } catch {
    try {
      resume = fs.readFileSync(path.join(__dirname, '..', 'core', 'base-resume.md'), 'utf8');
    } catch {}
  }

  return { profile, resume };
}

async function scoreJobFit(jobDescription, jobTitle, company, userId = 'default') {
  const { profile, resume } = loadUserContext(userId);

  const systemPrompt = `You are an expert career coach and job fit analyst. Evaluate candidate fit against job descriptions.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

BASE RESUME:
${resume}`;

  const userMessage = `Evaluate the fit between this candidate and the following job.

Company: ${company || 'Unknown'}
Role: ${jobTitle || 'Unknown'}

Job Description:
${jobDescription}

Return ONLY valid JSON (no markdown fences, no explanation) in exactly this shape:
{
  "score": <number 0-10>,
  "verdict": <"STRONG MATCH" | "GOOD MATCH" | "WEAK MATCH" | "NO MATCH">,
  "applyRecommendation": <true | false>,
  "topMatchingSkills": [<string>, ...],
  "keyGaps": [<string>, ...],
  "missingKeywords": [<string>, ...],
  "tailoringTips": [<string>, ...],
  "scoringBreakdown": {
    "skillsMatch": <number 0-10>,
    "experienceLevel": <number 0-10>,
    "toolsMatch": <number 0-10>,
    "roleAlignment": <number 0-10>
  },
  "oneLineSummary": <string>
}`;

  const raw = await callClaude(userMessage, {
    tier: 'quality',
    maxTokens: 1000,
    systemPrompt,
    useCache: true,
  });

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse fit score response: ${raw}`);
  }
}

module.exports = { scoreJobFit };
