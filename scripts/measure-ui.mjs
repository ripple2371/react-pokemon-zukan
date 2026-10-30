import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'chrome' : undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let requests = 0;
  page.on('request', request => { if (request.url().startsWith('https://pokeapi.co/api/v2/')) requests++; });
  const started = performance.now();
  await page.goto('http://127.0.0.1:4173/react-pokemon-zukan/');
  await page.locator('main h2').nth(39).waitFor({ state: 'attached', timeout: 45000 });
  console.log(JSON.stringify({ first40DomMs: Math.round(performance.now() - started), apiRequests: requests,
    ...(await page.evaluate(() => ({ navigationMs: Math.round(performance.now()), cards: document.querySelectorAll('main h2').length }))) }));
} finally { await browser.close(); }
