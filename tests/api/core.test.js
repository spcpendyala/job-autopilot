'use strict';

const path = require('path');
const { makeAgent, waitForServer } = require('./helpers');
const { seed } = require('../fixtures/seed');

const DB_PATH = process.env.TEST_DB_PATH || path.join(__dirname, '..', '..', 'data', 'test.autopilot.db');

let agent;

beforeAll(async () => {
  await waitForServer(15000);
  seed(DB_PATH);
  agent = makeAgent();
}, 20000);

// ─────────────────────────────────────────────────
// GROUP 1: Health & Auth
// ─────────────────────────────────────────────────

describe('Health & Auth', () => {
  test('GET /api/health returns ok', async () => {
    const res = await agent.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  test('GET /auth/me returns user id', async () => {
    const res = await agent.get('/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
  });

  test('GET /api/setup-status returns profileApproved flag', async () => {
    const res = await agent.get('/api/setup-status');
    expect(res.status).toBe(200);
    expect(typeof res.body.profileApproved).toBe('boolean');
    expect(typeof res.body.profileExists).toBe('boolean');
  });
});

// ─────────────────────────────────────────────────
// GROUP 2: Applications — Read
// ─────────────────────────────────────────────────

describe('Applications — Read', () => {
  test('GET /api/applications returns array with seeded data', async () => {
    const res = await agent.get('/api/applications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  test('GET /api/applications?status=discovered filters correctly', async () => {
    const res = await agent.get('/api/applications?status=discovered');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(a => expect(a.status).toBe('discovered'));
  });

  test('GET /api/applications/:id returns the specific app', async () => {
    const res = await agent.get('/api/applications/J-001');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('J-001');
    expect(res.body.company).toBe('Acme Corp');
  });

  test('GET /api/applications/:id returns 404 for unknown id', async () => {
    const res = await agent.get('/api/applications/J-DOES-NOT-EXIST');
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────
// GROUP 3: Applications — Write
// ─────────────────────────────────────────────────

describe('Applications — Write', () => {
  test('PATCH /api/applications/:id/status updates status', async () => {
    const res = await agent
      .patch('/api/applications/J-002/status')
      .send({ status: 'interview' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the change persisted
    const check = await agent.get('/api/applications/J-002');
    expect(check.body.status).toBe('interview');
  });

  test('DELETE /api/applications/:id removes the app', async () => {
    const res = await agent.delete('/api/applications/J-003');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it's gone
    const check = await agent.get('/api/applications/J-003');
    expect(check.status).toBe(404);
  });

  test('POST /api/signals logs a preference signal', async () => {
    const res = await agent.post('/api/signals').send({
      signal_type: 'deselected',
      application_id: 'J-001',
      job_company: 'Acme Corp',
      job_role: 'Software Engineer',
      fit_score: 7.5,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────
// GROUP 4: Stats
// ─────────────────────────────────────────────────

describe('Stats & Brief', () => {
  test('GET /api/stats returns aggregate stats', async () => {
    const res = await agent.get('/api/stats');
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.applied).toBe('number');
    expect(res.body.responseRate).toBeDefined();
  });

  test('GET /api/morning-brief returns brief structure', async () => {
    const res = await agent.get('/api/morning-brief');
    expect(res.status).toBe(200);
    expect(res.body.date).toBeDefined();
    expect(Array.isArray(res.body.newJobs)).toBe(true);
    expect(Array.isArray(res.body.followUpsDue)).toBe(true);
    expect(Array.isArray(res.body.newResponses)).toBe(true);
    expect(res.body.stats).toBeDefined();
  });

  test('GET /api/discover/status returns lastRun field', async () => {
    const res = await agent.get('/api/discover/status');
    expect(res.status).toBe(200);
    expect('lastRun' in res.body).toBe(true);
    expect(typeof res.body.running).toBe('boolean');
  });
});

// ─────────────────────────────────────────────────
// GROUP 5: Profile
// ─────────────────────────────────────────────────

describe('Profile', () => {
  test('GET /api/profile returns completeness field', async () => {
    const res = await agent.get('/api/profile');
    expect(res.status).toBe(200);
    expect(typeof res.body.completeness).toBe('number');
  });

  test('POST /api/profile saves profile fields', async () => {
    const res = await agent.post('/api/profile').send({
      name: 'Test User',
      email: 'test@example.com',
      location: 'San Francisco, CA',
      summary: 'Experienced software engineer with 5 years of Node.js and React.',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify saved
    const check = await agent.get('/api/profile');
    expect(check.body.name).toBe('Test User');
    expect(check.body.email).toBe('test@example.com');
  });

  test('GET /api/profile/resume returns content field', async () => {
    const res = await agent.get('/api/profile/resume');
    expect(res.status).toBe(200);
    expect('content' in res.body).toBe(true);
  });

  test('GET /api/profile/status returns approved and pendingReview', async () => {
    const res = await agent.get('/api/profile/status');
    expect(res.status).toBe(200);
    expect(typeof res.body.approved).toBe('boolean');
    expect(typeof res.body.pendingReview).toBe('boolean');
  });

  test('POST /api/profile/approve saves profile and marks approved', async () => {
    const profile = {
      name: 'Test User',
      email: 'test@example.com',
      location: 'San Francisco, CA',
      summary: 'Experienced software engineer with 5 years of Node.js and React.',
      coreSkills: ['Node.js', 'React', 'Express', 'SQLite', 'Docker'],
      targetRoles: ['Software Engineer', 'Backend Engineer'],
    };
    const res = await agent.post('/api/profile/approve').send({
      profile,
      baseResume: '# Base Resume\n\nTest User — Software Engineer',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await agent.get('/api/profile/status');
    expect(check.body.approved).toBe(true);
  });
});

// ─────────────────────────────────────────────────
// GROUP 6: Config
// ─────────────────────────────────────────────────

describe('Config', () => {
  test('GET /api/config returns config object', async () => {
    const res = await agent.get('/api/config');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });

  test('POST /api/config updates a config value', async () => {
    const res = await agent.post('/api/config').send({ followUpDays: 7 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await agent.get('/api/config');
    expect(check.body.followUpDays).toBe(7);
  });
});

// ─────────────────────────────────────────────────
// GROUP 7: Approval Queue
// ─────────────────────────────────────────────────

describe('Approval Queue', () => {
  test('GET /api/approval-queue returns pending items', async () => {
    const res = await agent.get('/api/approval-queue');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Both AQ-001 and AQ-002 start as pending
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    res.body.forEach(item => expect(item.status).toBe('pending'));
  });

  test('POST /api/approval-queue/:id/skip marks item skipped', async () => {
    const res = await agent.post('/api/approval-queue/AQ-001/skip');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/approval-queue/stats returns totals', async () => {
    const res = await agent.get('/api/approval-queue/stats');
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.pending).toBe('number');
    expect(typeof res.body.skipped).toBe('number');
    expect(res.body.skipped).toBeGreaterThanOrEqual(1); // AQ-001 was just skipped
  });

  test('POST /api/approval-queue/:id/approve approves item', async () => {
    const res = await agent.post('/api/approval-queue/AQ-002/approve').send({
      resume: '# Final Resume',
      coverLetter: '# Final Cover Letter',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────
// GROUP 8: Apply Queue
// ─────────────────────────────────────────────────

describe('Apply Queue', () => {
  test('GET /api/apply-queue returns ready items', async () => {
    const res = await agent.get('/api/apply-queue');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/apply-queue/:id/mark-applied marks item applied', async () => {
    const res = await agent.post('/api/apply-queue/AP-001/mark-applied');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────
// GROUP 9: Outreach
// ─────────────────────────────────────────────────

describe('Outreach', () => {
  test('GET /api/outreach returns items and stats', async () => {
    const res = await agent.get('/api/outreach');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/outreach/stats returns aggregates', async () => {
    const res = await agent.get('/api/outreach/stats');
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.sent).toBe('number');
    expect(typeof res.body.replyRate).toBe('number');
  });

  test('POST /api/outreach/:id/mark-sent changes status to sent', async () => {
    const res = await agent.post('/api/outreach/OR-001/mark-sent');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/preference/signal logs a signal', async () => {
    const res = await agent.post('/api/preference/signal').send({
      signal_type: 'applied',
      application_id: 'J-001',
      job_company: 'Acme Corp',
      job_role: 'Software Engineer',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────
// GROUP 10: Misc endpoints
// ─────────────────────────────────────────────────

describe('Misc endpoints', () => {
  test('GET /api/skills-gap returns skills array', async () => {
    const res = await agent.get('/api/skills-gap');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.skills)).toBe(true);
    expect(typeof res.body.analyzed).toBe('boolean');
  });

  test('GET /api/inbox/unread-count returns count', async () => {
    const res = await agent.get('/api/inbox/unread-count');
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe('number');
  });
});

// ─────────────────────────────────────────────────
// GROUP 11: Session endpoint (TEST_MODE only)
// ─────────────────────────────────────────────────

describe('Test session endpoint', () => {
  test('POST /api/test-helpers/session returns Set-Cookie header', async () => {
    const sessionAgent = makeAgent();
    const res = await sessionAgent.post('/api/test-helpers/session').send({ userId: 'test-user-001' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // supertest agent stores the cookie; verify the response header is present
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(Array.isArray(setCookie) ? setCookie.length : setCookie).toBeTruthy();
  });
});
