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
    )
  `);
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function isDuplicate(url) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const hash = md5(url);
  const row = db.prepare('SELECT 1 FROM applications WHERE url_hash = ?').get(hash);
  return !!row;
}

function saveApplication(data) {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  const id = `J-${Date.now()}`;
  const urlHash = md5(data.job_url);

  db.prepare(`
    INSERT INTO applications
      (id, url_hash, company, role, job_url, fit_score, verdict, apply_recommendation, raw_score_json, drive_folder_url)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    data.drive_folder_url || null
  );
}

function getAllApplications() {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  return db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
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

function getStats() {
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
  `).get();
}

module.exports = { initDB, isDuplicate, saveApplication, getAllApplications, getApplicationsDueFollowUp, updateApplicationStatus, updateDriveUrl, getStats };
