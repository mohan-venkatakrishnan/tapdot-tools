import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html';
  const fp = path.join(ROOT, p);
  fs.readFile(fp, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': T[path.extname(fp)] || 'text/plain' }); s.end(d); });
});
await new Promise(r => srv.listen(8140, r));
const browser = await chromium.launch({ channel: 'chrome', headless: true });

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + name); ok ? pass++ : fail++; };

// 1. Search palette: click trigger opens it, typing filters, Escape closes.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/', { waitUntil: 'networkidle' });
  await page.click('.ts-search-trigger');
  check('palette opens on click', await page.isVisible('.ts-palette-backdrop'));
  await page.fill('#tsPaletteInput', 'jwt');
  await page.waitForTimeout(120);
  const items = await page.$$eval('.ts-palette-item .pi-name', els => els.map(e => e.textContent));
  check('search "jwt" finds JWTRead', items.includes('JWTRead'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  check('Escape closes palette', !(await page.isVisible('.ts-palette-backdrop')));
  // Cmd/Ctrl+K opens it
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(120);
  check('Ctrl+K opens palette', await page.isVisible('.ts-palette-backdrop'));
  check('no JS errors on / ', errs.length === 0);
  await page.close();
}

// 2. TimezoneNow map: clicking a marker adds/removes it from the clock list.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/timezone/', { waitUntil: 'networkidle' });
  const before = await page.$$eval('#clocks tbody tr', rows => rows.length);
  // London is in the default list; click it on the map to remove it
  await page.click('.tzm-marker[data-tz="Europe/London"]');
  await page.waitForTimeout(150);
  const after = await page.$$eval('#clocks tbody tr', rows => rows.length);
  check('clicking a selected marker removes it from clocks', after === before - 1);
  // click again to re-add
  await page.click('.tzm-marker[data-tz="Europe/London"]');
  await page.waitForTimeout(150);
  const after2 = await page.$$eval('#clocks tbody tr', rows => rows.length);
  check('clicking again re-adds it', after2 === before);
  check('no JS errors on TimezoneNow', errs.length === 0);
  await page.close();
}

// 3. TZConvert: changing the slider updates the converted time; map reflects picked time.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/timeconvert/', { waitUntil: 'networkidle' });
  const before = await page.$eval('.tzc-time', el => el.textContent);
  await page.fill('#srcTime', '03:00');
  await page.dispatchEvent('#srcTime', 'input');
  await page.waitForTimeout(150);
  const after = await page.$eval('.tzc-time', el => el.textContent);
  check('changing source time updates converted time', before !== after);
  check('map renders in TZConvert', await page.isVisible('.tzm-svg'));
  check('no JS errors on TZConvert', errs.length === 0);
  await page.close();
}

// 4. JWT: claims table + countdown populate for a sample (unsigned-alg) token.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/jwt/', { waitUntil: 'networkidle' });
  // header {"alg":"HS256","typ":"JWT"} payload {"sub":"1234567890","name":"Jo","iat":1516239022,"exp":9999999999}
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.abc';
  await page.fill('#token', token);
  await page.waitForTimeout(150);
  const rows = await page.$$eval('#claimsBody tr', trs => trs.map(tr => tr.children[0].textContent.trim()));
  check('claims table lists sub/exp/iat', ['sub', 'exp', 'iat'].every(c => rows.includes(c)));
  const badge = await page.$eval('#expiry', el => el.textContent);
  check('expiry badge shows "Expires in"', badge.includes('Expires in'));
  check('no JS errors on JWTRead', errs.length === 0);
  await page.close();
}

await browser.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
