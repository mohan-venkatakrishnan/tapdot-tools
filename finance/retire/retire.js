// RetireCalc — corpus needed vs projected, with the monthly investment that
// closes the gap. Corpus needed uses a 30-year drawdown annuity on the real
// (inflation-adjusted) post-retirement return.

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => tapdotMoney.fmt(n);
const RETIREMENT_YEARS = 30;

// Present value of an annuity paying `payment` monthly for `months` at monthly rate `r`.
function annuityPV(payment, r, months) {
  if (r === 0) return payment * months;
  return payment * (1 - Math.pow(1 + r, -months)) / r;
}

// Future value of current corpus + monthly contributions.
function projectCorpus(corpusNow, monthly, annualReturn, years) {
  const r = annualReturn / 100 / 12;
  const n = years * 12;
  const fvCorpus = corpusNow * Math.pow(1 + r, n);
  const fvContrib = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
  return fvCorpus + fvContrib;
}

// Monthly contribution needed to reach `target` in `years`.
function monthlyFor(target, corpusNow, annualReturn, years) {
  const r = annualReturn / 100 / 12;
  const n = years * 12;
  const fvCorpus = corpusNow * Math.pow(1 + r, n);
  const remaining = Math.max(0, target - fvCorpus);
  if (remaining === 0) return 0;
  if (r === 0) return remaining / n;
  return remaining / ((Math.pow(1 + r, n) - 1) / r);
}

function render() {
  const ageNow = parseFloat($('ageNow').value) || 0;
  const ageRetire = parseFloat($('ageRetire').value) || 0;
  const expenses = Math.max(0, parseFloat($('expenses').value) || 0);
  const inflation = parseFloat($('inflation').value) || 0;
  const corpusNow = Math.max(0, parseFloat($('corpusNow').value) || 0);
  const monthlyInvest = Math.max(0, parseFloat($('monthlyInvest').value) || 0);
  const returnPre = parseFloat($('returnPre').value) || 0;
  const returnPost = parseFloat($('returnPost').value) || 0;

  const years = Math.max(1, ageRetire - ageNow);

  // Expenses at retirement, inflated.
  const expensesAtRetirement = expenses * Math.pow(1 + inflation / 100, years);
  // Real monthly return during retirement (post-retirement return net of inflation).
  const realAnnual = ((1 + returnPost / 100) / (1 + inflation / 100) - 1);
  const realMonthly = realAnnual / 12;
  const corpusNeeded = annuityPV(expensesAtRetirement, realMonthly, RETIREMENT_YEARS * 12);

  const corpusProjected = projectCorpus(corpusNow, monthlyInvest, returnPre, years);
  const gap = corpusNeeded - corpusProjected;
  const needMonthly = monthlyFor(corpusNeeded, corpusNow, returnPre, years);

  $('corpusNeeded').textContent = fmtMoney(corpusNeeded);
  $('corpusProjected').textContent = fmtMoney(corpusProjected);
  const gapEl = $('gap');
  if (gap > 0) {
    gapEl.textContent = fmtMoney(gap);
    gapEl.className = 'ts-stat-num ts-text-danger';
    $('gapLabel').textContent = 'Shortfall';
  } else {
    gapEl.textContent = fmtMoney(-gap);
    gapEl.className = 'ts-stat-num ts-text-success';
    $('gapLabel').textContent = 'Surplus';
  }
  $('neededMonthly').textContent = fmtMoney(needMonthly);

  $('explain').textContent =
    `In ${years} years your ${fmtMoney(expenses)}/month lifestyle will cost ${fmtMoney(expensesAtRetirement)}/month at ${inflation}% inflation. ` +
    `Funding that for ${RETIREMENT_YEARS} years of retirement — with your corpus still earning ${returnPost}% while you draw it down — needs ${fmtMoney(corpusNeeded)}. ` +
    `Your current ${fmtMoney(corpusNow)} plus ${fmtMoney(monthlyInvest)}/month at ${returnPre}% grows to ${fmtMoney(corpusProjected)} by age ${ageRetire}. ` +
    (gap > 0
      ? `Closing the gap means investing about ${fmtMoney(needMonthly)}/month instead.`
      : `You're on track — you could retire on ${fmtMoney(monthlyInvest)}/month of investing, or even earlier.`);

  // Chart: corpus growth per year vs the needed line.
  const points = [];
  for (let y = 0; y <= years; y++) points.push(projectCorpus(corpusNow, monthlyInvest, returnPre, y));
  renderLineChart($('chart'), points, {
    label: (i) => 'Age ' + (Math.round(parseFloat(document.getElementById('ageNow').value) || 0) + i),
    series: [{ points: points.map(() => corpusNeeded), color: 'var(--color-danger)' }],
  });
}

['ageNow', 'ageRetire', 'expenses', 'inflation', 'corpusNow', 'monthlyInvest', 'returnPre', 'returnPost']
  .forEach(id => $(id).addEventListener('input', render));
render();
