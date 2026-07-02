// ThreadCraft — split long text into a numbered tweet thread

const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩',
                 '⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];

// Split raw text into chunks that each fit within `usable` characters.
function autoSplit(text, usable) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  const chunks = [];
  let current = '';

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const candidate = current ? current + ' ' + sentence : sentence;
    if (candidate.length <= usable) {
      current = candidate;
    } else {
      if (current) { chunks.push(current); current = ''; }
      if (sentence.length > usable) {
        // split long sentence at word boundaries
        const words = sentence.split(/\s+/);
        let chunk = '';
        for (const word of words) {
          const next = chunk ? chunk + ' ' + word : word;
          if (next.length <= usable) {
            chunk = next;
          } else {
            if (chunk) chunks.push(chunk);
            chunk = word;
          }
        }
        if (chunk) current = chunk;
      } else {
        current = sentence;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function manualSplit(text) {
  return text.split(/^\s*---\s*$/m).map(s => s.trim()).filter(Boolean);
}

function numberTweet(text, i, total, fmt) {
  switch (fmt) {
    case 'plain':  return `${i + 1}. ${text}`;
    case 'emoji':  return `${CIRCLED[i] || (i + 1) + '.'} ${text}`;
    case 'none':   return text;
    case 'slash':
    default:       return `${i + 1}/${total} ${text}`;
  }
}

// Reserve chars for the numbering prefix so tweets stay within the limit.
function reserveFor(fmt, total) {
  if (fmt === 'none') return 0;
  if (fmt === 'plain') return String(total).length + 2;      // "12. "
  if (fmt === 'emoji') return 2;                             // "① "
  return String(total).length * 2 + 2;                       // "12/34 "
}

function buildThread() {
  const text  = document.getElementById('input').value.trim();
  if (!text) return;
  const limit = Math.max(50, parseInt(document.getElementById('limitInput').value, 10) || 280);
  const fmt   = document.getElementById('numFmt').value;
  const mode  = document.getElementById('splitMode').value;

  let chunks;
  if (mode === 'manual') {
    chunks = manualSplit(text);
  } else {
    // Two-pass: split with an estimated reserve, then finalise numbering.
    const estReserve = reserveFor(fmt, 20);
    chunks = autoSplit(text, limit - estReserve);
  }

  const total = chunks.length;
  const tweets = chunks.map((c, i) => numberTweet(c, i, total, fmt));

  renderTweets(tweets, limit);
}

function renderTweets(tweets, limit) {
  const wrap = document.getElementById('tweets');
  const overCount = tweets.filter(t => t.length > limit).length;
  document.getElementById('threadMeta').textContent =
    `${tweets.length} tweet${tweets.length === 1 ? '' : 's'}` +
    (overCount ? ` · ${overCount} over limit` : '');

  wrap.innerHTML = tweets.map((t, i) => {
    const over = t.length > limit;
    const badgeClass = over ? 'over' : (t.length > limit * 0.92 ? 'warn' : 'ok');
    return `<div class="tc-tweet${over ? ' over' : ''}">
      <div class="tc-tweet-text">${escapeHtml(t)}</div>
      <div class="tc-tweet-foot">
        <span class="ts-badge ${badgeClass}">${t.length} / ${limit}</span>
        <button class="ts-copy-btn" data-idx="${i}">Copy tweet ${i + 1}</button>
      </div>
    </div>`;
  }).join('');

  // store for copy handlers
  wrap._tweets = tweets;
  showOutput('output');
}

document.getElementById('splitBtn').addEventListener('click', buildThread);

document.getElementById('tweets').addEventListener('click', (e) => {
  const btn = e.target.closest('.ts-copy-btn');
  if (!btn) return;
  const tweets = document.getElementById('tweets')._tweets || [];
  copyText(tweets[+btn.dataset.idx], btn);
});

document.getElementById('copyAllBtn').addEventListener('click', (e) => {
  const tweets = document.getElementById('tweets')._tweets || [];
  copyText(tweets.join('\n\n'), e.target);
});
