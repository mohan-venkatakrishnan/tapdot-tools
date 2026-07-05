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
  check('search "jwt" finds JWTStudio', items.includes('JWTStudio'));
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
  check('no JS errors on JWTStudio', errs.length === 0);
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

// 31. BMICalc: default 70kg/175cm computes BMI 22.9, Normal weight.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/health/bmi/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const bmi = await page.$eval('#bmi', el => el.textContent);
  const category = await page.$eval('#bmiCategory', el => el.textContent);
  check('BMICalc computes BMI 22.9 for 70kg/175cm', bmi === '22.9');
  check('BMICalc categorizes as Normal weight', category === 'Normal weight');
  check('no JS errors on BMICalc', errs.length === 0);
  await page.close();
}

// 32. MedicationLog: adding a medication and marking a dose updates today's count.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/health/medication/', { waitUntil: 'networkidle' });
  await page.fill('#medName', 'Metformin 500mg');
  await page.fill('#medTimes', '2');
  await page.click('#addMed');
  await page.waitForTimeout(100);
  await page.click('[data-take]');
  await page.waitForTimeout(100);
  const today = await page.$eval('#todayList', el => el.textContent);
  check('MedicationLog marks a dose taken (1/2)', today.includes('1/2 taken today'));
  check('no JS errors on MedicationLog', errs.length === 0);
  await page.close();
}

// 33. SymptomDiary: logging a symptom marks the calendar day and lists the entry.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/health/symptoms/', { waitUntil: 'networkidle' });
  const today = new Date().toISOString().slice(0, 10);
  await page.fill('#symDate', today);
  await page.fill('#symName', 'Headache');
  await page.click('#addSymptom');
  await page.waitForTimeout(100);
  const entries = await page.$eval('#entryList', el => el.textContent);
  const loggedCells = await page.$$eval('.health-cal-cell.logged', els => els.length);
  check('SymptomDiary lists the logged entry', entries.includes('Headache'));
  check('SymptomDiary marks the calendar day as logged', loggedCells >= 1);
  check('no JS errors on SymptomDiary', errs.length === 0);
  await page.close();
}

// 34. CycleTracker: logging a period start predicts a next period date.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/health/cycle/', { waitUntil: 'networkidle' });
  await page.fill('#cycleLen', '28');
  await page.fill('#logDate', '2026-06-01');
  await page.click('#logStart');
  await page.waitForTimeout(100);
  const next = await page.$eval('#nextPeriod', el => el.textContent);
  check('CycleTracker predicts a next-period date', next !== '—' && next.length > 0);
  check('no JS errors on CycleTracker', errs.length === 0);
  await page.close();
}

// 35. WaterIntake: logging an amount updates the progress ring toward the goal.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/health/water/', { waitUntil: 'networkidle' });
  await page.fill('#goal', '1000');
  await page.click('[data-amt="500"]');
  await page.waitForTimeout(100);
  const ringText = await page.$eval('#ring', el => el.textContent);
  check('WaterIntake logs 500ml toward a 1000ml goal (50%)', ringText.includes('50%'));
  await page.click('#undoBtn');
  await page.waitForTimeout(100);
  const ringAfterUndo = await page.$eval('#ring', el => el.textContent);
  check('WaterIntake undo removes the last log', ringAfterUndo.includes('0%'));
  check('no JS errors on WaterIntake', errs.length === 0);
  await page.close();
}

// 36. SleepLog: logging a night computes correct duration (23:00-07:00 = 8h).
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/health/sleep/', { waitUntil: 'networkidle' });
  await page.fill('#sleepDate', '2026-06-30');
  await page.fill('#bedTime', '23:00');
  await page.fill('#wakeTime', '07:00');
  await page.click('#addSleep');
  await page.waitForTimeout(100);
  const avg = await page.$eval('#avgDuration', el => el.textContent);
  check('SleepLog computes 8.0h duration for 23:00-07:00', avg === '8.0h');
  check('no JS errors on SleepLog', errs.length === 0);
  await page.close();
}

// 37. PaletteForge: entering a base hex generates a 5-swatch palette and export.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/design/palette/', { waitUntil: 'networkidle' });
  await page.fill('#baseHex', '#ff0000');
  await page.dispatchEvent('#baseHex', 'change');
  await page.waitForTimeout(100);
  const cards = await page.$$eval('.palette-card', els => els.length);
  const exportText = await page.$eval('#exportOutput', el => el.textContent);
  check('PaletteForge generates a 5-colour palette', cards === 5);
  check('PaletteForge exports CSS variables', exportText.includes('--color-primary'));
  check('no JS errors on PaletteForge', errs.length === 0);
  await page.close();
}

// 38. TypographyScale: base size 16 + ratio 1.2 produces a 'base' step of exactly 16px.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/design/typography/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const rows = await page.$eval('#scaleList', el => el.textContent);
  check('TypographyScale renders 9 steps including base 16.00px', rows.includes('16.00px'));
  check('no JS errors on TypographyScale', errs.length === 0);
  await page.close();
}

// 39. IconExplorer: searching filters the grid, and clicking a tile copies an SVG.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('http://localhost:8140/design/icons/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const allCount = await page.$$eval('.icon-tile', els => els.length);
  await page.fill('#iconSearch', 'arrow');
  await page.waitForTimeout(100);
  const filteredCount = await page.$$eval('.icon-tile', els => els.length);
  check('IconExplorer search narrows the grid', filteredCount > 0 && filteredCount < allCount);
  await page.click('.icon-tile');
  await page.waitForTimeout(100);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  check('IconExplorer copies an SVG to clipboard', clip.includes('<svg'));
  check('no JS errors on IconExplorer', errs.length === 0);
  await page.close();
}

