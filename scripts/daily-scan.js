require('dotenv').config();

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { getRecentEmails } = require('../services/gmail');
const { syncToSheets, updateSheetStatus } = require('../services/sheets');
const { classifyEmail } = require('../agents/response-classifier');
const { draftFollowUp } = require('../agents/follow-up-drafter');
const { generateInterviewBrief } = require('../agents/interview-prep');
const { saveInterviewBrief } = require('../services/output-writer');
const { scanRSSFeeds } = require('../discovery/rss-scanner');
const { checkWatchedCompanies } = require('../discovery/careers-monitor');
const { scoreAndSaveDiscoveredJobs } = require('../discovery/auto-scorer');
const {
  initDB,
  getAllApplications,
  getApplicationsDueFollowUp,
  updateApplicationStatus,
  getStats,
  getOutreach,
  getOutreachStats,
  getApprovalStats,
  getMetadata,
  setMetadata,
  getUserPreferences,
} = require('../services/db');
const { analyzeApplicationPatterns } = require('../agents/rejection-analyzer');

const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs');

const STATUS_MAP = {
  INTERVIEW_REQUEST: 'interview',
  REJECTION: 'rejected',
  OFFER: 'offer',
};

const LABEL_ICON = {
  INTERVIEW_REQUEST: '✅',
  REJECTION: '❌',
  OFFER: '🎉',
};

function sanitize(str) {
  return (str || 'Unknown').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
}

function extractDomain(fromHeader) {
  const match = fromHeader.match(/@([\w.\-]+)/);
  return match ? match[1].toLowerCase() : '';
}

