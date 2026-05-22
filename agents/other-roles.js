const axios = require('axios');
const { callClaude } = require('../services/claude');

function detectATS(jobUrl) {
  if (jobUrl.includes('greenhouse.io')) return 'greenhouse';
  if (jobUrl.includes('lever.co')) return 'lever';
  if (jobUrl.includes('workday.com')) return 'workday';
  return 'other';
}

function extractSlug(jobUrl, ats) {
  try {
    const url = new URL(jobUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    if (ats === 'greenhouse' || ats === 'lever') return segments[0] || null;
  } catch {
    // fall through
  }
  return null;
}

async function fetchCareersPage(jobUrl, company) {
  const ats = detectATS(jobUrl);

  if (ats === 'workday') return null;

  let careersUrl;
  if (ats === 'greenhouse') {
    const slug = extractSlug(jobUrl, ats);
    if (!slug) return null;
    careersUrl = `https://r.jina.ai/https://boards.greenhouse.io/${slug}`;
  } else if (ats === 'lever') {
    const slug = extractSlug(jobUrl, ats);
    if (!slug) return null;
    careersUrl = `https://r.jina.ai/https://jobs.lever.co/${slug}`;
  } else {
    const domain = (company || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    careersUrl = `https://r.jina.ai/https://www.${domain}.com/careers`;
  }

  try {
    const response = await axios.get(careersUrl, {
      headers: { 'Accept': 'text/plain' },
      timeout: 12000,
    });
    const text = (response.data || '').trim();
    if (text.length < 100) return null;
    return text.slice(0, 4000);
  } catch {
    return null;
  }
}

async function findOtherRoles(company, currentJobUrl) {
  const careersContent = await fetchCareersPage(currentJobUrl, company);

  if (!careersContent) return { otherRoles: [] };

  const userMessage = `A candidate is applying to ${company || 'this company'}. Below is content from their careers page.

Identify up to 5 job listings that would be a strong match for an operations/IT leader with this background:
- 10+ years in IT operations, service operations, network operations, SOC management
- Incident management, SLA ownership, ITIL, team leadership
- Technical account management, delivery management, infrastructure management

Careers page content:
${careersContent}

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "otherRoles": [
    {
      "title": "Role Title",
      "url": "full job URL if visible in the content, else empty string",
      "whyRelevant": "one sentence"
    }
  ]
}`;

  const raw = await callClaude(userMessage, {
    tier: 'cheap',
    maxTokens: 500,
    useCache: false,
  });

  const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { otherRoles: [] };
  }
}

module.exports = { findOtherRoles };
