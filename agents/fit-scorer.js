const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'sai'}.json`);
const resumePath = path.join(__dirname, '..', 'core', 'base-resume.md');

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const resume = fs.readFileSync(resumePath, 'utf8');

const systemPrompt = `You are an expert career coach and job fit analyst. Evaluate candidate fit against job descriptions.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

BASE RESUME:
${resume}`;

async function scoreJobFit(jobDescription, jobTitle, company) {
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
