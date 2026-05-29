'use strict';

const { callClaude } = require('../services/claude');
const { getPreferenceSignals, setUserPreferences } = require('../services/db');

// Reads the last 30 signals for a user, sends them to Haiku, and writes back
// a structured preference summary to user_preferences.
// Called after any batch of signals (discovery, approval, apply queue).
async function learnPreferences(userId = 'default') {
  const signals = getPreferenceSignals(userId, 30);
  if (signals.length === 0) return null;

  const formatted = signals.map(s => {
    const parts = [`type=${s.signal_type}`];
    if (s.job_company) parts.push(`company=${s.job_company}`);
    if (s.job_role)    parts.push(`role=${s.job_role}`);
    if (s.fit_score)   parts.push(`score=${s.fit_score}`);
    if (s.metadata) {
      try {
        const m = JSON.parse(s.metadata);
        if (m.reason) parts.push(`reason=${m.reason}`);
        if (m.keyword) parts.push(`keyword=${m.keyword}`);
      } catch {}
    }
    return parts.join(', ');
  }).join('\n');

  const prompt = `You analyze job search behavior signals and extract preference rules.

Signals (most recent first):
${formatted}

Signal types:
- deselected: user dismissed a job card
- skipped: user skipped an approval queue item
- no_edit_approved: user approved tailored content without edits (liked it)
- edited_resume: user edited the tailored resume before approving
- applied: user marked a job as applied (strong positive signal)
- not_interested: user explicitly said not interested

Analyze these signals and return JSON with exactly this structure:
{
  "avoided_companies": ["Company A", "Company B"],
  "avoided_keywords": ["keyword1", "keyword2"],
  "preferred_keywords": ["keyword1", "keyword2"],
  "min_score_threshold": 6.5,
  "insights": "1-2 sentence summary of what the user seems to want"
}

Rules:
- avoided_companies: companies the user consistently dismissed/skipped
- avoided_keywords: role/skill keywords that appear in dismissed jobs
- preferred_keywords: keywords in jobs the user approved or applied to
- min_score_threshold: inferred minimum fit score (between 5.0 and 8.0, default 6.0)
- Return only valid JSON, no explanation`;

  let parsed;
  try {
    const raw = await callClaude(prompt, { model: 'haiku', maxTokens: 400 });
    const jsonMatch = raw.match(/\{[\s\S]+\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return null;
  }

  const prefs = {
    avoided_companies:   Array.isArray(parsed.avoided_companies)  ? parsed.avoided_companies  : [],
    avoided_keywords:    Array.isArray(parsed.avoided_keywords)   ? parsed.avoided_keywords   : [],
    preferred_keywords:  Array.isArray(parsed.preferred_keywords) ? parsed.preferred_keywords : [],
    min_score_threshold: typeof parsed.min_score_threshold === 'number'
      ? Math.max(5.0, Math.min(8.0, parsed.min_score_threshold))
      : 6.0,
    insights: typeof parsed.insights === 'string' ? parsed.insights : '',
    updated_at: new Date().toISOString(),
    signal_count: signals.length,
  };

  setUserPreferences(prefs, userId);
  console.log(`[preferences] Learned from ${signals.length} signals for user`);
  return prefs;
}

module.exports = { learnPreferences };
