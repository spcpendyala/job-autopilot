require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { buildDiscoveryQueries } = require('./query-builder');
const { fetchFromSource } = require('./source-fetcher');
const { isRelevant } = require('./pre-filter');
const { fetchJobDescription } = require('../services/fetcher');
const { scoreJobFit } = require('../agents/fit-scorer');
const { tailorResume } = require('../agents/resume-tailor');
const { generateCoverLetter } = require('../agents/cover-letter');
const { scanATSGaps } = require('../agents/ats-scanner');
const { getScoredJobCache, setScoredJobCache } = require('../services/claude');
const {
  saveApplication, isDuplicate, addToApprovalQueue, initDB, getProfileStatus,
  getUserPreferences,
} = require('../services/db');
const { getProfilePath } = require('../services/user-paths');

const MAX_JOBS_PER_RUN = parseInt(process.env.MAX_DISCOVERY_JOBS || '15');

// Free keyword pre-filter — runs before any Claude call
function quickFilter(jobTitle, jobDescription, targetRoles, coreSkills) {
  const text = (jobTitle + ' ' + (jobDescription || '')).toLowerCase();
  const roleWords = targetRoles.flatMap(r => r.toLowerCase().split(' '));
  const skillWords = coreSkills.map(s => s.toLowerCase());
  const matches = [...roleWords, ...skillWords].filter(k => k.length > 2 && text.includes(k));
  return matches.length >= 2;
}

const CONFIG_PATH = path.join(__dirname, '..', 'core', 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

function loadProfile(userId = 'default') {
  const profilePath = getProfilePath(userId);
  try {
    return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  } catch {
    // Legacy fallback for old single-user installs
    const legacyName = process.env.ACTIVE_PROFILE || 'sai';
    const legacyPath = path.join(__dirname, '..', 'core', 'profiles', `${legacyName}.json`);
    return JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  }
}

// Returns true if this job should be filtered based on user preferences
function isPreferenceFiltered(job, prefs) {
  if (!prefs) return false;

  const titleLower  = (job.title   || '').toLowerCase();
  const companyLower = (job.company || '').toLowerCase();

  if (prefs.avoided_companies?.length) {
    for (const co of prefs.avoided_companies) {
      if (companyLower.includes(co.toLowerCase())) return true;
    }
  }

  if (prefs.avoided_keywords?.length) {
    for (const kw of prefs.avoided_keywords) {
      if (titleLower.includes(kw.toLowerCase())) return true;
    }
  }

  return false;
}

async function runDiscovery(userId = 'default') {
  initDB();

  const status = getProfileStatus(userId);
  if (status.approved !== 'true') {
    console.log('[discovery] Profile not approved. Complete onboarding first.');
    return { discovered: 0, scored: 0, queued: 0 };
  }

  const config = readConfig();
  const profile = loadProfile(userId);
  const prefs = getUserPreferences(userId);

  const autoTailorThreshold = config.autoTailorThreshold || 7.5;
  // Prefer the learned threshold; fall back to config; floor at 6.0
  const minScoreToShow = prefs?.min_score_threshold || config.minScoreToShow || 6.0;

  const queries = buildDiscoveryQueries(profile);

  let discovered = 0, scored = 0, queued = 0;

  const rolePreview = (profile.targetRoles || []).slice(0, 3).join(', ') || '(no roles set)';
  console.log(`[discovery] Running for: ${rolePreview}...`);
  console.log(`[discovery] Sources: ${queries.length} queries across ${new Set(queries.map(q => q.source)).size} platforms`);
  if (prefs?.insights) console.log(`[discovery] Preferences: ${prefs.insights}`);

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

  console.log(`[discovery] Found ${uniqueJobs.length} unique listings`);

  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recentJobs = uniqueJobs.filter(job => {
    if (!job.pubDate) return true;
    const d = new Date(job.pubDate);
    return isNaN(d.getTime()) || d.getTime() > cutoff;
  });

  let processedThisRun = 0;

  for (const job of recentJobs) {
    if (processedThisRun >= MAX_JOBS_PER_RUN) {
      console.log(`[discovery] Max jobs per run (${MAX_JOBS_PER_RUN}) reached — stopping`);
      break;
    }

    if (isDuplicate(job.url, userId)) continue;

    // Apply preference filters before expensive AI calls
    if (isPreferenceFiltered(job, prefs)) {
      console.log(`[discovery] Filtered (preferences): ${job.title}`);
      continue;
    }

    // Free keyword check before any Claude call
    if (!quickFilter(job.title, job.description, profile.targetRoles || [], profile.coreSkills || [])) {
      console.log(`[FILTERED] ${job.title} — no keyword match`);
      continue;
    }

    discovered++;
    processedThisRun++;

    // Disk cache check — skip scoring if we've scored this URL in last 48h
    const urlHash = crypto.createHash('sha256').update(job.url).digest('hex');
    const cached = getScoredJobCache(urlHash);
    if (cached) {
      console.log(`[discovery] [cached] ${job.title} — score ${cached.score}`);
      continue;
    }

    const relevant = await isRelevant(job.title, job.description, profile);
    if (!relevant) continue;

    let jd = '';
    try {
      jd = await fetchJobDescription(job.url);
    } catch { continue; }

    let fitResult;
    let atsResult = { criticalMissing: [], keyPhrasesToUse: [] };
    try {
      fitResult = await scoreJobFit(jd, job.title, job.company || '', userId);
    } catch (fitErr) {
      console.warn('[auto-scorer] fit-score failed for', job.title, '—', fitErr.message);
      continue;
    }
    try {
      atsResult = await scanATSGaps(jd, job.title) || atsResult;
    } catch (atsErr) {
      console.warn('[auto-scorer] ATS scan failed for', job.title, '—', atsErr.message);
    }

    scored++;
    setScoredJobCache(urlHash, { score: fitResult.score, verdict: fitResult.verdict });

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
    }, userId);

    console.log(`[discovery] [${fitResult.score}/10] ${job.title} — ${job.company || 'Unknown'} (${job.source})`);

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
        }, userId);

        queued++;
        console.log(`[discovery] Queued for approval: ${job.title}`);
      } catch (err) {
        console.error(`[discovery] Tailor failed: ${err.message}`);
      }
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return { discovered, scored, queued };
}

