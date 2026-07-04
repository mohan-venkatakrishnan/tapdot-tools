// TZConvert — convert a picked date/time across timezones, with a live slider
// and an interactive map. City list: /dev/libs/tz/cities.js — map: /dev/libs/tz/worldmap.js

const LS_TARGETS = 'tapdot-tzconvert-targets';
const $ = (id) => document.getElementById(id);
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function getTargets() {
  try { const s = JSON.parse(localStorage.getItem(LS_TARGETS)); if (Array.isArray(s) && s.length) return s; } catch (e) {}
  return ['America/New_York', 'Europe/London', 'Asia/Tokyo'].filter(tz => tz !== LOCAL_TZ);
}
function setTargets(l) { localStorage.setItem(LS_TARGETS, JSON.stringify(l)); }

function getOffsetMinutes(tz, date) {
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((tzDate - utcDate) / 60000);
}
function getUTCOffset(tz, date) {
  const off = getOffsetMinutes(tz, date);
  const sign = off >= 0 ? '+' : '-'; const abs = Math.abs(off);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

// Interpret (y, mo, d, h, mi) as wall-clock time IN `tz`, return the UTC instant.
function wallTimeToUTC(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo, d, h, mi);
  const off1 = getOffsetMinutes(tz, new Date(guess));
  let utcMs = guess - off1 * 60000;
  const off2 = getOffsetMinutes(tz, new Date(utcMs));
  if (off2 !== off1) utcMs = guess - off2 * 60000;
  return new Date(utcMs);
}

function dateParts(date, tz) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const [y, m, d] = f.split('-').map(Number);
  return { y, m, d };
}
function dayDiff(date, srcTz, tgtTz) {
  const a = dateParts(date, srcTz), b = dateParts(date, tgtTz);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

// ── State ────────────────────────────────────────────────────────────────

function initTzSelects() {
  const opts = TZ_CITIES.map(([c, tz]) => `<option value="${tz}">${tzOptionLabel(c, tz)}</option>`).join('') +
    (TZ_CITIES.some(c => c[1] === LOCAL_TZ) ? '' : `<option value="${LOCAL_TZ}">Your timezone — ${LOCAL_TZ}</option>`);
  $('srcTz').innerHTML = opts;
  $('srcTz').value = LOCAL_TZ;
  $('tzSelect').innerHTML = opts;
}

function setNow() {
  const now = new Date();
  const parts = dateParts(now, LOCAL_TZ);
  $('srcDate').value = `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
  const hh = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: LOCAL_TZ, hour: '2-digit', hour12: false }).format(now));
  const mi = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: LOCAL_TZ, minute: '2-digit' }).format(now));
  $('srcTime').value = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  $('srcTz').value = LOCAL_TZ;
  syncSliderFromTime();
  render();
}

function syncSliderFromTime() {
  const [h, m] = $('srcTime').value.split(':').map(Number);
  $('slider').value = h * 60 + m;
}
function syncTimeFromSlider() {
  const mins = parseInt($('slider').value, 10);
  const h = Math.floor(mins / 60), m = mins % 60;
  $('srcTime').value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function currentUTCInstant() {
  const [y, mo, d] = $('srcDate').value.split('-').map(Number);
  const [h, mi] = $('srcTime').value.split(':').map(Number);
  return wallTimeToUTC(y, mo - 1, d, h, mi, $('srcTz').value);
}

function render() {
  const utc = currentUTCInstant();
  const srcTz = $('srcTz').value;
  const targets = getTargets();

  // Map: mark source (if curated) + all targets, terminator reflects picked time.
  const marked = TZ_CITIES.some(c => c[1] === srcTz) ? [srcTz, ...targets] : targets;
  renderWorldMap($('map'), {
    cities: TZ_CITIES,
    selected: marked,
    date: utc,
    onToggle: (tz) => {
      if (tz === srcTz) return;
      const list = getTargets();
      const next = list.includes(tz) ? list.filter(t => t !== tz) : [...list, tz];
      setTargets(next); render();
    },
  });

  $('results').innerHTML = targets.map(tz => {
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(utc);
    const date = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(utc);
    const dd = dayDiff(utc, srcTz, tz);
    const dayBadge = dd === 0 ? '' : `<span class="tzc-day">${dd > 0 ? `+${dd}d` : `${dd}d`}</span>`;
    return `<div class="tzc-row">
      <div><div class="tzc-name">${escapeHtml(tzCityName(tz))}</div><div class="tzc-off">${escapeHtml(date)} · ${getUTCOffset(tz, utc)}</div></div>
      <div class="dev-row" style="gap:6px"><span class="tzc-time">${time}</span>${dayBadge}<button class="tzc-remove" data-tz="${tz}" aria-label="Remove">×</button></div>
    </div>`;
  }).join('') || '<p class="dev-muted">Add a target city from the dropdown or click the map.</p>';
}

// ── Events ───────────────────────────────────────────────────────────────

$('srcDate').addEventListener('input', render);
$('srcTime').addEventListener('input', () => { syncSliderFromTime(); render(); });
$('srcTz').addEventListener('change', render);
$('slider').addEventListener('input', () => { syncTimeFromSlider(); render(); });
$('nowBtn').addEventListener('click', setNow);
$('add').addEventListener('click', () => {
  const tz = $('tzSelect').value;
  const list = getTargets();
  if (tz !== $('srcTz').value && !list.includes(tz)) { list.unshift(tz); setTargets(list); render(); }
});
$('results').addEventListener('click', (e) => {
  const b = e.target.closest('.tzc-remove'); if (!b) return;
  setTargets(getTargets().filter(tz => tz !== b.dataset.tz));
  render();
});

initTzSelects();
setNow();

initMapFullscreen(document.getElementById('mapFs'), document.getElementById('mapWrap'));