function findOutputsFolder(company, role) {
  const prefix = `${sanitize(company)}-${sanitize(role)}`;
  if (!fs.existsSync(OUTPUTS_DIR)) return null;
  const match = fs.readdirSync(OUTPUTS_DIR).find(f => f.startsWith(prefix));
  return match ? path.join(OUTPUTS_DIR, match) : null;
}

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function formatDate(isoStr) {
  if (!isoStr) return 'Unknown date';
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function daysSince(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

async function runMorningBrief() {
  initDB();

  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  console.log(`\n⏰ AutoPilot Morning Brief — ${date}`);
  console.log('══════════════════════════════════════════\n');

  // --- Discovery ---
  const userId = 'default';
  const prefs = getUserPreferences(userId);
  const discoveryMode = prefs?.discovery_mode || 'manual';
  const lastActive = prefs?.last_active_at ? new Date(prefs.last_active_at) : null;
  const daysSinceActive = lastActive ? (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24) : 999;

  if (discoveryMode === 'manual') {
    console.log('[discovery] Skipping — mode is manual. User triggers discovery from app.');
    console.log('  Set discovery_mode to "auto" in Settings to enable automatic morning scans.');
  } else if (daysSinceActive > 1) {
    console.log(`[discovery] Skipping — user inactive for ${daysSinceActive.toFixed(1)} days (threshold: 1)`);
  } else {
  console.log('🔍 NEW JOBS DISCOVERED');
  console.log('  Scanning RSS feeds...');
  const rssJobs = await scanRSSFeeds().catch(() => []);
  console.log('  Scanning watched companies...');
  const companyJobs = await checkWatchedCompanies().catch(() => []);
  const allDiscovered = [...rssJobs, ...companyJobs];

  if (allDiscovered.length > 0) {
    const scoredJobs = await scoreAndSaveDiscoveredJobs(allDiscovered);
    const visible = scoredJobs.filter(j => j.fitScore.score >= 6.0);
    for (const job of visible) {
      const company = job.company || 'Unknown';
      console.log(`  [${job.fitScore.score}/10] ${job.title} at ${company} — ${job.fitScore.verdict}`);
    }
    const highFit = scoredJobs.filter(j => j.fitScore.score >= 8.0);
    console.log(`\n  Total discovered: ${allDiscovered.length} | Scored ≥6.0: ${visible.length} | High-fit (≥8.0): ${highFit.length}`);
    if (highFit.length > 0) {
      console.log('  Run: node scripts/apply.js --full "[url]" "[company]" "[role]"');
      console.log('    to generate full package for any of these.');
    }
  } else {
    console.log('  No new jobs found.\n');
  }
  console.log();
  } // end auto-mode discovery block

  // --- Email scan ---
  const applications = getAllApplications();
  const emails = await getRecentEmails(1);
  const actionableEmails = [];

  for (const email of emails) {
    const label = await classifyEmail(email.subject, email.from, email.snippet);
    if (!STATUS_MAP[label]) continue;

    // Best-effort match to an application by company domain
    const domain = extractDomain(email.from);
    const matched = applications.find(app =>
      app.company && domain && domain.includes(app.company.toLowerCase().split(' ')[0])
    );

    actionableEmails.push({ email, label, matched });

    if (matched) {
      const newStatus = STATUS_MAP[label];
      updateApplicationStatus(matched.id, newStatus);
      await updateSheetStatus(matched.id, newStatus, email.snippet);

      if (label === 'INTERVIEW_REQUEST') {
        const folder = findOutputsFolder(matched.company, matched.role);
        try {
          const jdRaw = folder ? (() => { try { return fs.readFileSync(path.join(folder, 'job-description.md'), 'utf8'); } catch { return null; } })() : null;
          const briefRaw = folder ? (() => { try { return JSON.parse(fs.readFileSync(path.join(folder, 'company-brief.json'), 'utf8')); } catch { return null; } })() : null;
          if (jdRaw && folder) {
            const interviewBrief = await generateInterviewBrief(jdRaw, matched.company, matched.role, briefRaw);
            saveInterviewBrief(folder, interviewBrief, matched.role, matched.company);
            updateApplicationStatus(matched.id, 'interview-prep-ready');
            console.log(`  🎯 Interview prep brief auto-generated for ${matched.company}`);
          }
        } catch (err) {
          console.error(`  ⚠️  Interview prep failed for ${matched.company}: ${err.message}`);
        }
      }
    } else if (label === 'INTERVIEW_REQUEST') {
      console.log(`  ⚠️  Couldn't match email to application — run: npm run prep [job-id]`);
    }
  }

  if (actionableEmails.length > 0) {
    console.log(`📬 NEW RESPONSES (${actionableEmails.length})`);
    for (const { email, label, matched } of actionableEmails) {
      const icon = LABEL_ICON[label] || '📧';
      const appLabel = matched ? `${matched.company} (${matched.role})` : email.subject;
      console.log(`  ${icon} ${label} — ${appLabel}`);
      console.log(`     From: ${email.from}`);
      if (email.snippet) console.log(`     "${email.snippet.slice(0, 80)}..."`);
    }
    console.log();
  } else {
    console.log('📬 NEW RESPONSES (0)\n');
  }

  // --- Follow-up due ---
  const duelist = getApplicationsDueFollowUp();

  if (duelist.length > 0) {
    console.log(`📅 FOLLOW-UP DUE (${duelist.length})`);
    for (const app of duelist) {
      const days = daysSince(app.applied_at);
      console.log(`  → ${app.company} — Applied ${formatDate(app.applied_at)} (${days} days ago)`);
      console.log(`    Role: ${app.role}`);

      const draft = await draftFollowUp(app.company, app.role, days, '');
      console.log('\n    Draft follow-up:');
      console.log('    ─────────────────');
      draft.split('\n').forEach(line => console.log('    ' + line));
      console.log('    ─────────────────');

      const answer = await ask('    Save this draft? [Y/n]: ');
      if (answer === '' || answer === 'y') {
        const folder = findOutputsFolder(app.company, app.role);
        if (folder) {
          fs.writeFileSync(path.join(folder, 'follow-up-draft.md'), draft, 'utf8');
          console.log(`    ✅ Saved to ${folder}/follow-up-draft.md`);
        } else {
          console.log('    ⚠️  No outputs folder found for this application — draft not saved.');
        }
      } else {
        console.log('    Skipped.');
      }
      console.log();
    }
  } else {
    console.log('📅 FOLLOW-UP DUE (0)\n');
  }

  // --- Outreach follow-up due ---
  const outreachDue = getOutreach('sent').filter(o => {
    const sentDaysAgo = Math.floor((Date.now() - new Date(o.sent_at)) / 86400000);
    return sentDaysAgo >= 7;
  });

  if (outreachDue.length > 0) {
    console.log('\n📨 OUTREACH FOLLOW-UP DUE');
    outreachDue.forEach(o => {
      const days = Math.floor((Date.now() - new Date(o.sent_at)) / 86400000);
      console.log(`  → ${o.company} (${o.contact_name || 'Hiring Team'}) — sent ${days} days ago`);
    });
  }

  const outreachStats = getOutreachStats();
  if (outreachStats.total > 0) {
    console.log(`\n📊 OUTREACH: ${outreachStats.sent} sent | ${outreachStats.replied} replied | ${outreachStats.replyRate}% reply rate`);
  }

  // --- Approval Queue Summary (Phase 13) ---
  const approvalStats = getApprovalStats();
  if (approvalStats.pending > 0 || approvalStats.applyReady > 0) {
    console.log('⏳ APPROVAL QUEUE');
    if (approvalStats.pending > 0) {
      console.log(`  Pending review: ${approvalStats.pending} package${approvalStats.pending !== 1 ? 's' : ''}`);
    }
    if (approvalStats.applyReady > 0) {
      console.log(`  Ready to apply: ${approvalStats.applyReady} approved package${approvalStats.applyReady !== 1 ? 's' : ''}`);
    }
    console.log('  → Open dashboard to review');
    console.log();
  }

  // --- Summary ---
  const stats = getStats();
  console.log('📊 SUMMARY');
  console.log(`  Applied: ${stats.applied} | Responded: ${stats.responded} | Interviews: ${stats.interviews} | Rejections: ${stats.rejections}`);
  console.log('══════════════════════════════════════════\n');

  // --- Strategy check (Phase 8) ---
  const currentCount = stats.total || 0;
  const lastAnalyzedCount = getMetadata('last_analyzed_count');
  if (currentCount >= 5 && String(currentCount) !== String(lastAnalyzedCount)) {
    try {
      console.log('📊 STRATEGY CHECK');
      const analysis = await analyzeApplicationPatterns();
      if (!analysis.insufficientData) {
        const topIssue = analysis.topIssues && analysis.topIssues[0];
        console.log(`   Grade: ${analysis.overallGrade} | Response Rate: ${analysis.computedStats.responseRate}%`);
        if (topIssue) {
          console.log(`   Top Issue: ${topIssue.issue}`);
          console.log(`   Fix: ${topIssue.fix}`);
        }
        console.log('   Full report: npm run analyze');
        setMetadata('last_analyzed_count', currentCount);
      }
      console.log('══════════════════════════════════════════\n');
    } catch (err) {
      console.error('  Strategy check failed:', err.message);
    }
  }
}

// PM2 cron_restart at 08:00 restarts this process, so runMorningBrief() runs
// once immediately on startup. The node-cron schedule is removed to prevent
// a double-run when PM2 and node-cron both fire at the same minute.
runMorningBrief().then(() => {
  console.log('[daily-scan] Complete. PM2 will restart at 08:00 tomorrow.');
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
