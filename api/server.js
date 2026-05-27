require('dotenv').config();

// Set dummy credentials before any module-level requires that validate them
if (process.env.TEST_MODE === 'true') {
  if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'test-placeholder-key';
  if (!process.env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  if (!process.env.GOOGLE_CLIENT_SECRET) process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
}

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const passport = require('../services/auth');

const {
  initDB, isDuplicate, saveApplication, getAllApplications, updateApplicationStatus, updateDriveUrl, getStats,
  getProfileStatus, setProfileStatus, saveUploadedResume, markResumesProcessed,
  addToApprovalQueue, getApprovalQueue, updateApprovalStatus,
  addToApplyQueue, getApplyQueue, markApplied, setApplicationApplied, getApprovalStats,
  saveOutreach, getOutreach, updateOutreachStatus, getOutreachStats,
  logPreferenceSignal, getPreferenceSignals, saveApplicationVersion,
} = require('../services/db');

const CONFIG_PATH = path.join(__dirname, '..', 'core', 'config.json');
const DB_PATH = process.env.TEST_DB_PATH
  ? path.resolve(process.env.TEST_DB_PATH)
  : path.join(__dirname, '..', 'data', 'autopilot.db');
const DATA_DIR = path.join(__dirname, '..', 'data');
const ADMIN_ID = process.env.ADMIN_USER_ID || '';

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function getUserDir(userId) {
  return path.join(__dirname, '..', 'data', 'users', userId)
}
function getProfilePath(userId) {
  return path.join(getUserDir(userId), 'profile.json')
}
function getResumePath(userId) {
  return path.join(getUserDir(userId), 'base-resume.md')
}
function getOutputsDir(userId) {
  return path.join(getUserDir(userId), 'outputs')
}
function ensureUserDir(userId) {
  const dirs = [getUserDir(userId), path.join(getUserDir(userId), 'resumes'), getOutputsDir(userId)]
  dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })
}

// Per-user morning brief cache
const morningBriefCacheStore = {};

const multer = require('multer');
const { parseResume } = require('../services/resume-parser');
const { synthesizeProfile } = require('../agents/profile-synthesizer');
const { findRecruiter } = require('../agents/recruiter-finder');
const { draftOutreach } = require('../agents/outreach-drafter');
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
const { analyzeApplicationPatterns } = require('../agents/rejection-analyzer');
const { saveApplicationPackage, saveInterviewBrief, saveSalaryBrief } = require('../services/output-writer');
const { syncToSheets, updateSheetStatus } = require('../services/sheets');

function sanitize(str) {
  return (str || 'Unknown').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
}

function findOutputsFolder(company, role, userId) {
  const prefix = `${sanitize(company)}-${sanitize(role)}`;
  const dir = getOutputsDir(userId);
  if (!fs.existsSync(dir)) return null;
  const match = fs.readdirSync(dir).find(f => f.startsWith(prefix));
  return match ? path.join(dir, match) : null;
}

function readFile(filepath) {
  try { return fs.readFileSync(filepath, 'utf8'); } catch { return null; }
}

initDB();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', 'resumes', req.userId || 'default')
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    cb(null, allowed.includes(file.mimetype) || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.docx') || file.originalname.endsWith('.txt'))
  }
});

const app = express();

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Ensure data dir exists for session store
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET || 'job-autopilot-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
}));
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.log(`[${req.method}] ${req.path} — ${Date.now() - start}ms`));
  next();
});

// Auth middleware — attaches userId to req
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.userId = req.user.id;
    return next();
  }
  // Single-user mode: no auth required
  if (process.env.MULTI_USER !== 'true') {
    req.userId = 'default';
    return next();
  }
  res.status(401).json({ error: 'Not authenticated', loginUrl: '/auth/google' });
};

// --- Auth routes (no requireAuth needed) ---

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Gmail linkup — requests Gmail read scope + offline access (gives us a refresh token)
app.get('/auth/google/gmail', passport.authenticate('google', {
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
  accessType: 'offline',
  prompt: 'consent',
}));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
  (req, res) => res.redirect('/?auth=success')
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/auth/me', requireAuth, (req, res) => {
  const adminId = process.env.ADMIN_USER_ID;
  res.json({
    user: req.user,
    userId: req.userId,
    isAdmin: !!(adminId && adminId.length > 0 && req.userId === adminId),
  });
});

