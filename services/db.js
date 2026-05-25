const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'autopilot.db');

let db;

function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      url_hash TEXT UNIQUE,
      company TEXT,
      role TEXT,
      job_url TEXT,
      fit_score REAL,
      verdict TEXT,
      apply_recommendation INTEGER,
      status TEXT DEFAULT 'discovered',
      applied_at TEXT,
      drive_folder_url TEXT,
      notes TEXT,
      raw_score_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profile_status (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS uploaded_resumes (
      id TEXT PRIMARY KEY,
      filename TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      processed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS approval_queue (
      id TEXT PRIMARY KEY,
      application_id TEXT,
      company TEXT,
      role TEXT,
      job_url TEXT,
      fit_score REAL,
      verdict TEXT,
      job_description TEXT,
      tailored_resume TEXT,
      cover_letter TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS apply_queue (
      id TEXT PRIMARY KEY,
      approval_id TEXT,
      application_id TEXT,
      company TEXT,
      role TEXT,
      job_url TEXT,
      fit_score REAL,
      tailored_resume TEXT,
      cover_letter TEXT,
      added_at TEXT DEFAULT (datetime('now')),
      applied_at TEXT,
      status TEXT DEFAULT 'ready'
    );

    CREATE TABLE IF NOT EXISTS outreach (
      id TEXT PRIMARY KEY,
      company TEXT,
      role TEXT,
      contact_name TEXT,
      contact_title TEXT,
      contact_email TEXT,
      contact_linkedin TEXT,
      outreach_type TEXT DEFAULT 'recruiter_cold',
      draft_message TEXT,
      status TEXT DEFAULT 'draft',
      application_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      sent_at TEXT,
      replied_at TEXT,
      notes TEXT
    );
  `);

  try {
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_url_hash ON applications(url_hash)').run()
  } catch (_) {}

  db.exec(`CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)`);

  migrateAddUserId();
}

function migrateAddUserId() {
  const tables = ['applications', 'outreach', 'approval_queue', 'apply_queue', 'profile_status', 'uploaded_resumes'];
  for (const table of tables) {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN user_id TEXT DEFAULT 'default'`).run();
    } catch { /* column already exists */ }
  }
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function isDuplicate(url, userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const hash = md5(url);
  const row = db.prepare('SELECT 1 FROM applications WHERE url_hash = ? AND user_id = ?').get(hash, userId);
  return !!row;
}

function saveApplication(data, userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const id = `J-${Date.now()}`;
  const urlHash = md5(data.job_url);

  db.prepare(`
    INSERT INTO applications
      (id, url_hash, company, role, job_url, fit_score, verdict, apply_recommendation, raw_score_json, drive_folder_url, user_id)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    urlHash,
    data.company || null,
    data.role || null,
    data.job_url,
    data.fit_score,
    data.verdict,
    data.apply_recommendation ? 1 : 0,
    data.raw_score_json,
    data.drive_folder_url || null,
    userId
  );
  return id;
}

function getAllApplications(userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  return db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function getApplicationsDueFollowUp() {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  return db.prepare(`
    SELECT * FROM applications
    WHERE status = 'applied'
      AND applied_at IS NOT NULL
      AND applied_at <= datetime('now', '-5 days')
    ORDER BY applied_at ASC
  `).all();
}

function updateApplicationStatus(id, status) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id);
}

function updateDriveUrl(id, driveUrl) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare('UPDATE applications SET drive_folder_url = ? WHERE id = ?').run(driveUrl, id);
}

function getStats(userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
      SUM(CASE WHEN status IN ('interview', 'offer', 'rejected') THEN 1 ELSE 0 END) as responded,
      SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interviews,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejections,
      SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offers
    FROM applications
    WHERE user_id = ?
  `).get(userId);
}

// profile_status uses a key-prefix approach for multi-user isolation
// because key is the PRIMARY KEY and we can't use a compound filter
function getProfileStatus(userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const prefix = userId !== 'default' ? `${userId}:` : '';
  const rows = db.prepare("SELECT key, value FROM profile_status WHERE key LIKE ?").all(`${prefix}%`);
  return rows.reduce((acc, r) => {
    acc[r.key.replace(prefix, '')] = r.value;
    return acc;
  }, {});
}

function setProfileStatus(key, value, userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const dbKey = userId !== 'default' ? `${userId}:${key}` : key;
  db.prepare('INSERT OR REPLACE INTO profile_status (key, value) VALUES (?, ?)').run(dbKey, String(value));
}

function saveUploadedResume(id, filename, userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare('INSERT INTO uploaded_resumes (id, filename, user_id) VALUES (?, ?, ?)').run(id, filename, userId);
}

