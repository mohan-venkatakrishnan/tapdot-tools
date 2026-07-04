// WaterIntake — one-tap hydration logging, daily goal ring, streak

const $ = (id) => document.getElementById(id);
const todayKey = () => new Date().toISOString().slice(0, 10);
const STORE_KEY = 'tapdot-water-log';

function loadLog() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
}
function saveLog(log) { localStorage.setItem(STORE_KEY, JSON.stringify(log)); }

function todayTotal(log) {
  return (log[todayKey()] || []).reduce((sum, e) => sum + e.amt, 0);
}

function calcStreak(log) {
  const goal = parseFloat($('goal').value) || 2500;
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    const total = (log[key] || []).reduce((s, e) => s + e.amt, 0);
    if (total >= goal) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}

function drawRing(pct, label) {
  const svg = $('ring');
  const r = 78, c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, pct));
  svg.innerHTML = `
    <circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--color-border)" stroke-width="14"/>
    <circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--color-accent)" stroke-width="14"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamped)}"
      transform="rotate(-90 90 90)" style="transition: stroke-dashoffset 0.4s ease"/>
    <text x="90" y="84" text-anchor="middle" class="ring-num" style="font-size:22px;font-weight:600">${Math.round(pct * 100)}%</text>
    <text x="90" y="106" text-anchor="middle" class="ring-num">${label}</text>
  `;
}

function render() {
  const log = loadLog();
  const goal = parseFloat($('goal').value) || 2500;
  const total = todayTotal(log);
  drawRing(total / goal, `${total} / ${goal} ml`);
  $('streak').textContent = calcStreak(log);
}

function pourSplash() {
  const wrap = $('ring').closest('.ring-wrap');
  if (!wrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  wrap.classList.remove('wi-pour');
  void wrap.offsetWidth; // restart the animation on repeated clicks
  wrap.classList.add('wi-pour');
  for (let i = 0; i < 4; i++) {
    const drop = document.createElement('span');
    drop.className = 'wi-droplet';
    drop.style.left = (35 + Math.random() * 30) + '%';
    drop.style.animationDelay = (i * 0.06) + 's';
    wrap.appendChild(drop);
    drop.addEventListener('animationend', () => drop.remove());
  }
}

function addAmount(amt) {
  if (!amt || amt <= 0) return;
  const log = loadLog();
  const key = todayKey();
  if (!log[key]) log[key] = [];
  log[key].push({ amt, t: Date.now() });
  saveLog(log);
  render();
  pourSplash();
}

document.querySelectorAll('[data-amt]').forEach(btn => {
  btn.addEventListener('click', () => addAmount(parseFloat(btn.dataset.amt)));
});
$('addCustom').addEventListener('click', () => {
  addAmount(parseFloat($('customAmt').value));
  $('customAmt').value = '';
});
$('undoBtn').addEventListener('click', () => {
  const log = loadLog();
  const key = todayKey();
  if (log[key] && log[key].length) {
    log[key].pop();
    saveLog(log);
    render();
  }
});
$('goal').addEventListener('input', render);

let reminderTimer = null;
function setupReminders() {
  const mins = parseFloat($('reminderMins').value) || 0;
  if (reminderTimer) clearInterval(reminderTimer);
  if (!mins) { $('notifStatus').textContent = ''; return; }
  if (!('Notification' in window)) {
    $('notifStatus').textContent = 'Notifications are not supported in this browser.';
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => setupReminders());
    return;
  }
  if (Notification.permission === 'denied') {
    $('notifStatus').textContent = 'Notifications are blocked — enable them in browser settings to get reminders.';
    return;
  }
  $('notifStatus').textContent = `Reminders on — every ${mins} min while this tab is open.`;
  reminderTimer = setInterval(() => {
    new Notification('Time to hydrate 💧', { body: 'Log some water intake on tapdot.' });
  }, mins * 60 * 1000);
}
$('reminderMins').addEventListener('change', setupReminders);

render();
