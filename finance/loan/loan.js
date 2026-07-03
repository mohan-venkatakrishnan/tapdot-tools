// LoanCalc — EMI, amortisation, part-payment impact with reduce-tenure /
// reduce-EMI strategies, baseline-vs-prepaid projection.

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => '$' + Math.round(n).toLocaleString();
const fmtYears = (months) => {
  const y = Math.floor(months / 12), m = months % 12;
  return y ? `${y}y${m ? ' ' + m + 'm' : ''}` : `${m}m`;
};

let partPayments = [{ month: 24, amount: 200000 }];
let strategy = 'tenure'; // 'tenure' | 'emi'
let nextPP = 2;

function calcEMI(principal, monthlyRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate === 0) return principal / months;
  return principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
}

// Simulate month by month. lumps: {month: amount}. On 'emi' strategy the EMI is
// recomputed after each lump sum for the REMAINING original tenure.
function simulate({ principal, annualRate, years, extraMonthly, lumps, strategy }) {
  const r = annualRate / 100 / 12;
  const totalMonths = Math.round(years * 12);
  let emi = calcEMI(principal, r, totalMonths);
  const startEmi = emi;
  let balance = principal, m = 0, totalInterest = 0;
  const monthly = [];
  const maxMonths = totalMonths * 3 + 12; // hard stop for pathological inputs
  while (balance > 0.5 && m < maxMonths) {
    m++;
    const interest = balance * r;
    totalInterest += interest;
    let principalPaid = emi + extraMonthly - interest;
    if (principalPaid <= 0 && r > 0) break; // EMI doesn't even cover interest
    if (principalPaid > balance) principalPaid = balance;
    balance -= principalPaid;
    if (lumps[m] && balance > 0) {
      const lump = Math.min(lumps[m], balance);
      balance -= lump;
      if (strategy === 'emi' && balance > 0 && m < totalMonths) {
        emi = calcEMI(balance, r, totalMonths - m);
      }
    }
    monthly.push({ month: m, interest, principalPaid, balance });
  }
  return { monthly, payoffMonths: m, totalInterest, startEmi, endEmi: emi };
}

function renderPP() {
  $('ppList').innerHTML = partPayments.length
    ? partPayments.map((p, i) => `
      <div class="biz-row" style="margin-bottom:8px">
        <span class="biz-muted">Month</span>
        <input class="ts-input" type="number" min="1" value="${p.month}" data-pp="${i}" data-f="month" style="width:80px" />
        <span class="biz-muted">Amount</span>
        <input class="ts-input" type="number" min="0" value="${p.amount}" data-pp="${i}" data-f="amount" style="width:130px;flex:1;min-width:0" />
        <button class="biz-rm" data-rm="${i}" aria-label="Remove part payment">✕</button>
      </div>`).join('')
    : '<p class="biz-muted">No part payments yet — add one to see the impact.</p>';

  $('ppList').querySelectorAll('[data-pp]').forEach(el => {
    el.addEventListener('input', () => {
      partPayments[+el.dataset.pp][el.dataset.f] = Math.max(el.dataset.f === 'month' ? 1 : 0, parseFloat(el.value) || 0);
      render();
    });
  });
  $('ppList').querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      partPayments.splice(+btn.dataset.rm, 1);
      renderPP();
      render();
    });
  });
}

