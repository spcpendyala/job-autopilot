const axios = require('axios');
const { callClaude } = require('../services/claude');
const { isDuplicate } = require('../services/db');

function deriveCompanyName(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    // For ATS boards, extract company from path (e.g. boards.greenhouse.io/anthropic)
    if (hostname.includes('greenhouse.io') || hostname.includes('lever.co') || hostname.includes('workday.com')) {
      const pathParts = parsed.pathname.replace(/^\//, '').split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const name = pathParts[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    const name = hostname.replace(/^www\./, '').split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Unknown';
  }
}

async function checkWatchedCompanies() {
  const raw = process.env.WATCH_COMPANIES || '';
  const urls = raw.split(',').map(s => s.trim()).filter(Boolean);

  if (urls.length === 0) return [];

  const results = [];

  for (const companyUrl of urls) {
    try {
      const companyName = deriveCompanyName(companyUrl);

      const response = await axios.get(`https://r.jina.ai/${companyUrl}`, {
        headers: { 'Accept': 'text/plain' },
        timeout: 15000,
      });

      const content = (response.data || '').trim().slice(0, 5000);

      const prompt = `Extract job titles and their URLs from this careers page content. Return at most 5 jobs as a JSON array: [{title, url}]. If no URL found for a job, use empty string. Return ONLY valid JSON array, no markdown fences, no explanation, no trailing text.\n\n${content}`;

      const raw = await callClaude(prompt, { tier: 'cheap', maxTokens: 400 });

      let jobs;
      try {
        jobs = JSON.parse(raw);
      } catch {
        console.error(`  ⚠️  Could not parse jobs from ${companyUrl}`);
        continue;
      }

      if (!Array.isArray(jobs)) continue;

      for (const job of jobs) {
        if (!job.title) continue;
        const jobUrl = job.url || '';
        if (jobUrl && isDuplicate(jobUrl)) continue;
        results.push({
          company: companyName,
          title: job.title,
          url: jobUrl,
          source: 'careers-monitor',
        });
      }
    } catch (err) {
      console.error(`  ⚠️  Failed to check ${companyUrl}: ${err.message}`);
    }
  }

  return results;
}

module.exports = { checkWatchedCompanies };
