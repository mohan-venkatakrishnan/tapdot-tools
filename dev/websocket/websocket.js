// WSTester — connect directly from the browser to any WebSocket server

const $ = (id) => document.getElementById(id);
let ws = null;

function setStatus(text, cls) {
  const el = $('wsStatus');
  el.textContent = text;
  el.className = 'dev-badge ' + (cls || '');
}

function log(dir, text) {
  const time = new Date().toLocaleTimeString();
  const cls = dir === 'sent' ? 'ws-sent' : dir === 'recv' ? 'ws-recv' : 'ws-sys';
  const arrow = dir === 'sent' ? '▲' : dir === 'recv' ? '▼' : '•';
  $('wsLog').insertAdjacentHTML('afterbegin',
    `<div class="${cls}"><span class="dev-muted">${time}</span> ${arrow} ${escapeHtml(text)}</div>`);
}

function disconnect() {
  if (ws) { ws.close(); ws = null; }
}

function connect() {
  const url = $('wsUrl').value.trim();
  if (!url) return;
  if (!/^wss?:\/\//.test(url)) { setStatus('URL must start with ws:// or wss://', 'bad'); return; }
  disconnect();
  setStatus('Connecting…', '');
  try { ws = new WebSocket(url); }
  catch (e) { setStatus('Invalid URL', 'bad'); ws = null; return; }

  ws.onopen = () => {
    setStatus('Connected', 'ok');
    log('sys', `Connected to ${url}`);
    $('sendBtn').disabled = false;
    $('connectBtn').textContent = 'Disconnect';
  };
  ws.onmessage = (e) => log('recv', typeof e.data === 'string' ? e.data : '[binary message]');
  ws.onerror = () => log('sys', 'Error — check the URL, and note that http pages cannot open ws:// from an https site.');
  ws.onclose = (e) => {
    setStatus('Disconnected', '');
    log('sys', `Closed (code ${e.code}${e.reason ? ', ' + e.reason : ''})`);
    $('sendBtn').disabled = true;
    $('connectBtn').textContent = 'Connect';
    ws = null;
  };
}

$('connectBtn').addEventListener('click', () => {
  if (ws) disconnect(); else connect();
});
$('sendBtn').addEventListener('click', () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const msg = $('wsMsg').value;
  if (!msg) return;
  ws.send(msg);
  log('sent', msg);
});
$('wsMsg').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') $('sendBtn').click();
});
$('clearLog').addEventListener('click', () => { $('wsLog').innerHTML = ''; });