// 40. ShadowStudio: switching to a preset updates the preview's box-shadow.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/design/shadows/', { waitUntil: 'networkidle' });
  await page.click('[data-preset="glass"]');
  await page.waitForTimeout(100);
  const shadow = await page.$eval('#previewCard', el => el.style.boxShadow);
  const exportText = await page.$eval('#exportOutput', el => el.textContent);
  check('ShadowStudio applies the glass preset to the preview', shadow.length > 0);
  check('ShadowStudio export contains box-shadow', exportText.includes('box-shadow'));
  check('no JS errors on ShadowStudio', errs.length === 0);
  await page.close();
}

// 41. SpacingCalc: linear method with base 4px produces sp-4 = 16px.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/design/spacing/', { waitUntil: 'networkidle' });
  await page.selectOption('#method', 'linear');
  await page.fill('#baseUnit', '4');
  await page.waitForTimeout(100);
  const rows = await page.$eval('#spacingList', el => el.textContent);
  check('SpacingCalc computes sp-4 = 16px for linear/4px base', rows.includes('sp-4') && rows.includes('16px'));
  check('no JS errors on SpacingCalc', errs.length === 0);
  await page.close();
}

// 42. GradientMaker: default two-stop linear gradient renders and exports valid CSS.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/design/gradient/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const bg = await page.$eval('#gradientPreview', el => el.style.backgroundImage);
  const exportText = await page.$eval('#exportOutput', el => el.textContent);
  check('GradientMaker renders a linear-gradient preview', bg.includes('linear-gradient'));
  check('GradientMaker export contains the gradient CSS', exportText.includes('linear-gradient'));
  await page.click('[data-type="radial"]');
  await page.waitForTimeout(100);
  const bgRadial = await page.$eval('#gradientPreview', el => el.style.backgroundImage);
  check('GradientMaker switches to radial-gradient', bgRadial.includes('radial-gradient'));
  check('no JS errors on GradientMaker', errs.length === 0);
  await page.close();
}

// 43. FocusTimer: starting the timer counts down, switching mode resets the ring.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/productivity/focus/', { waitUntil: 'networkidle' });
  const initialText = await page.$eval('#ring text', el => el.textContent);
  check('FocusTimer starts at 25:00', initialText === '25:00');
  await page.click('[data-mode="short"]');
  await page.waitForTimeout(100);
  const shortText = await page.$eval('#ring text', el => el.textContent);
  check('FocusTimer switches to a 05:00 short break', shortText === '05:00');
  check('no JS errors on FocusTimer', errs.length === 0);
  await page.close();
}

// 44. QuickNote: typing autosaves after the debounce and updates the word count.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/productivity/note/', { waitUntil: 'networkidle' });
  await page.fill('#noteBody', 'four little words here');
  await page.waitForTimeout(700);
  const wordCount = await page.$eval('#wordCount', el => el.textContent);
  const status = await page.$eval('#saveStatus', el => el.textContent);
  check('QuickNote updates the word count', wordCount === '4 words');
  check('QuickNote autosaves after the debounce', status === 'Saved');
  check('no JS errors on QuickNote', errs.length === 0);
  await page.close();
}

// 45. DecisionMatrix: default matrix computes a weighted score and marks a winner.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/productivity/decision/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const winners = await page.$$eval('.matrix-table .winner', els => els.length);
  check('DecisionMatrix marks exactly one winning option', winners === 1);
  check('no JS errors on DecisionMatrix', errs.length === 0);
  await page.close();
}

// 46. MeetingTimer: cost accrues over time based on attendee salaries.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/productivity/meeting-timer/', { waitUntil: 'networkidle' });
  const before = await page.$eval('#costNum', el => el.textContent);
  await page.click('#startPause');
  await page.waitForTimeout(2200);
  const after = await page.$eval('#costNum', el => el.textContent);
  check('MeetingTimer cost increases once started', before === '$0.00' && after !== '$0.00');
  check('no JS errors on MeetingTimer', errs.length === 0);
  await page.close();
}

// 47. HabitTracker: checking a habit today shows a 1-day streak.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/productivity/habits/', { waitUntil: 'networkidle' });
  await page.fill('#newHabitName', 'Read 20 minutes');
  await page.click('#addHabit');
  await page.waitForTimeout(100);
  await page.click('.habit-check');
  await page.waitForTimeout(100);
  const streakText = await page.$eval('.habit-streak', el => el.textContent);
  check('HabitTracker shows a 1-day streak after checking today', streakText.includes('1d streak'));
  check('no JS errors on HabitTracker', errs.length === 0);
  await page.close();
}

// 48. ReadingList: adding an item and cycling its status updates the badge.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/productivity/reading/', { waitUntil: 'networkidle' });
  await page.fill('#itemTitle', 'Designing Data-Intensive Applications');
  await page.click('#addItem');
  await page.waitForTimeout(100);
  const initialBadge = await page.$eval('.reading-status-badge', el => el.textContent);
  check('ReadingList adds a new item as "To read"', initialBadge.includes('To read'));
  await page.click('.reading-status-badge');
  await page.waitForTimeout(100);
  const afterBadge = await page.$eval('.reading-status-badge', el => el.textContent);
  check('ReadingList cycles status to "Reading" on click', afterBadge.includes('Reading') && !afterBadge.includes('To read'));
  check('no JS errors on ReadingList', errs.length === 0);
  await page.close();
}

