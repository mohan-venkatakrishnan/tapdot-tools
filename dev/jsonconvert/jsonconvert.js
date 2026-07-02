// JSONConvert — JSON <-> YAML / CSV / XML / TOML (js-yaml bundled; rest vanilla)

const $ = (id) => document.getElementById(id);

// ── JSON → CSV ──────────────────────────────────────────────────────────────
function jsonToCSV(jsonStr) {
  const data = JSON.parse(jsonStr);
  const arr = Array.isArray(data) ? data : [data];
  if (!arr.length) return '';
  const headers = [...new Set(arr.flatMap(o => Object.keys(o || {})))];
  const esc = (val) => {
    const str = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const rows = arr.map(r => headers.map(h => esc(r ? r[h] : '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// ── JSON → XML ──────────────────────────────────────────────────────────────
function escapeXML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function objToXML(obj, tag) {
  if (Array.isArray(obj)) return obj.map(item => objToXML(item, 'item')).join('\n');
  if (typeof obj !== 'object' || obj === null) return `<${tag}>${escapeXML(String(obj))}</${tag}>`;
  const inner = Object.entries(obj).map(([k, v]) => objToXML(v, k)).join('\n');
  return `<${tag}>\n${inner}\n</${tag}>`;
}
function jsonToXML(jsonStr) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${objToXML(JSON.parse(jsonStr), 'root')}`;
}

// ── JSON → TOML (common cases) ──────────────────────────────────────────────
function tomlVal(v) {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return '[' + v.map(tomlVal).join(', ') + ']';
  return JSON.stringify(v);
}
function tomlSection(obj, prefix) {
  let out = '';
  const tables = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) tables.push([k, v]);
    else out += `${k} = ${tomlVal(v)}\n`;
  }
  for (const [k, v] of tables) {
    const name = prefix ? `${prefix}.${k}` : k;
    out += `\n[${name}]\n` + tomlSection(v, name);
  }
  return out;
}
function jsonToTOML(jsonStr) { return tomlSection(JSON.parse(jsonStr), '').trim(); }

// ── CSV → JSON ──────────────────────────────────────────────────────────────
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
  return rows;
}
function csvToJSON(raw) {
  const rows = parseCSV(raw.trim());
  if (!rows.length) return '[]';
  const [headers, ...data] = rows;
  const objs = data.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  return JSON.stringify(objs, null, 2);
}

// ── XML → JSON (basic) ──────────────────────────────────────────────────────
function elemToObj(el) {
  const children = [...el.children];
  if (!children.length) return el.textContent;
  const obj = {};
  for (const c of children) {
    const v = elemToObj(c);
    if (c.tagName in obj) { if (!Array.isArray(obj[c.tagName])) obj[c.tagName] = [obj[c.tagName]]; obj[c.tagName].push(v); }
    else obj[c.tagName] = v;
  }
  return obj;
}
function xmlToJSON(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
  return JSON.stringify({ [doc.documentElement.tagName]: elemToObj(doc.documentElement) }, null, 2);
}

const CONV = {
  'json-yaml': (s) => jsyaml.dump(JSON.parse(s), { indent: 2, lineWidth: 80 }),
  'json-toml': jsonToTOML,
  'json-csv': jsonToCSV,
  'json-xml': jsonToXML,
  'yaml-json': (s) => JSON.stringify(jsyaml.load(s), null, 2),
  'csv-json': csvToJSON,
  'xml-json': xmlToJSON,
};
const LABELS = {
  'json-yaml': ['JSON source', 'YAML output'], 'json-toml': ['JSON source', 'TOML output'],
  'json-csv': ['JSON source', 'CSV output'], 'json-xml': ['JSON source', 'XML output'],
  'yaml-json': ['YAML source', 'JSON output'], 'csv-json': ['CSV source', 'JSON output'],
  'xml-json': ['XML source', 'JSON output'],
};

function run() {
  const dir = $('dir').value;
  const [srcL, outL] = LABELS[dir];
  $('srcLabel').textContent = srcL; $('outLabel').textContent = outL;
  const src = $('src').value;
  const msg = $('msg'), out = $('out');
  if (!src.trim()) { out.textContent = ''; msg.textContent = ''; return; }
  try { out.textContent = CONV[dir](src); msg.textContent = ''; }
  catch (e) { out.textContent = ''; msg.className = 'ts-err-msg'; msg.textContent = e.message; }
}

$('dir').addEventListener('change', run);
$('src').addEventListener('input', run);
$('copyOut').addEventListener('click', (e) => copyText($('out').textContent, e.target));
run();
