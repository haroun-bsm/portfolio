// verify-live.mjs — UTF-8-safe check of the deployed page's head + console cleanliness.
const url = 'https://haroun-ben-salem.pages.dev/';
const res = await fetch(url);
const html = await res.text();
const pick = [
  /<link rel="canonical"[^>]*>/,
  /<meta property="og:url"[^>]*>/,
  /<meta property="og:image"[^>]*>/,
  /<meta name="twitter:card"[^>]*>/,
  /<meta name="description"[^>]*>/,
];
console.log('status', res.status, 'bytes', html.length);
for (const re of pick) {
  const m = html.match(re);
  console.log(m ? m[0] : 'MISSING ' + re);
}
const ld = html.match(/"url":\s*"[^"]+"/);
console.log(ld ? ld[0] : 'MISSING jsonld url');

const { chromium } = await import('../.10k/tools/node_modules/playwright-core/index.mjs').catch(() => import('playwright-core'));
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch({ channel: 'msedge' }));
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const events = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') events.push(`console.${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => events.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => events.push('requestfailed: ' + r.url() + ' :: ' + (r.failure()?.errorText || '')));
page.on('response', (r) => { if (r.status() >= 400) events.push(`http ${r.status()}: ${r.url()}`); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(() => scrollTo(0, 400));
await page.waitForTimeout(2500);
await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2500);
console.log('overflow', await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
console.log('booted', await page.evaluate(() => document.documentElement.classList.contains('k-on')));
console.log(events.length ? events.join('\n') : 'no console/network errors');
await browser.close();
