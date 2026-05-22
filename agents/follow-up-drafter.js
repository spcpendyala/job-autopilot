const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'sai'}.json`);
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

const systemPrompt = `You are a professional email writer helping a job candidate send follow-up emails.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}`;

async function draftFollowUp(company, role, daysElapsed, recruiterName) {
  const salutation = recruiterName ? `${recruiterName.split(' ')[0]}` : 'Hiring Team';

  const prompt = `Draft a follow-up email for a job application.

Company: ${company}
Role: ${role}
Days since applying: ${daysElapsed}
Recruiter name: ${recruiterName || 'unknown'}

Rules:
- Address them as "${salutation}"
- 3 sentences maximum
- Tone: professional, direct, not desperate
- Reference the specific role by name
- Express continued interest and ask for a status update
- Do NOT say "I wanted to follow up" or "just checking in"
- Do NOT use hollow phrases like "I remain very interested"
- Return email body only — no subject line, no sign-off

Write the email body now.`;

  const raw = await callClaude(prompt, {
    tier: 'quality',
    maxTokens: 300,
    systemPrompt,
    useCache: true,
  });

  return raw.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim();
}

module.exports = { draftFollowUp };
