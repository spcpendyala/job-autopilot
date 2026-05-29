'use strict';

const { test, expect } = require('@playwright/test');
const path = require('path');
const { seed } = require('../fixtures/seed');

const DB_PATH = process.env.TEST_DB_PATH || path.join(__dirname, '..', '..', 'data', 'test.autopilot.db');

const MOCK_USER = {
  user: { id: 'default', name: 'Test User', email: 'test@example.com', picture: null },
  userId: 'default',
  isAdmin: false,
};

test.beforeAll(() => {
  seed(DB_PATH);
});

// Expected noise on a live MULTI_USER=true server — not our bugs
const NOISE = ['favicon', 'net::ERR', 'Failed to load resource', 'ERR_CONNECTION'];
const filterNoise = errors => errors.filter(e => !NOISE.some(n => e.includes(n)));

// Click a sidebar nav button by label text (scoped to <aside> to avoid ambiguity)
const navClick = (page, label) =>
  page.locator('aside').locator(`button:has-text("${label}")`).click();

// ─────────────────────────────────────────────────
// Full mock setup: covers every API route the app
// polls on initial load so 401s don't cause failures
// ─────────────────────────────────────────────────
async function setupAuth(page) {
  // NOTE: Playwright page.route() is LIFO — last registered = highest priority.
  // Register the catch-all FIRST so specific mocks registered after it take priority.

  // Catch-all for any /api/ route not specifically mocked — safe empty fallback
  // (prevents 401s from un-mocked routes causing JS errors on live MULTI_USER server)
  await page.route('**/api/**', r => r.fulfill({ json: {} }));

  // Auth — registered after catch-all so it wins
  await page.route('**/auth/me', r =>
    r.fulfill({ json: MOCK_USER }));

  // Critical: setup-status must return profileApproved:true or onboarding triggers
  await page.route('**/api/setup-status**', r =>
    r.fulfill({ json: { profileApproved: true, profileExists: true, userId: 'default', checks: {} } }));

  // AppShell background polling
  await page.route('**/api/approval-queue/stats**', r =>
    r.fulfill({ json: { pending: 0, approved: 0, skipped: 0, applyReady: 0, total: 0 } }));
  await page.route('**/api/inbox/unread-count**', r =>
    r.fulfill({ json: { count: 0 } }));
  await page.route('**/api/notifications**', r =>
    r.fulfill({ json: [] }));

  // Home page data
  await page.route('**/api/stats**', r =>
    r.fulfill({ json: { total: 0, applied: 0, responded: 0, interviews: 0, rejections: 0, responseRate: '0%' } }));
  await page.route('**/api/approval-queue**', r =>
    r.fulfill({ json: [] }));
  await page.route('**/api/apply-queue**', r =>
    r.fulfill({ json: [] }));
  await page.route('**/api/morning-brief**', r =>
    r.fulfill({ json: { date: 'Today', newJobs: [], followUpsDue: [], newResponses: [], stats: {}, outreachStats: {}, outreachDue: [] } }));

  // Settings / prefs / discovery
  await page.route('**/api/preferences**', r =>
    r.fulfill({ json: { discovery_mode: 'manual' } }));
  await page.route('**/api/discover/status**', r =>
    r.fulfill({ json: { lastRun: null, running: false } }));
  await page.route('**/api/discovery/sources**', r =>
    r.fulfill({ json: { active: 5, total: 8, byCategory: {} } }));
  await page.route('**/api/config**', r =>
    r.fulfill({ json: { autoTailorThreshold: 7.5, minScoreToShow: 6.0 } }));
}

// ─────────────────────────────────────────────────
// TEST 1: Sign-in screen when not authenticated
// ─────────────────────────────────────────────────
test('shows sign-in screen when not authenticated', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('/');
  await page.waitForSelector('h1', { timeout: 10000 });

  await expect(page.locator('h1')).toContainText('Job AutoPilot');
  await expect(page.locator('a[href="/auth/google"]')).toBeVisible();

  // On a live MULTI_USER server, background fetches 401 — expected, not our bug
  expect(filterNoise(consoleErrors)).toHaveLength(0);
});

// ─────────────────────────────────────────────────
// TEST 2: Home page loads after auth
// ─────────────────────────────────────────────────
test('Home page loads and shows sidebar after auth', async ({ page }) => {
  await setupAuth(page);
  await page.route('**/api/applications**', r => r.fulfill({ json: [] }));
  await page.route('**/api/profile**', r =>
    r.fulfill({ json: { name: 'Test User', email: 'test@example.com', completeness: 60, coreSkills: [], targetRoles: [], experience: [] } }));

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('/');
  await page.waitForSelector('text=Job AutoPilot', { timeout: 10000 });

  // Verify sidebar nav items are present (scoped to <aside> to avoid ambiguity)
  await expect(page.locator('aside').locator('button:has-text("Home")')).toBeVisible();
  await expect(page.locator('aside').locator('button:has-text("Pipeline")')).toBeVisible();
  await expect(page.locator('aside').locator('button:has-text("Find a Job")')).toBeVisible();
  await expect(page.locator('aside').locator('button:has-text("Profile")')).toBeVisible();

  expect(filterNoise(consoleErrors)).toHaveLength(0);
});

