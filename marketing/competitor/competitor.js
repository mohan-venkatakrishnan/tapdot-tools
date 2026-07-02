// CompetitorMatrix — feature comparison table, saved locally

const LS = 'tapdot-competitor-matrix';
const $ = (id) => document.getElementById(id);

function defaultState() {
  return {
    cols: ['Us', 'Competitor A', 'Competitor B'],
    rows: ['Free tier', 'API access', 'Mobile app'],
    cells: {}, // "r,c" -> value
  };
}
function load() { try { const s = JSON.parse(localStorage.getItem(LS)); if (s && s.cols && s.rows) return s; } catch {} return defaultState(); }
let state = load();
function save() { localStorage.setItem(LS, JSON.stringify(state)); }

const SCORE_MAP = { yes: 1, y: 1, no: 0, n: 0, partial: 0.5, p: 0.5 };
function cellScore(v) {
  if (!v) return 0;
  const num = parseFloat(v);
  if (!isNaN(num)) return num;
  return SCORE_MAP[v.trim().toLowerCase()] ?? 0;
}

function render() {
  const thead = '<tr><th>Feature</th>' + state.cols.map((c, ci) =>
    `<th><input value="${escapeHtml(c)}" data-col="${ci}" /><button class="biz-rm" data-rmcol="${ci}">×</button></th>`).join('') + '</tr>';
  const tbody = state.rows.map((r, ri) =>
    `<tr><td><input value="${escapeHtml(r)}" data-row="${ri}" /><button class="biz-rm" data-rmrow="${ri}">×</button></td>` +
    state.cols.map((_, ci) => `<td><input value="${escapeHtml(state.cells[`${ri},${ci}`] || '')}" placeholder="Yes/No/1-5" data-cell="${ri},${ci}" /></td>`).join('') +
    '</tr>').join('');
  $('matrix').innerHTML = `<thead>${thead}</thead><tbody>${tbody}</tbody>`;
  renderSummary();
}

function renderSummary() {
  const totals = state.cols.map((c, ci) => {
    let sum = 0;
    state.rows.forEach((_, ri) => { sum += cellScore(state.cells[`${ri},${ci}`]); });
    return { name: c, sum };
  });
  const max = Math.max(1, ...totals.map(t => t.sum));
  $('summaryBars').innerHTML = totals.map(t =>
    `<div class="biz-bar-row"><span class="biz-bar-label">${escapeHtml(t.name)}</span><div class="biz-bar-track"><div class="biz-bar-fill" style="width:${(t.sum / max) * 100}%"></div></div><span class="biz-bar-val">${t.sum}</span></div>`
  ).join('');
}

$('matrix').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.col !== undefined) state.cols[+t.dataset.col] = t.value;
  else if (t.dataset.row !== undefined) state.rows[+t.dataset.row] = t.value;
  else if (t.dataset.cell) state.cells[t.dataset.cell] = t.value;
  save(); renderSummary();
});
$('matrix').addEventListener('click', (e) => {
  const rc = e.target.closest('[data-rmcol]'), rr = e.target.closest('[data-rmrow]');
  if (rc) { state.cols.splice(+rc.dataset.rmcol, 1); save(); render(); }
  if (rr) { state.rows.splice(+rr.dataset.rmrow, 1); save(); render(); }
});
$('addCol').addEventListener('click', () => { state.cols.push('New competitor'); save(); render(); });
$('addRow').addEventListener('click', () => { state.rows.push('New feature'); save(); render(); });

$('copyMd').addEventListener('click', (e) => {
  const header = '| Feature | ' + state.cols.join(' | ') + ' |';
  const sep = '|---|' + state.cols.map(() => '---').join('|') + '|';
  const rows = state.rows.map((r, ri) => `| ${r} | ` + state.cols.map((_, ci) => state.cells[`${ri},${ci}`] || '').join(' | ') + ' |');
  copyText([header, sep, ...rows].join('\n'), e.target);
});
$('downloadCsv').addEventListener('click', () => {
  const header = ['Feature', ...state.cols].map(v => `"${v.replace(/"/g, '""')}"`).join(',');
  const rows = state.rows.map((r, ri) => [r, ...state.cols.map((_, ci) => state.cells[`${ri},${ci}`] || '')].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'competitor-matrix.csv'; a.click();
  URL.revokeObjectURL(a.href);
});

render();
