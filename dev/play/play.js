// CodePlay — HTML/CSS/JS playground with sandboxed live preview + console capture.
//
// Everything here is local: the preview is a srcdoc iframe with `allow-scripts`
// only, code autosaves to localStorage, and the "share link" encodes the code
// into the URL hash rather than posting it anywhere.

const $ = (id) => document.getElementById(id);
const LS = 'tapdot-codeplay';
const LS_LAYOUT = 'tapdot-codeplay-layout';
const PANES = ['html', 'css', 'js'];

const TEMPLATES = {
  counter: {
    html: '<div class="card">\n  <h1>Hello, CodePlay</h1>\n  <button id="btn">Click me</button>\n  <p id="out"></p>\n</div>',
    css: 'body { font-family: system-ui; display: grid; place-items: center; min-height: 90vh; background: #f6f5f2; }\n.card { background: #fff; padding: 32px 40px; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }\nbutton { padding: 8px 18px; border-radius: 8px; border: none; background: #7c5cd6; color: #fff; cursor: pointer; }',
    js: 'let count = 0;\ndocument.getElementById("btn").addEventListener("click", () => {\n  count++;\n  document.getElementById("out").textContent = `Clicked ${count} time${count === 1 ? "" : "s"}`;\n  console.log("count is now", count);\n});',
  },
  grid: {
    html: '<div class="gallery">\n  <figure style="--h:180">Aurora</figure>\n  <figure style="--h:120">Basalt</figure>\n  <figure style="--h:220">Cirrus</figure>\n  <figure style="--h:150">Dune</figure>\n  <figure style="--h:190">Ember</figure>\n  <figure style="--h:130">Fjord</figure>\n</div>',
    css: 'body { font-family: system-ui; margin: 0; padding: 24px; background: #14141c; color: #eee; }\n.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }\nfigure { margin: 0; height: calc(var(--h) * 1px); border-radius: 14px; display: grid; place-items: center;\n  background: linear-gradient(135deg, #7c5cd6, #4e8fc4); font-size: 14px; letter-spacing: .04em; }',
    js: 'console.log("Resize the preview — the grid reflows with auto-fill.");',
  },
  canvas: {
    html: '<canvas id="c" width="400" height="300"></canvas>',
    css: 'body { margin: 0; display: grid; place-items: center; min-height: 100vh; background: #0f0f18; }\ncanvas { border-radius: 12px; background: #16161f; }',
    js: 'const ctx = document.getElementById("c").getContext("2d");\nlet t = 0;\nfunction frame() {\n  ctx.clearRect(0, 0, 400, 300);\n  for (let i = 0; i < 40; i++) {\n    const x = 200 + Math.cos(t / 40 + i / 4) * (40 + i * 3);\n    const y = 150 + Math.sin(t / 30 + i / 5) * (30 + i * 2);\n    ctx.fillStyle = `hsl(${(i * 8 + t) % 360} 70% 65%)`;\n    ctx.beginPath();\n    ctx.arc(x, y, 4, 0, Math.PI * 2);\n    ctx.fill();\n  }\n  t++;\n  requestAnimationFrame(frame);\n}\nframe();',
  },
  form: {
    html: '<form id="f" novalidate>\n  <label>Email <input name="email" type="email" required /></label>\n  <label>Password <input name="pw" type="password" minlength="8" required /></label>\n  <button>Sign up</button>\n  <p id="msg"></p>\n</form>',
    css: 'body { font-family: system-ui; display: grid; place-items: center; min-height: 90vh; background: #faf9f6; }\nform { display: grid; gap: 12px; width: 260px; }\nlabel { display: grid; gap: 4px; font-size: 13px; color: #555; }\ninput { padding: 8px 10px; border: 1px solid #ccc; border-radius: 8px; font: inherit; }\ninput.bad { border-color: #c0392b; }\nbutton { padding: 9px; border: 0; border-radius: 8px; background: #7c5cd6; color: #fff; cursor: pointer; }\n#msg { font-size: 13px; margin: 0; }',
    js: 'const f = document.getElementById("f");\nf.addEventListener("submit", (e) => {\n  e.preventDefault();\n  let ok = true;\n  for (const el of f.elements) {\n    if (!el.name) continue;\n    const valid = el.checkValidity();\n    el.classList.toggle("bad", !valid);\n    if (!valid) ok = false;\n  }\n  document.getElementById("msg").textContent = ok ? "✓ Looks good" : "Please fix the highlighted fields.";\n  console.log("submitted, valid:", ok);\n});',
  },
  blank: { html: '', css: '', js: '' },
};
const DEFAULTS = TEMPLATES.counter;

