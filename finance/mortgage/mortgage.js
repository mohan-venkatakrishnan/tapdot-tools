// MortgageCalc — EMI, amortisation schedule, overpayment savings

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => '$' + Math.round(n).toLocaleString();

function calcEMI({ principal, annualRate, years }) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// Returns { months: [...], payoffMonths, totalInterest }
function amortise({ principal, annualRate, years, extra = 0 }) {
  const baseEmi = calcEMI({ principal, annualRate, years });
  const r = annualRate / 100 / 12;
  const months = [];
  let balance = principal, m = 0;
  const maxMonths = years * 12 + 1;
  while (balance > 0.5 && m < maxMonths) {
    m++;
    const interest = balance * r;
    let principalP = baseEmi + extra - interest;
    if (principalP > balance) principalP = balance;
    balance -= principalP;
    months.push({ month: m, interest, principal: principalP, balance: Math.max(0, balance) });
  }
  const totalInterest = months.reduce((s, x) => s + x.interest, 0);
  return { months, payoffMonths: m, totalInterest, emi: baseEmi };
}

function yearlyRollup(months) {
  const years = [];
  for (let i = 0; i < months.length; i += 12) {
    const chunk = months.slice(i, i + 12);
    years.push({
      year: Math.floor(i / 12) + 1,
      interest: chunk.reduce((s, x) => s + x.interest, 0),
      principal: chunk.reduce((s, x) => s + x.principal, 0),
      balance: chunk[chunk.length - 1].balance,
    });
  }
  return years;
}

function render() {
  const principal = Math.max(0, (parseFloat($('loanAmount').value) || 0) - (parseFloat($('downPayment').value) || 0));
  const annualRate = parseFloat($('rate').value) || 0;
  const years = Math.max(1, parseInt($('years').value, 10) || 1);
  const extra = parseFloat($('overpay').value) || 0;

  const base = amortise({ principal, annualRate, years, extra: 0 });
  $('emi').textContent = fmtMoney(base.emi);
  $('totalPaid').textContent = fmtMoney(principal + base.totalInterest);
  $('totalInterest').textContent = fmtMoney(base.totalInterest);
  $('ratio').textContent = principal > 0 ? (base.totalInterest / principal).toFixed(2) + 'x' : '—';

  $('table').innerHTML = '<thead><tr><th>Year</th><th>Principal paid</th><th>Interest paid</th><th>Balance</th></tr></thead><tbody>' +
    yearlyRollup(base.months).map(y => `<tr><td>${y.year}</td><td>${fmtMoney(y.principal)}</td><td class="ts-text-warning">${fmtMoney(y.interest)}</td><td>${fmtMoney(y.balance)}</td></tr>`).join('') +
    '</tbody>';

  if (extra > 0) {
    const withExtra = amortise({ principal, annualRate, years, extra });
    $('overpayCard').classList.remove('ts-hidden');
    $('newTerm').textContent = (withExtra.payoffMonths / 12).toFixed(1) + ' yrs';
    $('timeSaved').textContent = ((base.payoffMonths - withExtra.payoffMonths) / 12).toFixed(1) + ' yrs';
    $('interestSaved').textContent = fmtMoney(base.totalInterest - withExtra.totalInterest);
  } else {
    $('overpayCard').classList.add('ts-hidden');
  }
}

['loanAmount', 'downPayment', 'rate', 'years', 'overpay'].forEach(id => $(id).addEventListener('input', render));
render();