function markResumesProcessed(userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare('UPDATE uploaded_resumes SET processed = 1 WHERE user_id = ?').run(userId);
}

function addToApprovalQueue(data, userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare(`
    INSERT INTO approval_queue
      (id, application_id, company, role, job_url, fit_score, verdict, job_description, tailored_resume, cover_letter, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.application_id || null, data.company || null, data.role || null,
    data.job_url || null, data.fit_score || null, data.verdict || null,
    data.job_description || null, data.tailored_resume || null, data.cover_letter || null,
    userId
  );
}

function getApprovalQueue(status = 'pending', userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  return db.prepare(
    'SELECT * FROM approval_queue WHERE status = ? AND user_id = ? ORDER BY fit_score DESC'
  ).all(status, userId);
}

function updateApprovalStatus(id, status, editedResume = null, editedCoverLetter = null) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare(`
    UPDATE approval_queue
    SET status = ?, reviewed_at = datetime('now'),
        tailored_resume = COALESCE(?, tailored_resume),
        cover_letter = COALESCE(?, cover_letter)
    WHERE id = ?
  `).run(status, editedResume, editedCoverLetter, id);
}

function addToApplyQueue(data, userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare(`
    INSERT INTO apply_queue
      (id, approval_id, application_id, company, role, job_url, fit_score, tailored_resume, cover_letter, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.approval_id || null, data.application_id || null,
    data.company || null, data.role || null, data.job_url || null,
    data.fit_score || null, data.tailored_resume || null, data.cover_letter || null,
    userId
  );
}

function getApplyQueue(status = 'ready', userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  return db.prepare(
    'SELECT * FROM apply_queue WHERE status = ? AND user_id = ? ORDER BY added_at DESC'
  ).all(status, userId);
}

function markApplied(id) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare("UPDATE apply_queue SET status = 'applied', applied_at = datetime('now') WHERE id = ?").run(id);
}

function setApplicationApplied(id) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare("UPDATE applications SET status = 'applied', applied_at = datetime('now') WHERE id = ?").run(id);
}

function getApprovalStats(userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
    FROM approval_queue
    WHERE user_id = ?
  `).get(userId);
  const applyReady = db.prepare(
    "SELECT COUNT(*) as n FROM apply_queue WHERE status = 'ready' AND user_id = ?"
  ).get(userId);
  return {
    pending: row.pending || 0,
    approved: row.approved || 0,
    skipped: row.skipped || 0,
    applyReady: applyReady.n || 0,
  };
}

function saveOutreach(data, userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare(`
    INSERT INTO outreach
      (id, company, role, contact_name, contact_title, contact_email, contact_linkedin,
       outreach_type, draft_message, status, application_id, notes, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.company || null, data.role || null,
    data.contact_name || null, data.contact_title || null,
    data.contact_email || null, data.contact_linkedin || null,
    data.outreach_type || 'recruiter_cold',
    data.draft_message || null, data.status || 'draft',
    data.application_id || null, data.notes || null,
    userId
  );
}

function getOutreach(status, userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  if (status) {
    return db.prepare('SELECT * FROM outreach WHERE status = ? AND user_id = ? ORDER BY created_at DESC').all(status, userId);
  }
  return db.prepare('SELECT * FROM outreach WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function updateOutreachStatus(id, status, notes = null) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const sentAt = status === 'sent' ? "datetime('now')" : 'sent_at';
  const repliedAt = status === 'replied' ? "datetime('now')" : 'replied_at';
  db.prepare(`
    UPDATE outreach
    SET status = ?,
        sent_at = ${sentAt},
        replied_at = ${repliedAt},
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(status, notes, id);
}

function getOutreachStats(userId = 'default') {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) as replied
    FROM outreach
    WHERE user_id = ?
  `).get(userId);
  const sent = row.sent || 0;
  const replied = row.replied || 0;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
  return { total: row.total || 0, sent, replied, replyRate };
}

function getMetadata(key) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const row = db.prepare('SELECT value FROM metadata WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setMetadata(key, value) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(key, String(value));
}

module.exports = {
  initDB, isDuplicate, saveApplication, getAllApplications, getApplicationsDueFollowUp,
  updateApplicationStatus, updateDriveUrl, getStats,
  getProfileStatus, setProfileStatus, saveUploadedResume, markResumesProcessed,
  addToApprovalQueue, getApprovalQueue, updateApprovalStatus,
  addToApplyQueue, getApplyQueue, markApplied, setApplicationApplied, getApprovalStats,
  saveOutreach, getOutreach, updateOutreachStatus, getOutreachStats,
  getMetadata, setMetadata,
};
