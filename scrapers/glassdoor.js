const { launchBrowser, newStealthPage } = require('./browser');

const TIMEOUT = 30000;

async function scrapeGlassdoor({ role, location, maxJobs = 20 }) {
  const browser = await launchBrowser();
  try {
    const page = await newStealthPage(browser);
    const url = `https://www.glassdoor.com/Job/jobs.htm?suggestCount=0&suggestChosen=false&clickSource=searchBtn&typedKeyword=${encodeURIComponent(role)}&sc.keyword=${encodeURIComponent(role)}&locT=C&locId=&jobType=`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

    // Handle cookie consent
    await page.locator('button:has-text("Accept"), button:has-text("Continue")').first().click({ timeout: 3000 }).catch(() => {});

    await page.waitForSelector('li.react-job-listing, [data-test="jobListing"], [class*="JobCard"]', { timeout: TIMEOUT }).catch(() => {});

    const jobs = await page.evaluate((max) => {
      const selectors = ['li.react-job-listing', '[data-test="jobListing"]', '[class*="JobCard_jobCard"]'];
      let cards = [];
      for (const sel of selectors) {
        cards = document.querySelectorAll(sel);
        if (cards.length > 0) break;
      }
      const results = [];
      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('[class*="JobCard_jobTitle"], a[class*="jobTitle"], [data-test="job-link"]');
        const companyEl = card.querySelector('[class*="EmployerProfile_employerName"], [data-test="employerName"]');
        const locationEl = card.querySelector('[class*="JobCard_location"], [data-test="location"]');
        const salaryEl = card.querySelector('[class*="salary"], [data-test="detailSalary"]');
        const linkEl = card.querySelector('a[href*="/job"]') || titleEl?.closest('a');
        if (!titleEl) continue;
        const href = linkEl?.href || linkEl?.getAttribute('href') || '';
        results.push({
          title: titleEl.textContent.trim(),
          company: companyEl ? companyEl.textContent.trim() : '',
          location: locationEl ? locationEl.textContent.trim() : '',
          salary: salaryEl ? salaryEl.textContent.trim() : '',
          url: href.startsWith('http') ? href : href ? 'https://www.glassdoor.com' + href : '',
          source: 'glassdoor',
        });
      }
      return results;
    }, maxJobs);

    return jobs.filter(j => j.title);
  } catch (err) {
    console.log(`[glassdoor] failed: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeGlassdoor };
