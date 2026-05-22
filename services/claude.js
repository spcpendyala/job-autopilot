const Anthropic = require('@anthropic-ai/sdk');

const SONNET = 'claude-sonnet-4-20250514';
const HAIKU = 'claude-haiku-4-5-20251001';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment. Check your .env file.');
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getModel(tier) {
  if (process.env.BETA_MODE === 'true') return HAIKU;
  return tier === 'quality' ? SONNET : HAIKU;
}

async function callClaude(prompt, options = {}) {
  const { tier = 'cheap', maxTokens = 1024, systemPrompt, useCache = false } = options;

  const model = getModel(tier);

  const params = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };

  if (systemPrompt) {
    if (useCache) {
      params.system = [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ];
    } else {
      params.system = systemPrompt;
    }
  }

  try {
    const response = await client.messages.create(params);
    const text = response.content[0].text;
    return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  } catch (err) {
    throw new Error(`Claude API error: ${err.message}`);
  }
}

module.exports = { callClaude, getModel };
