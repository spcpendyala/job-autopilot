require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const { initDB, isDuplicate, saveApplication, getAllApplications, updateApplicationStatus, updateDriveUrl, getStats } = require('../services/db');

const CONFIG_PATH = path.join(__dirname, '..', 'core', 'config.json');
const DB_PATH = path.join(__dirname, '..', 'data', 'autopilot.db');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

let morningBriefCache = null;
let morningBriefCachedAt = null;
const { syncApplicationToDrive } = require('../services/drive');
const { fetchJobDescription } = require('../services/fetcher');
const { scoreJobFit } = require('../agents/fit-scorer');
const { scanATSGaps } = require('../agents/ats-scanner');
const { tailorResume } = require('../agents/resume-tailor');
const { generateCoverLetter } = require('../agents/cover-letter');
const { getCompanyBrief } = require('../agents/company-brief');
const { findOtherRoles } = require('../agents/other-roles');
const { generateInterviewBrief } = require('../agents/interview-prep');
const { researchSalary } = require('../agents/salary-researcher');
const { saveApplicationPackage, saveInterviewBrief, saveSalaryBrief } = require('../services/output-writer');
const { syncToSheets, updateSheetStatus } = require('../services/sheets');

const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs');

function sanitize(str) {
  return (str || 'Unknown').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
}

function findOutputsFolder(company, role) {
  const prefix = `${sanitize(company)}-${sanitize(role)}`;
  if (!fs.existsSync(OUTPUTS_DIR)) return null;
  const match = fs.readdirSync(OUTPUTS_DIR).find(f => f.startsWith(prefix));
  return match ? path.join(OUTPUTS_DIR, match) : null;
}

function readFile(filepath) {
  try { return fs.readFileSync(filepath, 'utf8'); } catch { return null; }
}

initDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.log(`[${req.method}] ${req.path} — ${Date.now() - start}ms`));
  next();
});

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/applications', (req, res) => {
  const apps = getAllApplications().map(a => ({
    ...a,
    scoreDetails: a.raw_score_json ? JSON.parse(a.raw_score_json) : null,
  }));
  res.json(apps);
});

app.get('/api/applications/:id', (req, res) => {
  const apps = getAllApplications();
  const found = apps.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Not found' });

  const application = {
    ...found,
    scoreDetails: found.raw_score_json ? JSON.parse(found.raw_score_json) : null,
  };

  const folder = findOutputsFolder(found.company, found.role);
  const files = {
    resume: folder ? readFile(path.join(folder, 'resume.md')) : null,
    coverLetter: folder ? readFile(path.join(folder, 'cover-letter.md')) : null,
    companyBrief: folder ? readFile(path.join(folder, 'company-brief.json')) : null,
    otherRoles: folder ? readFile(path.join(folder, 'other-roles.md')) : null,
    interviewPrep: folder ? readFile(path.join(folder, 'interview-prep.md')) : null,
    salaryBrief: folder ? readFile(path.join(folder, 'salary-brief.json')) : null,
  };

  res.json({ ...application, files });
});

app.get('/api/stats', (req, res) => {
  const stats = getStats();
  const apps = getAllApplications();
  const withScores = apps.filter(a => a.fit_score != null);
  const avgFitScore = withScores.length
    ? Math.round(withScores.reduce((s, a) => s + a.fit_score, 0) / withScores.length * 10) / 10
    : 0;
  const responseRate = stats.total > 0 ? `${Math.round((stats.responded / stats.total) * 100)}%` : '0%';
  res.json({ ...stats, avgFitScore, responseRate });
});

app.post('/api/analyze', async (req, res) => {
  let { jobUrl, jobDescription, jobTitle, company } = req.body;
  if (jobUrl && !jobDescription) {
    jobDescription = await fetchJobDescription(jobUrl);
  }
  if (!jobDescription) throw new Error('Provide jobUrl or jobDescription');

  const [fitScore, atsGaps] = await Promise.all([
    scoreJobFit(jobDescription, jobTitle, company),
    scanATSGaps(jobDescription),
  ]);
  res.json({ fitScore, atsGaps, jobDescription });
});

app.post('/api/apply', async (req, res) => {
  const { jobUrl, jobDescription, jobTitle, company, fitScore, atsGaps, generateDocs } = req.body;
  const url = jobUrl || `paste-${Date.now()}`;

  if (jobUrl && isDuplicate(jobUrl)) {
    return res.json({ duplicate: true });
  }

  let outputFolder = null;

  if (generateDocs) {
    const [resume, coverLetter, companyBrief, otherRoles] = await Promise.all([
      tailorResume(jobDescription, jobTitle, company, atsGaps),
      generateCoverLetter(jobDescription, jobTitle, company, fitScore.score),
      getCompanyBrief(company, jobDescription),
      findOtherRoles(company, jobUrl || ''),
    ]);

    outputFolder = saveApplicationPackage({
      company, role: jobTitle, jobUrl: url, jobDescription,
      fitScore, atsGaps, resume, coverLetter, companyBrief, otherRoles,
    });
  }

  saveApplication({
    job_url: url,
    company: company || null,
    role: jobTitle || null,
    fit_score: fitScore.score,
    verdict: fitScore.verdict,
    apply_recommendation: fitScore.applyRecommendation,
    raw_score_json: JSON.stringify(fitScore),
  });

  const saved = getAllApplications().find(a => a.job_url === url);
  if (saved) await syncToSheets(saved).catch(() => {});

  res.json({ success: true, applicationId: saved?.id, outputFolder, files: null });
});

app.patch('/api/applications/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  updateApplicationStatus(req.params.id, status);
  await updateSheetStatus(req.params.id, status, notes).catch(() => {});
  res.json({ success: true });
});

app.post('/api/prep/:id', async (req, res) => {
  const apps = getAllApplications();
  const found = apps.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Not found' });

  const folder = findOutputsFolder(found.company, found.role);
  if (!folder) return res.status(400).json({ error: 'No outputs folder found. Run with --full first.' });

  const jdRaw = readFile(path.join(folder, 'job-description.md'));
  if (!jdRaw) return res.status(400).json({ error: 'No job-description.md found.' });

  const briefRaw = readFile(path.join(folder, 'company-brief.json'));
  const companyBrief = briefRaw ? JSON.parse(briefRaw) : null;

  const brief = await generateInterviewBrief(jdRaw, found.company, found.role, companyBrief);
  saveInterviewBrief(folder, brief, found.role, found.company);
  updateApplicationStatus(found.id, 'interview-prep-ready');

  res.json({ success: true, briefPath: path.join(folder, 'interview-prep.md') });
});

app.post('/api/sync-drive/:id', async (req, res) => {
  const apps = getAllApplications();
  const found = apps.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Not found' });

  const folder = findOutputsFolder(found.company, found.role);
  if (!folder) return res.status(400).json({ error: 'No outputs folder found.' });

  const driveResult = await syncApplicationToDrive(folder, found.company, found.role);
  if (!driveResult) return res.json({ success: false, message: 'Drive sync skipped — check DRIVE_FOLDER_ID and authentication.' });

  updateDriveUrl(found.id, driveResult.folderUrl);
  await updateSheetStatus(found.id, found.status, null, driveResult.folderUrl).catch(() => {});

  res.json({ success: true, folderUrl: driveResult.folderUrl });
});

app.post('/api/salary', async (req, res) => {
  const { role, company, location, applicationId } = req.body;
  if (!role || !company) throw new Error('role and company are required');

  const salaryBrief = await researchSalary(role, company, location || null);

  if (applicationId) {
    const apps = getAllApplications();
    const found = apps.find(a => a.id === applicationId);
    if (found) {
      const folder = findOutputsFolder(found.company, found.role);
      if (folder) saveSalaryBrief(folder, salaryBrief, role, company);
    }
  }

  res.json(salaryBrief);
});

// --- Phase 10 endpoints ---

app.get('/api/setup-status', (req, res) => {
  const profileName = process.env.ACTIVE_PROFILE || 'sai';
  const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${profileName}.json`);
  const tokenPath = path.join(__dirname, '..', 'core', 'google-token.json');
  const config = readConfig();

  const checks = {
    profile: fs.existsSync(profilePath),
    anthropicKey: !!process.env.ANTHROPIC_API_KEY,
    googleConnected: fs.existsSync(tokenPath),
    driveConfigured: !!process.env.DRIVE_FOLDER_ID,
    rssFeeds: (config.rssFeeds || []).length > 0,
    watchedCompanies: (config.watchedCompanies || []).length > 0,
  };

  res.json({ complete: checks.profile && checks.anthropicKey, checks });
});

app.get('/api/morning-brief', (req, res) => {
  const force = req.query.refresh === 'true';
  const thirtyMin = 30 * 60 * 1000;

  if (!force && morningBriefCache && morningBriefCachedAt > Date.now() - thirtyMin) {
    return res.json(morningBriefCache);
  }

  const apps = getAllApplications();
  const stats = getStats();
  const config = readConfig();

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const newJobs = apps
    .filter(a => a.status === 'discovered' && a.created_at > oneDayAgo)
    .map(a => ({
      id: a.id, company: a.company, role: a.role, fitScore: a.fit_score,
      verdict: a.verdict, jobUrl: a.job_url,
      scoreDetails: a.raw_score_json ? JSON.parse(a.raw_score_json) : null,
    }));

  const followUpDays = config.followUpDays || 5;
  const cutoff = new Date(Date.now() - followUpDays * 24 * 60 * 60 * 1000).toISOString();
  const followUpsDue = apps
    .filter(a => a.status === 'applied' && a.applied_at && a.applied_at <= cutoff)
    .map(a => ({
      id: a.id, company: a.company, role: a.role, appliedAt: a.applied_at,
      daysSinceApplied: Math.floor((Date.now() - new Date(a.applied_at).getTime()) / 86400000),
    }));

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const newResponses = apps
    .filter(a => ['responded', 'interview', 'rejected', 'offer'].includes(a.status) && a.created_at > twoDaysAgo)
    .map(a => ({ id: a.id, company: a.company, role: a.role, status: a.status }));

  const total = stats.total || 0;
  const responseRate = total > 0 ? Math.round(((stats.responded || 0) / total) * 100) : 0;

  morningBriefCache = {
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    newJobs, followUpsDue, newResponses,
    stats: { total, applied: stats.applied || 0, responded: stats.responded || 0, interviews: stats.interviews || 0, rejections: stats.rejections || 0, responseRate },
  };
  morningBriefCachedAt = Date.now();
  res.json(morningBriefCache);
});

app.get('/api/profile', (req, res) => {
  const profileName = process.env.ACTIVE_PROFILE || 'sai';
  const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${profileName}.json`);
  if (!fs.existsSync(profilePath)) return res.json({});
  res.json(JSON.parse(fs.readFileSync(profilePath, 'utf8')));
});

app.post('/api/profile', (req, res) => {
  const profileName = process.env.ACTIVE_PROFILE || 'sai';
  const profilePath = path.join(__dirname, '..', 'core', 'profiles', `${profileName}.json`);
  const current = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
  fs.writeFileSync(profilePath, JSON.stringify({ ...current, ...req.body }, null, 2));
  res.json({ success: true });
});

app.get('/api/config', (req, res) => {
  res.json(readConfig());
});

app.post('/api/config', (req, res) => {
  const updated = { ...readConfig(), ...req.body };
  delete updated.morningBriefCache;
  writeConfig(updated);
  res.json({ success: true });
});

app.post('/api/discover', (req, res) => {
  const apps = getAllApplications();
  const discovered = apps
    .filter(a => a.status === 'discovered')
    .map(a => ({ id: a.id, title: a.role, url: a.job_url, company: a.company, fitScore: a.fit_score }));
  res.json({ discovered });
});

app.post('/api/applications/:id/mark-applied', (req, res) => {
  const apps = getAllApplications();
  const found = apps.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  updateApplicationStatus(req.params.id, 'applied');
  res.json({ success: true });
});

app.delete('/api/applications/:id', (req, res) => {
  const tmpDb = new Database(DB_PATH);
  try {
    tmpDb.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } finally {
    tmpDb.close();
  }
});

// Global error handler — never sends HTML
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 JobPilot API running on port ${PORT}`));
