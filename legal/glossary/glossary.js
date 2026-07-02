// LegalGlossary — instant search over bundled terms, with fuzzy fallback

const $ = (id) => document.getElementById(id);

function slugify(term) { return term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// Cheap fuzzy match for common misspellings: normalized edit distance <= 2
// for single-word queries against each term's first word.
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return GLOSSARY_TERMS;
  const substrMatches = GLOSSARY_TERMS.filter(([term, def]) =>
    term.toLowerCase().includes(q) || def.toLowerCase().includes(q));
  if (substrMatches.length || q.includes(' ')) return substrMatches;
  // Fuzzy fallback for a single misspelled word — compare against a same-length
  // PREFIX of the term (not the whole word), since users are typically typing
  // incrementally and mistype a letter partway through, not the whole word.
  return GLOSSARY_TERMS.filter(([term]) => {
    const firstWord = term.toLowerCase().split(/[\s(]/)[0];
    const prefix = firstWord.slice(0, q.length + 1);
    return levenshtein(q, prefix) <= 2;
  });
}

function render(query) {
  const results = search(query);
  $('count').textContent = `${results.length} of ${GLOSSARY_TERMS.length} terms`;
  $('list').innerHTML = results.map(([term, def, example]) =>
    `<div class="glossary-term" id="${slugify(term)}">
      <dt>${escapeHtml(term)}</dt>
      <dd>${escapeHtml(def)}${example ? `<span class="ex">e.g. ${escapeHtml(example)}</span>` : ''}</dd>
    </div>`
  ).join('') || '<p class="biz-muted">No terms match that search.</p>';
}

$('search').addEventListener('input', () => {
  render($('search').value);
  history.replaceState(null, '', location.pathname);
});

// Deep-link support: #indemnification jumps straight to that term.
function jumpToHash() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  render('');
  const el = document.getElementById(hash);
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.style.background = 'var(--color-accent-soft)'; }
}

render('');
if (location.hash) jumpToHash();
window.addEventListener('hashchange', jumpToHash);
