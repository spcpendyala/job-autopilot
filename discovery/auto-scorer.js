const { fetchJobDescription } = require('../services/fetcher');
const { scoreJobFit } = require('../agents/fit-scorer');
const { saveApplication } = require('../services/db');

function deriveCompany(job) {
  if (job.company) return job.company;
  try {
    const hostname = new URL(job.url).hostname.replace(/^www\./, '');
    const name = hostname.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Unknown';
  }
}

async function scoreAndSaveDiscoveredJobs(jobs) {
  const scored = [];

  for (const job of jobs) {
    if (!job.url) {
      console.log(`  [skip] ${job.title} — no URL`);
      continue;
    }

    try {
      const jd = await fetchJobDescription(job.url);
      const company = deriveCompany(job);
      const fitScore = await scoreJobFit(jd, job.title, company);

      saveApplication({
        company,
        role: job.title,
        job_url: job.url,
        fit_score: fitScore.score,
        verdict: fitScore.verdict,
        apply_recommendation: fitScore.applyRecommendation,
        raw_score_json: JSON.stringify(fitScore),
      });

      console.log(`  [${fitScore.score}/10] ${job.title} — ${company}`);
      scored.push({ ...job, company, fitScore });
    } catch (err) {
      console.log(`  [skip] ${job.title} — ${err.message.slice(0, 60)}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return scored.sort((a, b) => b.fitScore.score - a.fitScore.score);
}

module.exports = { scoreAndSaveDiscoveredJobs };