// --- Test helpers (TEST_MODE only — must be before requireAuth) ---
if (process.env.TEST_MODE === 'true') {
  app.post('/api/test-helpers/session', (req, res) => {
    const userId = (req.body && req.body.userId) || 'test-user-001';
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: err.message });
      req.session.passport = { user: userId };
      req.session.save((err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ok: true, userId });
      });
    });
  });

  app.post('/api/test-helpers/session/admin', (req, res) => {
    const adminId = process.env.ADMIN_USER_ID || 'test-admin';
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: err.message });
      req.session.passport = { user: adminId };
      req.session.save((err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ok: true, userId: adminId, isAdmin: true });
      });
    });
  });
}

// --- All /api/* routes require auth ---
app.use('/api', requireAuth);

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/applications', (req, res) => {
  const { status, limit, followupDue } = req.query;
  let apps = getAllApplications(req.userId).map(a => ({
    ...a,
    scoreDetails: a.raw_score_json ? JSON.parse(a.raw_score_json) : null,
  }));
  if (status) {
    const statuses = status.split(',');
    apps = apps.filter(a => statuses.includes(a.status));
  }
  if (followupDue === 'true') {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    apps = apps.filter(a =>
      a.applied_at && a.applied_at < fiveDaysAgo && a.status === 'applied'
    );
  }
  if (limit) apps = apps.slice(0, parseInt(limit) || 20);
  res.json(apps);
});

app.get('/api/applications/:id', (req, res) => {
  const apps = getAllApplications(req.userId);
  const found = apps.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Not found' });

  const application = {
    ...found,
    scoreDetails: found.raw_score_json ? JSON.parse(found.raw_score_json) : null,
  };

  const folder = findOutputsFolder(found.company, found.role, req.userId);
  const files = {
    resume: folder ? readFile(path.join(folder, 'resume.md')) : null,
    coverLetter: folder ? readFile(path.join(folder, 'cover-letter.md')) : null,
    companyBrief: folder ? readFile(path.join(folder, 'company-brief.json')) : null,
    otherRoles: folder ? readFile(path.join(folder, 'other-roles.md')) : null,
    interviewPrep: folder ? readFile(path.join(folder, 'interview-prep.md')) : null,
    salaryBrief: folder ? readFile(path.join(folder, 'salary-brief.md')) : null,
  };

  res.json({ ...application, files });
});

app.get('/api/stats', (req, res) => {
  const stats = getStats(req.userId);
  const apps = getAllApplications(req.userId);
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

  if (jobUrl && isDuplicate(jobUrl, req.userId)) {
    return res.json({ duplicate: true });
  }

  let outputFolder = null;

  if (generateDocs) {
    const [resume, coverLetter, companyBrief, otherRoles] = await Promise.all([
      tailorResume(jobDescription, jobTitle, company, atsGaps, req.userId),
      generateCoverLetter(jobDescription, jobTitle, company, fitScore.score, req.userId),
      getCompanyBrief(company, jobDescription),
      findOtherRoles(company, jobUrl || ''),
    ]);

    outputFolder = saveApplicationPackage(req.userId, {
      company, role: jobTitle, jobUrl: url, jobDescription,
      fitScore, atsGaps, resume, coverLetter, companyBrief, otherRoles,
    });
  }

  const appId = saveApplication({
    job_url: url,
    company: company || null,
    role: jobTitle || null,
    fit_score: fitScore.score,
    verdict: fitScore.verdict,
    apply_recommendation: fitScore.applyRecommendation,
    raw_score_json: JSON.stringify(fitScore),
  }, req.userId);

  const saved = getAllApplications(req.userId).find(a => a.id === appId);
  if (saved) await syncToSheets(saved).catch(() => {});

  res.json({ success: true, applicationId: appId, outputFolder, files: null });
});

app.patch('/api/applications/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  updateApplicationStatus(req.params.id, status);
  await updateSheetStatus(req.params.id, status, notes).catch(() => {});
  res.json({ success: true });
});

app.post('/api/prep/:id', async (req, res) => {
  const apps = getAllApplications(req.userId);
  const found = apps.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Not found' });

  const folder = findOutputsFolder(found.company, found.role, req.userId);
  if (!folder) return res.status(400).json({ error: 'No outputs folder found. Run with --full first.' });

  const jdRaw = readFile(path.join(folder, 'job-description.md'));
  if (!jdRaw) return res.status(400).json({ error: 'No job-description.md found.' });

  const briefRaw = readFile(path.join(folder, 'company-brief.json'));
  const companyBrief = briefRaw ? JSON.parse(briefRaw) : null;

  const brief = await generateInterviewBrief(jdRaw, found.company, found.role, companyBrief);
  saveInterviewBrief(req.userId, folder, brief, found.role, found.company);
  updateApplicationStatus(found.id, 'interview-prep-ready');

  res.json({ success: true, briefPath: path.join(folder, 'interview-prep.md') });
});

