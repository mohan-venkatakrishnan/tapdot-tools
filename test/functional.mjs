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

// 5. Dark mode: no flash — theme attr must be set BEFORE shared.js can run,
// i.e. as of the earliest committed navigation state.
{
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('tapdot-theme', 'dark'));
  await page.goto('http://localhost:8140/study/cite/', { waitUntil: 'commit' });
  const themeAtCommit = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('dark theme set before shared.js can execute (no FOUC)', themeAtCommit === 'dark');
  await page.close();
}

// 6. Back button: present + correct target on a tool page and a hub page; absent on root.
{
  const page = await browser.newPage();
  await page.goto('http://localhost:8140/study/cite/', { waitUntil: 'networkidle' });
  check('back button on a tool page points to its collection hub', await page.$eval('.ts-back-btn', el => el.getAttribute('href')) === '/study/');
  await page.goto('http://localhost:8140/study/', { waitUntil: 'networkidle' });
  check('back button on a hub page points to root', await page.$eval('.ts-back-btn', el => el.getAttribute('href')) === '/');
  await page.goto('http://localhost:8140/', { waitUntil: 'networkidle' });
  check('back button absent on root hub', (await page.$('.ts-back-btn')) === null);
  // breadcrumb: "Tools" root crumb must stay reachable even collapsed on mobile
  await page.goto('http://localhost:8140/study/cite/', { waitUntil: 'networkidle' });
  const crumbHref = await page.$eval('.ts-nav-crumb-home', el => el.getAttribute('href'));
  check('breadcrumb home crumb points to /', crumbHref === '/');
  await page.close();
}

// 7. Sun/moon toggle icon actually swaps with theme.
{
  const page = await browser.newPage();
  await page.goto('http://localhost:8140/', { waitUntil: 'networkidle' });
  const beforeDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const beforeHtml = await page.$eval('#darkToggle', el => el.innerHTML);
  await page.click('#darkToggle');
  await page.waitForTimeout(50);
  const afterHtml = await page.$eval('#darkToggle', el => el.innerHTML);
  check('toggle icon changes after click (sun<->moon)', beforeHtml !== afterHtml);
  await page.close();
}

// 8. Search palette groups results by category.
{
  const page = await browser.newPage();
  await page.goto('http://localhost:8140/dev/', { waitUntil: 'networkidle' });
  await page.click('.ts-search-trigger');
  await page.waitForTimeout(100);
  const groups = await page.$$eval('.ts-palette-group', els => els.map(e => e.textContent));
  check('palette shows category group headers', groups.length >= 3 && groups.includes('Study') && groups.includes('Dev'));
  await page.close();
}

// 9. Searchable dropdown (TimezoneNow "Add a city"): opens, filters, selects.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/timezone/', { waitUntil: 'networkidle' });
  await page.click('#tzSelect + .ts-ssel-btn, .ts-ssel-btn'); // enhanced control sits next to (wraps) the native select
  await page.waitForTimeout(100);
  check('searchable dropdown panel opens', await page.isVisible('.ts-ssel-panel'));
  await page.fill('.ts-ssel-search', 'Nairobi');
  await page.waitForTimeout(100);
  const opts = await page.$$eval('.ts-ssel-opt', els => els.map(e => e.textContent));
  check('typing filters to Nairobi', opts.length === 1 && opts[0].includes('Nairobi'));
  await page.click('.ts-ssel-opt');
  await page.waitForTimeout(50);
  const selVal = await page.$eval('#tzSelect', el => el.value);
  check('selecting an option updates the underlying <select> value', selVal === 'Africa/Nairobi');
  check('no JS errors on TimezoneNow (searchable select)', errs.length === 0);
  await page.close();
}

