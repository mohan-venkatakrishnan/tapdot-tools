// FocusTimer — Pomodoro timer with browser notifications and localStorage session log

const $ = (id) => document.getElementById(id);
const LOG_KEY = 'tapdot-focus-log';

let mode = 'focus';
let remaining = 25 * 60;
let total = 25 * 60;
let running = false;
let timerHandle = null;
let completedFocusSessions = 0;

function minsFor(m) {
  if (m === 'focus') return parseFloat($('focusMins').value) || 25;
  if (m === 'short') return parseFloat($('shortMins').value) || 5;
  return parseFloat($('longMins').value) || 15;
}

function loadLog() { try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { return []; } }
function saveLog(l) { localStorage.setItem(LOG_KEY, JSON.stringify(l)); }
function todayKey() { return new Date().toISOString().slice(0, 10); }

function logSession(m, mins) {
  const log = loadLog();
  log.push({ date: todayKey(), mode: m, mins, t: Date.now() });
  saveLog(log);
  renderStats();
}

function renderStats() {
  const log = loadLog();
  const today = todayKey();
  const sessionsToday = log.filter(e => e.date === today && e.mode === 'focus').length;
  $('sessionsToday').textContent = sessionsToday;

  const weekAgo = Date.now() - 7 * 86400000;
  const weekFocusMins = log.filter(e => e.mode === 'focus' && e.t >= weekAgo).reduce((s, e) => s + e.mins, 0);
  $('focusThisWeek').textContent = weekFocusMins >= 60 ? `${(weekFocusMins / 60).toFixed(1)}h` : `${Math.round(weekFocusMins)}m`;
}

const BASE_TITLE = document.title;

function drawRing() {
  const svg = $('ring');
  const r = 96, c = 2 * Math.PI * r;
  const pct = total > 0 ? remaining / total : 0;
  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = Math.floor(remaining % 60).toString().padStart(2, '0');
  // Countdown in the tab title so you can see it from any other tab.
  document.title = running ? `${mm}:${ss} · ${mode === 'focus' ? 'Focus' : 'Break'} — FocusTimer` : BASE_TITLE;
  svg.innerHTML = `
    <circle cx="110" cy="110" r="${r}" fill="none" stroke="var(--color-border)" stroke-width="12"/>
    <circle cx="110" cy="110" r="${r}" fill="none" stroke="var(--color-accent)" stroke-width="12"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"
      transform="rotate(-90 110 110)" style="transition: stroke-dashoffset 0.3s linear"/>
    <text x="110" y="120" text-anchor="middle" class="timer-num" style="font-size:38px;font-weight:600">${mm}:${ss}</text>
  `;
}

function setMode(m, resetOnly) {
  mode = m;
  document.querySelectorAll('#modeTabs .ts-segment-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  total = minsFor(m) * 60;
  remaining = total;
  drawRing();
}

function tick() {
  remaining--;
  drawRing();
  if (remaining <= 0) {
    clearInterval(timerHandle);
    running = false;
    $('startPause').textContent = 'Start';
    logSession(mode, minsFor(mode));
    notify(mode);
    advanceMode();
  }
}

function advanceMode() {
  if (mode === 'focus') {
    completedFocusSessions++;
    const every = parseInt($('longEvery').value, 10) || 4;
    setMode(completedFocusSessions % every === 0 ? 'long' : 'short');
  } else {
    setMode('focus');
  }
}

function notify(finishedMode) {
  const label = finishedMode === 'focus' ? 'Focus session' : finishedMode === 'short' ? 'Short break' : 'Long break';
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`${label} complete`, { body: 'Time for the next one — open tapdot to continue.' });
  }
}

function start() {
  if (running) return;
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      $('notifStatus').textContent = p === 'granted' ? 'Notifications enabled.' : 'Notifications blocked — you can still use the timer.';
    });
  }
  running = true;
  $('startPause').textContent = 'Pause';
  timerHandle = setInterval(tick, 1000);
}
function pause() {
  running = false;
  clearInterval(timerHandle);
  $('startPause').textContent = 'Start';
  document.title = BASE_TITLE;
}
function reset() {
  pause();
  remaining = total;
  drawRing();
}
function skip() {
  pause();
  advanceMode();
}

$('startPause').addEventListener('click', () => running ? pause() : start());
$('resetBtn').addEventListener('click', reset);
$('skipBtn').addEventListener('click', skip);
$('modeTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-mode]');
  if (!btn) return;
  pause();
  setMode(btn.dataset.mode);
});
['focusMins', 'shortMins', 'longMins'].forEach(id => $(id).addEventListener('input', () => {
  if (!running) { total = minsFor(mode) * 60; remaining = total; drawRing(); }
}));

setMode('focus');
renderStats();
