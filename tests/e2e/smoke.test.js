const { test, expect } = require('@playwright/test');

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});

test('discover/test endpoint returns sources', async ({ request }) => {
  const res = await request.get('/api/discover/test');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.sources).toBeDefined();
  expect(body.sources.length).toBeGreaterThan(0);
});

test('/privacy loads without auth', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.locator('h1')).toContainText('Privacy Policy');
  expect(page.url()).toContain('privacy');
});

test('/terms loads without auth', async ({ page }) => {
  await page.goto('/terms');
  const body = await page.locator('body').innerText();
  expect(body.length).toBeGreaterThan(10);
  expect(body.toLowerCase()).toContain('term');
});

test('app root responds (API server running)', async ({ request }) => {
  // Root / is served by Nginx in production; in test mode just verify server is up
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
});
