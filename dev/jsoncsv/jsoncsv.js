// JSONCSV — JSON array-of-objects <-> CSV, RFC-4180-ish quoting

const $ = (id) => document.getElementById(id);
let mode = 'j2c';

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  return out;
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function jsonToCsv(text) {
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : [data];
  const flat = rows.map(r => flatten(r));
  const cols = [...new Set(flat.flatMap(r => Object.keys(r)))];
  const lines = [cols.map(csvCell).join(',')];
  flat.forEach(r => lines.push(cols.map(c => csvCell(r[c])).join(',')));
  return { csv: lines.join('\n'), rows: rows.length, cols: cols.length };
}

// Minimal RFC-4180 CSV parser: handles quoted fields with embedded commas/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

function coerce(v) {
  if (v === '') return '';
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function csvToJson(text) {
  const rows = parseCsv(text.trim());
  if (!rows.length) return { json: '[]', rows: 0, cols: 0 };
  const [header, ...body] = rows;
  const objs = body.map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = coerce(r[i] ?? ''); });
    return o;
  });
  return { json: JSON.stringify(objs, null, 2), rows: objs.length, cols: header.length };
}

function run() {
  const raw = $('input').value;
  const err = $('err');
  if (!raw.trim()) { $('output').textContent = ''; $('stats').textContent = ''; err.textContent = ''; return; }
  try {
    if (mode === 'j2c') {
      const { csv, rows, cols } = jsonToCsv(raw);
      $('output').textContent = csv;
      $('stats').textContent = `${rows} row${rows === 1 ? '' : 's'} · ${cols} column${cols === 1 ? '' : 's'}`;
    } else {
      const { json, rows, cols } = csvToJson(raw);
      $('output').textContent = json;
      $('stats').textContent = `${rows} row${rows === 1 ? '' : 's'} · ${cols} column${cols === 1 ? '' : 's'}`;
    }
    err.textContent = '';
  } catch (e) {
    err.textContent = mode === 'j2c' ? `Invalid JSON: ${e.message}` : `Could not parse CSV: ${e.message}`;
    $('output').textContent = '';
    $('stats').textContent = '';
  }
}

$('modeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-pill-tab');
  if (!b) return;
  $('modeTabs').querySelectorAll('.ts-pill-tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  $('inLabel').textContent = mode === 'j2c' ? 'JSON (array of objects)' : 'CSV (with header row)';
  $('outLabel').textContent = mode === 'j2c' ? 'CSV' : 'JSON';
  if (mode === 'c2j' && $('input').value.trim().startsWith('[')) {
    $('input').value = 'name,role,years\nAda Lovelace,Engineer,5\nGrace Hopper,Admiral,12';
  }
  run();
});
$('input').addEventListener('input', run);
$('copyOut').addEventListener('click', (e) => copyText($('output').textContent, e.target));
run();
