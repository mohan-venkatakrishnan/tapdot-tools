// WordCount Pro — real-time text statistics

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','must','shall','that',
  'this','these','those','it','its','i','you','he','she','we','they','my',
  'your','his','her','our','their','not','no','so','as','if','by','from'
]);

function countAll(text) {
  const words        = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars        = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const sentences    = (text.match(/[.!?]+/g) || []).length;
  const paragraphs   = text.split(/\n{2,}/).filter(p => p.trim()).length;
  const readingMins  = Math.ceil(words / 238);
  const speakingMins = Math.ceil(words / 130);

  const freq = {};
  text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: words > 0 ? ((count / words) * 100).toFixed(1) : '0.0'
    }));

  return { words, chars, charsNoSpace, sentences, paragraphs,
           readingMins, speakingMins, keywords };
}

const input = document.getElementById('input');

function render() {
  const text = input.value;
  const r = countAll(text);

  document.getElementById('sWords').textContent        = r.words.toLocaleString();
  document.getElementById('sChars').textContent        = r.chars.toLocaleString();
  document.getElementById('sCharsNoSpace').textContent = r.charsNoSpace.toLocaleString();
  document.getElementById('sSentences').textContent    = r.sentences.toLocaleString();
  document.getElementById('sParagraphs').textContent   = r.paragraphs.toLocaleString();
  document.getElementById('sReading').textContent      = r.readingMins + 'm';
  document.getElementById('sSpeaking').textContent     = r.speakingMins + 'm';

  const kwBody = document.getElementById('kwBody');
  if (r.keywords.length) {
    kwBody.innerHTML = r.keywords.map(k =>
      `<tr><td>${escapeHtml(k.word)}</td><td>${k.count}</td><td>${k.density}%</td></tr>`
    ).join('');
  } else {
    kwBody.innerHTML =
      '<tr><td colspan="3" style="color:var(--color-muted)">Start typing to see keywords.</td></tr>';
  }

  updateLimit(r.chars);
}

function updateLimit(chars) {
  const limitInput = document.getElementById('limitInput');
  const readout = document.getElementById('limitReadout');
  const limit = parseInt(limitInput.value, 10);
  if (!limit || limit <= 0) {
    readout.className = 'wc-limit';
    readout.textContent = 'Set a limit to see remaining characters.';
    return;
  }
  const remaining = limit - chars;
  const pct = chars / limit;
  if (remaining < 0) {
    readout.className = 'wc-limit over';
    readout.textContent = `${Math.abs(remaining)} over the ${limit} limit`;
  } else {
    readout.className = 'wc-limit ' + (pct >= 0.9 ? 'warn' : 'ok');
    readout.textContent = `${remaining} of ${limit} remaining`;
  }
}

input.addEventListener('input', render);
document.getElementById('limitInput').addEventListener('input', () => updateLimit(input.value.length));
render();