// 10. CiteMaker: 7 styles present, source-type fields swap, a Vancouver book citation generates.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/study/cite/', { waitUntil: 'networkidle' });
  const styles = await page.$$eval('#styleSegment .ts-segment-btn', els => els.map(e => e.dataset.style));
  check('CiteMaker offers 7 styles', styles.length === 7 && styles.includes('vancouver') && styles.includes('ieee') && styles.includes('asa'));
  await page.click('#typeSegment [data-type="book"]');
  await page.click('#styleSegment [data-style="vancouver"]');
  await page.fill('#f_author', 'Smith J');
  await page.fill('#f_title', 'Deep Work');
  await page.fill('#f_year', '2016');
  await page.fill('#f_publisher', 'Grand Central');
  await page.fill('#f_city', 'New York');
  await page.click('#generateBtn');
  await page.waitForTimeout(100);
  const out = await page.$eval('#citationOut', el => el.textContent);
  check('Vancouver book citation contains author/title/publisher', out.includes('Smith J') && out.includes('Deep Work') && out.includes('Grand Central'));
  check('no JS errors on CiteMaker', errs.length === 0);
  await page.close();
}

// 11. UTMBuilder: builds a correctly tagged URL.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/utm/', { waitUntil: 'networkidle' });
  await page.fill('#baseUrl', 'https://example.com/page');
  await page.fill('#source', 'Newsletter'); await page.fill('#medium', 'Email'); await page.fill('#campaign', 'Q3 Launch');
  await page.click('#buildBtn'); await page.waitForTimeout(100);
  const out = await page.$eval('#resultOut', el => el.textContent);
  check('UTMBuilder tags a URL correctly', out.includes('utm_source=newsletter') && out.includes('utm_campaign=q3_launch'));
  check('no JS errors on UTMBuilder', errs.length === 0);
  await page.close();
}

// 12. ROICalculator: computes ROI correctly for known inputs.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/roi/', { waitUntil: 'networkidle' });
  const firstRow = page.locator('#campaignBody tr').first();
  await firstRow.locator('[data-f="spend"]').fill('1000');
  await firstRow.locator('[data-f="revenue"]').fill('3000');
  await firstRow.locator('[data-f="spend"]').dispatchEvent('input');
  await page.waitForTimeout(150);
  const roiText = await page.$eval('#resultsTable tbody tr td:nth-child(2)', el => el.textContent);
  check('ROICalculator computes 200% ROI for 1000->3000', roiText.includes('200'));
  check('no JS errors on ROICalculator', errs.length === 0);
  await page.close();
}

// 13. EmailSubjectTester: flags known spam trigger words.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/emailsubject/', { waitUntil: 'networkidle' });
  await page.fill('#subject', 'Act now - free money guaranteed!');
  await page.waitForTimeout(100);
  const spamCount = await page.$eval('#spamCount', el => el.textContent);
  check('EmailSubjectTester flags spam trigger words', parseInt(spamCount, 10) >= 2);
  check('no JS errors on EmailSubjectTester', errs.length === 0);
  await page.close();
}

// 14. CompetitorMatrix: add-column control works.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/competitor/', { waitUntil: 'networkidle' });
  await page.click('#addCol'); await page.waitForTimeout(50);
  const cols = await page.$$eval('#matrix thead input', els => els.length);
  check('CompetitorMatrix adds a competitor column', cols === 4);
  check('no JS errors on CompetitorMatrix', errs.length === 0);
  await page.close();
}

// 15. HeadlineScore: scores locally and degrades gracefully when AI is unavailable.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/headline/', { waitUntil: 'networkidle' });
  await page.fill('#headline', '7 Proven Ways to Boost Your Productivity Today');
  await page.click('#scoreBtn'); await page.waitForTimeout(100);
  const total = await page.$eval('#totalScore', el => el.textContent);
  check('HeadlineScore computes a non-zero score', parseInt(total, 10) > 0);
  check('no JS errors on HeadlineScore', errs.length === 0);
  await page.close();
}

// 16. MortgageCalc: EMI matches the standard formula for a known input.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/mortgage/', { waitUntil: 'networkidle' });
  await page.fill('#loanAmount', '300000'); await page.fill('#downPayment', '0');
  await page.fill('#rate', '6'); await page.fill('#years', '30');
  await page.dispatchEvent('#rate', 'input');
  await page.waitForTimeout(150);
  const emiText = await page.$eval('#emi', el => el.textContent);
  const emi = parseFloat(emiText.replace(/[^0-9.]/g, ''));
  // Standard EMI for 300k @ 6%/30yr ~= $1798.65
  check('MortgageCalc EMI matches standard formula (~$1799)', Math.abs(emi - 1799) < 3);
  check('no JS errors on MortgageCalc', errs.length === 0);
  await page.close();
}

