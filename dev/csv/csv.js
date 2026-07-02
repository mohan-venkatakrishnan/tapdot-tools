// CSVExplore — RFC 4180 parser + sortable/filterable table

function parseCSV(raw) {
  const rows = []; let row = [], field = '', inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i], next = raw[i + 1];
    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else field += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) { if (ch === '\r') i++; row.push(field); field = ''; rows.push(row); row = []; }
      else field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };
  const [headers, ...dataRows] = rows;
  return { headers, rows: dataRows };
}

function detectColumnType(values) {
  const ne = values.filter(v => v.trim() !== '');
  if (!ne.length) return 'text';
  if (ne.every(v => !isNaN(Number(v)))) return 'number';
  if (ne.every(v => !isNaN(Date.parse(v)))) return 'date';
  if (ne.every(v => ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase()))) return 'boolean';
  return 'text';
}

const $ = (id) => document.getElementById(id);
let data = { headers: [], rows: [] };
let types = [];
let sortCol = -1, sortDir = 1;

function load(raw) {
  data = parseCSV(raw);
  types = data.headers.map((_, c) => detectColumnType(data.rows.map(r => r[c] ?? '')));
  sortCol = -1;
  render();
}

function render() {
  const filter = $('filter').value.trim().toLowerCase();
  let rows = data.rows;
  if (filter) rows = rows.filter(r => r.some(c => (c ?? '').toLowerCase().includes(filter)));
  if (sortCol >= 0) {
    const num = types[sortCol] === 'number';
    rows = [...rows].sort((a, b) => {
      const x = a[sortCol] ?? '', y = b[sortCol] ?? '';
      const cmp = num ? (Number(x) - Number(y)) : String(x).localeCompare(String(y));
      return cmp * sortDir;
    });
  }

  if (!data.headers.length) { $('tbl').innerHTML = ''; $('stats').innerHTML = ''; return; }

  const thead = '<thead><tr>' + data.headers.map((h, i) =>
    `<th data-c="${i}">${escapeHtml(h)} <span class="dev-muted">${types[i]}</span>${sortCol === i ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`
  ).join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map(r =>
    '<tr>' + data.headers.map((_, i) => `<td>${escapeHtml(r[i] ?? '')}</td>`).join('') + '</tr>'
  ).join('') + '</tbody>';
  $('tbl').innerHTML = thead + tbody;
  $('tblLabel').textContent = `Table — ${rows.length} of ${data.rows.length} rows`;

  $('stats').innerHTML =
    `<div class="ts-stat"><span class="ts-stat-num">${data.rows.length}</span><span class="ts-stat-label">Rows</span></div>` +
    `<div class="ts-stat"><span class="ts-stat-num">${data.headers.length}</span><span class="ts-stat-label">Columns</span></div>` +
    `<div class="ts-stat"><span class="ts-stat-num">${types.filter(t => t === 'number').length}</span><span class="ts-stat-label">Numeric cols</span></div>`;
}

$('input').addEventListener('input', () => load($('input').value));
$('filter').addEventListener('input', render);
$('tbl').addEventListener('click', (e) => {
  const th = e.target.closest('th'); if (!th) return;
  const c = +th.dataset.c;
  if (sortCol === c) sortDir = -sortDir; else { sortCol = c; sortDir = 1; }
  render();
});
$('attach').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('input').value = String(r.result || ''); load($('input').value); };
  r.readAsText(f);
});
$('copyTsv').addEventListener('click', (e) => {
  const tsv = [data.headers.join('\t'), ...data.rows.map(r => r.join('\t'))].join('\n');
  copyText(tsv, e.target);
});
$('dlCsv').addEventListener('click', () => {
  const blob = new Blob([$('input').value], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data.csv'; a.click();
  URL.revokeObjectURL(a.href);
});