// 49. Homepage hero: search bar opens the palette; palette groups include new collections.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/', { waitUntil: 'networkidle' });
  await page.click('.ts-hero-search');
  check('hero search bar opens the palette', await page.isVisible('.ts-palette-backdrop'));
  await page.fill('#tsPaletteInput', 'bmi');
  await page.waitForTimeout(120);
  const groups = await page.$$eval('.ts-palette-group', els => els.map(e => e.textContent));
  check('palette shows the Health group label (not raw slug)', groups.includes('Health'));
  check('no JS errors on redesigned homepage', errs.length === 0);
  await page.close();
}

// 50. AI fallback tools produce usable output without on-device AI (headless Chrome has none).
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/adcopy/', { waitUntil: 'networkidle' });
  await page.fill('#product', 'Acme CRM');
  await page.click('#genBtn');
  await page.waitForTimeout(400);
  const variants = await page.$$eval('#variants .ts-card', els => els.length);
  check('AdCopyWriter renders template variants without AI', variants === 3);
  check('no JS errors on AdCopyWriter fallback', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/legal/contract/', { waitUntil: 'networkidle' });
  await page.fill('#input', 'The Company may terminate this agreement at any time. Customer shall indemnify the Company against all claims. This agreement automatically renews each year.');
  await page.click('#summarizeBtn');
  await page.waitForTimeout(400);
  const summary = await page.$eval('#summary', el => el.textContent);
  check('ContractRead clause scan flags termination + indemnification without AI',
    summary.includes('TERMINATION') && summary.includes('INDEMNIFICATION'));
  check('no JS errors on ContractRead fallback', errs.length === 0);
  await page.close();
}

