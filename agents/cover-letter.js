const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

function loadUserProfile(userId = 'default') {
  const profilePath = path.join(__dirname, '..', 'data', 'users', userId, 'profile.json');
  return fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
}

async function generateCoverLetter(jobDescription, jobTitle, company, fitScore, userId = 'default') {
  const profile = loadUserProfile(userId);

  const systemPrompt = `You are an expert cover letter writer who crafts concise, compelling letters that get interviews.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}`;

  const userMessage = `Write a cover letter for this candidate applying to the following role.

Company: ${company || 'Unknown'}
Role: ${jobTitle || 'Unknown'}
Fit Score: ${fitScore}/10 (do NOT mention this number in the letter)

Job Description:
${jobDescription}

Rules:
- Do NOT open with "I am writing to express my interest" or any generic opener
- Open with a specific hook — something concrete about the company or this role
- Maximum 3 short paragraphs — hiring managers skim
- Reference 2-3 specific things from the job description by name
- End with a direct, confident call to action — not "I look forward to hearing from you"
- Tone: direct, confident, human — not formal, not sycophantic
- Do NOT include subject line, date, or address block — letter body only

Return the cover letter text only. No preamble, no explanation. Start directly with the opening line.`;

  const raw = await callClaude(userMessage, {
    tier: 'quality',
    maxTokens: 600,
    systemPrompt,
    useCache: true,
  });

  return raw.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim();
}

module.exports = { generateCoverLetter };