app.post('/api/sync-drive/:id', async (req, res) => {
  const apps = getAllApplications(req.userId);
  const found = apps.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Not found' });

  const folder = findOutputsFolder(found.company, found.role, req.userId);
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
    const apps = getAllApplications(req.userId);
    const found = apps.find(a => a.id === applicationId);
    if (found) {
      const folder = findOutputsFolder(found.company, found.role, req.userId);
      if (folder) saveSalaryBrief(req.userId, folder, salaryBrief, role, company);
    }
  }

  res.json(salaryBrief);
});

// --- Phase 10 endpoints ---

app.get('/api/setup-status', (req, res) => {
  try {
    let profileApproved = false;
    let profileExists = false;
    try {
      const status = getProfileStatus(req.userId);
      profileApproved = status?.approved === 'true' || status?.approved === true;
    } catch {}
    try {
      profileExists = fs.existsSync(getProfilePath(req.userId));
    } catch {}
    res.json({
      profileApproved,
      profileExists,
      userId: req.userId,
      checks: {
        apiKey: !!process.env.ANTHROPIC_API_KEY,
        google: !!process.env.GOOGLE_CLIENT_ID,
      },
    });
  } catch (e) {
    res.json({ profileApproved: false, profileExists: false, checks: {} });
  }
});

app.get('/api/morning-brief', (req, res) => {
  const userId = req.userId;
  const force = req.query.refresh === 'true';
  const thirtyMin = 30 * 60 * 1000;
  const cached = morningBriefCacheStore[userId];

  if (!force && cached && cached.cachedAt > Date.now() - thirtyMin) {
    return res.json(cached.data);
  }

  const apps = getAllApplications(userId);
  const stats = getStats(userId);
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

  const outreachStats = getOutreachStats(userId);
  const outreachDue = getOutreach('sent', userId).filter(o => {
    const days = Math.floor((Date.now() - new Date(o.sent_at)) / 86400000);
    return days >= 7;
  });

  const briefData = {
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    newJobs, followUpsDue, newResponses,
    stats: { total, applied: stats.applied || 0, responded: stats.responded || 0, interviews: stats.interviews || 0, rejections: stats.rejections || 0, responseRate },
    outreachStats,
    outreachDue,
  };

  morningBriefCacheStore[userId] = { data: briefData, cachedAt: Date.now() };
  res.json(briefData);
});

function computeCompleteness(p) {
  const checks = [
    { field: 'name', weight: 10, check: () => !!p.name },
    { field: 'email', weight: 8, check: () => !!p.email },
    { field: 'phone', weight: 5, check: () => !!p.phone },
    { field: 'location', weight: 5, check: () => !!p.location },
    { field: 'summary', weight: 12, check: () => !!p.summary && p.summary.length > 50 },
    { field: 'coreSkills', weight: 10, check: () => Array.isArray(p.coreSkills) && p.coreSkills.length >= 3 },
    { field: 'targetRoles', weight: 8, check: () => Array.isArray(p.targetRoles) && p.targetRoles.length >= 1 },
    { field: 'experience', weight: 15, check: () => Array.isArray(p.experience) && p.experience.length >= 1 },
    { field: 'education', weight: 8, check: () => Array.isArray(p.education) && p.education.length >= 1 },
    { field: 'certifications', weight: 5, check: () => Array.isArray(p.certifications) && p.certifications.length >= 1 },
    { field: 'achievements', weight: 7, check: () => Array.isArray(p.achievements) && p.achievements.length >= 1 },
    { field: 'projects', weight: 7, check: () => Array.isArray(p.projects) && p.projects.length >= 1 },
  ];
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter(c => c.check()).reduce((s, c) => s + c.weight, 0);
  return Math.round((earned / total) * 100);
}

app.get('/api/profile', (req, res) => {
  const profilePath = getProfilePath(req.userId);
  if (!fs.existsSync(profilePath)) return res.json({ completeness: 0 });
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  profile.completeness = computeCompleteness(profile);
  res.json(profile);
});

app.post('/api/profile', (req, res) => {
  ensureUserDir(req.userId);
  const profilePath = getProfilePath(req.userId);
  const current = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
  fs.writeFileSync(profilePath, JSON.stringify({ ...current, ...req.body }, null, 2));
  res.json({ success: true });
});

app.get('/api/profile/resume', (req, res) => {
  const p = getResumePath(req.userId)
  if (!fs.existsSync(p)) return res.json({ content: '' })
  res.json({ content: fs.readFileSync(p, 'utf8') })
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
  const apps = getAllApplications(req.userId);
  const discovered = apps
    .filter(a => a.status === 'discovered')
    .map(a => ({ id: a.id, title: a.role, url: a.job_url, company: a.company, fitScore: a.fit_score }));
  res.json({ discovered });
});