// ─────────────────────────────────────────────────
// TEST 3: Pipeline page shows kanban column headers
// ─────────────────────────────────────────────────
test('Pipeline page shows kanban column headers', async ({ page }) => {
  await setupAuth(page);

  await page.route('**/api/applications**', r =>
    r.fulfill({
      json: [
        { id: 'J-001', company: 'Acme Corp', role: 'Software Engineer', status: 'discovered', fit_score: 7.5, job_url: 'https://example.com', created_at: new Date().toISOString(), raw_score_json: null },
        { id: 'J-002', company: 'Beta Corp', role: 'Frontend Dev', status: 'applied', fit_score: 8.2, job_url: 'https://example.com/2', created_at: new Date().toISOString(), raw_score_json: null },
      ],
    }));
  await page.route('**/api/profile**', r =>
    r.fulfill({ json: { name: 'Test User', completeness: 60, coreSkills: [], targetRoles: [], experience: [] } }));

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('/');
  await page.waitForSelector('aside', { timeout: 10000 });
  await navClick(page, 'Pipeline');

  // Kanban columns — uppercase as defined in Pipeline.jsx STAGES
  await expect(page.locator('text=DISCOVERED')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=APPLIED')).toBeVisible({ timeout: 5000 });

  expect(filterNoise(consoleErrors)).toHaveLength(0);
});

// ─────────────────────────────────────────────────
// TEST 4: Find a Job — paste description, analyze, see score
// ─────────────────────────────────────────────────
test('Find a Job: paste description, click Analyze Job, see score result', async ({ page }) => {
  await setupAuth(page);

  await page.route('**/api/analyze**', r =>
    r.fulfill({
      json: {
        fitScore: {
          score: 7.5, verdict: 'Strong fit',
          oneLineSummary: 'Your Node.js and React skills match well.',
          applyRecommendation: true,
          topMatchingSkills: ['Node.js', 'React', 'Express'],
          keyGaps: ['TypeScript', 'AWS Lambda'],
          missingKeywords: [], tailoringTips: [],
          scoringBreakdown: { skillsMatch: 8, experienceLevel: 7, toolsMatch: 7, roleAlignment: 8 },
        },
        atsGaps: { criticalMissing: ['TypeScript'], niceToHaveMissing: [], keyPhrasesToUse: [], resumeSections: { summary: [], skills: [], bullets: [] } },
        jobDescription: 'Full-stack engineer needed with Node.js and React.',
      },
    }));
  await page.route('**/api/applications**', r => r.fulfill({ json: [] }));
  await page.route('**/api/profile**', r =>
    r.fulfill({ json: { name: 'Test User', completeness: 60, coreSkills: [], targetRoles: [], experience: [] } }));

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('/');
  await page.waitForSelector('aside', { timeout: 10000 });
  await navClick(page, 'Find a Job');

  // Wait for the job description textarea
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.locator('textarea').fill(
    'Full-stack Node.js / React engineer needed. Requirements: Node.js, React, Express, REST APIs.'
  );

  await page.locator('button:has-text("Analyze Job")').click();

  await expect(page.locator('text=Strong fit')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('text=7.5').first()).toBeVisible();

  expect(filterNoise(consoleErrors)).toHaveLength(0);
});

// ─────────────────────────────────────────────────
// TEST 5: Profile page loads with no console errors
// ─────────────────────────────────────────────────
test('Profile page loads with no console errors', async ({ page }) => {
  await setupAuth(page);

  await page.route('**/api/profile**', r =>
    r.fulfill({
      json: {
        name: 'Test User', email: 'test@example.com',
        location: 'San Francisco, CA', completeness: 45,
        coreSkills: ['Node.js', 'React'], targetRoles: ['Software Engineer'],
        experience: [], education: [],
      },
    }));
  await page.route('**/api/applications**', r => r.fulfill({ json: [] }));

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('/');
  await page.waitForSelector('aside', { timeout: 10000 });
  await navClick(page, 'Profile');

  // Profile page shows the user's name
  await expect(page.locator('text=Test User').first()).toBeVisible({ timeout: 10000 });

  expect(filterNoise(consoleErrors)).toHaveLength(0);
});
