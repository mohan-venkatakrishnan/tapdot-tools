// UUIDGen — Web Crypto API, all local

function uuidV4() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join('-');
}
function uuidV7() {
  const ms = BigInt(Date.now());
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const bytes = new Uint8Array(16);
  const msBytes = [(ms >> 40n) & 0xFFn, (ms >> 32n) & 0xFFn, (ms >> 24n) & 0xFFn, (ms >> 16n) & 0xFFn, (ms >> 8n) & 0xFFn, ms & 0xFFn];
  msBytes.forEach((b, i) => { bytes[i] = Number(b); });
  bytes[6] = (rand[0] & 0x0f) | 0x70; bytes[8] = (rand[1] & 0x3f) | 0x80;
  for (let i = 9; i < 16; i++) bytes[i] = rand[i - 7];
  const h = Array.from(bytes).map(x => x.toString(16).padStart(2, '0')).join('');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join('-');
}
function ulid() {
  const CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const rand = crypto.getRandomValues(new Uint8Array(10));
  let timeStr = '', t = Date.now();
  for (let i = 9; i >= 0; i--) { timeStr = CHARS[t % 32] + timeStr; t = Math.floor(t / 32); }
  let randStr = '';
  for (let i = 0; i < 10; i++) randStr += CHARS[rand[i] % 32];
  return timeStr + randStr;
}
function nanoid(size = 21) {
  const ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes).map(b => ALPHABET[b % ALPHABET.length]).join('');
}
function randomHex(bytes = 16) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
function randomBase64(bytes = 32) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const GEN = { uuidv4: uuidV4, uuidv7: uuidV7, ulid, nanoid, hex: randomHex, base64: randomBase64 };
const NOTES = {
  uuidv4: 'Random 128-bit identifier — the default UUID for most database keys.',
  uuidv7: 'Time-ordered UUID — sorts by creation time, great for DB primary keys.',
  ulid: '26-char sortable identifier, Crockford Base32.',
  nanoid: 'Compact 21-char URL-safe id — smaller than a UUID.',
  hex: '32 hex characters of cryptographic randomness.',
  base64: 'URL-safe base64 token — good for secrets and API keys.',
};

const $ = (id) => document.getElementById(id);
let current = [];

function generate() {
  const fmt = $('fmt').value;
  let n = parseInt($('qty').value, 10);
  if (isNaN(n) || n < 1) n = 1;
  n = Math.min(n, 1000);
  const gen = GEN[fmt] || uuidV4;
  current = Array.from({ length: n }, () => gen());
  $('list').innerHTML = current.map(v =>
    `<div class="uuid-row"><span>${escapeHtml(v)}</span><button class="ts-copy-btn" data-v="${escapeHtml(v)}">Copy</button></div>`
  ).join('');
}

$('fmt').addEventListener('change', () => { $('fmtNote').textContent = NOTES[$('fmt').value]; generate(); });
$('gen').addEventListener('click', generate);
$('qty').addEventListener('change', generate);
$('list').addEventListener('click', (e) => { const b = e.target.closest('.ts-copy-btn'); if (b) copyText(b.dataset.v, b); });
$('copyAll').addEventListener('click', (e) => copyText(current.join('\n'), e.target));
$('download').addEventListener('click', () => {
  const blob = new Blob([current.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'ids.txt'; a.click();
  URL.revokeObjectURL(a.href);
});

$('fmtNote').textContent = NOTES.uuidv4;
generate();
