// TaxEstimate — simplified slab/bracket calculator for India, US, UK

const SLABS = {
  in_new: [
    { limit: 300000, rate: 0 }, { limit: 700000, rate: 0.05 }, { limit: 1000000, rate: 0.10 },
    { limit: 1200000, rate: 0.15 }, { limit: 1500000, rate: 0.20 }, { limit: Infinity, rate: 0.30 },
  ],
  in_old: [
    { limit: 250000, rate: 0 }, { limit: 500000, rate: 0.05 }, { limit: 1000000, rate: 0.20 }, { limit: Infinity, rate: 0.30 },
  ],
  us: [
    { limit: 11925, rate: 0.10 }, { limit: 48475, rate: 0.12 }, { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 }, { limit: 250525, rate: 0.32 }, { limit: 626350, rate: 0.35 }, { limit: Infinity, rate: 0.37 },
  ],
  uk: [
    { limit: 12570, rate: 0 }, { limit: 50270, rate: 0.20 }, { limit: 125140, rate: 0.40 }, { limit: Infinity, rate: 0.45 },
  ],
};
const CURRENCY = { in: '₹', us: '$', uk: '£' };

function calcSlabTax(income, slabs) {
  let tax = 0, prev = 0;
  const breakdown = [];
  for (const slab of slabs) {
    if (income <= prev) break;
    const taxable = Math.min(income, slab.limit) - prev;
    const slabTax = taxable * slab.rate;
    tax += slabTax;
    if (taxable > 0) breakdown.push({ from: prev, to: Math.min(income, slab.limit), rate: slab.rate, taxable, tax: slabTax });
    prev = slab.limit;
  }
  return { tax: Math.round(tax), breakdown };
}

const $ = (id) => document.getElementById(id);
let country = 'in', regime = 'new';

$('countryTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-segment-btn'); if (!b) return;
  document.querySelectorAll('#countryTabs .ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  country = b.dataset.c;
  $('regimeTabs').classList.toggle('ts-hidden', country !== 'in');
  render();
});
$('regimeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-segment-btn'); if (!b) return;
  document.querySelectorAll('#regimeTabs .ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  regime = b.dataset.r;
  render();
});

function fmt(n) { return CURRENCY[country] + Math.round(n).toLocaleString(); }

function render() {
  const income = Math.max(0, parseFloat($('income').value) || 0);
  const deductions = Math.max(0, parseFloat($('deductions').value) || 0);
  const taxable = Math.max(0, income - deductions);
  const slabKey = country === 'in' ? `in_${regime}` : country;
  const slabs = SLABS[slabKey];
  const { tax, breakdown } = calcSlabTax(taxable, slabs);

  $('taxOwed').textContent = fmt(tax);
  $('effRate').textContent = income > 0 ? ((tax / income) * 100).toFixed(1) + '%' : '0%';
  $('takeHome').textContent = fmt(income - tax);

  $('table').innerHTML = '<thead><tr><th>Bracket</th><th>Rate</th><th>Taxable in bracket</th><th>Tax</th></tr></thead><tbody>' +
    breakdown.map(b => `<tr><td>${fmt(b.from)} – ${b.to === Infinity ? '∞' : fmt(b.to)}</td><td>${(b.rate * 100).toFixed(0)}%</td><td>${fmt(b.taxable)}</td><td>${fmt(b.tax)}</td></tr>`).join('') +
    '</tbody>';
}

['income', 'deductions'].forEach(id => $(id).addEventListener('input', render));
$('regimeTabs').classList.toggle('ts-hidden', country !== 'in'); // India is the default country — show its regime tabs on load
render();
