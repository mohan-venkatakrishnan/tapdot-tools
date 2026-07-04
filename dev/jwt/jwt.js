// JWTStudio — decode JWTs client-side (atob), no library

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

function formatDuration(secs) {
  secs = Math.abs(secs);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`;
}

const CLAIM_INFO = {
  iss: 'Issuer — who created and signed this token.',
  sub: 'Subject — the principal the token is about (usually a user ID).',
  aud: 'Audience — the intended recipient(s) of the token.',
  exp: 'Expiration time — the token must be rejected after this instant.',
  nbf: 'Not before — the token must be rejected before this instant.',
  iat: 'Issued at — when the token was created.',
  jti: 'JWT ID — a unique identifier for this token, used to prevent replay.',
  alg: 'Algorithm — the signing algorithm used (header claim).',
  typ: 'Type — usually "JWT" (header claim).',
  kid: 'Key ID — which key was used to sign this token (header claim).',
  scope: 'Scope — space-separated list of permissions granted to this token.',
  role: 'Role — the role assigned to the subject (non-standard, common in practice).',
};
function fmtClaimValue(key, val) {
  if ((key === 'exp' || key === 'iat' || key === 'nbf') && typeof val === 'number') {
    return `${val} — ${new Date(val * 1000).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
  }
  return typeof val === 'object' ? JSON.stringify(val) : String(val);
}

function decodeJWT(token) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT — must have 3 parts separated by dots.');
  const base64Decode = (str) => {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
      .padEnd(str.length + (4 - str.length % 4) % 4, '=');
    return JSON.parse(decodeURIComponent(escape(atob(base64))));
  };
  const header = base64Decode(parts[0]);
  const payload = base64Decode(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  const expired = payload.exp ? payload.exp < now : null;
  const timeInfo = payload.exp
    ? (expired ? `Expired ${formatDuration(now - payload.exp)} ago` : `Expires in ${formatDuration(payload.exp - now)}`)
    : 'No expiry claim';
  return { header, payload, sigRaw: parts[2], expired, timeInfo, algorithm: header.alg };
}

const $ = (id) => document.getElementById(id);
let currentPayload = null;
let tickTimer = null;

function renderClaimsTable(header, payload) {
  const rows = [];
  if (header.alg) rows.push(['alg', header.alg]);
  if (header.typ) rows.push(['typ', header.typ]);
  if (header.kid) rows.push(['kid', header.kid]);
  Object.entries(payload).forEach(([k, v]) => rows.push([k, v]));
  $('claimsBody').innerHTML = rows.map(([k, v]) =>
    `<tr><td><code>${escapeHtml(k)}</code></td><td style="font-family:var(--font-mono);font-size:12px">${escapeHtml(fmtClaimValue(k, v))}</td><td class="dev-muted">${escapeHtml(CLAIM_INFO[k] || 'Custom claim.')}</td></tr>`
  ).join('') || '<tr><td colspan="3" class="dev-muted">No claims.</td></tr>';
}

function tickExpiry() {
  if (!currentPayload || !currentPayload.exp) return;
  const now = Math.floor(Date.now() / 1000);
  const expired = currentPayload.exp < now;
  const timeInfo = expired
    ? `Expired ${formatDuration(now - currentPayload.exp)} ago`
    : `Expires in ${formatDuration(currentPayload.exp - now)}`;
  const exp = $('expiry');
  exp.textContent = timeInfo;
  exp.className = 'dev-badge ' + (expired ? 'bad' : 'ok');
}

function render() {
  const token = $('token').value.trim();
  const err = $('err');
  clearInterval(tickTimer); tickTimer = null;
  if (!token) { hideOutput('out'); err.textContent = ''; currentPayload = null; return; }
  let d;
  try { d = decodeJWT(token); }
  catch (e) { err.textContent = e.message; hideOutput('out'); currentPayload = null; return; }
  err.textContent = '';
  $('alg').textContent = 'alg: ' + (d.algorithm || 'none');
  currentPayload = d.payload;
  const exp = $('expiry');
  exp.textContent = d.timeInfo;
  exp.className = 'dev-badge ' + (d.expired === true ? 'bad' : d.expired === false ? 'ok' : '');
  if (d.payload.exp) tickTimer = setInterval(tickExpiry, 1000);
  $('header').innerHTML = highlightJSON(JSON.stringify(d.header, null, 2));
  $('payload').innerHTML = highlightJSON(JSON.stringify(d.payload, null, 2));
  renderClaimsTable(d.header, d.payload);
  $('sig').textContent = d.sigRaw;
  showOutput('out');
}

// ── HMAC signature verification (WebCrypto, fully local) ────────────────────
const HMAC_ALGS = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

function b64urlToBytes(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=');
  const bin = atob(base64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function verifyHmac() {
  const badge = $('verifyStatus');
  const token = $('token').value.trim();
  const secret = $('secret').value;
  const parts = token.split('.');
  if (!token || parts.length !== 3 || !secret) { badge.textContent = ''; badge.className = 'dev-badge'; return; }

  let alg;
  try { alg = decodeJWT(token).algorithm; } catch { badge.textContent = ''; badge.className = 'dev-badge'; return; }
  if (!HMAC_ALGS[alg]) {
    badge.textContent = `${alg || 'unknown'} — not an HMAC token`;
    badge.className = 'dev-badge';
    return;
  }
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: HMAC_ALGS[alg] }, false, ['verify']);
    const valid = await crypto.subtle.verify(
      'HMAC', key, b64urlToBytes(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1]));
    badge.textContent = valid ? 'Signature verified ✓' : 'Invalid signature ✗';
    badge.className = 'dev-badge ' + (valid ? 'ok' : 'bad');
  } catch (e) {
    badge.textContent = 'Could not verify';
    badge.className = 'dev-badge bad';
  }
}

