// SymptomDiary — symptom + severity logging on a calendar, with an optional AI summary

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'tapdot-symptom-log';
const SEVERITY_COLORS = ['#8bc98f', '#c9c98b', '#e3b04b', '#e08a4b', '#d9534f'];

let viewYear, viewMonth;
(function initView() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
})();

function loadEntries() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; } }
function saveEntries(e) { localStorage.setItem(STORE_KEY, JSON.stringify(e)); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function renderCalendar() {
  const entries = loadEntries();
  const byDate = {};
  entries.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });

  const first = new Date(viewYear, viewMonth, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  $('calTitle').textContent = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  let html = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<div class="health-cal-head">${d}</div>`).join('');
  for (let i = 0; i < startWeekday; i++) html += '<div class="health-cal-cell empty"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEntries = byDate[key];
    let cls = 'health-cal-cell';
    let style = '';
    if (dayEntries && dayEntries.length) {
      cls += ' logged';
      const maxSeverity = Math.max(...dayEntries.map(e => e.severity));
      style = `style="border-color:${SEVERITY_COLORS[maxSeverity - 1]}"`;
    }
    html += `<div class="${cls}" ${style} title="${dayEntries ? dayEntries.map(e => e.name).join(', ') : ''}">${day}</div>`;
  }
  $('calendar').innerHTML = html;
}

function renderEntries() {
  const entries = loadEntries().sort((a, b) => new Date(b.date) - new Date(a.date));
  $('entryList').innerHTML = entries.length ? entries.map((e, i) => `
    <div class="log-item">
      <span class="log-main">
        <span class="severity-dot" style="background:${SEVERITY_COLORS[e.severity - 1]}"></span>
        ${escapeHtml(e.name)} <span class="log-meta">${e.date} · severity ${e.severity}/5${e.notes ? ' · ' + escapeHtml(e.notes) : ''}</span>
      </span>
      <button class="biz-rm" data-idx="${i}" aria-label="Remove">✕</button>
    </div>
  `).join('') : '<p class="biz-muted">No symptoms logged yet.</p>';

  $('entryList').querySelectorAll('[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sorted = loadEntries().sort((a, b) => new Date(b.date) - new Date(a.date));
      sorted.splice(parseInt(btn.dataset.idx, 10), 1);
      saveEntries(sorted);
      render();
    });
  });
}

function render() { renderCalendar(); renderEntries(); }

$('symSeverity').addEventListener('input', () => $('severityVal').textContent = $('symSeverity').value);

$('addSymptom').addEventListener('click', () => {
  const date = $('symDate').value || new Date().toISOString().slice(0, 10);
  const name = $('symName').value.trim();
  if (!name) return;
  const entries = loadEntries();
  entries.push({
    date, name,
    severity: parseInt($('symSeverity').value, 10),
    notes: $('symNotes').value.trim(),
  });
  saveEntries(entries);
  $('symName').value = ''; $('symNotes').value = ''; $('symSeverity').value = 3; $('severityVal').textContent = '3';
  render();
});

$('prevMonth').addEventListener('click', () => {
  viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
});
$('nextMonth').addEventListener('click', () => {
  viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
});

async function summarize() {
  const entries = loadEntries().sort((a, b) => new Date(a.date) - new Date(b.date));
  const status = $('aiStatus');
  if (!entries.length) { status.className = 'biz-ai-status fallback'; status.textContent = 'Log a few symptoms first.'; return; }
  const listText = entries.map(e => `${e.date}: ${e.name}, severity ${e.severity}/5${e.notes ? ' — ' + e.notes : ''}`).join('\n');
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — here is your raw log instead:';
    $('entryList').insertAdjacentHTML('beforebegin', `<pre class="ts-mono-output">${escapeHtml(listText)}</pre>`);
    return;
  }
  $('aiSummary').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Summarizing…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(`Summarize this patient symptom log clearly and factually for a doctor visit. Note any patterns in frequency or severity. Do not diagnose or suggest treatment. Log:\n${listText}`);
    if (session.destroy) session.destroy();
    const existing = document.getElementById('aiSummaryOutput');
    if (existing) existing.remove();
    $('entryList').insertAdjacentHTML('beforebegin', `<pre class="ts-mono-output" id="aiSummaryOutput">${escapeHtml(raw.trim())}</pre>`);
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI.';
  } catch (e) {
    status.className = 'biz-ai-status fallback'; status.textContent = 'AI error — try again.';
  } finally {
    $('aiSummary').disabled = false;
  }
}
$('aiSummary').addEventListener('click', summarize);

render();
