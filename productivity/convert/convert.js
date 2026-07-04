// UnitConvert — every common unit, live, with a full equivalents table.
// Linear units store a factor to the category's base unit; temperature is special-cased.

const $ = (id) => document.getElementById(id);

const CATEGORIES = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, 'µm': 1e-6, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, 'nautical mi': 1852 },
  Weight: { kg: 1, g: 0.001, mg: 1e-6, tonne: 1000, lb: 0.45359237, oz: 0.028349523, stone: 6.35029318 },
  Temperature: 'special',
  Area: { 'm²': 1, 'km²': 1e6, 'cm²': 1e-4, 'ft²': 0.09290304, 'yd²': 0.83612736, acre: 4046.8564, hectare: 10000, 'sq mi': 2589988.11 },
  Volume: { L: 1, mL: 0.001, 'm³': 1000, 'gal (US)': 3.785411784, 'qt (US)': 0.946352946, 'pt (US)': 0.473176473, 'cup (US)': 0.2365882365, 'fl oz (US)': 0.0295735296, 'tbsp': 0.01478676, 'tsp': 0.00492892 },
  Speed: { 'km/h': 1, 'm/s': 3.6, mph: 1.609344, knot: 1.852, 'ft/s': 1.09728 },
  Data: { MB: 1, KB: 0.001, B: 1e-6, GB: 1000, TB: 1e6, PB: 1e9, MiB: 1.048576, GiB: 1073.741824, KiB: 0.001024 },
  Time: { min: 1, s: 1 / 60, ms: 1 / 60000, h: 60, day: 1440, week: 10080, month: 43800, year: 525600 },
};

const TEMPS = ['°C', '°F', 'K'];
function tempToC(v, unit) { return unit === '°C' ? v : unit === '°F' ? (v - 32) * 5 / 9 : v - 273.15; }
function tempFromC(c, unit) { return unit === '°C' ? c : unit === '°F' ? c * 9 / 5 + 32 : c + 273.15; }

let cat = 'Length';

function units() { return cat === 'Temperature' ? TEMPS : Object.keys(CATEGORIES[cat]); }

function convert(v, from, to) {
  if (cat === 'Temperature') return tempFromC(tempToC(v, from), to);
  const f = CATEGORIES[cat];
  return v * f[from] / f[to];
}

function fmtNum(n) {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e9 || abs < 1e-4)) return n.toExponential(4);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function renderTabs() {
  $('catTabs').innerHTML = Object.keys(CATEGORIES).map(c =>
    `<button class="ts-segment-btn ${c === cat ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
}

function fillSelects(keepFrom, keepTo) {
  const us = units();
  const opts = us.map(u => `<option value="${u}">${u}</option>`).join('');
  $('fromUnit').innerHTML = opts;
  $('toUnit').innerHTML = opts;
  $('fromUnit').value = keepFrom && us.includes(keepFrom) ? keepFrom : us[0];
  $('toUnit').value = keepTo && us.includes(keepTo) ? keepTo : us[1] || us[0];
}

function render() {
  const v = parseFloat($('amount').value);
  const from = $('fromUnit').value, to = $('toUnit').value;
  if (isNaN(v)) { $('result').textContent = '—'; $('formula').textContent = ''; $('allUnits').innerHTML = ''; return; }
  const out = convert(v, from, to);
  $('result').textContent = `${fmtNum(v)} ${from} = ${fmtNum(out)} ${to}`;
  const one = convert(1, from, to);
  $('formula').textContent = cat === 'Temperature' ? '' : `1 ${from} = ${fmtNum(one)} ${to}`;
  $('allUnits').innerHTML = units().filter(u => u !== from).map(u =>
    `<div class="uc-cell"><span class="uc-cell-num">${fmtNum(convert(v, from, u))}</span><span class="uc-cell-unit">${u}</span></div>`).join('');
}

$('catTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  cat = b.dataset.cat;
  renderTabs();
  fillSelects();
  render();
});
$('swapU').addEventListener('click', () => {
  const f = $('fromUnit').value;
  $('fromUnit').value = $('toUnit').value;
  $('toUnit').value = f;
  render();
});
['amount', 'fromUnit', 'toUnit'].forEach(id => $(id).addEventListener('input', render));

renderTabs();
fillSelects();
render();