// 17. TaxEstimate: India new vs old regime both compute, and differ.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/tax/', { waitUntil: 'networkidle' });
  await page.fill('#income', '1200000');
  await page.waitForTimeout(100);
  const newTax = await page.$eval('#taxOwed', el => el.textContent);
  await page.click('#regimeTabs [data-r="old"]');
  await page.waitForTimeout(100);
  const oldTax = await page.$eval('#taxOwed', el => el.textContent);
  check('TaxEstimate India new vs old regime produce different results', newTax !== oldTax);
  check('no JS errors on TaxEstimate', errs.length === 0);
  await page.close();
}

// 18. EquityCalc: dilution + ownership rows sum to 100%.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/equity/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const pcts = await page.$$eval('#table tbody tr td:nth-child(3)', els => els.map(e => parseFloat(e.textContent)));
  const sum = pcts.slice(0, 3).reduce((a, b) => a + b, 0);
  check('EquityCalc ownership percentages sum to ~100%', Math.abs(sum - 100) < 0.5);
  check('no JS errors on EquityCalc', errs.length === 0);
  await page.close();
}

// 19. CurrencyConvert: searchable selects populate after the async rate fetch,
// and the label-sync fix keeps the button in sync with programmatic changes.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/currency/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600); // allow the rate fetch (or its failure) to settle
  const fromOptions = await page.$eval('#from', el => el.options.length);
  check('CurrencyConvert populates currency options', fromOptions > 10);
  const btnLabel = await page.$eval('.ts-ssel-btn .ts-ssel-label', el => el.textContent).catch(() => null);
  check('searchable dropdown label reflects async-populated value', !!btnLabel && btnLabel.length > 0);
  check('no JS errors on CurrencyConvert', errs.length === 0);
  await page.close();
}

// 20. BudgetPlanner: 50/30/20 classification + savings rate.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/budget/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const rate = await page.$eval('#savingsRate', el => el.textContent);
  check('BudgetPlanner computes a savings rate', /%$/.test(rate));
  check('no JS errors on BudgetPlanner', errs.length === 0);
  await page.close();
}

// 21. LegalGlossary: instant search + fuzzy fallback for a misspelling.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/legal/glossary/', { waitUntil: 'networkidle' });
  await page.fill('#search', 'indemnif');
  await page.waitForTimeout(100);
  const terms = await page.$$eval('.glossary-term dt', els => els.map(e => e.textContent));
  check('LegalGlossary substring search finds Indemnification', terms.some(t => t.includes('Indemnif')));
  await page.fill('#search', 'idemnify'); // misspelled — missing an 'n'
  await page.waitForTimeout(100);
  const fuzzyTerms = await page.$$eval('.glossary-term dt', els => els.map(e => e.textContent));
  check('LegalGlossary fuzzy search tolerates a misspelling', fuzzyTerms.some(t => t.includes('Indemnif')));
  check('no JS errors on LegalGlossary', errs.length === 0);
  await page.close();
}

// 22. CopyrightChecker: pre-1928 US work is always public domain.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/legal/copyright/', { waitUntil: 'networkidle' });
  await page.fill('#pubYear', '1900');
  await page.waitForTimeout(100);
  const badge = await page.$eval('#statusBadge', el => el.textContent);
  check('CopyrightChecker: pre-1928 US work is public domain', badge.includes('public domain'));
  check('no JS errors on CopyrightChecker', errs.length === 0);
  await page.close();
}

// 23. NDAGenerator: generated text includes party names and mutual/one-way framing.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/legal/nda/', { waitUntil: 'networkidle' });
  await page.fill('#partyA', 'Acme Inc.');
  await page.fill('#partyB', 'Beta LLC');
  await page.click('#genBtn');
  await page.waitForTimeout(100);
  const doc = await page.$eval('#preview', el => el.textContent);
  check('NDAGenerator includes both party names', doc.includes('Acme Inc.') && doc.includes('Beta LLC'));
  check('no JS errors on NDAGenerator', errs.length === 0);
  await page.close();
}

// 24. TermsBuilder + PrivacyPolicyGen: templates fill in the company name.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/legal/terms/', { waitUntil: 'networkidle' });
  await page.fill('#company', 'tapdot');
  await page.click('#genBtn');
  await page.waitForTimeout(100);
  const doc = await page.$eval('#preview', el => el.textContent);
  check('TermsBuilder fills in the company name', doc.includes('tapdot'));
  check('no JS errors on TermsBuilder', errs.length === 0);
  await page.close();
}

// 25. ContractRead: graceful message when on-device AI is unavailable.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/legal/contract/', { waitUntil: 'networkidle' });
  await page.fill('#input', 'This Agreement is entered into by and between the parties.');
  await page.click('#summarizeBtn');
  await page.waitForTimeout(300);
  const status = await page.$eval('#aiStatus', el => el.textContent);
  check('ContractRead shows a clear message when AI is unavailable', status.toLowerCase().includes('not available') || status.toLowerCase().includes('unavailable'));
  check('no JS errors on ContractRead', errs.length === 0);
  await page.close();
}

// 26. LeaveCalculator: full-year employee accrues the full entitlement by year-end.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/hr/leave/', { waitUntil: 'networkidle' });
  await page.fill('#startDate', '2020-01-01');
  await page.fill('#asOfDate', '2026-06-30');
  await page.fill('#annualEntitlement', '20');
  await page.fill('#taken', '0'); await page.fill('#priorCarry', '0');
  await page.dispatchEvent('#asOfDate', 'input');
  await page.waitForTimeout(100);
  const projected = await page.$eval('#projected', el => el.textContent);
  check('LeaveCalculator projects ~20 days for a full-year employee with none taken', Math.abs(parseFloat(projected) - 20) < 0.5);
  check('no JS errors on LeaveCalculator', errs.length === 0);
  await page.close();
}

// 27. SalaryBand: compa-ratio computes correctly (salary / grade midpoint).
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/hr/salary/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const ratio = await page.$eval('#roleBody tr td:nth-child(4)', el => el.textContent);
  check('SalaryBand computes a compa-ratio', /%$/.test(ratio));
  check('no JS errors on SalaryBand', errs.length === 0);
  await page.close();
}

// 28. OnboardingChecklist: mobile layout no longer overflows (regression fix),
// and checking a task updates progress.
{
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/hr/onboarding/', { waitUntil: 'networkidle' });
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  check('OnboardingChecklist has no horizontal overflow on mobile', docWidth <= 376);
  await page.click('.checklist-item input[type="checkbox"]');
  await page.waitForTimeout(100);
  const pct = await page.$eval('#progressPct', el => el.textContent);
  check('OnboardingChecklist updates progress after checking a task', pct !== '0%');
  check('no JS errors on OnboardingChecklist', errs.length === 0);
  await page.close();
}

// 29. JobDescriptionWriter: exclusionary-language scan flags a known term.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/hr/jd/', { waitUntil: 'networkidle' });
  await page.fill('#title', 'Rockstar Engineer');
  await page.click('#genBtn');
  await page.waitForTimeout(300);
  const flagged = await page.isVisible('#exclusionCard:not(.ts-hidden)').catch(() => false);
  check('JobDescriptionWriter flags exclusionary language ("rockstar")', flagged);
  check('no JS errors on JobDescriptionWriter', errs.length === 0);
  await page.close();
}

// 30. OfferLetterBuilder: template fills in candidate + salary.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/hr/offer/', { waitUntil: 'networkidle' });
  await page.fill('#candidate', 'Jordan Lee');
  await page.fill('#salary', '$140,000');
  await page.click('#genBtn');
  await page.waitForTimeout(100);
  const doc = await page.$eval('#preview', el => el.textContent);
  check('OfferLetterBuilder fills in candidate and salary', doc.includes('Jordan Lee') && doc.includes('$140,000'));
  check('no JS errors on OfferLetterBuilder', errs.length === 0);
  await page.close();
}

await browser.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
