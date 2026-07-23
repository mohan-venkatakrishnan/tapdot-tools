// CronLab — parse, build, explain, next-runs, NL→cron.
//
// The engine parses each field into (a) a list of structural TERMS used to build
// a crontab.guru-style English sentence, and (b) a Set of matching values used
// for scheduling. Supports 5-field and 6-field (leading seconds) expressions,
// step-on-range (`9-17/2`), named ranges (`MON-FRI`), and the `@daily`-style
// nickname strings.

const FIELDS_5 = [
  { name: 'Minute', label: 'min', noun: 'minute', range: [0, 59] },
  { name: 'Hour', label: 'hour', noun: 'hour', range: [0, 23] },
  { name: 'Day of month', label: 'dom', noun: 'day-of-month', range: [1, 31] },
  { name: 'Month', label: 'mon', noun: 'month', range: [1, 12] },
  { name: 'Day of week', label: 'dow', noun: 'day-of-week', range: [0, 7] },
];
const FIELD_SEC = { name: 'Second', label: 'sec', noun: 'second', range: [0, 59] };
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Nicknames understood by vixie-cron / crontab.guru.
const NICKNAMES = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};
const PRESETS = ['@hourly', '@daily', '@weekly', '@monthly', '@yearly', '@reboot'];
const TZS = ['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone, 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
const $ = (id) => document.getElementById(id);

let format6 = false; // toggled by pills, auto-detected from input

function activeFields() { return format6 ? [FIELD_SEC, ...FIELDS_5] : FIELDS_5; }

const ORD_SUFFIX = (n) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
};

// ── Field parsing ─────────────────────────────────────────────────────────────

// Resolve a token that may be a number or a JAN/MON style name.
function resolveValue(tok, f) {
  const n = Number(tok);
  if (/^\d+$/.test(tok)) return n;
  const upper = tok.toUpperCase();
  if (f.label === 'mon') { const i = MONTH_NAMES.indexOf(upper); if (i >= 0) return i + 1; }
  if (f.label === 'dow') { const i = DOW_NAMES.indexOf(upper); if (i >= 0) return i; }
  return null;
}

// Day-of-week accepts both 0 and 7 for Sunday; normalise to 0 so the matcher
// only ever deals with JS's getUTCDay() domain.
const normDow = (v, f) => (f.label === 'dow' && v === 7 ? 0 : v);

function parseField(text, f) {
  const terms = [];
  const values = new Set();
  const [lo, hi] = f.range;

  if (text === '') return { ok: false, error: `${f.name}: empty field` };

  for (const token of text.split(',')) {
    if (token === '') return { ok: false, error: `${f.name}: empty item in list` };

    const slash = token.split('/');
    if (slash.length > 2) return { ok: false, error: `${f.name}: "${token}" has more than one step` };
    const base = slash[0];
    let step = 1;
    if (slash.length === 2) {
      if (!/^\d+$/.test(slash[1])) return { ok: false, error: `${f.name}: step "${slash[1]}" is not a number` };
      step = parseInt(slash[1], 10);
      if (step < 1) return { ok: false, error: `${f.name}: step must be at least 1` };
    }

    let a, b, kind;
    if (base === '*' || base === '?') {
      a = lo; b = hi;
      kind = step === 1 ? 'all' : 'allStep';
    } else if (base.includes('-')) {
      const [rawA, rawB] = base.split('-');
      a = resolveValue(rawA, f); b = resolveValue(rawB, f);
      if (a === null) return { ok: false, error: `${f.name}: "${rawA}" is not valid` };
      if (b === null) return { ok: false, error: `${f.name}: "${rawB}" is not valid` };
      if (a > b) return { ok: false, error: `${f.name}: range ${base} starts after it ends` };
      if (a < lo || b > hi) return { ok: false, error: `${f.name}: ${base} is outside ${lo}-${hi}` };
      kind = step === 1 ? 'range' : 'rangeStep';
    } else {
      const v = resolveValue(base, f);
      if (v === null) return { ok: false, error: `${f.name}: "${base}" is not valid` };
      if (v < lo || v > hi) return { ok: false, error: `${f.name}: ${v} is outside ${lo}-${hi}` };
      a = v;
      // `5/10` means "from 5 to the end of the field, every 10" — not just "5".
      b = step === 1 ? v : hi;
      kind = step === 1 ? 'single' : 'singleStep';
    }

    for (let v = a; v <= b; v += step) values.add(normDow(v, f));
    terms.push({ kind, a, b, step });
  }

  return { ok: true, terms, values, raw: text, isAll: terms.length === 1 && terms[0].kind === 'all' };
}

function expandNicknames(expr) {
  const t = expr.trim().toLowerCase();
  return NICKNAMES[t] || expr;
}

function parseExpression(input) {
  const rawExpr = input.trim();
  if (rawExpr.toLowerCase() === '@reboot') {
    return { ok: true, reboot: true, parts: ['@reboot'], hasSeconds: false, specs: [] };
  }
  const expr = expandNicknames(rawExpr);
  const nickname = expr !== rawExpr ? rawExpr.trim().toLowerCase() : null;

  const parts = expr.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5 && parts.length !== 6) {
    if (rawExpr.startsWith('@')) return { ok: false, error: `Unknown nickname "${rawExpr}". Try ${Object.keys(NICKNAMES).join(', ')} or @reboot.` };
    return { ok: false, error: `Expected 5 or 6 fields, got ${parts.length}` };
  }

  const hasSeconds = parts.length === 6;
  const fields = hasSeconds ? [FIELD_SEC, ...FIELDS_5] : FIELDS_5;
  const specs = [];
  for (let i = 0; i < parts.length; i++) {
    const res = parseField(parts[i], fields[i]);
    if (!res.ok) return { ok: false, error: res.error };
    specs.push({ ...res, field: fields[i] });
  }

  return { ok: true, parts, hasSeconds, nickname, specs, fields, main: hasSeconds ? specs.slice(1) : specs, sec: hasSeconds ? specs[0] : null };
}

// ── English description (crontab.guru style) ──────────────────────────────────

function nameOf(v, f) {
  if (f.label === 'mon') return MONTH_FULL[v - 1] || String(v);
  if (f.label === 'dow') return DOW_FULL[v === 7 ? 0 : v] || String(v);
  return String(v);
}

function joinList(items) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// Describes a field as the phrase that follows "At " / "past " / "on ".
// `bare` fields (month, day-of-week) read as plain names; numeric fields get
// their noun prefixed ("minute 5") unless the term already carries it.
function describeField(spec) {
  const f = spec.field;
  const named = f.label === 'mon' || f.label === 'dow';

  const chunks = spec.terms.map((t) => {
    switch (t.kind) {
      case 'all': return `every ${f.noun}`;
      case 'allStep': return `every ${ORD_SUFFIX(t.step)} ${f.noun}`;
      case 'single': return named ? nameOf(t.a, f) : String(t.a);
      case 'range': return `${nameOf(t.a, f)} through ${nameOf(t.b, f)}`;
      case 'rangeStep': return `every ${ORD_SUFFIX(t.step)} ${f.noun} from ${nameOf(t.a, f)} through ${nameOf(t.b, f)}`;
      case 'singleStep': return `every ${ORD_SUFFIX(t.step)} ${f.noun} from ${nameOf(t.a, f)} through ${nameOf(t.b, f)}`;
      default: return '';
    }
  });

  const body = joinList(chunks);
  // A plain value list on a numeric field needs its noun ("minute 0"); a term
  // that already begins with "every …" reads correctly on its own.
  const allPlain = spec.terms.every(t => t.kind === 'single' || t.kind === 'range');
  if (!named && allPlain) return `${f.noun} ${body}`;
  return body;
}

const pad2 = (n) => String(n).padStart(2, '0');
const isSingle = (spec) => spec.terms.length === 1 && spec.terms[0].kind === 'single';

