const path = require('path');
const fs = require('fs');
const { callClaude } = require('../services/claude');

const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${process.env.ACTIVE_PROFILE || 'sai'}.json`);
const resumePath = path.join(__dirname, '..', 'core', 'base-resume.md');

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const resume = fs.readFileSync(resumePath, 'utf8');

const systemPrompt = `You are an expert interview coach preparing a candidate for a specific role.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

BASE RESUME:
${resume}`;

async function generateInterviewBrief(jobDescription, company, role, companyBrief) {
  const briefContext = companyBrief
    ? `Company Research:\n${JSON.stringify(companyBrief, null, 2)}`
    : 'No prior company research available — infer from job description.';

  const userMessage = `Generate a comprehensive interview preparation brief for this candidate.

Company: ${company || 'Unknown'}
Role: ${role || 'Unknown'}

Job Description:
${jobDescription}

${briefContext}

Return ONLY valid JSON (no markdown fences, no explanation) in exactly this shape:
{
  "roleInContext": "Why this role exists at this company right now — what problem it solves",
  "likelyQuestions": [
    {
      "question": "question text",
      "category": "behavioral | situational | role-specific",
      "whyTheyAsk": "what they are testing",
      "suggestedAnswer": "STAR format answer using Sai's actual experience — be specific about which role and company"
    }
  ],
  "technicalTopics": ["topic1", "topic2"],
  "questionsToAskThem": [
    {
      "question": "question text",
      "whyAsk": "why this question is strategic"
    }
  ],
  "salaryContext": {
    "estimatedRange": "$X - $Y CAD/USD",
    "anchorAdvice": "where to anchor and why",
    "negotiationNote": "one sentence on leverage"
  },
  "thirtyDayPlan": "what to realistically focus on in the first 30 days",
  "redFlags": ["things to probe in the interview"],
  "keyThemesToEmphasize": ["theme1", "theme2", "theme3"],
  "doNotMention": ["avoid these unless asked"]
}

Requirements:
- likelyQuestions: generate 8-10 questions spanning behavioral, situational, and role-specific categories
- STAR answers must reference Sai's actual experience from the profile (Palaemon, Parity, Herjavec Group, Guest Tek) — never generic
- Each suggestedAnswer: 3-4 sentences maximum — prioritize specificity over length
- questionsToAskThem: at least 3 strategic questions
- salaryContext.estimatedRange must be populated with a realistic range`;

  const raw = await callClaude(userMessage, {
    tier: 'quality',
    maxTokens: 5000,
    systemPrompt,
    useCache: true,
  });

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse interview brief response: ${raw}`);
  }
}

module.exports = { generateInterviewBrief };