// Console bridge: capture log/warn/error inside the sandboxed iframe and post to parent.
const BRIDGE = `<script>
(function () {
  function fmt(a) {
    try {
      if (a instanceof Error) return a.stack || a.message;
      return typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a);
    } catch (e) { return String(a); }
  }
  function send(kind, args) {
    try { parent.postMessage({ tapdotPlay: true, kind: kind, text: args.map(fmt).join(' ') }, '*'); } catch (e) {}
  }
  ['log', 'warn', 'error', 'info'].forEach(function (k) {
    var orig = console[k];
    console[k] = function () { send(k === 'info' ? 'log' : k, [].slice.call(arguments)); orig.apply(console, arguments); };
  });
  window.onerror = function (msg, src, line, col) { send('error', [msg + ' (line ' + line + ')']); };
  window.addEventListener('unhandledrejection', function (e) { send('error', ['Unhandled promise rejection: ' + fmt(e.reason)]); });
})();
<\/script>`;

/* ── Persistence & sharing ─────────────────────────────────────────────── */

// The share link carries the code in the URL hash. base64 can't hold arbitrary
// Unicode directly, so the text is UTF-8 encoded to bytes first.
function encodeState(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeState(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function currentState() {
  return { html: $('html').value, css: $('css').value, js: $('js').value };
}

function load() {
  // A shared link always wins over whatever is in this browser's storage —
  // otherwise opening someone's link would silently show your own code.
  const hash = location.hash.match(/^#code=(.+)$/);
  if (hash) {
    try { return { ...DEFAULTS, ...decodeState(hash[1]) }; } catch { /* fall through */ }
  }
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(LS)) || {}) }; }
  catch { return { ...DEFAULTS }; }
}

/* ── Running ───────────────────────────────────────────────────────────── */

