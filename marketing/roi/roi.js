// ROICalculator — ROI, ROAS, CPA, CLV, payback period (pure math)

const $ = (id) => document.getElementById(id);
const fmt = (n) => isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';
const fmtPct = (n) => isFinite(n) ? n.toFixed(1) + '%' : '—';
const fmtMoney = (n) => isFinite(n) ? '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—';

function rowHtml(i, c = {}) {
  return `<tr data-i="${i}">
    <td><input value="${c.name || ''}" placeholder="Campaign ${i + 1}" data-f="name" /></td>
    <td><input type="number" value="${c.spend ?? ''}" placeholder="1000" data-f="spend" /></td>
    <td><input type="number" value="${c.revenue ?? ''}" placeholder="3000" data-f="revenue" /></td>
    <td><input type="number" value="${c.conversions ?? ''}" placeholder="50" data-f="conversions" /></td>
    <td><input type="number" value="${c.aov ?? ''}" placeholder="60" data-f="aov" /></td>
    <td><input type="number" value="${c.freq ?? ''}" placeholder="2" data-f="freq" /></td>
    <td><input type="number" value="${c.lifespan ?? ''}" placeholder="3" data-f="lifespan" /></td>
    <td><button class="biz-rm" data-rm="${i}" aria-label="Remove">×</button></td>
  </tr>`;
}

function styleInputs() {
  document.querySelectorAll('#campaignTable input').forEach(inp => {
    inp.style.cssText = 'width:100%;border:0.5px solid var(--color-border);border-radius:6px;padding:6px 8px;background:var(--color-bg-soft);color:var(--color-text);font-family:var(--font-body);font-size:13px;';
  });
}

let campaigns = [{}, {}];

function render() {
  $('campaignBody').innerHTML = campaigns.map((c, i) => rowHtml(i, c)).join('');
  styleInputs();
  calc();
}

function readRows() {
  campaigns = [...document.querySelectorAll('#campaignBody tr')].map(tr => {
    const c = {};
    tr.querySelectorAll('input').forEach(inp => { c[inp.dataset.f] = inp.dataset.f === 'name' ? inp.value : parseFloat(inp.value) || 0; });
    return c;
  });
}

function calc() {
  const rows = campaigns.map((c, i) => {
    const name = c.name || `Campaign ${i + 1}`;
    const roi = c.spend > 0 ? ((c.revenue - c.spend) / c.spend) * 100 : NaN;
    const roas = c.spend > 0 ? c.revenue / c.spend : NaN;
    const cpa = c.conversions > 0 ? c.spend / c.conversions : NaN;
    const clv = (c.aov || 0) * (c.freq || 0) * (c.lifespan || 0);
    const payback = clv > 0 && c.lifespan > 0 ? cpa / (clv / (c.lifespan * 12)) : NaN;
    return { name, roi, roas, cpa, clv, payback };
  });

  $('resultsTable').innerHTML =
    '<thead><tr><th>Campaign</th><th>ROI</th><th>ROAS</th><th>CPA</th><th>CLV</th><th>Payback (months)</th></tr></thead><tbody>' +
    rows.map(r => `<tr><td>${escapeHtml(r.name)}</td><td class="${r.roi >= 0 ? 'ts-text-success' : 'ts-text-danger'}">${fmtPct(r.roi)}</td><td>${fmt(r.roas)}x</td><td>${fmtMoney(r.cpa)}</td><td>${fmtMoney(r.clv)}</td><td>${fmt(r.payback)}</td></tr>`).join('') +
    '</tbody>';

  const maxRoi = Math.max(1, ...rows.map(r => isFinite(r.roi) ? Math.abs(r.roi) : 0));
  $('roiBars').innerHTML = rows.map(r => {
    const pct = isFinite(r.roi) ? Math.min(100, Math.abs(r.roi) / maxRoi * 100) : 0;
    return `<div class="biz-bar-row"><span class="biz-bar-label">${escapeHtml(r.name)}</span><div class="biz-bar-track"><div class="biz-bar-fill" style="width:${pct}%"></div></div><span class="biz-bar-val">${fmtPct(r.roi)}</span></div>`;
  }).join('');
}

$('campaignBody').addEventListener('input', () => { readRows(); calc(); });
$('campaignBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rm]'); if (!b) return;
  readRows();
  campaigns.splice(+b.dataset.rm, 1);
  if (!campaigns.length) campaigns = [{}];
  render();
});
$('addCampaign').addEventListener('click', () => {
  readRows();
  if (campaigns.length >= 6) return;
  campaigns.push({});
  render();
});

render();
