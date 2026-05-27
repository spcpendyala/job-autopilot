'use strict';

const Database = require('better-sqlite3');
const path = require('path');

function seed(dbPath) {
  if (!dbPath) throw new Error('dbPath is required');
  const absPath = path.resolve(dbPath);

  // Set env var so db.js initDB uses the test DB
  process.env.TEST_DB_PATH = absPath;
  const { initDB } = require('../../services/db');
  initDB();

  // Open a direct connection for controlled inserts
  const db = new Database(absPath);

  db.prepare('DELETE FROM applications WHERE user_id = ?').run('default');
  db.prepare('DELETE FROM approval_queue WHERE user_id = ?').run('default');
  db.prepare('DELETE FROM apply_queue WHERE user_id = ?').run('default');
  db.prepare('DELETE FROM outreach WHERE user_id = ?').run('default');
  db.prepare('DELETE FROM preference_signals WHERE user_id = ?').run('default');

  // Three applications with different statuses
  const insertApp = db.prepare(`
    INSERT INTO applications
      (id, url_hash, company, role, job_url, fit_score, verdict,
       apply_recommendation, status, user_id, raw_score_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertApp.run('J-001', 'hash001', 'Acme Corp', 'Software Engineer',
    'https://jobs.acme.com/001', 7.5, 'Strong fit', 1, 'discovered', 'default',
    JSON.stringify({ score: 7.5, verdict: 'Strong fit', breakdown: [] }));

  insertApp.run('J-002', 'hash002', 'Beta Corp', 'Frontend Developer',
    'https://jobs.beta.com/002', 8.2, 'Excellent fit', 1, 'applied', 'default',
    JSON.stringify({ score: 8.2, verdict: 'Excellent fit', breakdown: [] }));

  insertApp.run('J-003', 'hash003', 'Gamma Inc', 'Backend Developer',
    'https://jobs.gamma.com/003', 6.0, 'Moderate fit', 0, 'rejected', 'default',
    JSON.stringify({ score: 6.0, verdict: 'Moderate fit', breakdown: [] }));

  // Two pending approval queue items
  const insertAQ = db.prepare(`
    INSERT INTO approval_queue
      (id, application_id, company, role, job_url, fit_score, verdict,
       status, user_id, job_description, tailored_resume, cover_letter)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAQ.run('AQ-001', 'J-001', 'Acme Corp', 'Software Engineer',
    'https://jobs.acme.com/001', 7.5, 'Strong fit', 'pending', 'default',
    'Full-stack engineer role requiring Node.js and React.', '# Tailored Resume A', '# Cover Letter A');

  insertAQ.run('AQ-002', 'J-001', 'Acme Corp', 'Software Engineer',
    'https://jobs.acme.com/001', 7.5, 'Strong fit', 'pending', 'default',
    'Full-stack engineer role requiring Node.js and React.', '# Tailored Resume B', '# Cover Letter B');

  // One ready apply-queue item
  db.prepare(`
    INSERT INTO apply_queue
      (id, approval_id, application_id, company, role, job_url, fit_score,
       tailored_resume, cover_letter, status, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('AP-001', 'AQ-001', 'J-001', 'Acme Corp', 'Software Engineer',
    'https://jobs.acme.com/001', 7.5,
    '# Tailored Resume A', '# Cover Letter A', 'ready', 'default');

  // One draft outreach record
  db.prepare(`
    INSERT INTO outreach
      (id, company, role, contact_name, draft_message, status, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('OR-001', 'Acme Corp', 'Software Engineer', 'Jane Smith',
    'Hi Jane, I noticed your team is hiring for...', 'draft', 'default');

  db.close();
  console.log('[seed] Test DB seeded at', absPath);
}

if (require.main === module) {
  const dbPath = process.env.TEST_DB_PATH || path.join(__dirname, '..', '..', 'data', 'test.autopilot.db');
  seed(dbPath);
}

module.exports = { seed };
