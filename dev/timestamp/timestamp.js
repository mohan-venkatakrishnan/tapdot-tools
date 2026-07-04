// TimestampConvert — Unix timestamp <-> date, live, across timezones

const $ = (id) => document.getElementById(id);

function tick() {
  $('nowTs').textContent = Math.floor(Date.now() / 1000);
}
$('copyNow').addEventListener('click', (e) => copyText($('nowTs').textContent, e.target));
tick();
setInterval(tick, 1000);

const COMMON_TZ = [['UTC', 'UTC'], ['Local', 'Local'], ['America/New_York', 'New York'], ['Europe/London', 'London'], ['Asia/Kolkata', 'Kolkata'], ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney']];

function fmtInTz(date, tz) {
  const zone = tz === 'Local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : tz;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date).replace(',', '');
}

function renderTsOut() {
  const raw = $('tsInput').value.trim();
  const err = $('err1');
  if (!raw) { $('tsOut').innerHTML = ''; err.textContent = ''; return; }
  const n = Number(raw);
  if (!Number.isFinite(n)) { err.textContent = 'Not a valid number.'; $('tsOut').innerHTML = ''; return; }
  const ms = $('unit').value === 's' ? n * 1000 : n;
  const date = new Date(ms);
  if (isNaN(date.getTime())) { err.textContent = 'Out of range for a JS Date.'; $('tsOut').innerHTML = ''; return; }
  err.textContent = '';
  $('tsOut').innerHTML = COMMON_TZ.map(([tz, label]) =>
    `<span><b>${fmtInTz(date, tz)}</b>${label}</span>`).join('') +
    `<span><b>${date.toISOString()}</b>ISO 8601</span>` +
    `<span><b>${Math.floor((Date.now() - date.getTime()) / 1000) >= 0 ? 'past' : 'future'}</b>relative</span>`;
}

function renderDateOut() {
  const err = $('err2');
  const dateStr = $('dateInput').value, timeStr = $('timeInput').value || '00:00:00';
  if (!dateStr) { $('dateOut').innerHTML = ''; err.textContent = ''; return; }
  const tz = $('tzInput').value;
  try {
    // Build the wall-clock time, then find the UTC instant that displays as
    // that wall-clock time in the chosen zone (handles arbitrary IANA zones
    // without a heavy timezone library).
    const naive = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(naive.getTime())) throw new Error('bad date');
    let guess = naive.getTime();
    // Converge in a couple of iterations: the offset itself can shift near a
    // DST boundary depending on which instant we probe.
    for (let i = 0; i < 3; i++) {
      guess = naive.getTime() - getTzOffsetMs(new Date(guess), tz);
    }
    const result = new Date(guess);
    err.textContent = '';
    $('dateOut').innerHTML =
      `<span><b>${Math.floor(result.getTime() / 1000)}</b>Unix seconds</span>` +
      `<span><b>${result.getTime()}</b>Unix ms</span>` +
      `<span><b>${result.toISOString()}</b>ISO 8601 (UTC)</span>`;
  } catch (e) {
    err.textContent = 'Could not parse that date/time.';
    $('dateOut').innerHTML = '';
  }
}

// Offset (ms) to ADD to a UTC instant to get the wall-clock time shown in `tz`.
function getTzOffsetMs(date, tz) {
  const zone = tz === 'Local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : tz;
  if (zone === 'UTC') return 0;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date).reduce((a, p) => (a[p.type] = p.value, a), {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUTC - date.getTime();
}

$('tsInput').addEventListener('input', renderTsOut);
$('unit').addEventListener('change', renderTsOut);
$('dateInput').addEventListener('input', renderDateOut);
$('timeInput').addEventListener('input', renderDateOut);
$('tzInput').addEventListener('change', renderDateOut);

// Populate timezone select from the shared city list + a UTC/Local shortcut.
$('tzInput').innerHTML = '<option value="Local">Local time</option><option value="UTC">UTC</option>' +
  TZ_CITIES.map(([name, tz]) => `<option value="${tz}">${name} (${tz})</option>`).join('');

// Default to now.
{
  const now = new Date();
  $('dateInput').value = now.toISOString().slice(0, 10);
  $('timeInput').value = now.toTimeString().slice(0, 8);
  $('tsInput').value = Math.floor(now.getTime() / 1000);
  renderTsOut();
  renderDateOut();
}