$('secret').addEventListener('input', verifyHmac);
$('token').addEventListener('input', () => { render(); verifyHmac(); });

// ── Encode & sign (WebCrypto HMAC) ──────────────────────────────────────────
function b64url(bytes) {
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj) {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

// RSA/ECDSA parameters per JWS alg. WebCrypto's ECDSA sign already returns the
// raw r||s concatenation JWS expects; RSASSA-PKCS1-v1_5 output is used as-is.
const ASYM_ALGS = {
  RS256: { import: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, sign: { name: 'RSASSA-PKCS1-v1_5' } },
  RS384: { import: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' }, sign: { name: 'RSASSA-PKCS1-v1_5' } },
  RS512: { import: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' }, sign: { name: 'RSASSA-PKCS1-v1_5' } },
  ES256: { import: { name: 'ECDSA', namedCurve: 'P-256' }, sign: { name: 'ECDSA', hash: 'SHA-256' } },
  ES384: { import: { name: 'ECDSA', namedCurve: 'P-384' }, sign: { name: 'ECDSA', hash: 'SHA-384' } },
  ES512: { import: { name: 'ECDSA', namedCurve: 'P-521' }, sign: { name: 'ECDSA', hash: 'SHA-512' } },
};

function pemToPkcs8(pem) {
  const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}
function derToPem(buf, label) {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const lines = b64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

async function encodeJwt() {
  const err = $('encErr');
  let payload;
  try { payload = JSON.parse($('encPayload').value); }
  catch (e) { err.textContent = 'Payload is not valid JSON: ' + e.message; $('encOut').textContent = ''; return; }
  err.textContent = '';
  const alg = $('encAlg').value;
  const secret = $('encSecret').value;
  const header = { alg, typ: 'JWT' };
  const signingInput = b64urlJson(header) + '.' + b64urlJson(payload);

  if (ASYM_ALGS[alg]) {
    const pem = $('encPem').value.trim();
    if (!pem) { $('encOut').textContent = ''; err.textContent = 'Paste a PKCS#8 private key, or click "Generate test keypair".'; return; }
    try {
      const spec = ASYM_ALGS[alg];
      const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8(pem), spec.import, false, ['sign']);
      const sig = await crypto.subtle.sign(spec.sign, key, new TextEncoder().encode(signingInput));
      $('encOut').textContent = signingInput + '.' + b64url(new Uint8Array(sig));
    } catch (e) {
      err.textContent = `Could not sign with ${alg}: ${e.message}. Check the key matches the algorithm (e.g. ES256 needs a P-256 key).`;
      $('encOut').textContent = '';
    }
    return;
  }

  if (!secret) { $('encOut').textContent = signingInput + '.'; return; }
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: HMAC_ALGS[alg] }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    $('encOut').textContent = signingInput + '.' + b64url(new Uint8Array(sig));
  } catch (e) {
    err.textContent = 'Could not sign: ' + e.message;
  }
}
function syncEncMode() {
  const asym = !!ASYM_ALGS[$('encAlg').value];
  $('pemWrap').classList.toggle('ts-hidden', !asym);
  $('encSecret').style.display = asym ? 'none' : '';
}

$('genKeyBtn').addEventListener('click', async () => {
  const alg = $('encAlg').value;
  const spec = ASYM_ALGS[alg];
  if (!spec) return;
  $('encErr').textContent = '';
  const genParams = spec.import.name === 'ECDSA'
    ? { name: 'ECDSA', namedCurve: spec.import.namedCurve }
    : { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: spec.import.hash };
  const pair = await crypto.subtle.generateKey(genParams, true, ['sign', 'verify']);
  const priv = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
  const pub = await crypto.subtle.exportKey('spki', pair.publicKey);
  $('encPem').value = derToPem(priv, 'PRIVATE KEY');
  $('pubOut').textContent = 'Public key (share this to verify):\n' + derToPem(pub, 'PUBLIC KEY');
  $('pubOut').classList.remove('ts-hidden');
  encodeJwt();
});

['encPayload', 'encSecret', 'encPem'].forEach(id => $(id).addEventListener('input', encodeJwt));
$('encAlg').addEventListener('input', () => { syncEncMode(); encodeJwt(); });
syncEncMode();
$('encCopy').addEventListener('click', (e) => copyText($('encOut').textContent, e.target));

$('jwtModeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-jm]');
  if (!b) return;
  $('jwtModeTabs').querySelectorAll('.ts-pill-tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const enc = b.dataset.jm === 'encode';
  $('decodePane').classList.toggle('ts-hidden', enc);
  $('out').classList.toggle('ts-hidden', enc);
  $('encodePane').classList.toggle('ts-hidden', !enc);
  if (enc) encodeJwt();
});
