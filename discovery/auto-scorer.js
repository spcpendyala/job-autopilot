require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { buildDiscoveryQueries } = require('./query-builder');
const { fetchFromSource } = require('./source-fetcher');
const { isRelevant } = require('./pre-filter');
const { fetchJobDescription } = require('../services/fetcher');
const { scoreJobFit } = require('../agents/fit-scorer');
const { tailorResume } = require('../agents/resume-tailor');
const { generateCoverLetter } = require('../agents/cover-letter');
const { scanATSGaps } = require('../agents/ats-scanner');
const { saveApplication, isDuplicate, addToApprovalQueue, initDB, getProfileStatus } = require('../services/db');

const CONFIG_PATH = path.join(__dirname, '..', 'core', 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

function loadProfile() {
  const profileName = process.env.ACTIVE_PROFILE || 'sai';
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'core', 'profiles', `${profileName}.json`), 'utf8'));
}

async function runDiscovery() {
  initDB();

  const status = getProfileStatus();
  if (status.approved !== 'true') {
    console.log('⚠️  Profile not approved. Complete onboarding first.');
    return { discovered: 0, scored: 0, queued: 0 };
  }

  const config = readConfig();
  const profile = loadProfile();
  const queries = buildDiscoveryQueries(profile);
  const autoTailorThreshold = config.autoTailorThreshold || 7.5;
  const minScoreToShow = config.minScoreToShow || 6.0;

  let discovered = 0, scored = 0, queued = 0;

  const rolePreview = (profile.targetRoles || []).slice(0, 3).join(', ') || '(no roles set)';
  console.log(`🔍 Running discovery for: ${rolePreview}...`);
  console.log(`   Sources: ${queries.length} queries across ${new Set(queries.map(q => q.source)).size} platforms`);

  const fetchResults = await Promise.allSettled(queries.map(q => fetchFromSource(q)));
  const allJobs = [];

  fetchResults.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value.map(job => ({ ...job, source: queries[i].source, label: queries[i].label })));
    }
  });

  const seen = new Set();
  const uniqueJobs = allJobs.filter(job => {
    if (!job.url || seen.has(job.url)) return false;
    seen.add(job.url);
    return true;
  });

  console.log(`   Found ${uniqueJobs.length} unique listings`);

  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recentJobs = uniqueJobs.filter(job => {
    if (!job.pubDate) return true;
    const d = new Date(job.pubDate);
    return isNaN(d.getTime()) || d.getTime() > cutoff;
  });

  for (const job of recentJobs) {
    if (isDuplicate(job.url)) continue;
    discovered++;

    const relevant = await isRelevant(job.title, job.description, profile);
    if (!relevant) continue;

    let jd = '';
    try {
      jd = await fetchJobDescription(job.url);
    } catch { continue; }

    let fitResult, atsResult;
    try {
      [fitResult, atsResult] = await Promise.all([
        scoreJobFit(jd, job.title, job.company || ''),
        scanATSGaps(jd),
      ]);
    } catch { continue; }

    scored++;

    if (fitResult.score < minScoreToShow) {
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    const appId = saveApplication({
      job_url: job.url,
      company: job.company || fitResult.company || '',
      role: job.title,
      fit_score: fitResult.score,
      verdict: fitResult.verdict,
      apply_recommendation: fitResult.applyRecommendation ? 1 : 0,
      raw_score_json: JSON.stringify(fitResult),
    });

    console.log(`  [${fitResult.score}/10] ${job.title} — ${job.company || 'Unknown'} (${job.source})`);

    if (fitResult.score >= autoTailorThreshold) {
      try {
        const [resume, coverLetter] = await Promise.all([
          tailorResume(jd, job.title, job.company || '', atsResult),
          generateCoverLetter(jd, job.title, job.company || '', fitResult.score),
        ]);

        addToApprovalQueue({
          id: 'AQ-' + Date.now(),
          application_id: appId,
          company: job.company || '',
          role: job.title,
          job_url: job.url,
          fit_score: fitResult.score,
          verdict: fitResult.verdict,
          job_description: jd,
          tailored_resume: resume,
          cover_letter: coverLetter,
        });

        queued++;
        console.log(`  ✦ Queued for approval: ${job.title}`);
      } catch (err) {
        console.error(`  ✗ Tailor failed: ${err.message}`);
      }
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return { discovered, scored, queued };
}

// Backward-compat shim for scripts/daily-scan.js
async function scoreAndSaveDiscoveredJobs(jobs) {
  const config = readConfig();
  const autoTailorThreshold = config.autoTailorThreshold || 7.5;
  const scored = [];

  let profile = null;
  try { profile = loadProfile(); } catch { profile = { targetRoles: [], coreSkills: [] }; }

  for (const job of jobs) {
    if (!job.url) {
      console.log(`  [skip] ${job.title} — no URL`);
      continue;
    }

    try {
      const jd = await fetchJobDescription(job.url);
      const company = job.company || (() => {
        try {
          const hostname = new URL(job.url).hostname.replace(/^www\./, '');
          const name = hostname.split('.')[0];
          return name.charAt(0).toUpperCase() + name.slice(1);
        } catch { return 'Unknown'; }
      })();

      const fitScore = await scoreJobFit(jd, job.title, company);

      const appId = saveApplication({
        company,
        role: job.title,
        job_url: job.url,
        fit_score: fitScore.score,
        verdict: fitScore.verdict,
        apply_recommendation: fitScore.applyRecommendation,
        raw_score_json: JSON.stringify(fitScore),
      });

      console.log(`  [${fitScore.score}/10] ${job.title} — ${company}`);

      if (fitScore.score >= autoTailorThreshold) {
        try {
          const [atsResult, resume, coverLetter] = await Promise.all([
            scanATSGaps(jd),
            tailorResume(jd, job.title, company, null),
            generateCoverLetter(jd, job.title, company, fitScore.score),
          ]);
          addToApprovalQueue({
            id: `AQ-${Date.now()}`,
            application_id: appId,
            company,
            role: job.title,
            job_url: job.url,
            fit_score: fitScore.score,
            verdict: fitScore.verdict,
            job_description: jd,
            tailored_resume: resume,
            cover_letter: coverLetter,
          });
          console.log(`  ✦ [${fitScore.score}] ${job.title} — queued for approval`);
        } catch (tailorErr) {
          console.log(`  ⚠️  Auto-tailor failed for ${job.title}: ${tailorErr.message.slice(0, 60)}`);
        }
      }

      scored.push({ ...job, company, fitScore });
    } catch (err) {
      console.log(`  [skip] ${job.title} — ${err.message.slice(0, 60)}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return scored.sort((a, b) => b.fitScore.score - a.fitScore.score);
}

module.exports = { runDiscovery, scoreAndSaveDiscoveredJobs };
