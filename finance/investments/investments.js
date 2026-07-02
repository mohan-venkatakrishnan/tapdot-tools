// InvestmentTracker — manual portfolio, gain/loss, allocation, saved locally

const LS = 'tapdot-investments';
const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const DONUT_COLORS = ['#5B6CF0', '#12A594', '#D97757', '#B0609E', '#4E8FC4', '#8A5CD6', '#3D9AA6', '#D6537E'];

function load() { try { const s = JSON.parse(localStorage.getItem(LS)); if (Array.isArray(s) && s.length) return s; } catch {} return [
  { name: 'Index Fund', buy: 100, qty: 20, current: 120 },
  { name: 'Bonds', buy: 50, qty: 40, current: 51 },
]; }
let holdings = load();
function save() { localStorage.setItem(LS, JSON.stringify(holdings)); }

function rowHtml(h, i) {
  const value = h.qty * h.current;
  const cost = h.qty * h.buy;
  const gain = value - cost;
  return `<tr data-i="${i}">
    <td><input value="${escapeHtml(h.name)}" data-f="name" /></td>
    <td><input type="number" value="${h.buy}" data-f="buy" /></td>
    <td><input type="number" value="${h.qty}" data-f="qty" /></td>
    <td><input type="number" value="${h.current}" data-f="current" /></td>
    <td>${fmtMoney(value)}</td>
    <td class="${gain >= 0 ? 'ts-text-success' : 'ts-text-danger'}">${gain >= 0 ? '+' : ''}${fmtMoney(gain)}</td>
    <td><button class="biz-rm" data-rm="${i}">×</button></td>
  </tr>`;
}

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
    `<div class="biz-legend-item"><span class="biz-legend-swatch" style="background:${s.color}"></span>${escapeHtml(s.label)}: ${fmtMoney(s.value)} (${total > 0 ? Math.round(s.value / total * 100) : 0}%)</div>`
  ).join('');
}

function render() {
  $('holdingsBody').innerHTML = holdings.map(rowHtml).join('');
  const totalValue = holdings.reduce((s, h) => s + h.qty * h.current, 0);
  const totalCost = holdings.reduce((s, h) => s + h.qty * h.buy, 0);
  const totalGain = totalValue - totalCost;
  $('totalValue').textContent = fmtMoney(totalValue);
  $('totalGain').textContent = (totalGain >= 0 ? '+' : '') + fmtMoney(totalGain);
  $('totalGain').className = 'ts-stat-num ' + (totalGain >= 0 ? 'ts-text-success' : 'ts-text-danger');
  $('totalReturn').textContent = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(1) + '%' : '—';

  drawDonut(holdings.map((h, i) => ({ label: h.name, value: h.qty * h.current, color: DONUT_COLORS[i % DONUT_COLORS.length] })));
}

$('holdingsBody').addEventListener('input', (e) => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const i = +tr.dataset.i;
  const f = e.target.dataset.f;
  holdings[i][f] = f === 'name' ? e.target.value : parseFloat(e.target.value) || 0;
  save(); render();
});
$('holdingsBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rm]'); if (!b) return;
  holdings.splice(+b.dataset.rm, 1);
  save(); render();
});
$('addHolding').addEventListener('click', () => { holdings.push({ name: 'New holding', buy: 0, qty: 0, current: 0 }); save(); render(); });

render();
