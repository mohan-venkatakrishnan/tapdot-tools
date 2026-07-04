// CycleTracker — period logging + next-cycle/fertile-window prediction

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'tapdot-cycle-log';
const DAY_MS = 86400000;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
}
function saveHistory(h) { localStorage.setItem(STORE_KEY, JSON.stringify(h)); }

function fmt(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function predictNextCycle(lastStart, cycleLen, periodLen) {
  const next = new Date(lastStart.getTime() + cycleLen * DAY_MS);
  const ovulation = new Date(next.getTime() - 14 * DAY_MS);
  const fertileStart = new Date(ovulation.getTime() - 5 * DAY_MS);
  const fertileEnd = new Date(ovulation.getTime() + 1 * DAY_MS);
  return { next, ovulation, fertileStart, fertileEnd };
}

function render() {
  const history = loadHistory().sort((a, b) => new Date(b.date) - new Date(a.date));
  const cycleLen = parseFloat($('cycleLen').value) || 28;
  const periodLen = parseFloat($('periodLen').value) || 5;

  if (!history.length) {
    $('nextPeriod').textContent = '—';
    $('fertileWindow').textContent = '—';
    $('ovulation').textContent = '—';
    $('cycleDay').textContent = '—';
    $('history').innerHTML = '<p class="biz-muted">No periods logged yet — add a start date above.</p>';
    return;
  }

  const lastStart = new Date(history[0].date + 'T00:00:00');
  const { next, ovulation, fertileStart, fertileEnd } = predictNextCycle(lastStart, cycleLen, periodLen);

  $('nextPeriod').textContent = fmt(next);
  $('fertileWindow').textContent = `${fmt(fertileStart)} – ${fmt(fertileEnd)}`;
  $('ovulation').textContent = fmt(ovulation);

  const today = new Date();
  const daysSince = Math.floor((today - lastStart) / DAY_MS);
  const cycleDay = ((daysSince % cycleLen) + cycleLen) % cycleLen + 1;
  $('cycleDay').textContent = cycleDay;

  $('history').innerHTML = history.map((h, i) => `
    <div class="log-item">
      <span class="log-main">${fmt(new Date(h.date + 'T00:00:00'))}</span>
      <button class="biz-rm" data-idx="${i}" aria-label="Remove">✕</button>
    </div>
  `).join('');
  $('history').querySelectorAll('[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const sorted = loadHistory().sort((a, b) => new Date(b.date) - new Date(a.date));
      sorted.splice(idx, 1);
      saveHistory(sorted);
      render();
    });
  });
}

$('logStart').addEventListener('click', () => {
  const date = $('logDate').value;
  if (!date) return;
  const history = loadHistory();
  if (!history.some(h => h.date === date)) history.push({ date });
  saveHistory(history);
  $('logDate').value = '';
  render();
  const grid = document.querySelector('.ts-stats-grid');
  if (grid && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    grid.classList.remove('ct-updated');
    void grid.offsetWidth;
    grid.classList.add('ct-updated');
  }
});
$('cycleLen').addEventListener('input', render);
$('periodLen').addEventListener('input', render);

render();
