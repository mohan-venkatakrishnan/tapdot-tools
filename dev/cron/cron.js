// CronLab — parse, build, explain, next-runs, NL→cron

const FIELDS = [
  { name: 'Minute', label: 'min', range: [0, 59] },
  { name: 'Hour', label: 'hour', range: [0, 23] },
  { name: 'Day of month', label: 'dom', range: [1, 31] },
  { name: 'Month', label: 'mon', range: [1, 12] },
  { name: 'Day of week', label: 'dow', range: [0, 7] },
];
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PRESETS = { '@daily': '0 0 * * *', '@hourly': '0 * * * *', '@weekly': '0 0 * * 0', '@monthly': '0 0 1 * *', '@yearly': '0 0 1 1 *' };
const TZS = ['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone, 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
const $ = (id) => document.getElementById(id);

function parseExpression(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return { ok: false, error: `Expected 5 fields, got ${parts.length}` };
  const errors = [];
  parts.forEach((part, i) => {
    const f = FIELDS[i];
    if (part === '*' || part === '?') return;
    for (const val of part.split(',')) {
      if (/^\*\/\d+$/.test(val)) { if (parseInt(val.slice(2)) < 1) errors.push(`${f.label}: step must be ≥ 1`); continue; }
      if (/^\d+-\d+$/.test(val)) {
        const [a, b] = val.split('-').map(Number);
        if (a > b) errors.push(`${f.label}: range start must be ≤ end`);
        if (a < f.range[0] || b > f.range[1]) errors.push(`${f.label}: ${a}-${b} outside ${f.range[0]}-${f.range[1]}`);
        continue;
      }
      const num = parseInt(val);
      if (isNaN(num)) {
        const named = f.label === 'mon' ? MONTH_NAMES : f.label === 'dow' ? DOW_NAMES : null;
        if (!named || !named.includes(val.toUpperCase())) errors.push(`${f.label}: "${val}" is not valid`);
        continue;
      }
      if (num < f.range[0] || num > f.range[1]) errors.push(`${f.label}: ${num} outside ${f.range[0]}-${f.range[1]}`);
    }
  });
  return errors.length ? { ok: false, error: errors.join(' · ') } : { ok: true, parts };
}

function toEnglish(parts) {
  const [min, hour, dom, mon, dow] = parts;
  if (parts.every(p => p === '*')) return 'At every minute.';
  if (/^\*\/\d+$/.test(min) && hour === '*' && dom === '*' && mon === '*' && dow === '*') return `Every ${min.slice(2)} minutes.`;
  const hourStr = hour === '*' ? 'every hour' : `${String(hour).padStart(2, '0')}:${min === '*' ? '00' : String(min).padStart(2, '0')}`;
  const minStr = min === '*' ? 'every minute' : `minute ${min}`;
  const dowName = (d) => DOW_NAMES[d === '7' ? 0 : d] || d;
  const dowStr = dow === '*' ? '' : ` on ${dow.split(',').map(seg => seg.includes('-') ? seg.split('-').map(dowName).join('–') : dowName(seg)).join(', ')}`;
  const monStr = mon === '*' ? '' : ` in ${mon.split(',').map(m => MONTH_NAMES[m - 1] || m).join(', ')}`;
  const domStr = dom === '*' ? '' : ` on day ${dom}`;
  if (hour !== '*' && min !== '*') return `At ${hourStr}${dowStr}${domStr}${monStr}.`;
  return `At ${minStr} past ${hourStr}${dowStr}${domStr}${monStr}.`;
}

function matchesField(value, field, min, isDow) {
  if (field === '*' || field === '?') return true;
  if (/^\*\/\d+$/.test(field)) return (value - min) % parseInt(field.slice(2)) === 0;
  return field.split(',').some(part => {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      if (value >= a && value <= b) return true;
      return isDow && value === 0 && b >= 7; // Sunday expressed as 7 inside a range
    }
    const n = parseInt(part);
    if (isDow) return n === value || (value === 0 && n === 7) || (value === 7 && n === 0);
    return n === value;
  });
}

function getNextRuns(parts, count = 20) {
  const [minF, hourF, domF, monF, dowF] = parts;
  const runs = [];
  let cur = new Date(); cur.setUTCSeconds(0, 0); cur = new Date(cur.getTime() + 60000);
  const maxIter = 527040;
  for (let i = 0; i < maxIter && runs.length < count; i++) {
    if (matchesField(cur.getUTCMinutes(), minF, 0) && matchesField(cur.getUTCHours(), hourF, 0) &&
        matchesField(cur.getUTCDate(), domF, 1) && matchesField(cur.getUTCMonth() + 1, monF, 1) &&
        matchesField(cur.getUTCDay(), dowF, 0, true)) {
      runs.push(new Date(cur));
    }
    cur = new Date(cur.getTime() + 60000);
  }
  return runs;
}