function render() {
  const principal = Math.max(0, parseFloat($('amount').value) || 0);
  const annualRate = Math.max(0, parseFloat($('rate').value) || 0);
  const years = Math.max(1, parseFloat($('years').value) || 1);
  const extraMonthly = Math.max(0, parseFloat($('extraMonthly').value) || 0);
  const lumps = {};
  partPayments.forEach(p => { if (p.amount > 0) lumps[p.month] = (lumps[p.month] || 0) + p.amount; });

  const base = simulate({ principal, annualRate, years, extraMonthly: 0, lumps: {}, strategy });
  $('emi').textContent = fmtMoney(base.startEmi);
  $('totalInterest').textContent = fmtMoney(base.totalInterest);
  $('totalPaid').textContent = fmtMoney(principal + base.totalInterest);
  $('interestPct').textContent = principal > 0 ? Math.round(base.totalInterest / principal * 100) + '%' : '—';

  const hasPrepay = Object.keys(lumps).length > 0 || extraMonthly > 0;
  let withPre = base;
  if (hasPrepay) {
    withPre = simulate({ principal, annualRate, years, extraMonthly, lumps, strategy });
    $('impactCard').classList.remove('ts-hidden');
    $('interestSaved').textContent = fmtMoney(base.totalInterest - withPre.totalInterest);
    $('timeSaved').textContent = fmtYears(base.payoffMonths - withPre.payoffMonths);
    $('newEmi').textContent = strategy === 'emi' && withPre.endEmi !== withPre.startEmi
      ? `${fmtMoney(withPre.startEmi)} → ${fmtMoney(withPre.endEmi)}`
      : fmtMoney(withPre.startEmi + extraMonthly);
    $('newPayoff').textContent = fmtYears(withPre.payoffMonths);
  } else {
    $('impactCard').classList.add('ts-hidden');
  }

  // Chart: baseline balance (area) + prepaid balance (dashed overlay, padded to same length)
  const yearlyBalance = (sim, months) => {
    const out = [principal];
    for (let m = 12; m <= months; m += 12) {
      const rec = sim.monthly[Math.min(m, sim.monthly.length) - 1];
      out.push(rec ? rec.balance : 0);
    }
    return out;
  };
  const basePoints = yearlyBalance(base, base.payoffMonths);
  const opts = {};
  if (hasPrepay) {
    const prePoints = yearlyBalance(withPre, base.payoffMonths);
    while (prePoints.length < basePoints.length) prePoints.push(0);
    opts.series = [{ points: prePoints, color: 'var(--color-success)' }];
  }
  renderLineChart($('chart'), basePoints, opts);
  $('chartLegend').innerHTML =
    '<span class="biz-muted"><span style="display:inline-block;width:18px;height:2px;background:var(--color-accent);vertical-align:middle;margin-right:5px"></span>Without prepayments</span>' +
    (hasPrepay ? '<span class="biz-muted" style="margin-left:16px"><span style="display:inline-block;width:18px;border-top:2px dashed var(--color-success);vertical-align:middle;margin-right:5px"></span>With prepayments</span>' : '');

  // Yearly amortisation of the ACTIVE scenario (prepaid if any, else baseline)
  const active = hasPrepay ? withPre : base;
  const rows = [];
  for (let i = 0; i < active.monthly.length; i += 12) {
    const chunk = active.monthly.slice(i, i + 12);
    rows.push({
      year: Math.floor(i / 12) + 1,
      principal: chunk.reduce((s, x) => s + x.principalPaid, 0),
      interest: chunk.reduce((s, x) => s + x.interest, 0),
      balance: chunk[chunk.length - 1].balance,
    });
  }
  $('table').innerHTML = '<thead><tr><th>Year</th><th>Principal paid</th><th>Interest paid</th><th>Interest share</th><th>Balance</th></tr></thead><tbody>' +
    rows.map(y => {
      const total = y.principal + y.interest;
      const share = total > 0 ? Math.round(y.interest / total * 100) : 0;
      return `<tr><td>${y.year}</td><td>${fmtMoney(y.principal)}</td><td class="ts-text-warning">${fmtMoney(y.interest)}</td><td>${share}%</td><td>${fmtMoney(y.balance)}</td></tr>`;
    }).join('') + '</tbody>';
}

$('addPP').addEventListener('click', () => {
  partPayments.push({ month: 12 * nextPP++, amount: 100000 });
  renderPP();
  render();
});
$('strategyTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-s]');
  if (!b) return;
  $('strategyTabs').querySelectorAll('.ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  strategy = b.dataset.s;
  render();
});
['amount', 'rate', 'years', 'extraMonthly'].forEach(id => $(id).addEventListener('input', render));

renderPP();
render();
