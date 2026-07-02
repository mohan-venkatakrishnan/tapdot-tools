// JSONLab — format / validate / minify / diff (no library)

function highlightJSON(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (m) => {
        let cls = 'ts-json-num';
        if (/^"/.test(m)) cls = /:$/.test(m) ? 'ts-json-key' : 'ts-json-str';
        else if (/true|false/.test(m)) cls = 'ts-json-bool';
        else if (/null/.test(m)) cls = 'ts-json-null';
        return `<span class="${cls}">${m}</span>`;
      });
}

function indentValue() {
  const v = document.getElementById('indent').value;
  return v === 't' ? '\t' : parseInt(v, 10);
}

// Turn a parse error into a friendly message with line/col when possible.
function errorInfo(raw, e) {
  const m = /position (\d+)/.exec(e.message);
  let hint = '';
  if (/,\s*[}\]]/.test(raw)) hint = ' — trailing comma detected?';
  else if (/'[^']*'\s*:/.test(raw)) hint = ' — did you mean double quotes?';
  if (m) {
    const pos = +m[1];
    const before = raw.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    return `${e.message} (line ${line}, col ${col})${hint}`;
  }
  return e.message + hint;
}

const $ = (id) => document.getElementById(id);
let mode = 'format';

function run() {
  if (mode === 'diff') { runDiff(); return; }
  const raw = $('input').value;
  const msg = $('msg');
  const out = $('output');
  if (!raw.trim()) { out.innerHTML = ''; msg.textContent = ''; return; }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { msg.className = 'ts-err-msg'; msg.textContent = errorInfo(raw, e); if (mode !== 'validate') out.innerHTML = ''; else out.innerHTML = ''; return; }

  if (mode === 'validate') {
    msg.className = 'ts-ok-msg';
    const count = (typeof parsed === 'object' && parsed) ? Object.keys(parsed).length : 0;
    msg.textContent = `Valid JSON${Array.isArray(parsed) ? ` — array of ${parsed.length}` : count ? ` — ${count} top-level keys` : ''}.`;
    out.innerHTML = highlightJSON(JSON.stringify(parsed, null, 2));
    $('outLabel').textContent = 'Parsed';
    return;
  }
  msg.textContent = '';
  if (mode === 'minify') {
    const min = JSON.stringify(parsed);
    out.textContent = min;
    const before = new Blob([raw]).size, after = new Blob([min]).size;
    const pct = before ? Math.round((1 - after / before) * 100) : 0;
    $('outLabel').textContent = `Minified — ${before}B → ${after}B (${pct}% smaller)`;
  } else { // format
    out.innerHTML = highlightJSON(JSON.stringify(parsed, null, indentValue()));
    $('outLabel').textContent = 'Formatted';
  }
}

function deepDiff(a, b, path) {
  const changes = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    const p = path ? `${path}.${key}` : key;
    if (!(key in a)) changes.push({ type: 'added', path: p, value: b[key] });
    else if (!(key in b)) changes.push({ type: 'removed', path: p, value: a[key] });
    else if (a[key] && b[key] && typeof a[key] === 'object' && typeof b[key] === 'object')
      changes.push(...deepDiff(a[key], b[key], p));
    else if (a[key] !== b[key]) changes.push({ type: 'changed', path: p, from: a[key], to: b[key] });
  }
  return changes;
}

function runDiff() {
  const out = $('diffOut'), sum = $('diffSummary');
  let a, b;
  try { a = JSON.parse($('diffA').value || '{}'); b = JSON.parse($('diffB').value || '{}'); }
  catch (e) { out.innerHTML = `<span class="ts-json-null">${escapeHtml(e.message)}</span>`; sum.textContent = 'Differences'; return; }
  const changes = deepDiff(a, b, '');
  const counts = { added: 0, removed: 0, changed: 0 };
  const V = (v) => escapeHtml(JSON.stringify(v));
  out.innerHTML = changes.map(c => {
    counts[c.type]++;
    if (c.type === 'added') return `<div><span class="ts-json-str">+ ${escapeHtml(c.path)}</span>: ${V(c.value)}</div>`;
    if (c.type === 'removed') return `<div><span style="color:var(--color-danger)">- ${escapeHtml(c.path)}</span>: ${V(c.value)}</div>`;
    return `<div><span style="color:var(--color-warning)">~ ${escapeHtml(c.path)}</span>: ${V(c.from)} → ${V(c.to)}</div>`;
  }).join('') || '<span class="dev-muted">No differences.</span>';
  sum.textContent = `${counts.added} added · ${counts.removed} removed · ${counts.changed} changed`;
}

$('modes').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-pill-tab'); if (!b) return;
  document.querySelectorAll('#modes .ts-pill-tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  $('single').classList.toggle('ts-hidden', mode === 'diff');
  $('diffPane').classList.toggle('ts-hidden', mode !== 'diff');
  $('indentWrap').style.visibility = mode === 'format' ? 'visible' : 'hidden';
  run();
});
$('input').addEventListener('input', run);
$('indent').addEventListener('change', run);
$('diffA').addEventListener('input', runDiff);
$('diffB').addEventListener('input', runDiff);
$('copyOut').addEventListener('click', (e) => copyText($('output').textContent, e.target));