app.post('/api/signals', (req, res) => {
  try {
    logPreferenceSignal(req.body, req.userId);
    res.json({ success: true });
  } catch { res.json({ success: false }); }
});

// Alias used by the new Home page
app.post('/api/preference/signal', (req, res) => {
  try {
    logPreferenceSignal(req.body, req.userId);
    res.json({ success: true });
  } catch { res.json({ success: false }); }
});

// Trigger tailoring for a single discovered application
app.post('/api/applications/:id/tailor', async (req, res) => {
  const apps = getAllApplications(req.userId);
  const app_ = apps.find(a => a.id === req.params.id);
  if (!app_) return res.status(404).json({ error: 'Not found' });

  updateApplicationStatus(req.params.id, 'tailoring');
  res.json({ started: true });

  // Run tailoring in background
  ;(async () => {
    try {
      let jd = app_.job_description;
      if (!jd && app_.job_url) jd = await fetchJobDescription(app_.job_url);
      if (!jd) return;

      const { scanATSGaps } = require('../agents/ats-scanner');
      const [atsResult, resume, coverLetter] = await Promise.all([
        scanATSGaps(jd).catch(() => null),
        tailorResume(jd, app_.role, app_.company || '', null, req.userId),
        generateCoverLetter(jd, app_.role, app_.company || '', app_.fit_score, req.userId),
      ]);

      addToApprovalQueue({
        id: `AQ-${Date.now()}`,
        application_id: app_.id,
        company: app_.company,
        role: app_.role,
        job_url: app_.job_url,
        fit_score: app_.fit_score,
        verdict: app_.verdict,
        job_description: jd,
        raw_score_json: app_.raw_score_json,
        ats_gaps: atsResult ? JSON.stringify(atsResult) : null,
        tailored_resume: resume,
        cover_letter: coverLetter,
        status: 'pending',
      }, req.userId);

      updateApplicationStatus(req.params.id, 'ready');
    } catch (e) {
      console.error('[tailor] failed for', req.params.id, e.message);
      updateApplicationStatus(req.params.id, 'discovered');
    }
  })();
});

app.post('/api/applications/:id/mark-applied', (req, res) => {
  const apps = getAllApplications(req.userId);
  const found = apps.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  setApplicationApplied(req.params.id);
  res.json({ success: true });
});

app.delete('/api/applications/:id', (req, res) => {
  const tmpDb = new Database(DB_PATH);
  try {
    tmpDb.prepare('DELETE FROM applications WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } finally {
    tmpDb.close();
  }
});

// CSV export
app.get('/api/applications/export-csv', (req, res) => {
  const apps = getAllApplications(req.userId)
  const headers = ['ID','Company','Role','Score','Verdict','Status','Applied At','Job URL','Notes']
  const rows = apps.map(a => [a.id,a.company||'',a.role||'',a.fit_score||'',a.verdict||'',a.status||'',a.applied_at||'',a.job_url||'',a.notes||''])
  const csv = [headers,...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  res.setHeader('Content-Type','text/csv')
  res.setHeader('Content-Disposition',`attachment; filename="applications-${Date.now()}.csv"`)
  res.send(csv)
});

// Admin config endpoints
app.get('/api/admin/config', (req, res) => {
  const isAdmin = !process.env.ADMIN_USER_ID || req.userId === process.env.ADMIN_USER_ID || req.userId === 'default'
  if (!isAdmin) return res.status(403).json({ error: 'Admin only' })
  const cfg = readConfig()
  res.json({ ...cfg, betaMode: process.env.BETA_MODE === 'true', isAdmin: true })
});

app.post('/api/admin/config', (req, res) => {
  const isAdmin = !process.env.ADMIN_USER_ID || req.userId === process.env.ADMIN_USER_ID || req.userId === 'default'
  if (!isAdmin) return res.status(403).json({ error: 'Admin only' })
  const updated = { ...readConfig(), ...req.body }
  writeConfig(updated)
  if (req.body.betaMode !== undefined) process.env.BETA_MODE = String(req.body.betaMode)
  res.json({ success: true, config: updated })
});

// --- Phase 15 endpoints ---

app.post('/api/outreach/find', async (req, res) => {
  const { company, role } = req.body;
  if (!company || !role) return res.status(400).json({ error: 'company and role required' });
  const recruiterInfo = await findRecruiter(company, role);
  res.json(recruiterInfo);
});

app.post('/api/outreach/draft', async (req, res) => {
  const { company, role, recruiterInfo, jobDescription, applicationId } = req.body;
  if (!company || !role) return res.status(400).json({ error: 'company and role required' });

  const draft = await draftOutreach(company, role, recruiterInfo || {}, jobDescription || '');
  const id = `OR-${Date.now()}`;

  saveOutreach({
    id,
    company,
    role,
    contact_name: recruiterInfo?.name || null,
    contact_title: recruiterInfo?.title || null,
    contact_email: recruiterInfo?.email || null,
    contact_linkedin: recruiterInfo?.linkedin || null,
    draft_message: draft.body,
    application_id: applicationId || null,
  }, req.userId);

  res.json({ success: true, outreachId: id, subject: draft.subject, body: draft.body, recruiterInfo: recruiterInfo || {} });
});

app.get('/api/outreach', (req, res) => {
  const items = getOutreach(null, req.userId);
  const stats = getOutreachStats(req.userId);
  res.json({ items, stats });
});

app.get('/api/outreach/stats', (req, res) => {
  const stats = getOutreachStats(req.userId);
  const draftsPending = getOutreach('draft', req.userId).length;
  res.json({ ...stats, draftsPending });
});

app.post('/api/outreach/:id/mark-sent', (req, res) => {
  updateOutreachStatus(req.params.id, 'sent');
  res.json({ success: true });
});

app.post('/api/outreach/:id/mark-replied', (req, res) => {
  updateOutreachStatus(req.params.id, 'replied');
  res.json({ success: true });
});

// --- Phase 13 endpoints ---

app.get('/api/approval-queue', (req, res) => {
  res.json(getApprovalQueue('pending', req.userId));
});

app.get('/api/approval-queue/stats', (req, res) => {
  const stats = getApprovalStats(req.userId);
  res.json({ ...stats, total: (stats.pending || 0) + (stats.approved || 0) + (stats.skipped || 0) });
});

app.post('/api/approval-queue/:id/approve', (req, res) => {
  const { resume, coverLetter } = req.body;
  const userId = req.userId;
  const allItems = [
    ...getApprovalQueue('pending', userId),
    ...getApprovalQueue('approved', userId),
    ...getApprovalQueue('skipped', userId),
  ];
  const item = allItems.find(i => i.id === req.params.id);

  if (!item) return res.status(404).json({ error: 'Not found' });

  updateApprovalStatus(req.params.id, 'approved', resume || null, coverLetter || null);

  addToApplyQueue({
    id: `AP-${Date.now()}`,
    approval_id: req.params.id,
    application_id: item.application_id,
    company: item.company,
    role: item.role,
    job_url: item.job_url,
    fit_score: item.fit_score,
    tailored_resume: resume || item.tailored_resume,
    cover_letter: coverLetter || item.cover_letter,
  }, userId);

  if (item.application_id) updateApplicationStatus(item.application_id, 'approved');

  res.json({ success: true });
});

app.post('/api/approval-queue/:id/skip', (req, res) => {
  updateApprovalStatus(req.params.id, 'skipped');
  res.json({ success: true });
});

app.get('/api/apply-queue', (req, res) => {
  res.json(getApplyQueue('ready', req.userId));
});

app.post('/api/apply-queue/:id/mark-applied', async (req, res) => {
  const items = getApplyQueue('ready', req.userId);
  const item = items.find(i => i.id === req.params.id);

  markApplied(req.params.id);

  if (item && item.application_id) {
    setApplicationApplied(item.application_id);
    const apps = getAllApplications(req.userId);
    const found = apps.find(a => a.id === item.application_id);
    if (found) await updateSheetStatus(found.id, 'applied', null).catch(() => {});
  }

  res.json({ success: true });
});

// --- Phase 12 endpoints ---

app.post('/api/profile/upload', upload.array('resumes', 6), async (req, res) => {
  const userId = req.userId;
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
  if (files.length > 6) return res.status(400).json({ error: 'Maximum 6 resumes allowed' });

  ensureUserDir(userId);

  for (const file of files) {
    saveUploadedResume(`R-${Date.now()}-${file.originalname}`, file.originalname, userId);
  }

  const texts = await Promise.all(files.map(f => parseResume(f.path, f.mimetype)));
  const result = await synthesizeProfile(texts, userId);

  markResumesProcessed(userId);
  setProfileStatus('pending_review', 'true', userId);
  setProfileStatus('approved', 'false', userId);

  res.json({ success: true, profile: result.profile, baseResume: result.baseResume, synthesisNotes: result.synthesisNotes });
});

app.get('/api/profile/status', (req, res) => {
  const status = getProfileStatus(req.userId);
  res.json({ approved: status.approved === 'true', pendingReview: status.pending_review === 'true' });
});

app.post('/api/profile/approve', (req, res) => {
  const userId = req.userId;
  const { profile, baseResume } = req.body;

  ensureUserDir(userId);
  const profilePath = getProfilePath(userId);
  const resumePath = getResumePath(userId);

  if (profile) fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  if (baseResume) fs.writeFileSync(resumePath, baseResume);

  setProfileStatus('approved', 'true', userId);
  setProfileStatus('pending_review', 'false', userId);

  res.json({ success: true });
});

app.post('/api/profile/reject', (req, res) => {
  setProfileStatus('pending_review', 'false', req.userId);
  setProfileStatus('approved', 'false', req.userId);
  res.json({ success: true });
});

// --- Phase 17: Admin endpoints ---

app.get('/api/admin/users', (req, res) => {
  const isAdmin = !process.env.ADMIN_USER_ID || req.userId === process.env.ADMIN_USER_ID || req.userId === 'default';
  if (process.env.MULTI_USER === 'true' && !isAdmin) {
    return res.status(403).json({ error: 'Admin only' });
  }
  const usersDir = path.join(__dirname, '..', 'data', 'users');
  if (!fs.existsSync(usersDir)) return res.json({ users: [] });

  const users = fs.readdirSync(usersDir)
    .filter(id => fs.statSync(path.join(usersDir, id)).isDirectory())
    .map(id => {
      try {
        const profilePath = path.join(usersDir, id, 'profile.json');
        const profile = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
        const stats = getStats(id);
        const profileStatus = getProfileStatus(id);
        return {
          id,
          name: profile.name || id,
          email: profile.email || '',
          profileApproved: profileStatus.approved === 'true',
          stats,
        };
      } catch { return { id, error: 'Could not read profile' }; }
    });

  res.json({ users });
});

// --- Phase 8 endpoint ---

app.get('/api/analyze-patterns', async (req, res) => {
  const result = await analyzeApplicationPatterns(req.userId);
  res.json(result);
});

// --- Freelance endpoints (Phase 13) ---

app.get('/api/freelance/gigs', requireAuth, (req, res) => {
  try {
    const { status, platform, limit } = req.query
    let gigs = db.getFreelanceGigs ? db.getFreelanceGigs(req.userId) : []
    if (status) gigs = gigs.filter(g => g.status === status)
    if (platform) gigs = gigs.filter(g => g.platform?.toLowerCase() === platform.toLowerCase())
    if (limit) gigs = gigs.slice(0, parseInt(limit) || 20)
    res.json(gigs)
  } catch (e) { res.json([]) }
})

app.get('/api/freelance/proposals', requireAuth, (req, res) => {
  try {
    const proposals = db.getFreelanceProposals ? db.getFreelanceProposals(req.userId) : []
    res.json(proposals)
  } catch (e) { res.json([]) }
})

app.get('/api/freelance/stats', requireAuth, (req, res) => {
  try {
    const proposals = db.getFreelanceProposals ? db.getFreelanceProposals(req.userId) : []
    const won = proposals.filter(p => p.status === 'won').length
    const total = proposals.filter(p => p.status !== 'draft').length
    const rate = total > 0 ? Math.round((won / total) * 100) : 0
    res.json({ total, won, rate, pending: proposals.filter(p => p.status === 'pending').length })
  } catch (e) { res.json({ total: 0, won: 0, rate: 0, pending: 0 }) }
})

app.post('/api/freelance/gigs/:id/skip', requireAuth, (req, res) => {
  try {
    if (db.updateFreelanceGig) db.updateFreelanceGig(req.userId, req.params.id, { status: 'skipped' })
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false }) }
})

app.post('/api/freelance/gigs/:id/propose', requireAuth, async (req, res) => {
  try {
    const gig = db.getFreelanceGig ? db.getFreelanceGig(req.userId, req.params.id) : null
    const profile = getProfile(req.userId)
    if (!gig && !profile) return res.json({ proposal: 'Unable to generate proposal — gig not found.' })
    const gigTitle = gig?.title || 'this project'
    const gigDesc = gig?.description || ''
    const bio = profile?.freelanceBio || profile?.summary || ''
    const rate = req.body?.hourlyRate || profile?.hourlyRate || ''
    const prompt = `Write a concise Upwork-style freelance proposal (under 300 words) for this gig:\n\nGig: ${gigTitle}\nDescription: ${gigDesc}\n\nMy background: ${bio}\nMy rate: ${rate ? '$' + rate + '/hr' : 'negotiable'}\n\nWrite a professional, direct proposal focused on solving the client's problem.`
    const { callClaude } = require('../services/claude')
    const text = await callClaude(prompt, { maxTokens: 600, model: 'haiku' })
    if (db.addFreelanceProposal) {
      db.addFreelanceProposal(req.userId, { gig_id: req.params.id, proposal_text: text, status: 'draft', platform: gig?.platform || 'upwork' })
    }
    res.json({ proposal: text })
  } catch (e) {
    console.error('[freelance] propose error:', e.message)
    res.json({ proposal: 'Unable to generate proposal at this time. Please try again.' })
  }
})

app.post('/api/freelance/proposals/:id/mark-sent', requireAuth, (req, res) => {
  try {
    if (db.updateFreelanceProposal) db.updateFreelanceProposal(req.userId, req.params.id, { status: 'pending', ...req.body })
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false }) }
})

app.patch('/api/freelance/proposals/:id/status', requireAuth, (req, res) => {
  try {
    if (db.updateFreelanceProposal) db.updateFreelanceProposal(req.userId, req.params.id, { status: req.body.status })
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false }) }
})

// --- Inbox endpoints (Phase 14) ---

app.get('/api/inbox/messages', requireAuth, (req, res) => {
  try {
    const { type, limit, unread } = req.query
    let msgs = db.getInboxMessages ? db.getInboxMessages(req.userId) : []
    if (type) msgs = msgs.filter(m => m.type === type)
    if (unread === 'true') msgs = msgs.filter(m => !m.actioned)
    if (limit) msgs = msgs.slice(0, parseInt(limit) || 50)
    res.json(msgs)
  } catch (e) { res.json([]) }
})

app.get('/api/inbox/unread-count', requireAuth, (req, res) => {
  try {
    const msgs = db.getInboxMessages ? db.getInboxMessages(req.userId) : []
    const count = msgs.filter(m => !m.actioned && m.type !== 'unknown').length
    res.json({ count })
  } catch (e) { res.json({ count: 0 }) }
})

app.post('/api/inbox/sync', requireAuth, async (req, res) => {
  try {
    res.json({ started: true, message: 'Sync started — refresh in ~30 seconds' })
  } catch (e) { res.json({ started: false, error: e.message }) }
})

app.post('/api/inbox/:id/action', requireAuth, (req, res) => {
  try {
    const { action } = req.body
    if (db.updateInboxMessage) db.updateInboxMessage(req.userId, req.params.id, { actioned: true, action })
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false }) }
})

app.get('/api/inbox/gmail-status', requireAuth, (req, res) => {
  try {
    const tokenPath = path.join(__dirname, '..', 'data', 'users', req.userId, 'gmail-token.json')
    const connected = fs.existsSync(tokenPath)
    let gmailEmail = null
    if (connected) {
      try { gmailEmail = JSON.parse(fs.readFileSync(tokenPath, 'utf8')).email } catch {}
    }
    const lastSync = db.getLastInboxSync?.(req.userId) || null
    res.json({ connected, lastSync, gmailEmail })
  } catch (e) { res.json({ connected: false, lastSync: null }) }
})

// --- Notification endpoints (Phase 15) ---

app.get('/api/notifications', requireAuth, (req, res) => {
  try {
    const notifs = db.getNotifications ? db.getNotifications(req.userId) : []
    res.json(notifs)
  } catch (e) { res.json([]) }
})

app.post('/api/notifications/:id/read', requireAuth, (req, res) => {
  try {
    if (db.markNotificationRead) db.markNotificationRead(req.userId, req.params.id)
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false }) }
})

app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  try {
    if (db.markAllNotificationsRead) db.markAllNotificationsRead(req.userId)
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false }) }
})

// --- Market Intelligence endpoint (Phase 15) ---

app.get('/api/market-intelligence', requireAuth, (req, res) => {
  try {
    const data = db.getMarketIntelligence ? db.getMarketIntelligence(req.userId) : null
    res.json(data || { trendingSkills: [], salaryRange: null, demandSignal: null, topCompanies: [], lastUpdated: null })
  } catch (e) { res.json({ trendingSkills: [], salaryRange: null, demandSignal: null, topCompanies: [], lastUpdated: null }) }
})

// --- Gap fill endpoints ---

