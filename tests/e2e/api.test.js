const { test, expect } = require('@playwright/test');

test('unauthenticated /api/applications returns 401 or 200 (depends on MULTI_USER)', async ({ request }) => {
  const res = await request.get('/api/applications');
  // 401 in MULTI_USER=true (production), 200 in MULTI_USER=false (dev/test)
  expect([200, 401]).toContain(res.status());
});

test('POST /api/feedback accepts submission or returns 401', async ({ request }) => {
  const res = await request.post('/api/feedback', {
    data: { page: 'test', tried: 'e2e test', worked: 'yes', severity: 'none' },
  });
  expect([200, 401]).toContain(res.status());
});

test('discover/test returns valid source structure', async ({ request }) => {
  const res = await request.get('/api/discover/test');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.sources)).toBe(true);
  for (const source of body.sources) {
    expect(source).toHaveProperty('name');
    expect(source).toHaveProperty('status');
    expect(['ok', 'blocked', 'error']).toContain(source.status);
  }
});
