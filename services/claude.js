const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SONNET = 'claude-sonnet-4-5';
const HAIKU = 'claude-haiku-4-5-20251001';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment. Check your .env file.');
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── In-memory response cache (24h TTL) ────────────────────────────────────────
const responseCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// ── Disk cache for scored jobs (keyed by URL hash, 48h TTL) ───────────────────
const DISK_CACHE_PATH = path.join(__dirname, '..', 'data', 'cache', 'scored-jobs.json');

function readDiskCache() {
  try {
    return JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeDiskCache(cache) {
  try {
    fs.mkdirSync(path.dirname(DISK_CACHE_PATH), { recursive: true });
    fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch {}
}

function getScoredJobCache(urlHash) {
  const cache = readDiskCache();
  const entry = cache[urlHash];
  if (!entry) return null;
  if (Date.now() - entry.ts > 48 * 60 * 60 * 1000) return null;
  return entry;
}

function setScoredJobCache(urlHash, data) {
  const cache = readDiskCache();
  cache[urlHash] = { ...data, ts: Date.now() };
  writeDiskCache(cache);
}

// ── Circuit breaker ────────────────────────────────────────────────────────────
let rateLimitHits = [];
let rateLimitedUntil = 0;

function recordRateLimitHit() {
  const now = Date.now();
  rateLimitHits = rateLimitHits.filter(t => now - t < 60 * 1000);
  rateLimitHits.push(now);
  if (rateLimitHits.length >= 3) {
    rateLimitedUntil = now + 10 * 60 * 1000;
    console.warn('[claude] circuit breaker: 3 rate limits in 60s — pausing 10 min');
  }
}

// ── Backoff wrapper ────────────────────────────────────────────────────────────
async function callWithBackoff(fn, label, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && i < maxRetries) {
        recordRateLimitHit();
        const wait = Math.pow(4, i) * 1000;
        console.warn(`[claude] rate limited on ${label}. Waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
}

function getModel(tier) {
  if (process.env.BETA_MODE === 'true') return HAIKU;
  return tier === 'quality' ? SONNET : HAIKU;
}

async function callClaude(prompt, options = {}) {
  if (Date.now() < rateLimitedUntil) {
    const wait = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
    throw new Error(`[claude] circuit breaker active — paused for ${wait}s due to repeated rate limiting`);
  }

  const { tier = 'cheap', maxTokens = 1024, systemPrompt, useCache = false, agent, noCache } = options;
  const model = getModel(tier);

  // In-memory cache check (skip for useCache=false with noCache flag)
  if (!noCache) {
    const cacheKey = crypto.createHash('sha256')
      .update(model + prompt + (systemPrompt || ''))
      .digest('hex');
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      console.log(`[claude] cache hit — saved 1 API call (${agent || 'unknown'})`);
      return cached.value;
    }

    const params = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };

    if (systemPrompt) {
      params.system = useCache
        ? [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
        : systemPrompt;
    }

    try {
      const response = await callWithBackoff(
        () => client.messages.create(params),
        agent || tier
      );
      const text = response.content[0].text;
      try {
        const { logUsage } = require('./db');
        logUsage({
          agent: agent || 'unknown',
          model,
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
        });
      } catch {}
      const result = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      responseCache.set(cacheKey, { value: result, ts: Date.now() });
      return result;
    } catch (err) {
      if (err.status === 429) recordRateLimitHit();
      throw new Error(`Claude API error: ${err.message}`);
    }
  }

  // noCache path (profile synthesis, unique content)
  const params = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };

  if (systemPrompt) {
    params.system = useCache
      ? [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
      : systemPrompt;
  }

  try {
    const response = await callWithBackoff(
      () => client.messages.create(params),
      agent || tier
    );
    const text = response.content[0].text;
    try {
      const { logUsage } = require('./db');
      logUsage({
        agent: agent || 'unknown',
        model,
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
      });
    } catch {}
    return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  } catch (err) {
    if (err.status === 429) recordRateLimitHit();
    throw new Error(`Claude API error: ${err.message}`);
  }
}

module.exports = { callClaude, getModel, getScoredJobCache, setScoredJobCache };
