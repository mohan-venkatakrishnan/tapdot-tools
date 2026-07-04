// BudgetPlanner — 50/30/20 rule, donut chart, month-to-month tracking

const LS = 'tapdot-budget-history';
const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => tapdotMoney.fmt(n);

const NEEDS = ['rent', 'mortgage', 'utilities', 'groceries', 'insurance', 'transport', 'minimum payments', 'childcare', 'healthcare'];
const WANTS = ['dining', 'entertainment', 'shopping', 'hobbies', 'subscriptions', 'gym', 'travel'];
const SAVINGS = ['emergency fund', 'investments', 'retirement', 'savings'];

function classify(category) {
  const c = category.toLowerCase();
  if (NEEDS.some(n => c.includes(n))) return 'needs';
  if (SAVINGS.some(s => c.includes(s))) return 'savings';
  return 'wants';
}

const CATEGORY_COLOR = { needs: 'var(--color-accent)', wants: 'var(--color-warning)', savings: 'var(--color-success)' };

let expenses = [
  { name: 'Rent', amount: 1500 }, { name: 'Groceries', amount: 400 },
  { name: 'Dining out', amount: 250 }, { name: 'Savings', amount: 500 },
];

function rowHtml(e, i) {
  return `<div class="biz-row" data-i="${i}" style="margin-bottom:6px">
    <input class="ts-input" value="${escapeHtml(e.name)}" data-f="name" placeholder="Category" style="flex:2" />
    <input class="ts-input" type="number" value="${e.amount}" data-f="amount" style="flex:1" />
    <span class="ts-badge" style="background:${CATEGORY_COLOR[classify(e.name)]}22;color:${CATEGORY_COLOR[classify(e.name)]}">${classify(e.name)}</span>
    <button class="biz-rm" data-rm="${i}" aria-label="Remove">×</button>
  </div>`;
}
function renderRows() { $('expenseRows').innerHTML = expenses.map(rowHtml).join(''); }

function drawDonut(segments) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 60, cx = 80, cy = 80, circumference = 2 * Math.PI * r;
  let offset = 0;
  const circles = segments.filter(s => s.value > 0).map(s => {
    const frac = s.value / total;
    const dash = frac * circumference;
    const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="22"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dash;
    return el;
  }).join('');
  $('donut').innerHTML = circles + `<circle cx="${cx}" cy="${cy}" r="${r - 22}" fill="var(--color-bg)"/>`;
  $('donutLegend').innerHTML = segments.map(s =>
    `<div class="biz-legend-item"><span class="biz-legend-swatch" style="background:${s.color}"></span>${s.label}: ${fmtMoney(s.value)} (${total > 0 ? Math.round(s.value / total * 100) : 0}%)</div>`
  ).join('');
}

function render() {
  const income = parseFloat($('income').value) || 0;
  const totals = { needs: 0, wants: 0, savings: 0 };
  expenses.forEach(e => { totals[classify(e.name)] += (parseFloat(e.amount) || 0); });
  const totalExpenses = totals.needs + totals.wants + totals.savings;

  $('totalExpenses').textContent = fmtMoney(totalExpenses);
  const surplus = income - totalExpenses;
  $('surplus').textContent = fmtMoney(surplus);
  $('surplus').className = 'ts-stat-num ' + (surplus >= 0 ? 'ts-text-success' : 'ts-text-danger');
  $('savingsRate').textContent = income > 0 ? Math.round((totals.savings / income) * 100) + '%' : '0%';

  drawDonut([
    { label: 'Needs (target 50%)', value: totals.needs, color: 'var(--color-accent)' },
    { label: 'Wants (target 30%)', value: totals.wants, color: 'var(--color-warning)' },
    { label: 'Savings (target 20%)', value: totals.savings, color: 'var(--color-success)' },
  ]);
  renderTrend();
}

function getHistory() { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } }
function renderTrend() {
  const h = getHistory();
  if (!h.length) { $('trendChart').innerHTML = ''; return; }
  renderLineChart($('trendChart'), h.slice(-12).map(m => m.savingsRate));
}

$('income').addEventListener('input', render);
$('expenseRows').addEventListener('input', (e) => {
  const row = e.target.closest('[data-i]'); if (!row) return;
  const i = +row.dataset.i;
  expenses[i][e.target.dataset.f] = e.target.dataset.f === 'amount' ? parseFloat(e.target.value) || 0 : e.target.value;
  renderRows();
  render();
});
$('expenseRows').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rm]'); if (!b) return;
  expenses.splice(+b.dataset.rm, 1);
  renderRows(); render();
});
$('addExpense').addEventListener('click', () => { expenses.push({ name: 'New category', amount: 0 }); renderRows(); render(); });

$('saveMonth').addEventListener('click', () => {
  const income = parseFloat($('income').value) || 0;
  const totals = { needs: 0, wants: 0, savings: 0 };
  expenses.forEach(e => { totals[classify(e.name)] += (parseFloat(e.amount) || 0); });
  const savingsRate = income > 0 ? (totals.savings / income) * 100 : 0;
  const h = getHistory();
  h.push({ date: new Date().toISOString().slice(0, 10), income, savingsRate });
  localStorage.setItem(LS, JSON.stringify(h.slice(-12)));
  renderTrend();
});

renderRows();
render();
