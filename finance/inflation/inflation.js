// InflationCalc — future cost, purchasing-power erosion, halving time

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => '$' + Math.round(n).toLocaleString();

function render() {
  const amount = Math.max(0, parseFloat($('amount').value) || 0);
  const rate = Math.max(0, parseFloat($('rate').value) || 0);
  const years = Math.max(1, Math.min(100, parseInt($('years').value, 10) || 1));
  const r = rate / 100;

  const futureCost = amount * Math.pow(1 + r, years);
  const futureValue = amount / Math.pow(1 + r, years);
  const erosionPct = amount > 0 ? (1 - futureValue / amount) * 100 : 0;
  const halfLife = r > 0 ? Math.log(2) / Math.log(1 + r) : Infinity;

  $('futureCost').textContent = fmtMoney(futureCost);
  $('futureCostLabel').textContent = `What ${fmtMoney(amount)} of goods costs in ${years} years`;
  $('futureValue').textContent = fmtMoney(futureValue);
  $('erosion').textContent = erosionPct.toFixed(0) + '%';
  $('halfLife').textContent = isFinite(halfLife) ? halfLife.toFixed(1) : '∞';

  const points = [];
  for (let y = 0; y <= years; y++) points.push(amount / Math.pow(1 + r, y));
  renderLineChart($('chart'), points);
  $('note').textContent = r > 0
    ? `At ${rate}% inflation, money loses half its purchasing power roughly every ${halfLife.toFixed(1)} years. To just stand still, your savings must earn at least ${rate}% after tax.`
    : 'With 0% inflation, purchasing power stays flat — adjust the rate to see the effect.';

  const step = years <= 12 ? 1 : years <= 30 ? 2 : 5;
  let rows = '';
  for (let y = step; y <= years; y += step) {
    rows += `<tr><td>${y}</td><td>${fmtMoney(amount * Math.pow(1 + r, y))}</td><td>${fmtMoney(amount / Math.pow(1 + r, y))}</td><td class="ts-text-danger">−${((1 - 1 / Math.pow(1 + r, y)) * 100).toFixed(0)}%</td></tr>`;
  }
  $('table').innerHTML = `<thead><tr><th>Year</th><th>Cost of today's ${fmtMoney(amount)}</th><th>Buying power of ${fmtMoney(amount)}</th><th>Power lost</th></tr></thead><tbody>${rows}</tbody>`;
}

['amount', 'rate', 'years'].forEach(id => $(id).addEventListener('input', render));
render();
