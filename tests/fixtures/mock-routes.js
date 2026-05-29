'use strict';

// Mock router — stubs for all AI-heavy endpoints in TEST_MODE.
// Mounted in server.js BEFORE real routes when TEST_MODE=true, so these
// handlers shadow the real ones without ever calling the Claude API.
// Response shapes mirror the real endpoints exactly.

const express = require('express');
const router = express.Router();
const fixtures = require('./ai-responses');

// ── POST /api/analyze ────────────────────────────────────────────────────────
// Real: calls fit-scorer + ats-scanner (two Claude calls)
// Mock: returns fixture fitScore + atsGaps instantly
router.post('/api/analyze', (req, res) => {
  const jd = req.body.jobDescription || req.body.jobUrl || 'Mock job description.';
  res.json({
    fitScore: fixtures.fitScore,
    atsGaps: fixtures.atsGaps,
    jobDescription: jd,
  });
});

// ── POST /api/apply ──────────────────────────────────────────────────────────
// Real: calls tailorResume + generateCoverLetter + getCompanyBrief + findOtherRoles
// Mock: saves a real DB record (so applicationId is retrievable) but skips AI
router.post('/api/apply', (req, res) => {
  const { saveApplication, isDuplicate } = require('../../services/db');
  const userId = req.userId || 'default';
  const url = req.body.jobUrl || `paste-mock-${Date.now()}`;

  try {
    if (req.body.jobUrl && isDuplicate(req.body.jobUrl, userId)) {
      return res.json({ duplicate: true });
    }
    const incomingScore = req.body.fitScore;
    const appId = saveApplication({
      job_url: url,
      company:  req.body.company  || null,
      role:     req.body.jobTitle || null,
      fit_score:            (incomingScore && incomingScore.score)   || fixtures.fitScore.score,
      verdict:              (incomingScore && incomingScore.verdict)  || fixtures.fitScore.verdict,
      apply_recommendation: true,
      raw_score_json: JSON.stringify(incomingScore || fixtures.fitScore),
    }, userId);
    res.json({ success: true, applicationId: appId, outputFolder: null, files: null });
  } catch (e) {
    // Fallback: return a mock ID if DB write fails for any reason
    res.json({ success: true, applicationId: `J-mock-${Date.now()}`, outputFolder: null, files: null });
  }
});

// ── POST /api/discover ───────────────────────────────────────────────────────
// Real: runs full discovery pipeline (scrape → score → queue)
// Mock: returns already-discovered apps from the test DB (no scraping/scoring)
router.post('/api/discover', (req, res) => {
  try {
    const { getAllApplications } = require('../../services/db');
    const apps = getAllApplications(req.userId || 'default');
    const discovered = apps
      .filter(a => a.status === 'discovered')
      .map(a => ({ id: a.id, title: a.role, url: a.job_url, company: a.company, fitScore: a.fit_score }));
    res.json({ discovered });
  } catch {
    res.json({ discovered: [] });
  }
});

// ── POST /api/prep/:id ───────────────────────────────────────────────────────
// Real: calls generateInterviewBrief (Claude)
// Mock: returns success immediately — no file written
router.post('/api/prep/:id', (req, res) => {
  res.json({ success: true, briefPath: '/mock/interview-prep.md' });
});

// ── POST /api/salary ─────────────────────────────────────────────────────────
// Real: calls researchSalary (Claude)
// Mock: returns fixture salary range
router.post('/api/salary', (req, res) => {
  res.json(fixtures.salaryBrief);
});

// ── POST /api/applications/:id/tailor ────────────────────────────────────────
// Real: starts background tailoring job (Claude resume + cover letter)
// Mock: returns { started: true } immediately — no background work
router.post('/api/applications/:id/tailor', (req, res) => {
  res.json({ started: true });
});

// ── POST /api/outreach/draft ─────────────────────────────────────────────────
// Real: calls findRecruiter + draftOutreach (Claude)
// Mock: saves a draft outreach record then returns fixture draft
router.post('/api/outreach/draft', (req, res) => {
  const { company, role, applicationId } = req.body;
  const id = `OR-mock-${Date.now()}`;

  try {
    const { saveOutreach } = require('../../services/db');
    saveOutreach({
      id,
      company:       company || null,
      role:          role    || null,
      contact_name:  null,
      draft_message: fixtures.outreachDraft.body,
      application_id: applicationId || null,
    }, req.userId || 'default');
  } catch { /* non-critical */ }

  res.json({
    success:     true,
    outreachId:  id,
    subject:     fixtures.outreachDraft.subject,
    body:        fixtures.outreachDraft.body,
    recruiterInfo: {},
  });
});

module.exports = router;
