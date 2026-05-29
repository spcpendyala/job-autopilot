const { launchBrowser, newStealthPage } = require('./browser');

const TIMEOUT = 30000;

async function scrapeLinkedIn({ role, location, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&f_TPR=r259200&sortBy=DD`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    // Check for sign-in wall
    const bodyText = await page.innerText('body').catch(() => '');
    if (bodyText.toLowerCase().includes('join now') && bodyText.toLowerCase().includes('sign in')) {
      console.log('[linkedin] sign-in wall detected — returning available results');
    }

    await page.waitForSelector('.jobs-search__results-list li, .base-card', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const cards = document.querySelectorAll('.jobs-search__results-list li, .base-search-card');
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('.base-search-card__title, h3.base-search-card__title');
        const companyEl = card.querySelector('.base-search-card__subtitle a, h4.base-search-card__subtitle');
        const locationEl = card.querySelector('.job-search-card__location, .base-search-card__metadata');
        const linkEl = card.querySelector('a.base-card__full-link, a[data-tracking-control-name]');
        const timeEl = card.querySelector('time[datetime]');
        if (!titleEl || !linkEl) continue;
        results.push({
          title: titleEl.textContent.trim(),
          company: companyEl ? companyEl.textContent.trim() : '',
          location: locationEl ? locationEl.textContent.trim() : '',
          url: linkEl.href,
          datePosted: timeEl ? timeEl.getAttribute('datetime') : '',
          source: 'linkedin',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.url);
  } catch (err) {
    console.log(`[linkedin] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeLinkedIn };
