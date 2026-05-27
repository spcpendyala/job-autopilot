'use strict';

const supertest = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3002';

/**
 * Returns a supertest agent that preserves cookies across requests.
 * In single-user mode (MULTI_USER not set), all routes pass through
 * automatically with req.userId = 'default'. The agent is still useful
 * for testing the session endpoint and keeping cookies for multi-user tests.
 */
function makeAgent() {
  return supertest.agent(BASE_URL);
}

/**
 * Ping the server. Retries up to maxMs ms before giving up.
 * Use in beforeAll to ensure the test server is ready.
 */
async function waitForServer(maxMs = 10000) {
  const agent = makeAgent();
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await agent.get('/api/health');
      if (res.status === 200) return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Test server at ${BASE_URL} did not respond within ${maxMs}ms`);
}

module.exports = { makeAgent, waitForServer, BASE_URL };
