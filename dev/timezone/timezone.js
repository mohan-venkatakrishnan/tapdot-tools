// TimezoneNow — world clock + meeting overlap (Intl API, no library)

const CITIES = [
  ['UTC', 'UTC'], ['Honolulu', 'Pacific/Honolulu'], ['Anchorage', 'America/Anchorage'],
  ['Los Angeles', 'America/Los_Angeles'], ['Denver', 'America/Denver'], ['Chicago', 'America/Chicago'],
  ['New York', 'America/New_York'], ['Toronto', 'America/Toronto'], ['Mexico City', 'America/Mexico_City'],
  ['Bogotá', 'America/Bogota'], ['São Paulo', 'America/Sao_Paulo'], ['London', 'Europe/London'],
  ['Lisbon', 'Europe/Lisbon'], ['Madrid', 'Europe/Madrid'], ['Paris', 'Europe/Paris'],
  ['Berlin', 'Europe/Berlin'], ['Rome', 'Europe/Rome'], ['Amsterdam', 'Europe/Amsterdam'],
  ['Stockholm', 'Europe/Stockholm'], ['Athens', 'Europe/Athens'], ['Istanbul', 'Europe/Istanbul'],
  ['Moscow', 'Europe/Moscow'], ['Nairobi', 'Africa/Nairobi'], ['Cairo', 'Africa/Cairo'],
  ['Johannesburg', 'Africa/Johannesburg'], ['Dubai', 'Asia/Dubai'], ['Karachi', 'Asia/Karachi'],
  ['Mumbai / Delhi', 'Asia/Kolkata'], ['Dhaka', 'Asia/Dhaka'], ['Bangkok', 'Asia/Bangkok'],
  ['Singapore', 'Asia/Singapore'], ['Hong Kong', 'Asia/Hong_Kong'], ['Shanghai', 'Asia/Shanghai'],
  ['Tokyo', 'Asia/Tokyo'], ['Seoul', 'Asia/Seoul'], ['Sydney', 'Australia/Sydney'],
  ['Auckland', 'Pacific/Auckland'],
];
const LS = 'tapdot-tz-list';
const $ = (id) => document.getElementById(id);

function getList() {
  try { const s = JSON.parse(localStorage.getItem(LS)); if (Array.isArray(s) && s.length) return s; } catch (e) {}
  return ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
}
function setList(l) { localStorage.setItem(LS, JSON.stringify(l)); }
const cityName = (tz) => (CITIES.find(c => c[1] === tz) || [tz])[0];

function getOffsetMinutes(tz, date) {
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((tzDate - utcDate) / 60000);
}
function getUTCOffset(tz, date = new Date()) {
  const off = getOffsetMinutes(tz, date);
  const sign = off >= 0 ? '+' : '-'; const abs = Math.abs(off);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
function isDST(tz, date = new Date()) {
  const jan = getOffsetMinutes(tz, new Date(date.getFullYear(), 0, 1));
  const jul = getOffsetMinutes(tz, new Date(date.getFullYear(), 6, 1));
  return getOffsetMinutes(tz, date) !== Math.max(jan, jul);
}
function localHour(tz, date) {
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(date));
}

function initSelect() {
  $('tzSelect').innerHTML = CITIES.map(([c, tz]) => `<option value="${tz}">${c} — ${tz}</option>`).join('');
}

function renderClocks() {
  const now = new Date();
  const list = getList();
  const rows = list.map(tz => {
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
    const date = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(now);
    return `<tr><td>${escapeHtml(cityName(tz))}</td><td>${time}</td><td>${date}</td><td>${getUTCOffset(tz, now)}${isDST(tz, now) ? ' <span class="dev-badge" style="padding:1px 6px">DST</span>' : ''}</td><td><button class="tz-remove" data-tz="${tz}" aria-label="Remove">×</button></td></tr>`;
  }).join('');
  $('clocks').innerHTML = `<thead><tr><th>City</th><th>Time</th><th>Date</th><th>UTC offset</th><th></th></tr></thead><tbody>${rows}</tbody>`;
}

function renderPlanner() {
  const list = getList();
  const now = new Date();
  const workCols = new Array(24).fill(list.length > 0);
  let head = '<tr><th>City</th>';
  for (let h = 0; h < 24; h++) head += `<th>${h}</th>`;
  head += '</tr>';
  let body = '';
  for (const tz of list) {
    body += `<tr><td>${escapeHtml(cityName(tz))}</td>`;
    for (let h = 0; h < 24; h++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h));
      const lh = localHour(tz, d);
      const work = lh >= 9 && lh < 18;
      if (!work) workCols[h] = false;
      body += `<td class="${work ? 'work' : ''}">${lh}</td>`;
    }
    body += '</tr>';
  }
  body += '<tr><td>Overlap</td>';
  for (let h = 0; h < 24; h++) body += `<td class="${workCols[h] ? 'ov' : ''}"></td>`;
  body += '</tr>';
  $('planner').innerHTML = `<table class="tz-planner"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

$('add').addEventListener('click', () => {
  const tz = $('tzSelect').value;
  const list = getList();
  if (!list.includes(tz)) { list.push(tz); setList(list); renderClocks(); renderPlanner(); }
});
$('clocks').addEventListener('click', (e) => {
  const b = e.target.closest('.tz-remove'); if (!b) return;
  setList(getList().filter(tz => tz !== b.dataset.tz));
  renderClocks(); renderPlanner();
});

initSelect();
renderClocks();
renderPlanner();
setInterval(renderClocks, 1000);
