// FlashForge — flashcards + spaced repetition, saved to localStorage

const LS_CARDS = 'tapdot-flashcards-cards';
const LS_NAME  = 'tapdot-flashcards-name';

let cards = [];       // full deck
let setName = '';
let queue = [];       // cards to review this session
let queueIdx = 0;
let flipped = false;
let session = { easy: 0, medium: 0, hard: 0, reviewed: 0 };

// ── Parsing ─────────────────────────────────────────────────────────────────

function parseNotes(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cards = [];

  // Q:/A: format
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith('Q:') && lines[i + 1].startsWith('A:')) {
      cards.push(newCard(lines[i].slice(2).trim(), lines[i + 1].slice(2).trim()));
      i++;
    }
  }
  if (cards.length) return cards;

  // Term — Definition
  const dashCards = lines.map(l => {
    const sep = l.match(/\s+[—–-]\s+/);
    if (!sep) return null;
    const [q, ...rest] = l.split(sep[0]);
    return newCard(q.trim(), rest.join(sep[0]).trim());
  }).filter(Boolean);
  if (dashCards.length) return dashCards;

  // Fallback: each line is a front (no answer)
  return lines.map(l => newCard(l.replace(/^[-•\d.]+\s*/, '').trim(), ''));
}

function newCard(q, a) {
  return { q, a, interval: 1, ease: 2.5, due: Date.now() };
}

// ── Spaced repetition (simplified SM-2) ─────────────────────────────────────

function updateCard(card, rating) {
  const q = rating === 'easy' ? 5 : rating === 'medium' ? 3 : 1;
  if (q < 3) {
    card.interval = 1;
  } else {
    card.ease     = Math.max(1.3, card.ease + 0.1 - (5 - q) * 0.08);
    card.interval = Math.round(card.interval * card.ease);
  }
  card.due = Date.now() + card.interval * 24 * 60 * 60 * 1000;
  return card;
}

// ── Persistence ─────────────────────────────────────────────────────────────

function save() {
  localStorage.setItem(LS_CARDS, JSON.stringify(cards));
  localStorage.setItem(LS_NAME, setName);
}

function load() {
  try {
    const raw = localStorage.getItem(LS_CARDS);
    if (raw) cards = JSON.parse(raw);
    setName = localStorage.getItem(LS_NAME) || '';
  } catch { cards = []; }
}

// ── View switching ──────────────────────────────────────────────────────────

function show(view) {
  ['viewCreate', 'viewGrid', 'viewStudy', 'viewDone']
    .forEach(v => document.getElementById(v).classList.add('ts-hidden'));
  document.getElementById(view).classList.remove('ts-hidden');
}

// ── Create ──────────────────────────────────────────────────────────────────

document.getElementById('createBtn').addEventListener('click', () => {
  const text = document.getElementById('notesInput').value;
  const parsed = parseNotes(text);
  if (!parsed.length) return;
  cards = parsed;
  setName = document.getElementById('setName').value.trim() || 'My cards';
  save();
  renderGrid();
  show('viewGrid');
});

// ── Grid ────────────────────────────────────────────────────────────────────

function dueCount() {
  const now = Date.now();
  return cards.filter(c => (c.due || 0) <= now).length;
}

function renderGrid() {
  document.getElementById('gridTitle').textContent = setName;
  const due = dueCount();
  document.getElementById('gridSub').textContent =
    `${cards.length} card${cards.length === 1 ? '' : 's'} · ${due} due now`;

  document.getElementById('cardGrid').innerHTML = cards.map((c, i) =>
    `<div class="ff-tile" data-idx="${i}">
       <div class="ff-tile-label">Front</div>
       <div class="ff-tile-q">${escapeHtml(c.q)}</div>
       <div class="ff-tile-a ts-hidden">
         <div class="ff-tile-label" style="margin-top:8px">Back</div>
         ${escapeHtml(c.a || '—')}
       </div>
     </div>`
  ).join('');
}

document.getElementById('cardGrid').addEventListener('click', (e) => {
  const tile = e.target.closest('.ff-tile');
  if (!tile) return;
  tile.querySelector('.ff-tile-a').classList.toggle('ts-hidden');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Start a new set? This clears your current cards.')) return;
  cards = []; setName = '';
  localStorage.removeItem(LS_CARDS);
  localStorage.removeItem(LS_NAME);
  document.getElementById('notesInput').value = '';
  document.getElementById('setName').value = '';
  show('viewCreate');
});

// ── Study ───────────────────────────────────────────────────────────────────

function startStudy() {
  const now = Date.now();
  queue = cards.filter(c => (c.due || 0) <= now);
  if (!queue.length) queue = cards.slice(); // nothing due → review all
  queueIdx = 0;
  session = { easy: 0, medium: 0, hard: 0, reviewed: 0 };
  show('viewStudy');
  renderStudyCard();
}

function renderStudyCard() {
  flipped = false;
  const card = queue[queueIdx];
  const fc = document.getElementById('flashcard');
  fc.classList.remove('flipped');
  document.getElementById('cardFront').textContent = card.q;
  document.getElementById('cardBack').textContent = card.a || 'No answer saved';
  document.getElementById('rateRow').classList.add('ts-hidden');
  document.getElementById('flipHint').classList.remove('ts-hidden');
  document.getElementById('studyProgress').textContent =
    `Card ${queueIdx + 1} of ${queue.length}`;
}

function flip() {
  flipped = !flipped;
  document.getElementById('flashcard').classList.toggle('flipped', flipped);
  if (flipped) {
    document.getElementById('rateRow').classList.remove('ts-hidden');
    document.getElementById('flipHint').classList.add('ts-hidden');
  }
}

function rate(rating) {
  if (!flipped) return;
  const card = queue[queueIdx];
  updateCard(card, rating);
  session[rating]++;
  session.reviewed++;
  save();
  queueIdx++;
  if (queueIdx >= queue.length) finishSession();
  else renderStudyCard();
}

function finishSession() {
  document.getElementById('doneReviewed').textContent = session.reviewed;
  document.getElementById('doneEasy').textContent = session.easy;
  document.getElementById('doneMedium').textContent = session.medium;
  document.getElementById('doneHard').textContent = session.hard;

  const soonest = cards.reduce((min, c) => Math.min(min, c.due || Infinity), Infinity);
  if (soonest !== Infinity) {
    const days = Math.max(0, Math.round((soonest - Date.now()) / (24 * 60 * 60 * 1000)));
    document.getElementById('nextDue').textContent =
      days <= 0 ? 'Some cards are due again today.'
                : `Next cards due in about ${days} day${days === 1 ? '' : 's'}.`;
  }
  show('viewDone');
}

document.getElementById('studyBtn').addEventListener('click', startStudy);
document.getElementById('flashcard').addEventListener('click', flip);
document.getElementById('exitStudy').addEventListener('click', () => { renderGrid(); show('viewGrid'); });
document.getElementById('rateRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-rate]');
  if (btn) rate(btn.dataset.rate);
});
document.getElementById('doneStudyAgain').addEventListener('click', startStudy);
document.getElementById('doneToGrid').addEventListener('click', () => { renderGrid(); show('viewGrid'); });

// Keyboard: Space flips, 1/2/3 rate
document.addEventListener('keydown', (e) => {
  if (document.getElementById('viewStudy').classList.contains('ts-hidden')) return;
  if (e.code === 'Space') { e.preventDefault(); flip(); }
  else if (flipped && e.key === '1') rate('hard');
  else if (flipped && e.key === '2') rate('medium');
  else if (flipped && e.key === '3') rate('easy');
});

// ── Boot ────────────────────────────────────────────────────────────────────

load();
if (cards.length) { renderGrid(); show('viewGrid'); }
else show('viewCreate');