function toEnglish(res) {
  if (res.reboot) return 'Once at startup, every time the machine boots.';

  const [min, hour, dom, mon, dow] = res.main;
  const sec = res.sec;

  // Trailing "on …/in …" clauses. When BOTH day-of-month and day-of-week are
  // restricted, cron runs on either — the sentence has to say "and" to match.
  let tail = '';
  if (!dom.isAll) tail += ` on ${describeField(dom)}`;
  if (!dow.isAll) tail += `${!dom.isAll ? ' and on ' : ' on '}${describeField(dow)}`;
  if (!mon.isAll) tail += ` in ${describeField(mon)}`;

  const secPhrase = sec && !isSingle(sec) ? describeField(sec)
    : sec && sec.terms[0].a !== 0 ? `second ${sec.terms[0].a}` : null;

  // "Every minute." / "Every second." — the fully-open expressions.
  if (min.isAll && hour.isAll && !tail) {
    if (!sec) return 'Every minute.';
    if (sec.isAll) return 'Every second.';
    if (sec.terms.length === 1 && sec.terms[0].kind === 'allStep') return `Every ${ORD_SUFFIX(sec.terms[0].step)} second.`;
  }

  let head;
  if (isSingle(min) && isSingle(hour)) {
    head = `At ${pad2(hour.terms[0].a)}:${pad2(min.terms[0].a)}`;
    if (secPhrase && sec && isSingle(sec)) head = `At ${pad2(hour.terms[0].a)}:${pad2(min.terms[0].a)}:${pad2(sec.terms[0].a)}`;
  } else {
    head = `At ${describeField(min)}`;
    if (!hour.isAll) head += ` past ${describeField(hour)}`;
  }

  const secPrefix = secPhrase && !(isSingle(min) && isSingle(hour) && sec && isSingle(sec))
    ? `${describeField(sec)}, `.replace(/^./, c => c.toUpperCase()) : '';

  return `${secPrefix}${secPrefix ? head.replace(/^At /, 'at ') : head}${tail}.`;
}

// ── Scheduling ────────────────────────────────────────────────────────────────

// Standard cron semantics: if BOTH day-of-month and day-of-week are restricted,
// a run happens when EITHER matches (not both). If only one is restricted, it
// alone decides. This is the rule vixie-cron documents and crontab.guru follows.
function dayMatches(date, dom, dow) {
  const domHit = dom.values.has(date.getUTCDate());
  const dowHit = dow.values.has(date.getUTCDay());
  if (dom.isAll && dow.isAll) return true;
  if (dom.isAll) return dowHit;
  if (dow.isAll) return domHit;
  return domHit || dowHit;
}

function minuteMatches(cur, res) {
  const [min, hour, dom, mon, dow] = res.main;
  return min.values.has(cur.getUTCMinutes())
    && hour.values.has(cur.getUTCHours())
    && mon.values.has(cur.getUTCMonth() + 1)
    && dayMatches(cur, dom, dow);
}

function getNextRuns(res, count = 20) {
  if (res.reboot) return [];
  const runs = [];
  const secs = res.sec ? [...res.sec.values].sort((a, b) => a - b) : [0];
  let cur = new Date(); cur.setUTCSeconds(0, 0);
  const now = Date.now();
  const maxIter = 527040; // one year of minutes
  for (let i = 0; i < maxIter && runs.length < count; i++) {
    if (minuteMatches(cur, res)) {
      for (const s of secs) {
        const t = cur.getTime() + s * 1000;
        if (t > now) { runs.push(new Date(t)); if (runs.length >= count) break; }
      }
    }
    cur = new Date(cur.getTime() + 60000);
  }
  return runs;
}

