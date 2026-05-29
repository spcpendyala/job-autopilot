const { launchBrowser, newStealthPage } = require('./browser');

const TIMEOUT = 30000;

async function scrapeMonster({ role, location, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const url = `https://www.monster.com/jobs/search?q=${encodeURIComponent(role)}&where=${encodeURIComponent(location)}&tm=3`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    await page.waitForSelector('[data-testid="jobTitle"], .job-cardstyle__JobCardComponent, [class*="JobCard"]', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const selectors = ['[data-testid="jobTitle"]', '.job-cardstyle__JobCardComponent', '[class*="job-card"]'];
      let cards = [];
      for (const sel of selectors) {
        cards = document.querySelectorAll(sel);
        if (cards.length > 0) break;
      }
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('h2, h3, [data-testid="jobTitle"], a[class*="title"]');
        const companyEl = card.querySelector('[data-testid="company"], [class*="company"]');
        const locationEl = card.querySelector('[data-testid="location"], [class*="location"]');
        const summaryEl = card.querySelector('[class*="snippet"], [class*="description"]');
        const linkEl = card.querySelector('a[href*="/job"]') || card.closest('a');
        if (!titleEl) continue;
        results.push({
          title: titleEl.textContent.trim(),
          company: companyEl ? companyEl.textContent.trim() : '',
          location: locationEl ? locationEl.textContent.trim() : '',
          summary: summaryEl ? summaryEl.textContent.trim().slice(0, 200) : '',
          url: linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : 'https://www.monster.com' + linkEl.getAttribute('href')) : '',
          source: 'monster',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.title);
  } catch (err) {
    console.log(`[monster] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeMonster };
