require('dotenv').config();

const { initDB } = require('../services/db');
const { scanRSSFeeds } = require('../discovery/rss-scanner');
const { checkWatchedCompanies } = require('../discovery/careers-monitor');
const { scoreAndSaveDiscoveredJobs } = require('../discovery/auto-scorer');

async function main() {
  initDB();

  console.log('\n🔍 Job AutoPilot — Discovery Run');
  console.log('════════════════════════════════════════\n');

  console.log('📡 Scanning RSS feeds...');
  const rssJobs = await scanRSSFeeds();
  if ((process.env.JOB_RSS_FEEDS || '').trim()) {
    console.log(`   Found ${rssJobs.length} new job(s) from RSS feeds\n`);
  }

  const watchRaw = process.env.WATCH_COMPANIES || '';
  const watchList = watchRaw.split(',').map(s => s.trim()).filter(Boolean);

  if (watchList.length === 0) {
    console.log('No companies watched. Add WATCH_COMPANIES to .env\n');
  } else {
    console.log('🏢 Scanning watched companies...');
  }

  const companyJobs = await checkWatchedCompanies();
  if (watchList.length > 0) {
    console.log(`   Found ${companyJobs.length} new job(s) from career pages\n`);
  }

  const allJobs = [...rssJobs, ...companyJobs];

  if (allJobs.length === 0) {
    console.log('No new jobs to score.\n');
    console.log('════════════════════════════════════════');
    return;
  }

  console.log(`🤖 Scoring ${allJobs.length} job(s)...\n`);
  const scored = await scoreAndSaveDiscoveredJobs(allJobs);

  console.log('\n════════════════════════════════════════');
  console.log('📊 RESULTS (sorted by fit score)\n');

  for (const job of scored) {
    const score = job.fitScore.score;
    const company = job.company || 'Unknown';
    const line = `⭐ [${score}/10] ${job.title} at ${company} — ${job.fitScore.verdict}`;

    if (score >= 8.0) {
      process.stdout.write('\x1b[32m' + line + '\x1b[0m\n');
    } else {
      console.log(`   [${score}/10] ${job.title} at ${company} — ${job.fitScore.verdict}`);
    }
  }

  const highFit = scored.filter(j => j.fitScore.score >= 8.0);
  console.log(`\n  High-fit jobs (≥8.0): ${highFit.length} found`);

  console.log('\nRun `npm run apply:full -- [url] [company] [role]` to generate package');
  console.log('════════════════════════════════════════\n');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
