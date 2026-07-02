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
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`;
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

function render() {
  const token = $('token').value.trim();
  const err = $('err');
  if (!token) { hideOutput('out'); err.textContent = ''; return; }
  let d;
  try { d = decodeJWT(token); }
  catch (e) { err.textContent = e.message; hideOutput('out'); return; }
  err.textContent = '';
  $('alg').textContent = 'alg: ' + (d.algorithm || 'none');
  const exp = $('expiry');
  exp.textContent = d.timeInfo;
  exp.className = 'dev-badge ' + (d.expired === true ? 'bad' : d.expired === false ? 'ok' : '');
  $('header').innerHTML = highlightJSON(JSON.stringify(d.header, null, 2));
  $('payload').innerHTML = highlightJSON(JSON.stringify(d.payload, null, 2));
  $('sig').textContent = d.sigRaw;
  showOutput('out');
}

$('token').addEventListener('input', render);
