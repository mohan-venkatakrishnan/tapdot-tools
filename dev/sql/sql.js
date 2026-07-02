// SQLFormat — keyword-aware formatter (no library)

const SQL_KEYWORDS = [
  'SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS',
  'ON','AND','OR','NOT','IN','IS','NULL','AS','DISTINCT','ORDER','BY','GROUP',
  'HAVING','LIMIT','OFFSET','INSERT','INTO','VALUES','UPDATE','SET','DELETE',
  'CREATE','TABLE','DROP','ALTER','INDEX','VIEW','TRIGGER','PROCEDURE','FUNCTION',
  'BEGIN','END','COMMIT','ROLLBACK','TRANSACTION','CASE','WHEN','THEN','ELSE',
  'WITH','UNION','ALL','EXISTS','BETWEEN','LIKE','ILIKE','ASC','DESC','PRIMARY',
  'KEY','FOREIGN','REFERENCES','CONSTRAINT','DEFAULT','UNIQUE','COUNT','SUM','AVG','MIN','MAX'
];
const SQL_SET = new Set(SQL_KEYWORDS);
const BREAK_BEFORE = new Set(['SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS','GROUP','ORDER','HAVING','LIMIT','UNION','SET','VALUES']);

function formatSQL(raw, indent = 2, keywordCase = 'upper') {
  const pad = ' '.repeat(indent);
  const kw = (w) => keywordCase === 'upper' ? w.toUpperCase() : keywordCase === 'lower' ? w.toLowerCase() : w;
  const tokens = raw.split(/(\s+|'[^']*'|"[^"]*"|--[^\n]*|\/\*[\s\S]*?\*\/|[(),;])/);
  let result = '', depth = 0;
  for (const token of tokens) {
    if (!token) continue;
    const upper = token.trim().toUpperCase();
    if (SQL_SET.has(upper)) {
      if (BREAK_BEFORE.has(upper) && result.trim()) result = result.replace(/\s+$/, '') + '\n';
      result += kw(token);
    } else if (token === '(') { result += token; depth++; }
    else if (token === ')') { depth--; result += token; }
    else if (token === ',') { result += token + '\n' + pad.repeat(Math.max(depth, 1)); }
    else if (token === ';') { result += token + '\n'; }
    else result += token;
  }
  return result.replace(/[ \t]+\n/g, '\n').trim();
}

function highlightSQL(text) {
  return text.split(/('(?:[^']|'')*'|"[^"]*"|--[^\n]*|\/\*[\s\S]*?\*\/)/).map(part => {
    if (!part) return '';
    if (part.startsWith("'") || part.startsWith('"')) return `<span class="ts-json-str">${escapeHtml(part)}</span>`;
    if (part.startsWith('--') || part.startsWith('/*')) return `<span class="ts-comment">${escapeHtml(part)}</span>`;
    return escapeHtml(part).replace(/\b([A-Za-z_]+)\b/g, (m) => SQL_SET.has(m.toUpperCase()) ? `<span class="ts-kw">${m}</span>` : m);
  }).join('');
}

const $ = (id) => document.getElementById(id);

function run() {
  const raw = $('input').value;
  if (!raw.trim()) { $('output').innerHTML = ''; $('stats').innerHTML = ''; return; }
  const formatted = formatSQL(raw, parseInt($('indent').value, 10), $('case').value);
  $('output').innerHTML = highlightSQL(formatted);
  const kwCount = (raw.toUpperCase().match(/\b[A-Z_]+\b/g) || []).filter(w => SQL_SET.has(w)).length;
  $('stats').innerHTML =
    `<div class="ts-stat"><span class="ts-stat-num">${formatted.split('\n').length}</span><span class="ts-stat-label">Lines</span></div>` +
    `<div class="ts-stat"><span class="ts-stat-num">${kwCount}</span><span class="ts-stat-label">Keywords</span></div>`;
}

$('input').addEventListener('input', run);
$('case').addEventListener('change', run);
$('indent').addEventListener('change', run);
$('copyOut').addEventListener('click', (e) => copyText($('output').textContent, e.target));
