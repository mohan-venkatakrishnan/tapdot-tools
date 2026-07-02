// HabitTracker — daily habit checklist, streaks, 30-day completion rate + heatmap

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'tapdot-habits';
const DAY_MS = 86400000;

function loadHabits() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; } }
function saveHabits(h) { localStorage.setItem(STORE_KEY, JSON.stringify(h)); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function dateKey(d) { return d.toISOString().slice(0, 10); }
function todayKey() { return dateKey(new Date()); }

function calcStreak(habit) {
  let streak = 0;
  let d = new Date();
  if (!habit.log[todayKey()]) d = new Date(Date.now() - DAY_MS); // allow streak to still show if today not yet checked
  while (habit.log[dateKey(d)]) {
    streak++;
    d = new Date(d.getTime() - DAY_MS);
  }
  return streak;
}

function completionRate30(habit) {
  let done = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * DAY_MS);
    if (habit.log[dateKey(d)]) done++;
  }
  return Math.round((done / 30) * 100);
}

function heatmapHtml(habit) {
  let cells = '';
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    const done = !!habit.log[dateKey(d)];
    cells += `<div class="habit-heat-cell ${done ? 'done' : ''}" title="${dateKey(d)}"></div>`;
  }
  return cells;
}

function render() {
  const habits = loadHabits();
  $('habitList').innerHTML = habits.length ? habits.map(h => `
    <div>
      <div class="habit-row">
        <span class="habit-icon">${h.icon}</span>
        <span class="habit-name">${escapeHtml(h.name)}</span>
        <span class="habit-streak">${calcStreak(h)}d streak · ${completionRate30(h)}% (30d)</span>
        <button class="habit-check ${h.log[todayKey()] ? 'done' : ''}" data-toggle="${h.id}" aria-label="Toggle today">✓</button>
        <button class="biz-rm" data-rm="${h.id}" aria-label="Remove habit">✕</button>
      </div>
      <div class="habit-heat">${heatmapHtml(h)}</div>
    </div>
  `).join('') : '<p class="biz-muted">No habits yet — add one above.</p>';

  $('habitList').querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const habits2 = loadHabits();
      const h = habits2.find(x => x.id === btn.dataset.toggle);
      const key = todayKey();
      if (h.log[key]) delete h.log[key]; else h.log[key] = true;
      saveHabits(habits2);
      render();
    });
  });
  $('habitList').querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      saveHabits(loadHabits().filter(h => h.id !== btn.dataset.rm));
      render();
    });
  });
}

$('addHabit').addEventListener('click', () => {
  const name = $('newHabitName').value.trim();
  if (!name) return;
  const habits = loadHabits();
  habits.push({ id: 'h' + Date.now(), name, icon: $('newHabitIcon').value, log: {} });
  saveHabits(habits);
  $('newHabitName').value = '';
  render();
});

render();
