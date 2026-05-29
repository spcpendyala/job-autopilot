const { chromium } = require('playwright-core');

const STEALTH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--disable-infobars',
  '--window-size=1366,768',
  '--disable-dev-shm-usage',
];

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: STEALTH_ARGS,
  });
}

async function newStealthPage(browser) {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'en-CA',
    timezoneId: 'America/Toronto',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });
  return page;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { launchBrowser, newStealthPage, sleep };
