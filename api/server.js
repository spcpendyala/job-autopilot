require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { initDB, isDuplicate, saveApplication, getAllApplications, updateApplicationStatus, getStats } = require('../services/db');
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

// Global error handler — never sends HTML
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 JobPilot API running on port ${PORT}`));
