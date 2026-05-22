const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'sai'}.json`);
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

const systemPrompt = `You are an expert salary negotiation coach with deep knowledge of Canadian and US tech and operations job markets in 2026.

CANDIDATE:
Name: ${profile.name}
Location: ${profile.location}
Years of Experience: ${profile.yearsExperience}
Target Roles: ${profile.targetRoles.join(', ')}
Core Skills: ${profile.coreSkills.join(', ')}`;

async function fetchSalarySource(url, label) {
  try {
    const response = await axios.get(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain' },
      timeout: 10000,
    });
    const text = (response.data || '').trim().slice(0, 2000);
    return `=== ${label} ===\n${text}`;
  } catch {
    return null;
  }
}

async function researchSalary(role, company, location) {
  const loc = location || profile.location;

  const sources = [
    [`https://www.glassdoor.com/Salaries/${role.replace(/\s+/g, '-')}-Salary-SRCH_KO0,${role.length}.htm`, 'Glassdoor'],
    [`https://www.levels.fyi/t/${role.replace(/\s+/g, '-')}/`, 'Levels.fyi'],
    [`https://www.payscale.com/research/CA/Job=${role.replace(/\s+/g, '_')}/Salary`, 'PayScale'],
  ];

  const results = await Promise.all(sources.map(([url, label]) => fetchSalarySource(url, label)));
  const combined = results.filter(Boolean).join('\n\n');
  const marketData = combined || 'No data retrieved — use your training knowledge';

  const userMessage = `Research salary for this role and generate a negotiation brief.

ROLE: ${role}
COMPANY: ${company}
LOCATION: ${loc}
CANDIDATE EXPERIENCE: ${profile.yearsExperience} years

MARKET DATA SCRAPED:
${marketData}

Generate a salary negotiation brief. Return ONLY valid JSON:
{
  "marketRange": {
    "low": "$X",
    "mid": "$Y",
    "high": "$Z",
    "currency": "CAD or USD",
    "dataQuality": "scraped|estimated"
  },
  "recommendedAsk": "$X",
  "anchorPoint": "$X",
  "walkAwayNumber": "$X",
  "reasoning": "Why these numbers for this candidate at this company",
  "negotiationScript": {
    "openingLine": "Exact line to say when asked about salary expectations",
    "counterOffer": "Exact line to use when countered below ask",
    "closingLine": "Exact line to accept or defer gracefully"
  },
  "equityNote": "What to know about equity at this company type",
  "benefitsToNegotiate": ["item1", "item2", "item3"],
  "redLines": ["never accept X", "reject if Y"],
  "marketContext": "One paragraph on salary trends for this role/location in 2026"
}`;

  const raw = await callClaude(userMessage, {
    tier: 'quality',
    maxTokens: 1500,
    systemPrompt,
    useCache: true,
  });

  // Extract JSON object — Claude sometimes appends commentary after the closing brace
  const start = raw.indexOf('{');
  let jsonStr = raw;
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === '{') depth++;
      else if (raw[i] === '}') { depth--; if (depth === 0) { jsonStr = raw.slice(start, i + 1); break; } }
    }
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse salary brief: ${raw}`);
  }
}

module.exports = { researchSalary };