// Honest 30-day histogram — counts EVERY run in the window, independent of the
// 20-run table above (a "* * * * *" really is 1,440/day, not 20 total).
function countRunsPerDay(res, days = 30) {
  const buckets = new Map();
  let total = 0;
  if (res.reboot) return { buckets, total };
  const perMinute = res.sec ? res.sec.values.size : 1;
  let cur = new Date(); cur.setUTCSeconds(0, 0);
  const end = cur.getTime() + days * 86400000;
  while (cur.getTime() < end) {
    if (minuteMatches(cur, res)) {
      const key = cur.toDateString();
      buckets.set(key, (buckets.get(key) || 0) + perMinute);
      total += perMinute;
    }
    cur = new Date(cur.getTime() + 60000);
  }
  return { buckets, total };
}

function fmtTZ(date, tz) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
}

function setFormat(is6, rewrite) {
  format6 = is6;
  document.querySelectorAll('#fmtPills .ts-pill-tab').forEach(b =>
    b.classList.toggle('active', (b.dataset.fmt === '6') === is6));
  if (rewrite) {
    const parts = expandNicknames($('expr').value).trim().split(/\s+/).filter(Boolean);
    if (is6 && parts.length === 5) $('expr').value = '0 ' + parts.join(' ');
    if (!is6 && parts.length === 6) $('expr').value = parts.slice(1).join(' ');
  }
  buildBuilder();
}

// Per-field breakdown — crontab.guru's signature panel: each field, what it
// literally says, and which values it expands to.
function renderBreakdown(res) {
  if (!res.ok || res.reboot) { $('breakdown').innerHTML = ''; return; }
  $('breakdown').innerHTML = res.specs.map((spec) => {
    const f = spec.field;
    const vals = [...spec.values].sort((a, b) => a - b);
    const shown = vals.length > 12
      ? `${vals.slice(0, 12).map(v => nameOf(v, f)).join(', ')} … (${vals.length} values)`
      : vals.map(v => nameOf(v, f)).join(', ');
    return `<div class="cron-bd-row">
      <code class="cron-bd-field">${escapeHtml(spec.raw)}</code>
      <div class="cron-bd-body">
        <span class="cron-bd-name">${f.name}</span>
        <span class="cron-bd-desc">${escapeHtml(describeField(spec))}</span>
        <span class="cron-bd-values">${escapeHtml(shown)}</span>
      </div>
    </div>`;
  }).join('');
}

function render() {
  const expr = $('expr').value;
  const expanded = expandNicknames(expr);
  const parts = expanded.trim().split(/\s+/).filter(Boolean);
  // Auto-detect field count as the user types.
  if ((parts.length === 6) !== format6 && (parts.length === 5 || parts.length === 6)) setFormat(parts.length === 6, false);

  const res = parseExpression(expr);
  const fields = activeFields();
  $('fields').innerHTML = res.reboot
    ? '<span><b>@reboot</b>special</span>'
    : fields.map((f, i) => `<span><b>${escapeHtml(parts[i] || '?')}</b>${f.label}</span>`).join('');

  if (!res.ok) {
    $('err').textContent = res.error;
    $('english').textContent = '';
    $('runs').innerHTML = ''; $('heatmap').innerHTML = ''; $('heatTotal').textContent = '';
    $('breakdown').innerHTML = '';
    return;
  }
  $('err').textContent = '';
  $('english').textContent = toEnglish(res);
  $('nick').textContent = res.nickname ? `${res.nickname} expands to ${expanded.trim()}` : '';
  renderBreakdown(res);

  const runs = getNextRuns(res, 20);
  const tz1 = $('tz1').value, tz2 = $('tz2').value;
  $('runs').innerHTML = `<thead><tr><th>#</th><th>${escapeHtml(tz1)}</th><th>${escapeHtml(tz2)}</th></tr></thead><tbody>` +
    (runs.length ? runs.map((r, i) => `<tr><td>${i + 1}</td><td>${fmtTZ(r, tz1)}</td><td>${fmtTZ(r, tz2)}</td></tr>`).join('')
      : `<tr><td colspan="3" class="dev-muted">${res.reboot ? '@reboot has no clock schedule — it fires once at boot.' : 'No runs in the next year.'}</td></tr>`) + '</tbody>';

  // 30-day heatmap with real counts
  const { buckets, total } = countRunsPerDay(res, 30);
  const today = new Date();
  let cells = '';
  for (let d = 0; d < 30; d++) {
    const date = new Date(today); date.setDate(today.getDate() + d);
    const n = buckets.get(date.toDateString()) || 0;
    const level = n === 0 ? 0 : n === 1 ? 1 : n <= 4 ? 2 : n <= 48 ? 3 : 4;
    cells += `<div class="ts-heatmap-cell" data-count="${level}" title="${date.toDateString()}: ${n.toLocaleString()} run${n === 1 ? '' : 's'}">${date.getDate()}</div>`;
  }
  $('heatmap').innerHTML = cells;
  $('heatTotal').textContent = res.reboot
    ? '@reboot fires at startup, so it has no per-day schedule to count.'
    : `${total.toLocaleString()} total run${total === 1 ? '' : 's'} in the next 30 days — hover a day for its exact count`;
  saveHistory(expr.trim());
}

