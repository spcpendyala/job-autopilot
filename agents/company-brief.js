const axios = require('axios');
const { callClaude } = require('../services/claude');

async function fetchAboutPage(company) {
  const domain = company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.com';
  try {
    const response = await axios.get(`https://r.jina.ai/https://www.${domain}/about`, {
      headers: { 'Accept': 'text/plain' },
      timeout: 10000,
    });
    const text = (response.data || '').trim();
    if (text.length < 300) return null;
    return text.slice(0, 3000);
  } catch {
    return null;
  }
}

async function getCompanyBrief(company, jobDescription) {
  const aboutContent = await fetchAboutPage(company);

  const contextBlock = aboutContent
    ? `Company About Page:\n${aboutContent}`
    : 'No about page content available — use context from the job description only.';

  const userMessage = `Research this company and generate a brief for a job applicant.

Company: ${company || 'Unknown'}

${contextBlock}

Job Description:
${jobDescription}

Return ONLY valid JSON (no markdown fences, no explanation) in exactly this shape:
{
  "oneLiner": "What the company does in one sentence",
  "missionSignals": "What they seem to care about based on JD language",
  "whyThisRole": "Why this role likely exists / what problem it solves",
  "cultureSignals": ["signal1", "signal2"],
  "interviewTalkingPoints": ["point1", "point2", "point3"],
  "redFlags": ["anything concerning from JD language"]
}`;

  const raw = await callClaude(userMessage, {
    tier: 'cheap',
    maxTokens: 600,
    useCache: false,
  });

  const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      oneLiner: company || 'Unknown',
      missionSignals: '',
      whyThisRole: '',
      cultureSignals: [],
      interviewTalkingPoints: [],
      redFlags: [],
      note: 'Could not parse company brief response.',
    };
  }
}

module.exports = { getCompanyBrief };
