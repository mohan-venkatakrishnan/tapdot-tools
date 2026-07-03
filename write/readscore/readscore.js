// ReadScore — readability analysis (all local)

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

const PASSIVE_PATTERN = /\b(was|were|is|are|been|being|be)\s+\w+ed\b/gi;

function fleschKincaid(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const words     = text.trim().split(/\s+/).filter(Boolean);
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);

  const numSentences = Math.max(sentences.length, 1);
  const numWords     = Math.max(words.length, 1);

  const ease  = 206.835 - 1.015 * (numWords / numSentences)
                        - 84.6  * (syllables / numWords);
  const grade = 0.39 * (numWords / numSentences)
              + 11.8 * (syllables / numWords) - 15.59;

  const readingMins  = Math.ceil(numWords / 238);
  const speakingMins = Math.ceil(numWords / 130);

  const passiveCount = (text.match(PASSIVE_PATTERN) || []).length;
  const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 25).length;

  return {
    words: numWords, sentences: numSentences, syllables,
    ease:  Math.round(Math.max(0, Math.min(100, ease))),
    grade: Math.max(0, grade).toFixed(1),
    readingMins, speakingMins, passiveCount, longSentences,
    avgSentenceLen: Math.round(numWords / numSentences),
  };
}

function easeLabel(ease) {
  if (ease >= 90) return 'Very easy';
  if (ease >= 80) return 'Easy';
  if (ease >= 70) return 'Fairly easy';
  if (ease >= 60) return 'Standard';
  if (ease >= 50) return 'Fairly difficult';
  if (ease >= 30) return 'Difficult';
  return 'Very difficult';
}

// Build highlighted HTML: wrap long sentences (>25 words) and passive phrases.
function buildHighlight(text) {
  // Split into sentences keeping their trailing punctuation.
  const parts = text.match(/[^.!?]+[.!?]*/g) || [];
  return parts.map(raw => {
    const trimmed = raw.trim();
    if (!trimmed) return escapeHtml(raw);
    const wordCount = trimmed.split(/\s+/).length;
    let html = escapeHtml(raw).replace(PASSIVE_PATTERN,
      m => `<span class="ts-hl-passive">${m}</span>`);
    if (wordCount > 25) html = `<span class="ts-hl-long">${html}</span>`;
    return html;
  }).join('');
}

function analyze() {
  const text = document.getElementById('input').value;
  if (!text.trim()) { hideOutput('output'); return; }
  const r = fleschKincaid(text);

  document.getElementById('rEase').textContent      = r.ease;
  document.getElementById('rEaseLabel').textContent = easeLabel(r.ease);
  document.getElementById('rGrade').textContent     = r.grade;
  document.getElementById('rWords').textContent     = r.words.toLocaleString();
  document.getElementById('rAvgLen').textContent    = r.avgSentenceLen;
  document.getElementById('rReading').textContent   = r.readingMins + 'm';
  document.getElementById('rSpeaking').textContent  = r.speakingMins + 'm';
  document.getElementById('rPassive').textContent   = r.passiveCount;
  document.getElementById('rLong').textContent      = r.longSentences;

  document.getElementById('highlight').innerHTML = buildHighlight(text);
  showOutput('output');
}

// Live analysis (debounced) — like Hemingway; the button stays as an explicit trigger.
let analyzeTimer = null;
document.getElementById('input').addEventListener('input', () => {
  clearTimeout(analyzeTimer);
  analyzeTimer = setTimeout(analyze, 300);
});
document.getElementById('analyzeBtn').addEventListener('click', analyze);
