const { launchBrowser, newStealthPage } = require('../browser');

const TIMEOUT = 30000;

async function scrapeFreelancer({ role, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const url = `https://www.freelancer.com/jobs/?keyword=${encodeURIComponent(role)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForSelector('.JobSearchCard-item, [class*="JobSearchCard"], .project-details', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const cards = document.querySelectorAll('.JobSearchCard-item, [class*="JobSearchCard-item"], .project-details');
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('h2 a, .JobSearchCard-primary-heading a, [class*="title"] a');
        const descEl = card.querySelector('.JobSearchCard-secondary-excerpt, [class*="description"], p');
        const budgetEl = card.querySelector('.JobSearchCard-secondary-price, [class*="budget"], [class*="price"]');
        const bidsEl = card.querySelector('[class*="bid"], [class*="Bids"]');
        const skillsEl = card.querySelectorAll('.JobSearchCard-primary-tags a, [class*="skill"] a');
        if (!titleEl) continue;
        results.push({
          title: titleEl.textContent.trim(),
          description: descEl ? descEl.textContent.trim().slice(0, 200) : '',
          budget: budgetEl ? budgetEl.textContent.trim() : '',
          bids: bidsEl ? bidsEl.textContent.trim() : '',
          skills: Array.from(skillsEl).slice(0, 6).map(s => s.textContent.trim()),
          url: titleEl.href.startsWith('http') ? titleEl.href : 'https://www.freelancer.com' + titleEl.getAttribute('href'),
          source: 'freelancer',
          type: 'freelance',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.url);
  } catch (err) {
    console.log(`[freelancer] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeFreelancer };
