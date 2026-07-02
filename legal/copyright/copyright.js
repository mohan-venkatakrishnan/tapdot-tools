// CopyrightChecker — simplified public-domain estimator by jurisdiction

const $ = (id) => document.getElementById(id);
const currentYear = new Date().getFullYear();

function usStatus({ pubYear, deathYear }) {
  if (pubYear < 1928) return { public: true, reason: `Published before 1928 — automatically in the public domain in the US.` };
  if (deathYear) {
    const pd = deathYear + 70;
    return { public: pd <= currentYear, reason: `Life of the author + 70 years: enters the public domain in ${pd}.` };
  }
  const pd = pubYear + 95;
  return { public: pd <= currentYear, reason: `95 years from publication (used when the author's death year is unknown): enters the public domain in ${pd}.` };
}
function ukEuStatus({ pubYear, deathYear }) {
  if (deathYear) {
    const pd = deathYear + 70;
    return { public: pd <= currentYear, reason: `Life of the author + 70 years: enters the public domain in ${pd}.` };
  }
  const pd = pubYear + 70;
  return { public: pd <= currentYear, reason: `70 years from publication (used for anonymous/unknown authorship): enters the public domain in ${pd}.` };
}
function indiaStatus({ pubYear, deathYear }) {
  if (deathYear) {
    const pd = deathYear + 60;
    return { public: pd <= currentYear, reason: `Life of the author + 60 years (Indian Copyright Act): enters the public domain in ${pd}.` };
  }
  const pd = pubYear + 60;
  return { public: pd <= currentYear, reason: `60 years from publication (used for anonymous/unknown authorship): enters the public domain in ${pd}.` };
}

const CALC = { us: usStatus, uk: ukEuStatus, eu: ukEuStatus, in: indiaStatus };
let jurisdiction = 'us';

$('jurisTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-segment-btn'); if (!b) return;
  document.querySelectorAll('#jurisTabs .ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  jurisdiction = b.dataset.j;
  render();
});

function render() {
  const pubYear = parseInt($('pubYear').value, 10) || currentYear;
  const deathYear = $('deathYear').value ? parseInt($('deathYear').value, 10) : null;
  const result = CALC[jurisdiction]({ pubYear, deathYear });

  const badge = $('statusBadge');
  badge.textContent = result.public ? '✓ Likely in the public domain' : '✗ Likely still under copyright';
  badge.className = 'ts-badge ' + (result.public ? 'ok' : 'over');
  $('reason').textContent = result.reason;
}

['pubYear', 'deathYear'].forEach(id => $(id).addEventListener('input', render));
render();
