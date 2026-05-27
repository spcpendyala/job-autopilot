'use strict';

// Judge helper — uses Claude Haiku to evaluate AI-generated content against a rubric.
// Returns { scores, overall, notes } even on parse errors (overall: 0 in that case).

const Anthropic = require('@anthropic-ai/sdk');

const JUDGE_MODEL = 'claude-haiku-4-5-20251001';

let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('[judge] ANTHROPIC_API_KEY must be set to run quality evaluations');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Evaluates AI-generated content against a rubric using Claude Haiku.
 *
 * @param {string} taskName   - Human-readable label for the evaluation context
 * @param {string} content    - The AI-generated content to judge
 * @param {string[]} rubric   - Array of "criterion_id: description" strings (pass=1 / fail=0)
 * @returns {Promise<{ scores: Record<string,number>, overall: number, notes: string }>}
 */
async function evaluate(taskName, content, rubric) {
  const rubricLines = rubric.map((r, i) => `${i + 1}. ${r}`).join('\n');

  const prompt = `You are an objective quality evaluator. Score the content below against each criterion.

EVALUATION TASK: ${taskName}

CONTENT:
---
${content.slice(0, 4000)}
---

RUBRIC (score each: 1 = pass, 0 = fail):
${rubricLines}

Respond with ONLY valid JSON — no markdown fences, no extra text:
{
  "scores": {
    "criterion_1": 1,
    "criterion_2": 0
  },
  "overall": 1.5,
  "notes": "short explanation of any failing criteria"
}

The keys in "scores" must be the criterion IDs (e.g. criterion_1, criterion_2, ...).
"overall" is the numeric sum of all scores.
Be strict: a criterion passes only if fully satisfied.`;

  try {
    const response = await getClient().messages.create({
      model: JUDGE_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    return JSON.parse(raw);
  } catch (err) {
    console.error('[judge] evaluation error:', err.message);
    return {
      scores: {},
      overall: 0,
      notes: `Judge error: ${err.message}`,
    };
  }
}

module.exports = { evaluate };
