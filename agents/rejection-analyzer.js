const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');
const { getAllApplications } = require('../services/db');

const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'sai'}.json`);

async function analyzeApplicationPatterns(userId = 'default') {
  let profile = {};
  try {
    profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  } catch {
    profile = { name: 'Candidate', yearsExperience: 'N/A', targetRoles: [], location: 'N/A' };
  }

  const applications = getAllApplications(userId);

  if (applications.length < 5) {
    return {
      insufficientData: true,
      message: `Need at least 5 applications for pattern analysis. You have ${applications.length}.`,
      currentCount: applications.length,
    };
  }

  const analysisData = applications.map(app => ({
    company: app.company,
    role: app.role,
    fitScore: app.fit_score,
    verdict: app.verdict,
    status: app.status,
    daysAgo: Math.floor((Date.now() - new Date(app.created_at)) / 86400000),
    appliedAt: app.applied_at,
    responded: ['responded', 'interview', 'offer', 'rejected'].includes(app.status),
  }));

  const respondedCount = applications.filter(a =>
    ['responded', 'interview', 'offer'].includes(a.status)
  ).length;
  const appliedCount = applications.filter(a =>
    ['applied', 'responded', 'interview', 'offer', 'rejected'].includes(a.status)
  ).length;
  const withScores = applications.filter(a => a.fit_score != null);

  const stats = {
    total: applications.length,
    applied: appliedCount,
    responded: respondedCount,
    responseRate: appliedCount > 0 ? parseFloat((respondedCount / appliedCount * 100).toFixed(1)) : 0,
    avgFitScore: withScores.length > 0
      ? parseFloat((withScores.reduce((s, a) => s + a.fit_score, 0) / withScores.length).toFixed(1))
      : 0,
    highFitNoResponse: applications.filter(a =>
      a.fit_score >= 8 && !['responded', 'interview', 'offer', 'rejected'].includes(a.status)
    ).length,
    verdictBreakdown: {
      strongMatch: applications.filter(a => a.verdict === 'STRONG MATCH').length,
      goodMatch: applications.filter(a => a.verdict === 'GOOD MATCH').length,
      stretch: applications.filter(a => a.verdict === 'STRETCH').length,
      weakMatch: applications.filter(a => a.verdict === 'WEAK MATCH').length,
    },
  };

  const prompt = `You are a career strategist analyzing a job seeker's application data.

CANDIDATE: ${profile.name || 'Candidate'}, ${profile.yearsExperience || 'N/A'} years experience
TARGET ROLES: ${(profile.targetRoles || []).join(', ') || 'N/A'}
LOCATION: ${profile.location || 'N/A'}

APPLICATION DATA:
${JSON.stringify(analysisData, null, 2)}

COMPUTED STATS:
${JSON.stringify(stats, null, 2)}

Analyze these patterns and generate strategic insights.
Return ONLY valid JSON (no markdown fences):
{
  "overallGrade": "A|B|C|D|F — one letter grade for their job search strategy",
  "responseRate": <number — response rate as a percentage>,
  "keyFindings": [
    {
      "finding": "Specific observation about their application pattern",
      "severity": "critical|warning|info",
      "evidence": "What in the data shows this"
    }
  ],
  "topIssues": [
    {
      "issue": "The main problem in one sentence",
      "impact": "How this is hurting their chances",
      "fix": "Specific actionable fix — not generic advice"
    }
  ],
  "whatIsWorking": ["thing1", "thing2"],
  "roleAlignmentAnalysis": "Are they targeting the right roles given their profile?",
  "recommendations": {
    "immediate": ["Do this today"],
    "thisWeek": ["Change X in resume"],
    "strategic": ["Consider pivoting toward X"]
  },
  "predictedResponseRateIfFixed": <number — predicted response rate as a percentage if fixes applied>,
  "motivationalNote": "One honest, direct sentence acknowledging the difficulty and what's actually in their control"
}`;

  const raw = await callClaude(prompt, {
    tier: 'quality',
    maxTokens: 2000,
    useCache: true,
    systemPrompt: JSON.stringify(profile),
  });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse rejection analyzer response: ${raw.slice(0, 200)}`);
  }

  return { ...parsed, computedStats: stats };
}

module.exports = { analyzeApplicationPatterns };
