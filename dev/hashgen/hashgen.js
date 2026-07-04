// HashGen — SHA-1/256/384/512 via WebCrypto, for text or files

const $ = (id) => document.getElementById(id);
const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
let mode = 'text';

function toHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashBytes(bytes) {
  const results = {};
  for (const algo of ALGOS) {
    results[algo] = toHex(await crypto.subtle.digest(algo, bytes));
  }
  return results;
}

function render(results) {
  $('hashList').innerHTML = Object.entries(results || {}).map(([algo, hex]) => `
    <div class="log-item" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--color-border)">
      <div style="min-width:0">
        <div class="dev-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.04em">${algo}</div>
        <div style="font-family:var(--font-mono);font-size:13px;word-break:break-all">${hex}</div>
      </div>
      <button class="ts-copy-btn" data-v="${hex}">Copy</button>
    </div>
  `).join('') || '<p class="dev-muted">Nothing hashed yet.</p>';
  $('hashList').querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.v, b)));
}

let hashTimer = null;
async function runText() {
  const text = $('input').value;
  if (!text) { render(null); return; }
  render(await hashBytes(new TextEncoder().encode(text)));
}
$('input').addEventListener('input', () => {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(runText, 200);
});

$('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $('fileInfo').textContent = `Hashing ${file.name} (${(file.size / 1024).toFixed(1)} KB)…`;
  const buf = await file.arrayBuffer();
  render(await hashBytes(buf));
  $('fileInfo').textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
});

$('modeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-pill-tab');
  if (!b) return;
  $('modeTabs').querySelectorAll('.ts-pill-tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  $('textPane').classList.toggle('ts-hidden', mode !== 'text');
  $('filePane').classList.toggle('ts-hidden', mode !== 'file');
  if (mode === 'text') runText(); else render(null);
});

render(null);