// Regenerate cover letter for an approval queue item
app.post('/api/approval-queue/:id/regenerate-cover', requireAuth, async (req, res) => {
  try {
    const allItems = [
      ...getApprovalQueue('pending', req.userId),
      ...getApprovalQueue('approved', req.userId),
    ]
    const item = allItems.find(i => i.id === req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    const jd = item.job_description || ''
    const newCoverLetter = await generateCoverLetter(jd, item.role, item.company || '', item.fit_score, req.userId)
    res.json({ coverLetter: newCoverLetter })
  } catch (e) {
    console.error('[regenerate-cover] error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Interview prep by application ID (alias for /api/prep/:id)
app.post('/api/applications/:id/interview-prep', requireAuth, async (req, res) => {
  const apps = getAllApplications(req.userId)
  const found = apps.find(a => a.id === req.params.id)
  if (!found) return res.status(404).json({ error: 'Not found' })

  try {
    const folder = findOutputsFolder(found.company, found.role, req.userId)
    const jdRaw = folder ? readFile(path.join(folder, 'job-description.md')) : (found.job_description || null)
    if (!jdRaw) return res.status(400).json({ error: 'No job description found. Run full package first.' })

    const briefRaw = folder ? readFile(path.join(folder, 'company-brief.json')) : null
    const companyBrief = briefRaw ? JSON.parse(briefRaw) : null

    const brief = await generateInterviewBrief(jdRaw, found.company, found.role, companyBrief)
    if (folder) saveInterviewBrief(req.userId, folder, brief, found.role, found.company)
    updateApplicationStatus(found.id, 'interview-prep-ready')
    res.json({ success: true, brief })
  } catch (e) {
    console.error('[interview-prep] error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Salary research by application ID
app.post('/api/applications/:id/salary', requireAuth, async (req, res) => {
  const apps = getAllApplications(req.userId)
  const found = apps.find(a => a.id === req.params.id)
  if (!found) return res.status(404).json({ error: 'Not found' })

  try {
    const salaryBrief = await researchSalary(found.role, found.company, null)
    const folder = findOutputsFolder(found.company, found.role, req.userId)
    if (folder) saveSalaryBrief(req.userId, folder, salaryBrief, found.role, found.company)
    res.json(salaryBrief)
  } catch (e) {
    console.error('[salary] error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Skills gap analysis
app.get('/api/skills-gap', requireAuth, (req, res) => {
  try {
    const tmpDb = new Database(DB_PATH)
    const rows = tmpDb.prepare(`
      SELECT skill, frequency, last_seen
      FROM skills_gap
      WHERE user_id = ?
      ORDER BY frequency DESC
      LIMIT 15
    `).all(req.userId)
    tmpDb.close()
    res.json({ skills: rows || [], analyzed: rows.length > 0 })
  } catch {
    res.json({ skills: [], analyzed: false })
  }
})

// Last discovery status
app.get('/api/discover/status', requireAuth, (req, res) => {
  try {
    const cfg = readConfig()
    const lastRun = cfg.lastMorningBriefAt || cfg.lastDiscoveryAt || null
    const tmpDb = new Database(DB_PATH)
    let dbLastRun = null
    try {
      const row = tmpDb.prepare("SELECT value FROM metadata WHERE key = ?").get(`last_discovery_${req.userId}`)
      dbLastRun = row?.value || null
    } catch {} finally { tmpDb.close() }
    res.json({ lastRun: dbLastRun || lastRun, running: false })
  } catch {
    res.json({ lastRun: null, running: false })
  }
})

// Admin: run discovery for all users
app.post('/api/admin/run-discovery', requireAuth, async (req, res) => {
  const isAdmin = !process.env.ADMIN_USER_ID || req.userId === process.env.ADMIN_USER_ID || req.userId === 'default'
  if (process.env.MULTI_USER === 'true' && !isAdmin) return res.status(403).json({ error: 'Admin only' })

  try {
    const usersDir = path.join(__dirname, '..', 'data', 'users')
    const userIds = fs.existsSync(usersDir)
      ? fs.readdirSync(usersDir).filter(id => fs.statSync(path.join(usersDir, id)).isDirectory())
      : [req.userId]

    // Fire discovery in background — respond immediately
    res.json({ started: true, userCount: userIds.length, message: `Discovery queued for ${userIds.length} user(s)` })

    for (const userId of userIds) {
      try {
        const profilePath = getProfilePath(userId)
        if (!fs.existsSync(profilePath)) continue
        const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
        if (!profile || profile.approved === false) continue
        const { runDiscovery } = require('../discovery/auto-scorer')
        await runDiscovery(userId).catch(e => console.error(`[admin-discover] user ${userId}:`, e.message))
      } catch (e) {
        console.error(`[admin-discover] skipping ${userId}:`, e.message)
      }
    }
  } catch (e) {
    console.error('[admin-discover] error:', e.message)
  }
})

// In TEST_MODE, serve the built dashboard so Playwright has a single origin
if (process.env.TEST_MODE === 'true') {
  const distDir = path.join(__dirname, '..', 'dashboard', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api|\/auth).*/, (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }
}

// Global error handler — never sends HTML
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`JobPilot API running on port ${PORT}`));
