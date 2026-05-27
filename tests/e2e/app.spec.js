'use strict';

const { test, expect } = require('@playwright/test');
const path = require('path');
const { seed } = require('../fixtures/seed');

const DB_PATH = process.env.TEST_DB_PATH || path.join(__dirname, '..', '..', 'data', 'test.autopilot.db');

// Mocked user returned by /auth/me to bypass real Google OAuth in tests
const MOCK_USER = {
  user: { id: 'default', name: 'Test User', email: 'test@example.com', picture: null },
  userId: 'default',
  isAdmin: false,
};

// Re-seed before each test file so state is predictable
test.beforeAll(() => {
  seed(DB_PATH);
});

// ─────────────────────────────────────────────────
// TEST 1: Sign-in screen when not authenticated
// ─────────────────────────────────────────────────

test('shows sign-in screen when not authenticated', async ({ page }) => {
  // Do NOT mock /auth/me — let it return { user: undefined } naturally.
  // In single-user mode the server returns userId:'default' but user:undefined,
  // which causes the app to show the SignInScreen.
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForSelector('h1', { timeout: 10000 });

  await expect(page.locator('h1')).toContainText('Job AutoPilot');
  await expect(page.locator('a[href="/auth/google"]')).toBeVisible();

  // Filter out browser-level noise; only fail on React/JS errors
  const realErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('net::ERR')
  );
  expect(realErrors).toHaveLength(0);
});

// ─────────────────────────────────────────────────
// Helper: set up routes that make the app think the user is signed in
// ─────────────────────────────────────────────────

async function setupAuth(page) {
  await page.route('**/auth/me', route =>
    route.fulfill({ json: MOCK_USER })
  );
  await page.route('**/api/setup-status', route =>
    route.fulfill({ json: { profileApproved: true, profileExists: true, userId: 'default', checks: {} } })
  );
  // Background polling routes — return minimal valid data
  await page.route('**/api/approval-queue/stats', route =>
    route.fulfill({ json: { pending: 0, approved: 0, skipped: 0, applyReady: 0, total: 0 } })
  );
  await page.route('**/api/inbox/unread-count', route =>
    route.fulfill({ json: { count: 0 } })
  );
}

// ─────────────────────────────────────────────────
// TEST 2: Home page loads after auth
// ─────────────────────────────────────────────────

test('Home page loads and shows sidebar after auth', async ({ page }) => {
  await setupAuth(page);

  // Also mock the morning-brief (may call AI on some paths, keep it fast)
  await page.route('**/api/morning-brief**', route =>
    route.fulfill({
      json: {
        date: 'Wednesday, May 27, 2026',
        newJobs: [],
        followUpsDue: [],
        newResponses: [],
        stats: { total: 0, applied: 0, responded: 0, interviews: 0, rejections: 0, responseRate: 0 },
        outreachStats: { total: 0, sent: 0, replied: 0, replyRate: 0 },
        outreachDue: [],
      },
    })
  );

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  // Sidebar should appear with "Job AutoPilot" branding
  await page.waitForSelector('text=Job AutoPilot', { timeout: 10000 });

  await expect(page.locator('text=Home')).toBeVisible();
  await expect(page.locator('text=Pipeline')).toBeVisible();
  await expect(page.locator('text=Find a Job')).toBeVisible();
  await expect(page.locator('text=Profile')).toBeVisible();

  const realErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('Failed to load resource')
  );
  expect(realErrors).toHaveLength(0);
});

// ─────────────────────────────────────────────────
// TEST 3: Pipeline page shows kanban column headers
// ─────────────────────────────────────────────────

test('Pipeline page shows kanban column headers', async ({ page }) => {
  await setupAuth(page);

  // Stub applications so the page renders without waiting for real API
  await page.route('**/api/applications**', route =>
    route.fulfill({
      json: [
        { id: 'J-001', company: 'Acme Corp', role: 'Software Engineer', status: 'discovered', fit_score: 7.5, job_url: 'https://example.com', created_at: new Date().toISOString(), raw_score_json: null },
        { id: 'J-002', company: 'Beta Corp', role: 'Frontend Dev', status: 'applied', fit_score: 8.2, job_url: 'https://example.com/2', created_at: new Date().toISOString(), raw_score_json: null },
      ],
    })
  );
  await page.route('**/api/apply-queue**', route => route.fulfill({ json: [] }));

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForSelector('text=Pipeline', { timeout: 10000 });
  await page.locator('text=Pipeline').first().click();

  // Pipeline page should show kanban column headers
  await expect(page.locator('text=DISCOVERED')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('text=APPLIED')).toBeVisible();
  await expect(page.locator('text=TAILORING')).toBeVisible();
  await expect(page.locator('text=INTERVIEW')).toBeVisible();

  const realErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('Failed to load resource')
  );
  expect(realErrors).toHaveLength(0);
});

// ─────────────────────────────────────────────────
// TEST 4: Find a Job — paste description, analyze, see score
// ─────────────────────────────────────────────────

test('Find a Job: paste description, click Analyze Job, see score result', async ({ page }) => {
  await setupAuth(page);

  // Mock the analyze endpoint so we don't hit the real Claude API
  await page.route('**/api/analyze', route =>
    route.fulfill({
      json: {
        fitScore: {
          score: 7.5,
          verdict: 'Strong fit',
          oneLineSummary: 'Your Node.js and React skills match well.',
          applyRecommendation: true,
          topMatchingSkills: ['Node.js', 'React', 'Express'],
          keyGaps: ['TypeScript', 'AWS Lambda'],
          breakdown: [],
        },
        atsGaps: {
          gaps: ['TypeScript', 'AWS Lambda'],
          score: 78,
          recommendations: [],
        },
        jobDescription: 'Full-stack engineer needed with Node.js and React.',
      },
    })
  );

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForSelector('text=Find a Job', { timeout: 10000 });
  await page.locator('text=Find a Job').first().click();

  // Wait for the FindJob form
  await page.waitForSelector('textarea', { timeout: 8000 });

  // Paste a job description
  await page.locator('textarea').fill(
    'Full-stack Node.js / React engineer needed. Requirements: Node.js, React, Express, REST APIs.'
  );

  // Click "Analyze Job"
  await page.locator('button:has-text("Analyze Job")').click();

  // Should show the score result (7.5 and "Strong fit")
  await expect(page.locator('text=Strong fit')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=7.5').first()).toBeVisible();

  const realErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('Failed to load resource')
  );
  expect(realErrors).toHaveLength(0);
});

// ─────────────────────────────────────────────────
// TEST 5: No console errors on Profile page
// ─────────────────────────────────────────────────

test('Profile page loads with no console errors', async ({ page }) => {
  await setupAuth(page);

  // Stub profile API
  await page.route('**/api/profile**', route =>
    route.fulfill({
      json: {
        name: 'Test User',
        email: 'test@example.com',
        location: 'San Francisco, CA',
        completeness: 45,
        coreSkills: ['Node.js', 'React'],
        targetRoles: ['Software Engineer'],
        experience: [],
        education: [],
      },
    })
  );

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForSelector('text=Profile', { timeout: 10000 });
  await page.locator('button:has-text("Profile")').first().click();

  // Profile page should show name or completeness info
  await page.waitForSelector('text=Test User', { timeout: 8000 });

  const realErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('Failed to load resource')
  );
  expect(realErrors).toHaveLength(0);
});
