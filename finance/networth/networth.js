// NetWorthTracker — assets minus liabilities, tracked month by month

const LS_ITEMS = 'tapdot-networth-items';
const LS_HISTORY = 'tapdot-networth-history';
const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => tapdotMoney.fmt(n);

function loadItems() {
  try { const s = JSON.parse(localStorage.getItem(LS_ITEMS)); if (s) return s; } catch {}
  return { assets: [{ name: 'Cash', amount: 5000 }, { name: 'Investments', amount: 20000 }], liabilities: [{ name: 'Credit card', amount: 1500 }] };
}
let state = loadItems();
function saveItems() { localStorage.setItem(LS_ITEMS, JSON.stringify(state)); }

function rowsHtml(list, key) {
  return list.map((item, i) =>
    `<div class="biz-row" data-i="${i}" style="margin-bottom:6px">
      <input class="ts-input" value="${escapeHtml(item.name)}" data-f="name" style="flex:2" />
      <input class="ts-input" type="number" value="${item.amount}" data-f="amount" style="flex:1" />
      <button class="biz-rm" data-rm="${i}">×</button>
    </div>`
  ).join('');
}
function render() {
  $('assetRows').innerHTML = rowsHtml(state.assets, 'assets');
  $('liabilityRows').innerHTML = rowsHtml(state.liabilities, 'liabilities');
  const totalAssets = state.assets.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  const totalLiabilities = state.liabilities.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  $('totalAssets').textContent = fmtMoney(totalAssets);
  $('totalLiabilities').textContent = fmtMoney(totalLiabilities);
  const net = totalAssets - totalLiabilities;
  $('netWorth').textContent = fmtMoney(net);
  $('netWorth').className = 'ts-stat-num ' + (net >= 0 ? 'ts-text-success' : 'ts-text-danger');
  renderTrend();
}

function bindList(containerId, listKey) {
  $(containerId).addEventListener('input', (e) => {
    const row = e.target.closest('[data-i]'); if (!row) return;
    const i = +row.dataset.i;
    state[listKey][i][e.target.dataset.f] = e.target.dataset.f === 'amount' ? parseFloat(e.target.value) || 0 : e.target.value;
    saveItems(); render();
  });
  $(containerId).addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    state[listKey].splice(+b.dataset.rm, 1);
    saveItems(); render();
  });
}
bindList('assetRows', 'assets');
bindList('liabilityRows', 'liabilities');

$('addAsset').addEventListener('click', () => { state.assets.push({ name: 'New asset', amount: 0 }); saveItems(); render(); });
$('addLiability').addEventListener('click', () => { state.liabilities.push({ name: 'New liability', amount: 0 }); saveItems(); render(); });

function getHistory() { try { return JSON.parse(localStorage.getItem(LS_HISTORY)) || []; } catch { return []; } }
function renderTrend() {
  const h = getHistory();
  if (!h.length) { $('trendChart').innerHTML = ''; return; }
  renderLineChart($('trendChart'), h.slice(-24).map(m => m.net));
}
$('saveMonth').addEventListener('click', () => {
  const totalAssets = state.assets.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  const totalLiabilities = state.liabilities.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  const h = getHistory();
  h.push({ date: new Date().toISOString().slice(0, 10), net: totalAssets - totalLiabilities });
  localStorage.setItem(LS_HISTORY, JSON.stringify(h.slice(-24)));
  renderTrend();
});

render();
