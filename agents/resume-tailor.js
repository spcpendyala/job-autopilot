const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

function loadUserProfile(userId = 'default') {
  const profilePath = path.join(__dirname, '..', 'data', 'users', userId, 'profile.json');
  const resumePath = path.join(__dirname, '..', 'data', 'users', userId, 'base-resume.md');
  const profile = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
  const resume = fs.existsSync(resumePath) ? fs.readFileSync(resumePath, 'utf8') : '';
  return { profile, resume };
}

async function tailorResume(jobDescription, jobTitle, company, atsGaps, userId = 'default') {
  const { profile, resume } = loadUserProfile(userId);
  const keyPhrasesToUse = atsGaps?.keyPhrasesToUse?.join(', ') || '';
  const criticalMissing = atsGaps?.criticalMissing?.join(', ') || '';

  const systemPrompt = `You are an expert resume writer and career strategist.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

BASE RESUME:
${resume}`;

  const userMessage = `Tailor this candidate's resume for the following role.

Company: ${company || 'Unknown'}
Role: ${jobTitle || 'Unknown'}

Job Description:
${jobDescription}

ATS keywords to incorporate (inject naturally where truthful):
- Critical missing: ${criticalMissing}
- Key phrases to use: ${keyPhrasesToUse}

Rules:
- Keep ALL facts true — never invent experience or skills
- Reorder and reword bullet points to prioritize what this job needs
- Inject missing ATS keywords naturally where truthful
- Mirror language from the job description where possible
- Keep same structure as base resume
- Lead summary with the most relevant strength for THIS role
- Use strong action verbs and keep quantified achievements

Return the complete tailored resume in clean markdown. No explanation, no preamble.
Must start with # ${profile.name || 'Candidate'} and include all sections.`;

  const raw = await callClaude(userMessage, {
    tier: 'quality',
    maxTokens: 2500,
    systemPrompt,
    useCache: true,
  });

  return raw.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim();
}

module.exports = { tailorResume };
