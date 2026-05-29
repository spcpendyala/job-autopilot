const { launchBrowser, newStealthPage } = require('../browser');

const TIMEOUT = 30000;

async function scrapeUpwork({ role, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const url = `https://www.upwork.com/nx/jobs/search/?sort=recency&q=${encodeURIComponent(role)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForSelector('[data-test="job-tile"], .job-tile, article[data-test]', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const cards = document.querySelectorAll('[data-test="job-tile"], .job-tile, article[data-test]');
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('h2 a, [data-test="job-title"] a, .job-title a');
        const descEl = card.querySelector('[data-test="job-description-text"], .job-description-text, p');
        const budgetEl = card.querySelector('[data-test="budget"], [data-test="hourly-rate"], .budget');
        const skillsEl = card.querySelectorAll('[data-test="skill"], .skill-badge, a[href*="skill"]');
        const postedEl = card.querySelector('[data-test="posted-on"], time, .posted-on');
        if (!titleEl) continue;
        results.push({
          title: titleEl.textContent.trim(),
          description: descEl ? descEl.textContent.trim().slice(0, 200) : '',
          budget: budgetEl ? budgetEl.textContent.trim() : '',
          skills: Array.from(skillsEl).slice(0, 6).map(s => s.textContent.trim()),
          postedTime: postedEl ? postedEl.textContent.trim() : '',
          url: titleEl.href.startsWith('http') ? titleEl.href : 'https://www.upwork.com' + titleEl.getAttribute('href'),
          source: 'upwork',
          type: 'freelance',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.url);
  } catch (err) {
    console.log(`[upwork] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeUpwork };
