const axios = require('axios');
const { callClaude } = require('../services/claude');

async function jina(url) {
  try {
    const res = await axios.get(`https://r.jina.ai/${url}`, { timeout: 10000 });
    return res.data || '';
  } catch { return ''; }
}

async function findRecruiter(company, role) {
  const slug = company.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const domain = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

  const [linkedinText, aboutText] = await Promise.all([
    jina(`https://www.linkedin.com/company/${slug}/people`),
    jina(`https://www.${domain}/about`),
  ]);

  const combined = [
    linkedinText.slice(0, 2000),
    aboutText.slice(0, 1000),
  ].filter(Boolean).join('\n\n');

  const prompt = `From this content about ${company}, extract recruiter or HR contact info.
Return JSON:
{
  "name": "first name only or empty string",
  "title": "Recruiter/HR Manager/Talent Acquisition/etc or empty",
  "email": "if found, else empty string",
  "linkedin": "linkedin URL if found, else empty",
  "confidence": "high|medium|low"
}
If no recruiter found, return all empty strings with confidence: "low".
Return ONLY valid JSON.

CONTENT:
${combined || '(no content found)'}`;

  let result;
  try {
    const raw = await callClaude(prompt, { tier: 'cheap', maxTokens: 300, useCache: false });
    result = JSON.parse(raw);
  } catch {
    return { name: '', title: 'Hiring Team', email: '', linkedin: '', confidence: 'low' };
  }

  if (!result.name && !result.email && !result.linkedin) {
    return { name: '', title: 'Hiring Team', email: '', linkedin: '', confidence: 'low' };
  }

  return result;
}

module.exports = { findRecruiter };
