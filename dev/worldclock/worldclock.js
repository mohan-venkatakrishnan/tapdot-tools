// WorldClock — themed analog clocks per city, ticking live, TV fullscreen

const $ = (id) => document.getElementById(id);
const LS = 'tapdot-worldclock-cities';

let selected = (() => {
  try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; }
})() || ['America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'];

function save() { localStorage.setItem(LS, JSON.stringify(selected)); }

function cityName(tz) {
  const c = TZ_CITIES.find(c => c[1] === tz);
  return c ? c[0] : tz.split('/').pop().replace(/_/g, ' ');
}

// Time parts in a given tz.
function timeIn(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, weekday: 'short', day: 'numeric', month: 'short',
  }).formatToParts(new Date());
  const get = (t) => parts.find(p => p.type === t)?.value || '';
  return { h: +get('hour') % 24, m: +get('minute'), s: +get('second'), date: `${get('weekday')} ${get('day')} ${get('month')}` };
}

function clockFace(tz) {
  // Static face; hands are rotated on tick via CSS transform.
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const a = i * 6 * Math.PI / 180;
    const r1 = major ? 40 : 44, r2 = 47;
    ticks += `<line class="wc-tick${major ? ' major' : ''}" x1="${50 + r1 * Math.sin(a)}" y1="${50 - r1 * Math.cos(a)}" x2="${50 + r2 * Math.sin(a)}" y2="${50 - r2 * Math.cos(a)}"/>`;
  }
  return `
    <div class="wc-clock" data-tz="${tz}">
      <svg viewBox="0 0 100 100" class="wc-face" role="img" aria-label="Clock for ${cityName(tz)}">
        <circle class="wc-dial" cx="50" cy="50" r="49"/>
        ${ticks}
        <line class="wc-hand wc-hour" x1="50" y1="50" x2="50" y2="27" data-hand="h"/>
        <line class="wc-hand wc-minute" x1="50" y1="50" x2="50" y2="17" data-hand="m"/>
        <line class="wc-hand wc-second" x1="50" y1="56" x2="50" y2="14" data-hand="s"/>
        <circle class="wc-hub" cx="50" cy="50" r="2.6"/>
      </svg>
      <div class="wc-city">${cityName(tz)}</div>
      <div class="wc-sub"><span data-digital></span> · <span data-date></span></div>
      <button class="biz-rm wc-rm" data-rm="${tz}" aria-label="Remove ${cityName(tz)}">✕</button>
    </div>`;
}

function build() {
  $('clockGrid').innerHTML = selected.map(clockFace).join('') ||
    '<p class="dev-muted">Add a city above.</p>';
  $('clockGrid').querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
    selected = selected.filter(tz => tz !== b.dataset.rm);
    save();
    build();
  }));
  tick();
}

function tick() {
  document.querySelectorAll('.wc-clock').forEach(el => {
    const t = timeIn(el.dataset.tz);
    const hA = (t.h % 12) * 30 + t.m * 0.5;
    const mA = t.m * 6 + t.s * 0.1;
    const sA = t.s * 6;
    el.querySelector('[data-hand="h"]').setAttribute('transform', `rotate(${hA} 50 50)`);
    el.querySelector('[data-hand="m"]').setAttribute('transform', `rotate(${mA} 50 50)`);
    el.querySelector('[data-hand="s"]').setAttribute('transform', `rotate(${sA} 50 50)`);
    el.querySelector('[data-digital]').textContent =
      `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;
    el.querySelector('[data-date]').textContent = t.date;
    el.classList.toggle('wc-night', t.h < 6 || t.h >= 18);
  });
}

// City picker
$('cityPick').innerHTML = TZ_CITIES.map(([name, tz]) => `<option value="${tz}">${name}</option>`).join('');
$('addCity').addEventListener('click', () => {
  const tz = $('cityPick').value;
  if (tz && !selected.includes(tz)) { selected.push(tz); save(); build(); }
});

// Themes
$('themeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-theme]');
  if (!b) return;
  $('themeTabs').querySelectorAll('.ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  $('clockGrid').dataset.wcTheme = b.dataset.theme;
});
$('clockGrid').dataset.wcTheme = 'airport';

initMapFullscreen($('clockFs'), $('clockGrid'));

build();
setInterval(tick, 1000);
