// YAMLCheck — validate + format YAML (bundled js-yaml)

const $ = (id) => document.getElementById(id);
let showJson = false;
let lastParsed = null;

function validateYAML(raw) {
  try { return { ok: true, parsed: jsyaml.load(raw) }; }
  catch (e) {
    return { ok: false, error: e.message,
      line: e.mark && e.mark.line != null ? e.mark.line + 1 : null,
      col: e.mark && e.mark.column != null ? e.mark.column + 1 : null };
  }
}

function countYAMLStats(parsed, depth = 0) {
  if (typeof parsed !== 'object' || parsed === null) return { keys: 0, depth };
  const keys = Object.keys(parsed).length;
  const depths = Object.values(parsed).map(v => countYAMLStats(v, depth + 1).depth);
  return { keys, depth: Math.max(depth, ...(depths.length ? depths : [depth])) };
}

function run() {
  const raw = $('input').value;
  const msg = $('msg'), out = $('output');
  if (!raw.trim()) { msg.textContent = ''; out.textContent = ''; $('stats').innerHTML = ''; lastParsed = null; return; }
  const res = validateYAML(raw);
  if (!res.ok) {
    msg.className = 'ts-err-msg';
    msg.textContent = res.error + (res.line ? ` (line ${res.line}, col ${res.col})` : '');
    out.textContent = ''; $('stats').innerHTML = ''; lastParsed = null;
    return;
  }
  lastParsed = res.parsed;
  msg.className = 'ts-ok-msg'; msg.textContent = 'Valid YAML';
  const lines = raw.split('\n').filter(l => l.trim()).length;
  const st = countYAMLStats(res.parsed);
  $('stats').innerHTML =
    `<div class="ts-stat"><span class="ts-stat-num">${lines}</span><span class="ts-stat-label">Lines</span></div>` +
    `<div class="ts-stat"><span class="ts-stat-num">${st.keys}</span><span class="ts-stat-label">Top keys</span></div>` +
    `<div class="ts-stat"><span class="ts-stat-num">${st.depth}</span><span class="ts-stat-label">Depth</span></div>`;
  render();
}

function render() {
  const out = $('output');
  if (lastParsed == null) { out.textContent = ''; return; }
  if (showJson) {
    out.textContent = JSON.stringify(lastParsed, null, 2);
    $('outLabel').textContent = 'As JSON';
    $('toggle').textContent = 'Show YAML';
  } else {
    out.textContent = jsyaml.dump(lastParsed, { indent: parseInt($('indent').value, 10), lineWidth: 120 });
    $('outLabel').textContent = 'Formatted YAML';
    $('toggle').textContent = 'Show JSON';
  }
}

$('input').addEventListener('input', run);
$('indent').addEventListener('change', run);
$('toggle').addEventListener('click', () => { showJson = !showJson; render(); });
$('copyOut').addEventListener('click', (e) => copyText($('output').textContent, e.target));
