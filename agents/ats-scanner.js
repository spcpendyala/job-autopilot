const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'sai'}.json`);
const resumePath = path.join(__dirname, '..', 'core', 'base-resume.md');

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const resume = fs.readFileSync(resumePath, 'utf8');

const systemPrompt = `You are an ATS (Applicant Tracking System) optimization expert. Analyze keyword gaps between job descriptions and candidate profiles.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

BASE RESUME:
${resume}`;

async function scanATSGaps(jobDescription) {
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

  const raw = await callClaude(userMessage, {
    tier: 'quality',
    maxTokens: 800,
    systemPrompt,
    useCache: true,
  });

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse ATS scan response: ${raw}`);
  }
}

module.exports = { scanATSGaps };