// Visual builder — one-way (builder → expression); gains a Seconds row in 6-field mode
function buildBuilder() {
  $('builder').innerHTML = activeFields().map((f, i) => `
    <div class="cron-builder-row">
      <label>${f.name}</label>
      <div class="dev-row" style="gap:6px">
        <select class="ts-select b-mode" data-i="${i}" style="height:34px">
          <option value="every">Every</option><option value="at">At</option>
          <option value="step">Every N</option><option value="range">Range</option>
        </select>
        <input class="ts-input b-val" data-i="${i}" style="height:34px;max-width:120px" placeholder="${f.range[0]}-${f.range[1]}" />
      </div>
    </div>`).join('');
}
function buildFromControls() {
  const parts = activeFields().map((f, i) => {
    const mode = $('builder').querySelector(`.b-mode[data-i="${i}"]`).value;
    const val = $('builder').querySelector(`.b-val[data-i="${i}"]`).value.trim();
    if (mode === 'every') return '*';
    if (mode === 'step') return val ? `*/${val}` : '*';
    return val || '*';
  });
  $('expr').value = parts.join(' ');
  render();
}

// NL → cron
function fallbackNLParser(description) {
  const d = description.toLowerCase();
  if (d.includes('every second')) return format6 ? '* * * * * *' : '* * * * *';
  if (d.includes('every minute')) return '* * * * *';
  if (d.includes('every hour')) return '0 * * * *';
  if (d.includes('midnight')) return '0 0 * * *';
  if (d.includes('noon')) return '0 12 * * *';
  if (d.includes('weekday')) return '0 9 * * 1-5';
  if (d.includes('weekend')) return '0 9 * * 0,6';
  if (d.includes('every monday')) return '0 9 * * 1';
  if (d.includes('every sunday')) return '0 9 * * 0';
  if (d.includes('first of the month') || d.includes('first day')) return '0 0 1 * *';
  let m;
  if ((m = d.match(/every (\d+) seconds?/))) return `*/${m[1]} * * * * *`;
  if ((m = d.match(/every (\d+) minutes?/))) return `*/${m[1]} * * * *`;
  if ((m = d.match(/every (\d+) hours?/))) return `0 */${m[1]} * * *`;
  if ((m = d.match(/business hours/))) return '0 9-17 * * 1-5';
  if ((m = d.match(/at (\d+)\s*(am|pm)/))) {
    let h = parseInt(m[1]); if (m[2] === 'pm' && h !== 12) h += 12; if (m[2] === 'am' && h === 12) h = 0;
    return `0 ${h} * * *`;
  }
  return null;
}
const NL_PROMPT = (desc) => `Convert this schedule description to a cron expression.
Respond with ONLY the cron expression (5 fields: minute hour day-of-month month day-of-week).
No explanation. No markdown. Just the 5-field cron expression.

Schedule: "${desc}"

Examples:
"Every day at midnight" -> 0 0 * * *
"Every weekday at 9am" -> 0 9 * * 1-5
"Every 15 minutes" -> */15 * * * *`;