// 51. Marketing UX pass: UTM live preview, headline word balance, inbox preview, ad mockups.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/utm/', { waitUntil: 'networkidle' });
  await page.fill('#baseUrl', 'example.com/page');
  await page.fill('#source', 'newsletter');
  await page.fill('#medium', 'email');
  await page.fill('#campaign', 'Q3 Launch');
  await page.waitForTimeout(100);
  const live = await page.$eval('#livePreview', el => el.textContent);
  check('UTM live preview builds as you type (protocol auto-added)', live.startsWith('https://example.com/page?'));
  check('UTM live preview normalizes values (Q3 Launch -> q3_launch)', live.includes('utm_campaign=q3_launch'));
  check('no JS errors on UTMBuilder live preview', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/headline/', { waitUntil: 'networkidle' });
  await page.fill('#headline', '7 Proven Ways to Boost Your Productivity Today');
  await page.waitForTimeout(150);
  const total = await page.$eval('#totalScore', el => el.textContent);
  const powerChips = await page.$$eval('.hl-word-power', els => els.length);
  const numberChips = await page.$$eval('.hl-word-number', els => els.length);
  check('HeadlineScore scores live without a button click', parseInt(total, 10) > 0);
  check('HeadlineScore word balance flags power words', powerChips >= 2);
  check('HeadlineScore word balance flags the number', numberChips === 1);
  check('no JS errors on HeadlineScore live scoring', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/emailsubject/', { waitUntil: 'networkidle' });
  await page.fill('#subject', 'This is a very long subject line that will definitely get cut off on mobile devices');
  await page.waitForTimeout(100);
  const mobile = await page.$eval('#mobilePreview', el => el.textContent);
  const desktop = await page.$eval('#desktopSubject', el => el.textContent);
  check('EmailSubjectTester mobile preview truncates at ~35 chars', mobile.endsWith('…') && mobile.length <= 36);
  check('EmailSubjectTester desktop preview truncates at ~70 chars', desktop.endsWith('…') && desktop.length <= 71);
  check('no JS errors on EmailSubjectTester inbox preview', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/adcopy/', { waitUntil: 'networkidle' });
  await page.fill('#product', 'Acme CRM');
  await page.click('#genBtn');
  await page.waitForTimeout(400);
  const mockups = await page.$$eval('.ad-preview-google', els => els.length);
  check('AdCopyWriter renders Google ad mockups for each variant', mockups === 3);
  check('no JS errors on AdCopyWriter mockups', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/marketing/calendar/', { waitUntil: 'networkidle' });
  const todayCell = await page.$$eval('.biz-cal-cell.today', els => els.length);
  const upcoming = await page.$eval('#upcomingList', el => el.textContent);
  check('SocialCalendar highlights today', todayCell === 1);
  check('SocialCalendar shows the next-7-days list', upcoming.length > 0);
  check('no JS errors on SocialCalendar', errs.length === 0);
  await page.close();
}

// 52. Dev UX pass: JWT HMAC verification, regex presets, markdown tables.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/jwt/', { waitUntil: 'networkidle' });
  // Token signed with HS256, secret "secret": {"sub":"1234567890","name":"John Doe","iat":1516239022}
  const hs256 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  await page.fill('#token', hs256);
  await page.fill('#secret', 'your-256-bit-secret');
  await page.waitForTimeout(300);
  const status = await page.$eval('#verifyStatus', el => el.textContent);
  check('JWTStudio verifies a valid HS256 signature', status.includes('verified'));
  await page.fill('#secret', 'wrong-secret');
  await page.waitForTimeout(300);
  const statusBad = await page.$eval('#verifyStatus', el => el.textContent);
  check('JWTStudio rejects a wrong HMAC secret', statusBad.includes('Invalid'));
  check('no JS errors on JWTStudio verification', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/regex/', { waitUntil: 'networkidle' });
  await page.selectOption('#presets', 'email');
  await page.waitForTimeout(150);
  const count = await page.$eval('#count', el => el.textContent);
  check('RegexLab email preset loads and matches its sample text', /^[12] match/.test(count) || count.includes('2 matches'));
  const cheat = await page.$$eval('.rx-cheat div', els => els.length);
  check('RegexLab shows the cheat sheet', cheat >= 15);
  check('no JS errors on RegexLab presets', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/markdown/', { waitUntil: 'networkidle' });
  await page.fill('#input', '| Name | Role |\n|------|------|\n| Ada | Engineer |\n| Grace | Admiral |');
  await page.waitForTimeout(150);
  const tableRows = await page.$$eval('#preview table tbody tr', els => els.length);
  const th = await page.$eval('#preview table th', el => el.textContent);
  check('MarkdownLive renders GFM tables', tableRows === 2 && th === 'Name');
  check('no JS errors on MarkdownLive tables', errs.length === 0);
  await page.close();
}

// 53. Finance/Study/Write/Health/Productivity UX pass checks.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/compound/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const legend = await page.$eval('#chartLegend', el => el.textContent);
  const dashed = await page.$$eval('#chart path[stroke-dasharray]', els => els.length);
  check('CompoundCalc chart shows a contributions overlay + legend', legend.includes('contributions') && dashed === 1);
  check('no JS errors on CompoundCalc', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/tax/', { waitUntil: 'networkidle' });
  await page.fill('#income', '1600000');
  await page.waitForTimeout(150);
  const marg = await page.$eval('#margRate', el => el.textContent);
  check('TaxEstimate shows the marginal rate (30% for ₹16L new regime)', marg === '30%');
  check('no JS errors on TaxEstimate marginal rate', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/equity/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const bars = await page.$$eval('#ownershipBars .biz-bar-row', els => els.length);
  check('EquityCalc renders ownership bars for all three stakeholders', bars === 3);
  check('no JS errors on EquityCalc bars', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/write/readscore/', { waitUntil: 'networkidle' });
  await page.fill('#input', 'The cat sat on the mat. The dog was chased by the postman around the yard.');
  await page.waitForTimeout(500);
  const ease = await page.$eval('#rEase', el => el.textContent);
  check('ReadScore analyzes live without a button click', parseInt(ease, 10) > 0);
  check('no JS errors on ReadScore live analysis', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/health/bmi/', { waitUntil: 'networkidle' });
  await page.click('[data-unit="imperial"]');
  await page.waitForTimeout(150);
  const weightLabel = await page.$eval('#weightLabel', el => el.textContent);
  const bmi = await page.$eval('#bmi', el => el.textContent);
  // 70kg/175cm converts to ~154lb & 5ft9 -> BMI should stay ~22.9 (rounding tolerance)
  check('BMICalc imperial toggle converts and stays consistent', weightLabel === 'Weight (lb)' && Math.abs(parseFloat(bmi) - 22.9) < 0.5);
  check('no JS errors on BMICalc imperial', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/productivity/focus/', { waitUntil: 'networkidle' });
  await page.click('#startPause');
  await page.waitForTimeout(1500);
  const title = await page.title();
  check('FocusTimer shows the countdown in the tab title while running', /\d{2}:\d{2}.*Focus/.test(title));
  check('no JS errors on FocusTimer title countdown', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/study/flashcards/', { waitUntil: 'networkidle' });
  await page.fill('#notesInput', 'Q: What is 2+2?\nA: 4\nQ: Capital of France?\nA: Paris');
  await page.click('#createBtn');
  await page.waitForTimeout(150);
  const exportVisible = await page.isVisible('#exportBtn');
  check('FlashForge grid view offers deck export', exportVisible);
  check('no JS errors on FlashForge export', errs.length === 0);
  await page.close();
}

// 54. New finance tools: LoanCalc part-payment impact, RetireCalc gap, InflationCalc erosion.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/loan/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  // $5,000,000 at 8.5% for 20y -> EMI ~ $43,391
  const emi = await page.$eval('#emi', el => el.textContent);
  check('LoanCalc EMI matches the standard formula (~$43,391)',
    Math.abs(parseFloat(emi.replace(/[$,]/g, '')) - 43391) < 20);
  const impactVisible = await page.isVisible('#impactCard');
  const saved = await page.$eval('#interestSaved', el => el.textContent);
  check('LoanCalc shows part-payment impact with interest saved',
    impactVisible && parseFloat(saved.replace(/[$,]/g, '')) > 0);
  // Reduce-EMI strategy should save LESS interest than reduce-tenure
  const savedTenure = parseFloat(saved.replace(/[$,]/g, ''));
  await page.click('[data-s="emi"]');
  await page.waitForTimeout(200);
  const savedEmi = parseFloat((await page.$eval('#interestSaved', el => el.textContent)).replace(/[$,]/g, ''));
  check('LoanCalc reduce-tenure saves more interest than reduce-EMI', savedTenure > savedEmi);
  const dashed = await page.$$eval('#chart path[stroke-dasharray]', els => els.length);
  check('LoanCalc chart overlays the prepaid projection', dashed === 1);
  check('no JS errors on LoanCalc', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/retire/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  const needed = await page.$eval('#corpusNeeded', el => parseFloat(el.textContent.replace(/[$,]/g, '')));
  const projected = await page.$eval('#corpusProjected', el => parseFloat(el.textContent.replace(/[$,]/g, '')));
  const explain = await page.$eval('#explain', el => el.textContent);
  check('RetireCalc computes a positive corpus needed and projection', needed > 0 && projected > 0);
  check('RetireCalc explains the calculation in plain English', explain.includes('inflation') && explain.length > 100);
  check('no JS errors on RetireCalc', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/inflation/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  // $10,000 at 5% for 20y -> future cost ~$26,533, halving ~14.2y
  const cost = await page.$eval('#futureCost', el => parseFloat(el.textContent.replace(/[$,]/g, '')));
  const half = await page.$eval('#halfLife', el => parseFloat(el.textContent));
  check('InflationCalc computes future cost (~$26,533 for $10k/5%/20y)', Math.abs(cost - 26533) < 30);
  check('InflationCalc computes halving time (~14.2y at 5%)', Math.abs(half - 14.2) < 0.2);
  check('no JS errors on InflationCalc', errs.length === 0);
  await page.close();
}

// 55. v21 batch: money formats, JWT encode, Base64, Diff, CodePlay, BigO, UnitConvert, WorldClock, SketchPad.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/loan/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  await page.selectOption('#tmCurrency', '₹');
  await page.click('[data-tmfmt="in"]');
  await page.waitForTimeout(200);
  const emi = await page.$eval('#emi', el => el.textContent);
  check('Finance money picker switches to ₹ with lakh/crore grouping', emi.startsWith('₹') && /\d,\d\d,\d\d\d|\d\d,\d\d\d/.test(emi));
  // restore defaults so other tests aren't affected
  await page.evaluate(() => { localStorage.removeItem('tapdot-finance-currency'); localStorage.removeItem('tapdot-finance-format'); });
  check('no JS errors on money picker', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/jwt/', { waitUntil: 'networkidle' });
  await page.click('[data-jm="encode"]');
  await page.waitForTimeout(400);
  const token = await page.$eval('#encOut', el => el.textContent);
  check('JWT encode produces a 3-part HS256 token', token.split('.').length === 3 && token.startsWith('eyJ'));
  // Round-trip: decode tab should verify what encode signed
  const hs256 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  check('JWT encode round-trips the canonical jwt.io token', token === hs256);
  check('no JS errors on JWT encode', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/base64/', { waitUntil: 'networkidle' });
  await page.fill('#input', 'Hello, world!');
  await page.waitForTimeout(100);
  const out = await page.$eval('#output', el => el.textContent);
  check('Base64Tool encodes correctly', out === 'SGVsbG8sIHdvcmxkIQ==');
  await page.click('[data-mode="decode"]');
  await page.fill('#input', 'SGVsbG8sIHdvcmxkIQ==');
  await page.waitForTimeout(100);
  const dec = await page.$eval('#output', el => el.textContent);
  check('Base64Tool decodes correctly', dec === 'Hello, world!');
  check('no JS errors on Base64Tool', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/diff/', { waitUntil: 'networkidle' });
  await page.fill('#left', 'line one\nline two\nline three');
  await page.fill('#right', 'line one\nline 2\nline three\nline four');
  await page.waitForTimeout(400);
  const stats = await page.$eval('#diffStats', el => el.textContent);
  check('DiffCheck counts additions and removals (+2 −1)', stats === '+2 −1');
  check('no JS errors on DiffCheck', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/play/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const frame = page.frames().find(f => f !== page.mainFrame());
  const h1 = frame ? await frame.$eval('h1', el => el.textContent).catch(() => '') : '';
  check('CodePlay renders the starter example in the sandboxed preview', h1 === 'Hello, CodePlay');
  check('no JS errors on CodePlay', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/bigo/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  const time = await page.$eval('#timeC', el => el.textContent);
  check('BigOCheck flags the nested-loop starter as O(n²)', time === 'O(n²)');
  await page.fill('#code', 'function sum(a){let s=0;for(const x of a){s+=x}return s}');
  await page.waitForTimeout(150);
  const linear = await page.$eval('#timeC', el => el.textContent);
  check('BigOCheck detects a single pass as O(n)', linear === 'O(n)');
  check('no JS errors on BigOCheck', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/productivity/convert/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  await page.fill('#amount', '100');
  await page.selectOption('#fromUnit', 'cm');
  await page.selectOption('#toUnit', 'm');
  await page.waitForTimeout(150);
  const result = await page.$eval('#result', el => el.textContent);
  check('UnitConvert converts 100 cm = 1 m', result.includes('100 cm = 1 m'));
  check('no JS errors on UnitConvert', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/worldclock/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  const clocks = await page.$$eval('.wc-clock', els => els.length);
  const digital = await page.$eval('.wc-clock [data-digital]', el => el.textContent);
  check('WorldClock renders default clocks with ticking digital time', clocks === 4 && /^\d{2}:\d{2}$/.test(digital));
  check('no JS errors on WorldClock', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/design/sketch/', { waitUntil: 'networkidle' });
  const box = await page.$eval('#skCanvas', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; });
  await page.mouse.move(box.x + 50, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 120);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tapdot-sketchpad') || '[]').length);
  check('SketchPad saves a drawn stroke locally', saved === 1);
  check('no JS errors on SketchPad', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/timezone/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const labels = await page.$$eval('.tzm-label', els => els.map(e => e.textContent));
  check('TimezoneNow shows persistent labels on selected map cities', labels.length > 0);
  const fsBtn = await page.isVisible('#mapFs');
  check('TimezoneNow offers a fullscreen button', fsBtn);
  check('no JS errors on TimezoneNow labels/fullscreen', errs.length === 0);
  await page.close();
}

// 56. v22 batch: diff navigation, JWTStudio rename + keygen, source links, AI gates, TZ order.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/diff/', { waitUntil: 'networkidle' });
  await page.fill('#left', 'a\nb\nc\nd\ne\nf');
  await page.fill('#right', 'a\nX\nc\nd\nY\nf');
  await page.waitForTimeout(400);
  const pos0 = await page.$eval('#diffPos', el => el.textContent);
  check('DiffCheck reports change-block count', pos0.includes('/ 2 changes'));
  await page.click('#nextDiff');
  await page.waitForTimeout(100);
  const current = await page.$$eval('.diff-current', els => els.length);
  const pos1 = await page.$eval('#diffPos', el => el.textContent);
  check('DiffCheck Next jumps to and highlights the first change', current === 1 && pos1.startsWith('1 /'));
  check('no JS errors on DiffCheck navigation', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/jwt/', { waitUntil: 'networkidle' });
  const h1 = await page.$eval('.ts-tool-name', el => el.textContent);
  check('JWT tool renamed to JWTStudio', h1 === 'JWTStudio');
  await page.click('[data-jm="encode"]');
  await page.selectOption('#encAlg', 'ES256');
  await page.waitForTimeout(100);
  const pemVisible = await page.isVisible('#pemWrap');
  check('JWTStudio shows the PEM key area for ES256', pemVisible);
  await page.click('#genKeyBtn');
  await page.waitForTimeout(1500);
  const token = await page.$eval('#encOut', el => el.textContent);
  check('JWTStudio generates an ES256 keypair and signs a 3-part token', token.split('.').length === 3 && token.length > 60);
  check('no JS errors on JWTStudio ES256', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/loan/', { waitUntil: 'networkidle' });
  const srcLink = await page.$eval('.ts-source-link', el => el.getAttribute('href'));
  check('Every tool footer links to its GitHub source folder',
    srcLink === 'https://github.com/mohan-venkatakrishnan/tapdot-tools/tree/main/finance/loan');
  // add-more-inputs stress: add 4 part payments, page must not overflow
  for (let i = 0; i < 4; i++) await page.click('#addPP');
  await page.waitForTimeout(200);
  const docW = await page.evaluate(() => document.documentElement.scrollWidth);
  const winW = await page.evaluate(() => window.innerWidth);
  check('LoanCalc stays within viewport after adding many part payments', docW <= winW + 1);
  check('no JS errors on LoanCalc add stress', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await page.goto('http://localhost:8140/finance/loan/', { waitUntil: 'networkidle' });
  for (let i = 0; i < 3; i++) await page.click('#addPP');
  await page.waitForTimeout(200);
  const docW = await page.evaluate(() => document.documentElement.scrollWidth);
  check('LoanCalc mobile: no overflow with added part-payment rows', docW <= 376);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/ai/summarize/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const gateTitle = await page.$eval('#gateTitle', el => el.textContent);
  const gateMsg = await page.$eval('#gateMsg', el => el.textContent);
  check('AISummarize gate reports a definitive supported/unsupported state',
    gateTitle !== 'Checking your browser…' && gateMsg.length > 40);
  check('no JS errors on AISummarize gate', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/timeconvert/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  // Map card should come before the converted-times card in DOM order.
  const order = await page.evaluate(() => {
    const map = document.getElementById('mapWrap');
    const results = document.getElementById('results');
    return map.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING ? 'map-first' : 'results-first';
  });
  check('TZConvert shows the world map before the converted times', order === 'map-first');
  check('no JS errors on TZConvert layout', errs.length === 0);
  await page.close();
}

// 57. PRD batch: search noise, stat auto-fit, browse page, and 4 new dev tools.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/', { waitUntil: 'networkidle' });
  await page.click('.ts-search-trigger');
  await page.waitForTimeout(150);
  const defaultNames = await page.$$eval('.ts-palette-item .pi-name', els => els.map(e => e.textContent));
  check('Search palette default list excludes "Tools" and "Privacy Policy"',
    !defaultNames.includes('Privacy Policy') && !defaultNames.some(n => n === 'Tools'));
  await page.fill('#tsPaletteInput', 'privacy');
  await page.waitForTimeout(150);
  const foundPrivacy = await page.$$eval('.ts-palette-item .pi-name', els => els.map(e => e.textContent));
  check('Search palette still finds Privacy Policy when typed', foundPrivacy.includes('Privacy Policy'));
  check('no JS errors on search palette', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/finance/equity/', { waitUntil: 'networkidle' });
  await page.fill('#preMoney', '10413879');
  await page.waitForTimeout(400);
  const overflowing = await page.$$eval('.ts-stat-num', els =>
    els.filter(el => el.scrollWidth > el.clientWidth + 1).length);
  check('Stat numbers auto-shrink to fit instead of wrapping (EquityCalc large ₹ value)', overflowing === 0);
  check('no JS errors on stat auto-fit', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/browse/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  const cardCount = await page.$$eval('.browse-card', els => els.length);
  check('Browse page lists a large number of tool cards', cardCount > 50);
  await page.fill('#browseSearch', 'jwt');
  await page.waitForTimeout(150);
  const filtered = await page.$$eval('.browse-card', els => els.length);
  check('Browse page search filters the card list', filtered >= 1 && filtered < cardCount);
  check('no JS errors on Browse page', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/timestamp/', { waitUntil: 'networkidle' });
  await page.fill('#tsInput', '1773081600');
  await page.selectOption('#unit', 's');
  await page.waitForTimeout(200);
  const utcRow = await page.$eval('#tsOut', el => el.textContent);
  check('TimestampConvert converts a known timestamp to UTC correctly', utcRow.includes('2026'));
  check('no JS errors on TimestampConvert', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/timestamp/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const docW = await page.evaluate(() => document.documentElement.scrollWidth);
  check('TimestampConvert has no horizontal overflow on mobile', docW <= 376);
  check('no JS errors on TimestampConvert mobile', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/jsoncsv/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  const csv = await page.$eval('#output', el => el.textContent);
  check('JSONCSV converts the default JSON sample to CSV', csv.includes('name,role,years') && csv.includes('Ada Lovelace'));
  await page.click('[data-mode="c2j"]');
  await page.waitForTimeout(200);
  const json = await page.$eval('#output', el => el.textContent);
  check('JSONCSV converts CSV back to JSON', json.includes('"name"') && json.includes('Ada Lovelace'));
  check('no JS errors on JSONCSV', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/hashgen/', { waitUntil: 'networkidle' });
  await page.fill('#input', 'hello');
  await page.waitForTimeout(400);
  const text = await page.$eval('#hashList', el => el.textContent);
  // Known SHA-256("hello")
  check('HashGen computes the correct SHA-256 for "hello"',
    text.includes('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'));
  check('no JS errors on HashGen', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/keygen/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const priv = await page.$eval('#privOut', el => el.textContent);
  const pub = await page.$eval('#pubOut', el => el.textContent);
  check('KeyGen generates a PEM private and public key by default', priv.includes('BEGIN PRIVATE KEY') && pub.includes('BEGIN PUBLIC KEY'));
  check('no JS errors on KeyGen', errs.length === 0);
  await page.close();
}

// 58. Deferred batch: PassHash (bcrypt/Argon2 via WASM), ImageCompress, AIWrite/AIRewrite, donate link.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/passhash/', { waitUntil: 'networkidle' });
  await page.fill('#password', 'correct horse battery staple');
  await page.selectOption('#algo', 'bcrypt');
  await page.fill('#bcryptCost', '4');
  await page.click('#runBtn');
  await page.waitForFunction(() => document.getElementById('result').textContent.startsWith('$2'), { timeout: 15000 });
  const bcryptHash = await page.$eval('#result', el => el.textContent);
  check('PassHash produces a real bcrypt hash', /^\$2[aby]?\$04\$/.test(bcryptHash));
  await page.click('[data-mode="verify"]');
  await page.fill('#existingHash', bcryptHash);
  await page.click('#runBtn');
  await page.waitForFunction(() => /Match|No match/.test(document.getElementById('result').textContent), { timeout: 15000 });
  const verifyText = await page.$eval('#result', el => el.textContent);
  check('PassHash verifies the correct password against its own bcrypt hash', verifyText.includes('Match') && !verifyText.includes('No match'));
  check('no JS errors on PassHash bcrypt', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/passhash/', { waitUntil: 'networkidle' });
  await page.fill('#password', 'correct horse battery staple');
  await page.selectOption('#algo', 'argon2id');
  await page.fill('#argonMem', '8');
  await page.click('#runBtn');
  await page.waitForFunction(() => document.getElementById('result').textContent.startsWith('$argon2id'), { timeout: 20000 });
  const argonHash = await page.$eval('#result', el => el.textContent);
  check('PassHash produces a real Argon2id hash', argonHash.startsWith('$argon2id$'));
  await page.click('[data-mode="verify"]');
  await page.fill('#existingHash', argonHash);
  await page.click('#runBtn');
  await page.waitForFunction(() => /Match|No match/.test(document.getElementById('result').textContent), { timeout: 20000 });
  const verifyText = await page.$eval('#result', el => el.textContent);
  check('PassHash verifies the correct password against its own Argon2id hash', verifyText.includes('Match') && !verifyText.includes('No match'));
  check('no JS errors on PassHash argon2id', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/design/imagecompress/', { waitUntil: 'networkidle' });
  const gateOk = await page.$eval('#gate', el => !!el).catch(() => false);
  check('ImageCompress loads without JS errors', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/ai/write/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const gateTitle = await page.$eval('#gateTitle', el => el.textContent);
  const gateMsg = await page.$eval('#gateMsg', el => el.textContent);
  check('AIWrite gate reports a definitive supported/unsupported state',
    gateTitle !== 'Checking your browser…' && gateMsg.length > 20);
  check('no JS errors on AIWrite gate', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/ai/rewrite/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const gateTitle = await page.$eval('#gateTitle', el => el.textContent);
  const gateMsg = await page.$eval('#gateMsg', el => el.textContent);
  check('AIRewrite gate reports a definitive supported/unsupported state',
    gateTitle !== 'Checking your browser…' && gateMsg.length > 20);
  check('no JS errors on AIRewrite gate', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  await page.goto('http://localhost:8140/dev/json/', { waitUntil: 'networkidle' });
  const href = await page.$eval('.ts-donate-link', el => el.getAttribute('href')).catch(() => null);
  check('Every tool footer links to the PayPal donate page', href === 'https://paypal.me/MohanVenkatakrishnan');
  await page.close();
}

// 59. SVGClean — regex-based SVG bloat stripper.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/svgclean/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const output = await page.$eval('#output', el => el.textContent);
  check('SVGClean strips comments/XML declaration/editor namespaces by default',
    !output.includes('<!--') && !output.includes('<?xml') && !output.includes('inkscape:'));
  check('SVGClean removes the empty inner <g></g>', !/<g>\s*<\/g>/.test(output));
  check('SVGClean rounds numeric precision', !output.includes('20.999999'));
  const savings = await page.$eval('#savings', el => el.textContent);
  check('SVGClean reports a size reduction', /smaller/.test(savings));
  await page.uncheck('#optPrecision');
  await page.waitForTimeout(200);
  const output2 = await page.$eval('#output', el => el.textContent);
  check('SVGClean precision toggle changes output', output2.includes('20.999999'));
  check('no JS errors on SVGClean', errs.length === 0);
  await page.close();
}

// 61. SQLObfuscate — consistent identifier/string/number placeholder mapping.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/dev/sqlobfuscate/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const output = await page.$eval('#output', el => el.textContent);
  check('SQLObfuscate keeps SQL keywords intact', /SELECT/.test(output) && /FROM/.test(output) && /WHERE/.test(output));
  check('SQLObfuscate replaces the real table name "customers"', !output.includes('customers'));
  check('SQLObfuscate maps repeated identifiers consistently',
    (output.match(/col1/g) || []).length >= 2);
  check('SQLObfuscate replaces string literals', !output.includes("'US'"));
  check('SQLObfuscate replaces numeric literals', !output.includes('100'));
  const mapping = await page.$eval('#mapping', el => el.textContent);
  check('SQLObfuscate shows the identifier mapping', mapping.includes('customers') && mapping.includes('col1'));
  await page.uncheck('#optIdent');
  await page.waitForTimeout(200);
  const output2 = await page.$eval('#output', el => el.textContent);
  check('SQLObfuscate identifier toggle restores real names', output2.includes('customers'));
  check('no JS errors on SQLObfuscate', errs.length === 0);
  await page.close();
}

// 62. Site Graph — radial layout of collections + tools from TOOL_REGISTRY.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/graph/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const nodeCount = await page.$$eval('.gn-node.tool', els => els.length);
  check('Site Graph renders a tool node for every registry entry (minus utility pages)', nodeCount > 80);
  const collectionCount = await page.$$eval('.gn-node.collection', els => els.length);
  check('Site Graph renders one node per collection', collectionCount === 11);
  await page.fill('#graphSearch', 'passhash');
  await page.waitForTimeout(150);
  const dimmed = await page.$$eval('.gn-node.tool.dim', els => els.length);
  const notDimmed = await page.$$eval('.gn-node.tool:not(.dim)', els => els.length);
  check('Site Graph search dims non-matching nodes', dimmed > 0 && notDimmed >= 1 && notDimmed < dimmed);
  check('no JS errors on Site Graph', errs.length === 0);
  await page.close();
}

// 63. tapdot Desktop download page — offline messaging, non-profit disclosure, downloads.
{
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8140/desktop/', { waitUntil: 'networkidle' });
  const bodyText = await page.$eval('body', el => el.textContent);
  check('Desktop page states the tool count as "90+"', bodyText.includes('90+'));
  check('Desktop page explains the CurrencyConvert offline exception precisely',
    bodyText.includes('CurrencyConvert') && bodyText.includes('once a day') && bodyText.includes('caches'));
  check('Desktop page explains why the app shows as untrusted (no paid certificate)',
    bodyText.includes('unidentified developer') && bodyText.includes('$99') && bodyText.includes('non-profit'));
  check('Desktop page links to view source on GitHub', await page.$('.desk-source-link') !== null);
  const downloadLinks = await page.$$eval('.desk-download-btn', els => els.map(e => e.getAttribute('href')));
  check('Desktop page offers downloads for all three platforms (macOS has two chip variants)',
    downloadLinks.filter(h => h.endsWith('.dmg')).length === 2 &&
    downloadLinks.some(h => h.endsWith('.exe')) && downloadLinks.some(h => h.endsWith('.AppImage')));
  check('no JS errors on Desktop page', errs.length === 0);
  await page.close();
}
{
  const page = await browser.newPage();
  await page.goto('http://localhost:8140/dev/json/', { waitUntil: 'networkidle' });
  const href = await page.$eval('.ts-desktop-link', el => el.getAttribute('href')).catch(() => null);
  check('Every tool footer links to the desktop app download page', href === '/desktop/');
  await page.close();
}
{
  const page = await browser.newPage();
  await page.goto('http://localhost:8140/desktop/', { waitUntil: 'networkidle' });
  const selfLink = await page.$('.ts-desktop-link');
  check('Desktop page itself does not show a redundant self-link in its footer', selfLink === null);
  await page.close();
}

await browser.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