// Backward-compat shim for scripts/daily-scan.js
async function scoreAndSaveDiscoveredJobs(jobs, userId = 'default') {
  const config = readConfig();
  const autoTailorThreshold = config.autoTailorThreshold || 7.5;
  const scored = [];

  let profile = null;
  try { profile = loadProfile(userId); } catch { profile = { targetRoles: [], coreSkills: [] }; }

  for (const job of jobs) {
    if (!job.url) {
      console.log(`[discovery] Skip ${job.title} — no URL`);
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

      const fitScore = await scoreJobFit(jd, job.title, company, userId);

      const appId = saveApplication({
        company,
        role: job.title,
        job_url: job.url,
        fit_score: fitScore.score,
        verdict: fitScore.verdict,
        apply_recommendation: fitScore.applyRecommendation,
        raw_score_json: JSON.stringify(fitScore),
      }, userId);

      console.log(`[discovery] [${fitScore.score}/10] ${job.title} — ${company}`);

      if (fitScore.score >= autoTailorThreshold) {
        try {
          const atsForTailor = await scanATSGaps(jd, job.title).catch(() => ({ criticalMissing: [], keyPhrasesToUse: [] }));
          const [resume, coverLetter] = await Promise.all([
            tailorResume(jd, job.title, company, atsForTailor),
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
          }, userId);
          console.log(`[discovery] [${fitScore.score}] ${job.title} — queued for approval`);
        } catch (tailorErr) {
          console.log(`[discovery] Auto-tailor failed for ${job.title}: ${tailorErr.message.slice(0, 60)}`);
        }
      }

      scored.push({ ...job, company, fitScore });
    } catch (err) {
      console.log(`[discovery] Skip ${job.title} — ${err.message.slice(0, 60)}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return scored.sort((a, b) => b.fitScore.score - a.fitScore.score);
}

module.exports = { runDiscovery, scoreAndSaveDiscoveredJobs };
