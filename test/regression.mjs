// Layout regression harness — checks every page at 3 viewports for horizontal
// overflow / misaligned (out-of-bounds) elements, and saves full-page screenshots.
// Run: cd test && npm install && npm run regression
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const PORT = 8123;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
};

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(fp, (e, data) => {
        if (e) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'content-type': TYPES[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

const ROUTES = [
  '/', '/study/', '/write/', '/dev/',
  '/study/cite/', '/study/flashcards/', '/study/grades/', '/study/bias/',
  '/write/readscore/', '/write/wordcount/', '/write/lorem/', '/write/thread/',
  '/dev/json/', '/dev/jsonconvert/', '/dev/jwt/', '/dev/yaml/', '/dev/csv/',
  '/dev/markdown/', '/dev/html/', '/dev/sql/', '/dev/contrast/', '/dev/uuid/',
  '/dev/timezone/', '/dev/timeconvert/', '/dev/regex/', '/dev/cron/',
  '/dev/base64/', '/dev/diff/', '/dev/websocket/', '/dev/play/', '/dev/bigo/', '/dev/worldclock/',
  '/marketing/', '/marketing/utm/', '/marketing/headline/', '/marketing/emailsubject/',
  '/marketing/adcopy/', '/marketing/calendar/', '/marketing/persona/',
  '/marketing/competitor/', '/marketing/roi/',
  '/finance/', '/finance/compound/', '/finance/budget/', '/finance/mortgage/',
  '/finance/investments/', '/finance/tax/', '/finance/currency/',
  '/finance/equity/', '/finance/networth/',
  '/finance/loan/', '/finance/retire/', '/finance/inflation/',
  '/legal/', '/legal/contract/', '/legal/nda/', '/legal/privacy-policy/',
  '/legal/terms/', '/legal/copyright/', '/legal/glossary/',
  '/hr/', '/hr/salary/', '/hr/jd/', '/hr/interview/', '/hr/offer/',
  '/hr/onboarding/', '/hr/leave/',
  '/health/', '/health/bmi/', '/health/medication/', '/health/symptoms/',
  '/health/cycle/', '/health/water/', '/health/sleep/',
  '/design/', '/design/palette/', '/design/typography/', '/design/icons/',
  '/design/shadows/', '/design/spacing/', '/design/gradient/',
  '/design/sketch/', '/design/photo/', '/design/imagecompress/',
  '/productivity/', '/productivity/focus/', '/productivity/note/',
  '/productivity/decision/', '/productivity/meeting-timer/',
  '/productivity/habits/', '/productivity/reading/', '/productivity/convert/',
  '/ai/', '/ai/summarize/', '/ai/translate/', '/ai/write/', '/ai/rewrite/',
  '/browse/', '/dev/timestamp/', '/dev/jsoncsv/', '/dev/hashgen/', '/dev/keygen/',
  '/dev/passhash/',
  '/privacy.html',
];
const VIEWPORTS = [
  { name: 'mobile', w: 375, h: 800 },
  { name: 'tablet', w: 768, h: 1000 },
  { name: 'desktop', w: 1280, h: 900 },
];

const srv = await serve();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const shotsDir = path.join(ROOT, 'test', 'shots');
fs.mkdirSync(shotsDir, { recursive: true });

let failures = 0;
const rows = [];

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(350);
    const res = await page.evaluate((vw) => {
      const docW = document.documentElement.scrollWidth;
      const offenders = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.display === 'none') return;
        if (el.closest('.ts-bg')) return; // decorative background, clipped + non-scrolling
        if (r.width > 0 && r.right > vw + 1.5) {
          const cls = (typeof el.className === 'string' && el.className)
            ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '';
          offenders.push({ t: el.tagName.toLowerCase() + cls, right: Math.round(r.right) });
        }
      });
      const seen = new Set(); const uniq = [];
      for (const o of offenders) { if (!seen.has(o.t)) { seen.add(o.t); uniq.push(o); } }
      return { docW, overflow: docW > vw + 1.5, offenders: uniq.slice(0, 6) };
    }, vp.w);

    const ok = !res.overflow;
    if (!ok) failures++;
    rows.push({ route, vp: vp.name, docW: res.docW, vw: vp.w, ok, offenders: res.offenders });
    const safe = (route.replace(/\//g, '_') || 'root').replace(/^_|_$/g, '') || 'root';
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
      document.querySelectorAll('.hiw2-step').forEach((s) => s.classList.add('playing')); // fill demos for review shots
    });
    await page.waitForTimeout(1700);
    await page.screenshot({ path: path.join(shotsDir, `${safe}__${vp.name}.png`), fullPage: true });
    await page.close();
  }
}

await browser.close();
srv.close();

console.log('\n' + 'Route'.padEnd(26) + 'Viewport'.padEnd(9) + 'docW/vw'.padEnd(11) + 'Result');
console.log('-'.repeat(58));
for (const r of rows) {
  console.log(r.route.padEnd(26) + r.vp.padEnd(9) + `${r.docW}/${r.vw}`.padEnd(11) + (r.ok ? 'PASS' : 'FAIL'));
  if (!r.ok) r.offenders.forEach((o) => console.log('    ↳ overflows: ' + o.t + '  right=' + o.right));
}
console.log(`\n${rows.length} checks · ${failures} failed. Screenshots → test/shots/`);
process.exit(failures ? 1 : 0);
