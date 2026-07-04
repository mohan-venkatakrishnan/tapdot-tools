// CompoundCalc — compound interest with monthly contributions

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => tapdotMoney.fmt(n);

function compoundInterest({ principal, rate, frequency, years, monthlyContrib }) {
  const n = frequency;
  const r = rate / 100;
  const pmt = monthlyContrib;
  const results = [];
  let balance = principal;
  for (let year = 1; year <= years; year++) {
    balance = balance * Math.pow(1 + r / n, n);
    if (r > 0) balance += pmt * 12 * ((Math.pow(1 + r / n, n) - 1) / (r / n));
    else balance += pmt * 12;
    results.push({
      year,
      balance: Math.round(balance),
      contributions: Math.round(principal + pmt * 12 * year),
      interest: Math.round(balance - principal - pmt * 12 * year),
    });
  }
  return results;
}

function render() {
  const fields = {
    principal: parseFloat($('principal').value) || 0,
    rate: parseFloat($('rate').value) || 0,
    frequency: parseInt($('frequency').value, 10),
    years: Math.max(1, parseInt($('years').value, 10) || 1),
    monthlyContrib: parseFloat($('monthlyContrib').value) || 0,
  };
  const results = compoundInterest(fields);
  const last = results[results.length - 1];

  $('finalValue').textContent = fmtMoney(last.balance);
  $('totalContrib').textContent = fmtMoney(last.contributions);
  $('totalInterest').textContent = fmtMoney(last.interest);

  renderLineChart($('chart'), results.map(r => r.balance), {
    series: [{ points: results.map(r => r.contributions), color: 'var(--color-muted)' }],
  });
  $('chartLegend').innerHTML =
    '<span class="biz-muted"><span style="display:inline-block;width:18px;height:2px;background:var(--color-accent);vertical-align:middle;margin-right:5px"></span>Total balance</span>' +
    '<span class="biz-muted" style="margin-left:16px"><span style="display:inline-block;width:18px;border-top:2px dashed var(--color-muted);vertical-align:middle;margin-right:5px"></span>Your contributions</span>' +
    `<span class="biz-muted" style="margin-left:16px">— the gap is <b class="ts-text-success">${fmtMoney(last.interest)}</b> of interest earned</span>`;

  $('table').innerHTML = '<thead><tr><th>Year</th><th>Balance</th><th>Contributions</th><th>Interest</th></tr></thead><tbody>' +
    results.map(r => `<tr><td>${r.year}</td><td>${fmtMoney(r.balance)}</td><td>${fmtMoney(r.contributions)}</td><td class="ts-text-success">${fmtMoney(r.interest)}</td></tr>`).join('') +
    '</tbody>';
}

['principal', 'rate', 'frequency', 'years', 'monthlyContrib'].forEach(id => $(id).addEventListener('input', render));
render();
