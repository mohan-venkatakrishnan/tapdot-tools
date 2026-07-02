// MeetingTimer — live per-second meeting cost, budget alert, URL-hash sharing

const $ = (id) => document.getElementById(id);
const WORKING_SECONDS_PER_YEAR = 1800 * 3600; // 1,800 working hours/year = 6,480,000s

let attendees = [
  { id: 'a1', name: 'Attendee 1', salary: 90000 },
  { id: 'a2', name: 'Attendee 2', salary: 110000 },
];
let nextId = 3;
let elapsedSeconds = 0;
let running = false;
let timerHandle = null;
let alerted = false;

function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function costPerSecond() {
  const totalAnnual = attendees.reduce((s, a) => s + a.salary, 0);
  return totalAnnual / WORKING_SECONDS_PER_YEAR;
}

function renderAttendees() {
  $('attendeeList').innerHTML = attendees.map(a => `
    <div class="attendee-row">
      <input type="text" class="ts-input" data-att="${a.id}" data-field="name" value="${escapeHtml(a.name)}" />
      <input type="number" class="ts-input" data-att="${a.id}" data-field="salary" value="${a.salary}" min="0" step="1000" />
      <button class="biz-rm" data-rm="${a.id}" aria-label="Remove attendee" ${attendees.length <= 1 ? 'disabled' : ''}>✕</button>
    </div>
  `).join('');

  $('attendeeList').querySelectorAll('[data-att]').forEach(el => {
    el.addEventListener('input', () => {
      const a = attendees.find(x => x.id === el.dataset.att);
      a[el.dataset.field] = el.dataset.field === 'salary' ? (parseFloat(el.value) || 0) : el.value;
      renderRate();
    });
  });
  $('attendeeList').querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      attendees = attendees.filter(a => a.id !== btn.dataset.rm);
      renderAttendees();
      renderRate();
    });
  });
  renderRate();
}

function renderRate() {
  const perSec = costPerSecond();
  $('rateLabel').textContent = `${attendees.length} attendee${attendees.length === 1 ? '' : 's'} · $${(perSec * 60).toFixed(2)}/min · $${(perSec * 3600).toFixed(2)}/hour`;
}

function fmtTime(s) {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function render() {
  const cost = elapsedSeconds * costPerSecond();
  $('costNum').textContent = `$${cost.toFixed(2)}`;
  $('elapsedLabel').textContent = `${fmtTime(elapsedSeconds)} elapsed`;

  const budget = parseFloat($('budget').value);
  if (budget && cost >= budget) {
    $('budgetAlert').textContent = `⚠ Over budget — meeting has cost more than $${budget.toFixed(2)}.`;
    if (!alerted) { alerted = true; $('costNum').style.color = 'var(--color-danger, #d9534f)'; }
  } else {
    $('budgetAlert').textContent = budget ? `Budget: $${budget.toFixed(2)}` : '';
  }
}

function tick() {
  elapsedSeconds++;
  render();
}

$('startPause').addEventListener('click', () => {
  if (running) {
    running = false;
    clearInterval(timerHandle);
    $('startPause').textContent = 'Start';
  } else {
    running = true;
    $('startPause').textContent = 'Pause';
    timerHandle = setInterval(tick, 1000);
  }
});
$('resetBtn').addEventListener('click', () => {
  running = false;
  clearInterval(timerHandle);
  elapsedSeconds = 0;
  alerted = false;
  $('costNum').style.color = '';
  $('startPause').textContent = 'Start';
  render();
});

$('addAttendee').addEventListener('click', () => {
  attendees.push({ id: 'a' + nextId++, name: `Attendee ${attendees.length + 1}`, salary: 90000 });
  renderAttendees();
});

$('shareLink').addEventListener('click', () => {
  const payload = { attendees: attendees.map(a => ({ name: a.name, salary: a.salary })), budget: $('budget').value || null };
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
  const url = `${location.origin}${location.pathname}#${encoded}`;
  copyText(url, $('shareLink'));
});

function loadFromHash() {
  if (!location.hash || location.hash.length < 2) return;
  try {
    const payload = JSON.parse(decodeURIComponent(atob(location.hash.slice(1))));
    if (Array.isArray(payload.attendees) && payload.attendees.length) {
      attendees = payload.attendees.map((a, i) => ({ id: 'a' + (i + 1), name: a.name, salary: a.salary }));
      nextId = attendees.length + 1;
    }
    if (payload.budget) $('budget').value = payload.budget;
  } catch (e) {}
}

loadFromHash();
renderAttendees();
render();
