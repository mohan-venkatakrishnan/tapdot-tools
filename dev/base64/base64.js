// Base64Tool — encode/decode live, UTF-8 safe, URL-safe option

const $ = (id) => document.getElementById(id);
let mode = 'encode';

function encodeB64(text, urlSafe) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  let b64 = btoa(bin);
  if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

function decodeB64(b64) {
  const std = b64.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = std.padEnd(std.length + (4 - std.length % 4) % 4, '=');
  const bin = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

function render() {
  const input = $('input').value;
  const err = $('err');
  err.textContent = '';
  if (!input) { $('output').textContent = ''; $('stats').textContent = ''; return; }
  try {
    const out = mode === 'encode' ? encodeB64(input, $('urlSafe').checked) : decodeB64(input);
    $('output').textContent = out;
    const inB = new Blob([input]).size, outB = new Blob([out]).size;
    $('stats').textContent = `${inB} bytes → ${outB} bytes`;
  } catch (e) {
    $('output').textContent = '';
    $('stats').textContent = '';
    err.textContent = mode === 'decode' ? 'Not valid Base64 — check for stray characters or truncation.' : e.message;
  }
}

$('modeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-pill-tab');
  if (!b) return;
  $('modeTabs').querySelectorAll('.ts-pill-tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  $('inLabel').textContent = mode === 'encode' ? 'Plain text' : 'Base64';
  $('outLabel').textContent = mode === 'encode' ? 'Base64' : 'Plain text';
  render();
});
$('input').addEventListener('input', render);
$('urlSafe').addEventListener('change', render);
$('copyOut').addEventListener('click', (e) => copyText($('output').textContent, e.target));
render();
