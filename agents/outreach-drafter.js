const fs = require('fs');
const path = require('path');
const { callClaude } = require('../services/claude');

const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'sai'}.json`);
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

const systemPrompt = `You are writing cold outreach emails on behalf of ${profile.name}.
Key credential: ${(profile.yearsExperience || 0)} years of experience. Core skills: ${(profile.coreSkills || []).slice(0, 3).join(', ')}.

Rules:
- 3 sentences maximum
- Address by first name if available, "Hiring Team" otherwise
- Reference the specific role and one concrete thing about the company from the job description
- End with a clear ask: schedule a call or review resume
- Do NOT say "I am writing to express my interest"
- Do NOT say "I wanted to reach out"
- Tone: direct, confident, human
- End with candidate name and one key credential only — no full signature block
- Return ONLY valid JSON: { "subject": "...", "body": "..." }`;

async function draftOutreach(company, role, recruiterInfo, jobDescription) {
  const addressee = recruiterInfo.name || 'Hiring Team';
  const jdSnippet = (jobDescription || '').slice(0, 500);

  const prompt = `Draft a cold outreach email to ${addressee} at ${company} for the ${role} position.

Job description snippet:
${jdSnippet}

Recruiter info: ${JSON.stringify(recruiterInfo)}

Return JSON: { "subject": "...", "body": "..." }`;

  const raw = await callClaude(prompt, {
    tier: 'cheap',
    maxTokens: 300,
    systemPrompt,
    useCache: true,
  });

  try {
    return JSON.parse(raw);
  } catch {
    return { subject: `${role} — ${profile.name}`, body: raw };
  }
}

module.exports = { draftOutreach };