function buildDoc(state) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${state.css}</style></head>`
    + `<body>${state.html}${BRIDGE}<script>${state.js}<\/script></body></html>`;
}

let conCount = 0;
function run() {
  $('playConsole').innerHTML = '';
  conCount = 0; $('conCount').textContent = '0';
  $('preview').srcdoc = buildDoc(currentState());
}

let runTimer = null, saveTimer = null;
function schedule() {
  if ($('autorun').checked) {
    clearTimeout(runTimer);
    runTimer = setTimeout(run, 400);
  }
  $('saveState').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(LS, JSON.stringify(currentState()));
    $('saveState').textContent = 'Saved locally';
  }, 800);
}

window.addEventListener('message', (e) => {
  if (!e.data || !e.data.tapdotPlay) return;
  conCount++;
  $('conCount').textContent = String(conCount);
  const con = $('playConsole');
  con.insertAdjacentHTML('beforeend',
    `<div class="play-con-line play-con-${escapeHtml(e.data.kind)}">${escapeHtml(e.data.text)}</div>`);
  con.scrollTop = con.scrollHeight;
});

/* ── Editor behaviour ──────────────────────────────────────────────────── */

// Line-number gutter. Kept in a plain div whose line-height matches the
// textarea exactly (both set in dev.css) and scrolled in lockstep.
function syncGutter(id) {
  const ta = $(id);
  const lines = ta.value.split('\n').length;
  const gut = $('gut-' + id);
  if (gut.childElementCount !== lines) {
    gut.innerHTML = Array.from({ length: lines }, (_, n) => `<span>${n + 1}</span>`).join('');
  }
  gut.scrollTop = ta.scrollTop;
}

const INDENT = '  ';

function handleKey(e) {
  const ta = e.target;

  if (e.key === 'Enter' && !e.shiftKey) {
    // Auto-indent: carry the current line's leading whitespace onto the new one,
    // and add a level after an opening brace.
    const before = ta.value.slice(0, ta.selectionStart);
    const lineStart = before.lastIndexOf('\n') + 1;
    const indent = (before.slice(lineStart).match(/^[ \t]*/) || [''])[0];
    const extra = /[{([]\s*$/.test(before) ? INDENT : '';
    e.preventDefault();
    insert(ta, '\n' + indent + extra);
    return;
  }

  if (e.key !== 'Tab') return;
  e.preventDefault(); // Tab must indent here, not jump to the next control.

  const { selectionStart: s, selectionEnd: en, value } = ta;
  const multiline = value.slice(s, en).includes('\n');

  if (!multiline && !e.shiftKey) { insert(ta, INDENT); syncAfterEdit(ta); return; }

  // Block indent / outdent across every touched line.
  const from = value.lastIndexOf('\n', s - 1) + 1;
  const to = en + (value.slice(en).match(/^[^\n]*/) || [''])[0].length;
  const block = value.slice(from, to);
  const next = e.shiftKey
    ? block.replace(/^([ \t]{1,2})/gm, '')
    : block.replace(/^/gm, INDENT);
  ta.setRangeText(next, from, to, 'select');
  syncAfterEdit(ta);
}

function insert(ta, text) {
  ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
  syncAfterEdit(ta);
}
function syncAfterEdit(ta) {
  syncGutter(ta.id);
  schedule();
}

/* ── Layout ────────────────────────────────────────────────────────────── */

function setLayout(mode) {
  $('playWrap').dataset.layout = mode;
  document.querySelectorAll('#layoutPills .ts-pill-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.layout === mode));
  localStorage.setItem(LS_LAYOUT, mode);
}

/* ── Wiring ────────────────────────────────────────────────────────────── */

PANES.forEach(id => {
  const ta = $(id);
  ta.addEventListener('input', () => { syncGutter(id); schedule(); });
  ta.addEventListener('scroll', () => { $('gut-' + id).scrollTop = ta.scrollTop; });
  ta.addEventListener('keydown', handleKey);
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
});

$('runBtn').addEventListener('click', run);
$('clearCon').addEventListener('click', () => { $('playConsole').innerHTML = ''; conCount = 0; $('conCount').textContent = '0'; });
$('autorun').addEventListener('change', () => { if ($('autorun').checked) run(); });
$('layoutPills').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-pill-tab');
  if (b) setLayout(b.dataset.layout);
});

$('shareBtn').addEventListener('click', (e) => {
  const url = `${location.origin}${location.pathname}#code=${encodeState(currentState())}`;
  history.replaceState(null, '', `#code=${encodeState(currentState())}`);
  copyText(url, e.target);
});

$('downloadBtn').addEventListener('click', () => {
  // The exported file has to stand alone, so the console bridge is stripped —
  // it only exists to talk back to this page.
  const state = currentState();
  const doc = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>CodePlay export</title>\n<style>\n${state.css}\n</style>\n</head>\n<body>\n${state.html}\n<script>\n${state.js}\n<\/script>\n</body>\n</html>\n`;
  const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'codeplay.html';
  a.click();
  URL.revokeObjectURL(url);
});

$('template').addEventListener('change', () => {
  const t = TEMPLATES[$('template').value];
  if (!t) return;
  applyState(t);
  $('template').value = '';
});

$('resetPlay').addEventListener('click', () => {
  if (!confirm('Reset to the starter example? Your current code will be lost.')) return;
  localStorage.removeItem(LS);
  history.replaceState(null, '', location.pathname);
  applyState(DEFAULTS);
});

function applyState(state) {
  PANES.forEach(id => { $(id).value = state[id] || ''; syncGutter(id); });
  run();
  localStorage.setItem(LS, JSON.stringify(currentState()));
}

// Init
setLayout(localStorage.getItem(LS_LAYOUT) || 'rows');
const saved = load();
PANES.forEach(id => { $(id).value = saved[id] || ''; syncGutter(id); });
if (location.hash.startsWith('#code=')) $('saveState').textContent = 'Loaded from a shared link';
run();