function fmtTZ(date, tz) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function render() {
  const expr = $('expr').value;
  const res = parseExpression(expr);
  const parts = expr.trim().split(/\s+/);
  $('fields').innerHTML = FIELDS.map((f, i) => `<span><b>${escapeHtml(parts[i] || '?')}</b>${f.label}</span>`).join('');
  if (!res.ok) { $('err').textContent = res.error; $('english').textContent = ''; $('runs').innerHTML = ''; $('heatmap').innerHTML = ''; return; }
  $('err').textContent = '';
  $('english').textContent = toEnglish(res.parts);

  const runs = getNextRuns(res.parts, 20);
  const tz1 = $('tz1').value, tz2 = $('tz2').value;
  $('runs').innerHTML = `<thead><tr><th>#</th><th>${escapeHtml(tz1)}</th><th>${escapeHtml(tz2)}</th></tr></thead><tbody>` +
    (runs.length ? runs.map((r, i) => `<tr><td>${i + 1}</td><td>${fmtTZ(r, tz1)}</td><td>${fmtTZ(r, tz2)}</td></tr>`).join('')
      : '<tr><td colspan="3" class="dev-muted">No runs in the next year.</td></tr>') + '</tbody>';

  // 30-day heatmap
  const today = new Date();
  let cells = '';
  for (let d = 0; d < 30; d++) {
    const date = new Date(today); date.setDate(today.getDate() + d);
    const n = Math.min(4, runs.filter(r => r.toDateString() === date.toDateString()).length);
    cells += `<div class="ts-heatmap-cell" data-count="${n}" title="${date.toDateString()}: ${n === 4 ? '4+' : n} runs">${date.getDate()}</div>`;
  }
  $('heatmap').innerHTML = cells;
  saveHistory(expr.trim());
}

// Visual builder — one-way (builder → expression)
function initBuilder() {
  $('builder').innerHTML = FIELDS.map((f, i) => `
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
  $('builder').addEventListener('input', buildFromControls);
}
function buildFromControls() {
  const parts = FIELDS.map((f, i) => {
    const mode = $('builder').querySelector(`.b-mode[data-i="${i}"]`).value;
    const val = $('builder').querySelector(`.b-val[data-i="${i}"]`).value.trim();
    if (mode === 'every') return '*';
    if (mode === 'step') return val ? `*/${val}` : '*';
    if (mode === 'range') return val || '*';
    return val || '*'; // at / list
  });
  $('expr').value = parts.join(' ');
  render();
}

// NL → cron
function fallbackNLParser(description) {
  const d = description.toLowerCase();
  if (d.includes('every minute')) return '* * * * *';
  if (d.includes('every hour')) return '0 * * * *';
  if (d.includes('midnight')) return '0 0 * * *';
  if (d.includes('noon')) return '0 12 * * *';
  if (d.includes('weekday')) return '0 9 * * 1-5';
  if (d.includes('every monday')) return '0 9 * * 1';
  if (d.includes('every sunday')) return '0 9 * * 0';
  if (d.includes('first of the month') || d.includes('first day')) return '0 0 1 * *';
  let m;
  if ((m = d.match(/every (\d+) minutes?/))) return `*/${m[1]} * * * *`;
  if ((m = d.match(/every (\d+) hours?/))) return `0 */${m[1]} * * *`;
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

// History
function saveHistory(expr) {
  if (!expr) return;
  const h = JSON.parse(localStorage.getItem('tapdot-cron-history') || '[]');
  localStorage.setItem('tapdot-cron-history', JSON.stringify([expr, ...h.filter(e => e !== expr)].slice(0, 10)));
}

// Init
$('tz1').innerHTML = TZS.map((t, i) => `<option${i === 0 ? ' selected' : ''}>${t}</option>`).join('');
$('tz2').innerHTML = TZS.map((t, i) => `<option${i === 1 ? ' selected' : ''}>${t}</option>`).join('');
$('presets').innerHTML = Object.entries(PRESETS).map(([k, v]) => `<button class="ts-btn ts-btn-ghost" style="height:30px;padding:0 12px" data-cron="${v}">${k}</button>`).join('');
$('presets').addEventListener('click', (e) => { const b = e.target.closest('[data-cron]'); if (b) { $('expr').value = b.dataset.cron; render(); } });
$('expr').addEventListener('input', render);
$('tz1').addEventListener('change', render);
$('tz2').addEventListener('change', render);
$('convert').addEventListener('click', convertNL);
$('nl').addEventListener('keydown', (e) => { if (e.key === 'Enter') convertNL(); });
initBuilder();
render();