async function convertNL() {
  const desc = $('nl').value.trim();
  const out = $('nlOut'), status = $('nlStatus');
  if (!desc) return;
  out.textContent = ''; status.textContent = '';
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    const cron = fallbackNLParser(desc);
    if (cron) { applyCron(cron); status.textContent = 'Converted with the built-in rule parser (on-device AI unavailable).'; }
    else { status.textContent = 'Could not parse that. Try phrasing like "every weekday at 9am". On-device AI (Chrome flags) handles more.'; }
    return;
  }
  status.textContent = 'Converting with on-device AI…';
  try {
    const session = await tapdotAI.createSession((p) => { status.textContent = `Downloading model… ${p}%`; });
    const raw = await session.prompt(NL_PROMPT(desc));
    if (session.destroy) session.destroy();
    const cron = raw.trim().replace(/`/g, '').split('\n')[0].trim();
    const parsed = parseExpression(cron);
    if (!parsed.ok) throw new Error('AI returned an invalid expression — try rephrasing');
    applyCron(cron); status.textContent = 'Converted with on-device AI.';
  } catch (e) {
    const cron = fallbackNLParser(desc);
    if (cron) { applyCron(cron); status.textContent = 'AI unavailable — used the rule parser instead.'; }
    else status.textContent = e.message;
  }
}
function applyCron(cron) { $('nlOut').innerHTML = `<code class="ts-kw">${escapeHtml(cron)}</code> <button class="ts-copy-btn" id="nlCopy">Copy</button>`; $('expr').value = cron; render(); $('nlCopy').addEventListener('click', (e) => copyText(cron, e.target)); }

function saveHistory(expr) {
  if (!expr) return;
  const h = JSON.parse(localStorage.getItem('tapdot-cron-history') || '[]');
  localStorage.setItem('tapdot-cron-history', JSON.stringify([expr, ...h.filter(e => e !== expr)].slice(0, 10)));
}

// A "random" button, like crontab.guru's — useful for discovering syntax you
// didn't know existed. Deliberately biased toward realistic schedules.
const RANDOM_POOL = [
  '*/5 * * * *', '0 9-17/2 * * 1-5', '30 4 1,15 * *', '0 22 * * MON-FRI',
  '5 0 * 8 *', '0 0,12 1 */2 *', '15 14 1 * *', '0 */6 * * SUN',
  '*/10 9-18 * * 1-5', '0 3 * * SAT', '45 23 * * 6', '0 0 1 JAN,JUL *',
];
function randomCron() {
  const pick = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
  $('expr').value = pick;
  setFormat(false, false);
  render();
}

// Init
$('tz1').innerHTML = TZS.map((t, i) => `<option${i === 0 ? ' selected' : ''}>${t}</option>`).join('');
$('tz2').innerHTML = TZS.map((t, i) => `<option${i === 1 ? ' selected' : ''}>${t}</option>`).join('');
$('presets').innerHTML = PRESETS.map(k => `<button class="ts-btn ts-btn-ghost" style="height:30px;padding:0 12px" data-cron="${k}">${k}</button>`).join('')
  + '<button class="ts-btn ts-btn-ghost" style="height:30px;padding:0 12px" id="randomBtn">🎲 random</button>';
$('presets').addEventListener('click', (e) => {
  if (e.target.closest('#randomBtn')) { randomCron(); return; }
  const b = e.target.closest('[data-cron]'); if (b) { $('expr').value = b.dataset.cron; render(); }
});
$('fmtPills').addEventListener('click', (e) => { const b = e.target.closest('.ts-pill-tab'); if (b) { setFormat(b.dataset.fmt === '6', true); render(); } });
$('expr').addEventListener('input', render);
$('tz1').addEventListener('change', render);
$('tz2').addEventListener('change', render);
$('convert').addEventListener('click', convertNL);
$('nl').addEventListener('keydown', (e) => { if (e.key === 'Enter') convertNL(); });
$('builder').addEventListener('input', buildFromControls);
buildBuilder();
render();
