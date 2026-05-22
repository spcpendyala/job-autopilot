const { callClaude } = require('../services/claude');

const VALID_LABELS = new Set([
  'INTERVIEW_REQUEST',
  'REJECTION',
  'APPLICATION_RECEIVED',
  'ASSESSMENT_SENT',
  'OFFER',
  'FOLLOW_UP_NEEDED',
  'IRRELEVANT',
]);

async function classifyEmail(subject, from, snippet) {
  const prompt = `Classify this email in the context of job applications. Return ONLY one label — nothing else.

Valid labels: INTERVIEW_REQUEST | REJECTION | APPLICATION_RECEIVED | ASSESSMENT_SENT | OFFER | FOLLOW_UP_NEEDED | IRRELEVANT

Subject: ${subject}
From: ${from}
Snippet: ${snippet}`;

  const raw = await callClaude(prompt, {
    tier: 'cheap',
    maxTokens: 30,
    useCache: false,
  });

  const label = raw.trim().toUpperCase();
  return VALID_LABELS.has(label) ? label : 'IRRELEVANT';
}

module.exports = { classifyEmail };
