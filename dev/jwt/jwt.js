// JWTRead — decode JWTs client-side (atob), no library

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

$('token').addEventListener('input', render);
