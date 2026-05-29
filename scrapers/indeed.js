const { launchBrowser, newStealthPage, sleep } = require('./browser');

const TIMEOUT = 30000;

async function scrapeIndeed({ role, location, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}&fromage=3&sort=date`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    // Detect block / captcha
    const title = await page.title();
    if (title.toLowerCase().includes('captcha') || title.toLowerCase().includes('blocked')) {
      console.log('[indeed] blocked — returning empty');
      return [];
    }

    await page.waitForSelector('.job_seen_beacon, .jobsearch-ResultsList', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const cards = document.querySelectorAll('.job_seen_beacon');
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('.jobTitle a, .jobTitle span[title]');
        const companyEl = card.querySelector('[data-testid="company-name"], .companyName');
        const locationEl = card.querySelector('[data-testid="text-location"], .companyLocation');
        const summaryEl = card.querySelector('.job-snippet, [data-testid="jobsnippet_footer"]');
        const jk = card.getAttribute('data-jk') || (card.querySelector('[data-jk]') || {}).dataset?.jk;
        if (!titleEl) continue;
        results.push({
          title: (titleEl.getAttribute('title') || titleEl.textContent || '').trim(),
          company: companyEl ? companyEl.textContent.trim() : '',
          location: locationEl ? locationEl.textContent.trim() : '',
          summary: summaryEl ? summaryEl.textContent.trim().slice(0, 200) : '',
          url: jk ? `https://www.indeed.com/viewjob?jk=${jk}` : '',
          source: 'indeed',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.url);
  } catch (err) {
    console.log(`[indeed] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeIndeed };
