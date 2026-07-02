// GradeCalc — GPA / weighted / final exam

// ── Grade scale ─────────────────────────────────────────────────────────────

const LETTER_TO_GPA = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F':  0.0
};

function percentToLetter(pct) {
  if (pct >= 97) return 'A+'; if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-'; if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';  if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+'; if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-'; if (pct >= 67) return 'D+';
  if (pct >= 63) return 'D';  if (pct >= 60) return 'D-';
  return 'F';
}

// Accepts a letter grade or a numeric percentage string
function gradeToGpa(raw) {
  const g = raw.trim().toUpperCase();
  if (g === '') return null;
  if (g in LETTER_TO_GPA) return LETTER_TO_GPA[g];
  const num = parseFloat(g);
  if (!isNaN(num)) return LETTER_TO_GPA[percentToLetter(num)] ?? 0;
  return null;
}

// ── Tabs ────────────────────────────────────────────────────────────────────

document.getElementById('tabSegment').addEventListener('click', (e) => {
  const btn = e.target.closest('.ts-segment-btn');
  if (!btn) return;
  document.querySelectorAll('#tabSegment .ts-segment-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.gc-tab').forEach(s => s.classList.add('ts-hidden'));
  document.getElementById('tab-' + btn.dataset.tab).classList.remove('ts-hidden');
});

// ── GPA calculator ──────────────────────────────────────────────────────────

const gpaRows = document.getElementById('gpaRows');

function gpaRowHtml() {
  return `<div class="gc-row gc-row-gpa">
    <input class="ts-input gc-name" placeholder="Course name" />
    <input class="ts-input gc-grade" placeholder="A / 92" />
    <input class="ts-input gc-credits" type="number" placeholder="3" />
    <button class="gc-del" aria-label="Remove">×</button>
  </div>`;
}

function addGpaRow() {
  gpaRows.insertAdjacentHTML('beforeend', gpaRowHtml());
}

gpaRows.addEventListener('input', calcGPA);
gpaRows.addEventListener('click', (e) => {
  if (e.target.classList.contains('gc-del')) {
    e.target.closest('.gc-row').remove();
    calcGPA();
  }
});
document.getElementById('gpaAdd').addEventListener('click', addGpaRow);

function calcGPA() {
  let totalPoints = 0, totalCredits = 0, counted = 0;
  gpaRows.querySelectorAll('.gc-row').forEach(row => {
    const grade = gradeToGpa(row.querySelector('.gc-grade').value);
    const credits = parseFloat(row.querySelector('.gc-credits').value);
    if (grade !== null && credits > 0) {
      totalPoints += grade * credits;
      totalCredits += credits;
      counted++;
    }
  });
  document.getElementById('gpaResult').textContent =
    totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  document.getElementById('gpaCredits').textContent = totalCredits || 0;
  document.getElementById('gpaCourses').textContent = counted;
}

// ── Weighted grade calculator ───────────────────────────────────────────────

const wRows = document.getElementById('wRows');

function wRowHtml() {
  return `<div class="gc-row gc-row-weighted">
    <input class="ts-input w-name" placeholder="Assignment" />
    <input class="ts-input w-score" type="number" placeholder="Score" />
    <input class="ts-input w-max" type="number" placeholder="Max" />
    <input class="ts-input w-weight" type="number" placeholder="Wt %" />
    <button class="gc-del" aria-label="Remove">×</button>
  </div>`;
}

function addWRow() { wRows.insertAdjacentHTML('beforeend', wRowHtml()); }

wRows.addEventListener('input', calcWeighted);
wRows.addEventListener('click', (e) => {
  if (e.target.classList.contains('gc-del')) {
    e.target.closest('.gc-row').remove();
    calcWeighted();
  }
});
document.getElementById('wAdd').addEventListener('click', addWRow);

function calcWeighted() {
  let earnedWeight = 0;      // sum of weights for graded items
  let weightedScore = 0;     // sum of (pct * weight) for graded items
  let totalWeight = 0;       // sum of all weights entered

  wRows.querySelectorAll('.gc-row').forEach(row => {
    const score  = parseFloat(row.querySelector('.w-score').value);
    const max    = parseFloat(row.querySelector('.w-max').value);
    const weight = parseFloat(row.querySelector('.w-weight').value);
    if (weight > 0) totalWeight += weight;
    if (!isNaN(score) && max > 0 && weight > 0) {
      const pct = (score / max) * 100;
      weightedScore += pct * weight;
      earnedWeight  += weight;
    }
  });

  const note = document.getElementById('wWeightNote');
  if (totalWeight > 0 && Math.abs(totalWeight - 100) > 0.01) {
    note.className = 'gc-note ts-text-warning';
    note.textContent = `Weights add up to ${totalWeight}% — they should total 100%.`;
  } else {
    note.className = 'gc-note';
    note.textContent = totalWeight > 0 ? 'Weights total 100%.' : '';
  }

  // Current grade = performance on graded work only
  const current = earnedWeight > 0 ? (weightedScore / earnedWeight) : null;
  // Projected = graded work as-is + remaining weight scored at 100%
  const remaining = Math.max(0, 100 - earnedWeight);
  const projected = earnedWeight > 0
    ? ((weightedScore + remaining * 100) / (earnedWeight + remaining))
    : null;

  document.getElementById('wCurrent').textContent =
    current !== null ? current.toFixed(1) + '%' : '—';
  document.getElementById('wProjected').textContent =
    projected !== null ? projected.toFixed(1) + '%' : '—';
}

// ── Final exam calculator ───────────────────────────────────────────────────

document.getElementById('fCalc').addEventListener('click', () => {
  const current = parseFloat(document.getElementById('fCurrent').value);
  const weight  = parseFloat(document.getElementById('fWeight').value);
  const desired = parseFloat(document.getElementById('fDesired').value);
  const card    = document.getElementById('fResultCard');
  const result  = document.getElementById('fResult');
  const note    = document.getElementById('fResultNote');

  if (isNaN(current) || isNaN(weight) || isNaN(desired) || weight <= 0) {
    card.classList.remove('ts-hidden');
    result.textContent = '—';
    result.className = 'gc-final-result';
    note.className = 'gc-note ts-text-danger';
    note.textContent = 'Enter current grade, exam weight (above 0), and desired grade.';
    return;
  }

  const w = weight / 100;
  const needed = (desired - current * (1 - w)) / w;

  card.classList.remove('ts-hidden');
  result.textContent = needed.toFixed(1) + '%';

  if (needed <= 0) {
    result.className = 'gc-final-result ts-text-success';
    note.className = 'gc-note ts-text-success';
    note.textContent = 'You have already secured your desired grade — even a 0% keeps you there.';
  } else if (needed <= 100) {
    result.className = 'gc-final-result ts-text-success';
    note.className = 'gc-note';
    note.textContent = `Score at least ${needed.toFixed(1)}% on the final to reach ${desired}%.`;
  } else {
    result.className = 'gc-final-result ts-text-danger';
    note.className = 'gc-note ts-text-danger';
    note.textContent = `Reaching ${desired}% is not possible — it would require over 100% on the final.`;
  }
});

// ── Seed initial rows ───────────────────────────────────────────────────────

addGpaRow(); addGpaRow(); addGpaRow();
addWRow(); addWRow();
