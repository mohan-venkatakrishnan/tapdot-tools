// MedicationLog — medications, daily dose logging, adherence rate

const $ = (id) => document.getElementById(id);
const MEDS_KEY = 'tapdot-medication-list';
const LOG_KEY = 'tapdot-medication-log';
const DAY_MS = 86400000;

function loadMeds() { try { return JSON.parse(localStorage.getItem(MEDS_KEY)) || []; } catch (e) { return []; } }
function saveMeds(m) { localStorage.setItem(MEDS_KEY, JSON.stringify(m)); }
function loadLog() { try { return JSON.parse(localStorage.getItem(LOG_KEY)) || {}; } catch (e) { return {}; } }
function saveLog(l) { localStorage.setItem(LOG_KEY, JSON.stringify(l)); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function dateKey(d) { return d.toISOString().slice(0, 10); }

function adherenceOver(days) {
  const meds = loadMeds();
  const log = loadLog();
  if (!meds.length) return null;
  let expected = 0, taken = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * DAY_MS);
    const key = dateKey(d);
    const activeMeds = meds.filter(m => m.added <= key);
    if (!activeMeds.length) continue;
    activeMeds.forEach(m => {
      expected += m.times;
      taken += Math.min(m.times, (log[key] && log[key][m.id]) || 0);
    });
  }
  if (!expected) return null;
  return Math.round((taken / expected) * 100);
}

function render() {
  const meds = loadMeds();
  const log = loadLog();
  const today = todayKey();
  const todayDoses = log[today] || {};

  $('todayList').innerHTML = meds.length ? meds.map(m => {
    const taken = todayDoses[m.id] || 0;
    return `
      <div class="log-item">
        <span class="log-main">${escapeHtml(m.name)} <span class="log-meta">${taken}/${m.times} taken today</span></span>
        <div class="biz-row">
          <button class="ts-btn ts-btn-secondary" data-take="${m.id}" ${taken >= m.times ? 'disabled' : ''}>Mark dose taken</button>
        </div>
      </div>
    `;
  }).join('') : '<p class="biz-muted">No medications added yet.</p>';

  $('medList').innerHTML = meds.length ? meds.map(m => `
    <div class="log-item">
      <span class="log-main">${escapeHtml(m.name)} <span class="log-meta">${m.times}x/day, added ${m.added}</span></span>
      <button class="biz-rm" data-rm="${m.id}" aria-label="Remove">✕</button>
    </div>
  `).join('') : '<p class="biz-muted">Nothing here yet.</p>';

  const a7 = adherenceOver(7), a30 = adherenceOver(30);
  $('adherence7').textContent = a7 === null ? '—' : `${a7}%`;
  $('adherence30').textContent = a30 === null ? '—' : `${a30}%`;

  $('todayList').querySelectorAll('[data-take]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.take;
      const log2 = loadLog();
      if (!log2[today]) log2[today] = {};
      log2[today][id] = (log2[today][id] || 0) + 1;
      saveLog(log2);
      render();
    });
  });
  $('medList').querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      saveMeds(loadMeds().filter(m => m.id !== btn.dataset.rm));
      render();
    });
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

$('addMed').addEventListener('click', () => {
  const name = $('medName').value.trim();
  const times = parseInt($('medTimes').value, 10) || 1;
  if (!name) return;
  const meds = loadMeds();
  meds.push({ id: 'm' + Date.now(), name, times, added: todayKey() });
  saveMeds(meds);
  $('medName').value = '';
  $('medTimes').value = '1';
  render();
});

render();
