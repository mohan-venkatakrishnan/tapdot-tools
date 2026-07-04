// CodePlay — HTML/CSS/JS playground with sandboxed live preview + console capture

const $ = (id) => document.getElementById(id);
const LS = 'tapdot-codeplay';

const DEFAULTS = {
  html: '<div class="card">\n  <h1>Hello, CodePlay</h1>\n  <button id="btn">Click me</button>\n  <p id="out"></p>\n</div>',
  css: 'body { font-family: system-ui; display: grid; place-items: center; min-height: 90vh; background: #f6f5f2; }\n.card { background: #fff; padding: 32px 40px; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }\nbutton { padding: 8px 18px; border-radius: 8px; border: none; background: #7c5cd6; color: #fff; cursor: pointer; }',
  js: 'let count = 0;\ndocument.getElementById("btn").addEventListener("click", () => {\n  count++;\n  document.getElementById("out").textContent = `Clicked ${count} time${count === 1 ? "" : "s"}`;\n  console.log("count is now", count);\n});',
};

// Console bridge: capture log/warn/error inside the sandboxed iframe and post to parent.
const BRIDGE = `<script>
(function () {
  function send(kind, args) {
    try { parent.postMessage({ tapdotPlay: true, kind: kind, text: args.map(function (a) {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch (e) { return String(a); }
    }).join(' ') }, '*'); } catch (e) {}
  }
  ['log', 'warn', 'error'].forEach(function (k) {
    var orig = console[k];
    console[k] = function () { send(k, [].slice.call(arguments)); orig.apply(console, arguments); };
  });
  window.onerror = function (msg, src, line, col) { send('error', [msg + ' (line ' + line + ')']); };
})();
<\/script>`;

function load() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(LS)) || {}) }; }
  catch { return { ...DEFAULTS }; }
}

let runTimer = null, saveTimer = null;

function run() {
  const doc = `<!DOCTYPE html><html><head><style>${$('css').value}</style></head>` +
    `<body>${$('html').value}${BRIDGE}<script>${$('js').value}<\/script></body></html>`;
  $('playConsole').innerHTML = '';
  $('preview').srcdoc = doc;
}

function schedule() {
  clearTimeout(runTimer);
  runTimer = setTimeout(run, 400);
  $('saveState').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(LS, JSON.stringify({ html: $('html').value, css: $('css').value, js: $('js').value }));
    $('saveState').textContent = 'Saved locally';
  }, 800);
}

window.addEventListener('message', (e) => {
  if (!e.data || !e.data.tapdotPlay) return;
  const color = e.data.kind === 'error' ? 'var(--color-danger)' : e.data.kind === 'warn' ? 'var(--color-warning)' : 'var(--color-text)';
  $('playConsole').insertAdjacentHTML('beforeend',
    `<div style="color:${color}">${escapeHtml(e.data.text)}</div>`);
});

['html', 'css', 'js'].forEach(id => $(id).addEventListener('input', schedule));
$('resetPlay').addEventListener('click', () => {
  if (!confirm('Reset to the starter example? Your current code will be lost.')) return;
  localStorage.removeItem(LS);
  const d = { ...DEFAULTS };
  $('html').value = d.html; $('css').value = d.css; $('js').value = d.js;
  run();
});

const saved = load();
$('html').value = saved.html;
$('css').value = saved.css;
$('js').value = saved.js;
run();
