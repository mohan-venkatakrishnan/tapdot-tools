// HeadlineScore — live rule-based scoring, word-balance analysis (CoSchedule-style),
// headline comparison history, and on-device AI rewrites.

const POWER_WORDS = ['proven', 'secret', 'instantly', 'free', 'guaranteed', 'best',
  'ultimate', 'easy', 'fast', 'boost', 'transform', 'discover', 'unlock', 'surprising',
  'essential', 'avoid', 'warning', 'mistake', 'never', 'always', 'you', 'your'];

const EMOTIONAL_WORDS = ['amazing', 'stunning', 'shocking', 'heartbreaking', 'inspiring',
  'unbelievable', 'terrifying', 'joy', 'love', 'hate', 'fear', 'happy', 'brilliant',
  'devastating', 'hilarious', 'wonderful', 'painful', 'effortless', 'struggle', 'dream'];

const COMMON_WORDS = new Set(['the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and',
  'or', 'is', 'are', 'that', 'this', 'with', 'how', 'what', 'why', 'when', 'it', 'at', 'by', 'from']);

const LS = 'tapdot-headline-history';

function scoreHeadline(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const len = words.length;

  const clarity = len >= 6 && len <= 12 ? 100 : len < 6 ? len * 14 : Math.max(0, 100 - (len - 12) * 8);
  const emotional = Math.min(100,
    POWER_WORDS.filter(w => text.toLowerCase().includes(w)).length * 20 +
    EMOTIONAL_WORDS.filter(w => text.toLowerCase().includes(w)).length * 15);
  const hasNumber = /\d/.test(text);
  const hasColon = text.includes(':');
  const hasQuotes = /["']/.test(text);
  const specific = Math.min(100, (hasNumber ? 40 : 0) + (hasColon ? 30 : 0) + (hasQuotes ? 30 : 0));
  const seo = text.length <= 60 ? (len >= 7 && len <= 11 ? 90 : 70) : Math.max(30, 70 - (text.length - 60));

  const total = Math.round((clarity + emotional + specific + seo) / 4);
  return { total, clarity: Math.round(clarity), emotional: Math.round(emotional), specific, seo: Math.round(seo) };
}

// CoSchedule-style word balance: classify every word.
function wordBalance(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.map(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9']/g, '');
    let kind = 'uncommon';
    if (/^\d/.test(clean)) kind = 'number';
    else if (POWER_WORDS.includes(clean)) kind = 'power';
    else if (EMOTIONAL_WORDS.includes(clean)) kind = 'emotional';
    else if (COMMON_WORDS.has(clean)) kind = 'common';
    return { word: w, kind };
  });
}

function suggestions(text, s) {
  const out = [];
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!/\d/.test(text)) out.push('Add a number — listicle-style headlines ("7 ways…") lift click-through.');
  if (s.emotional < 40) out.push('Add a power or emotional word (proven, effortless, surprising…).');
  if (words.length < 6) out.push('Too short — aim for 6–12 words so the promise is clear.');
  if (words.length > 12) out.push('Too long — trim below 12 words; front-load the value.');
  if (text.length > 60) out.push(`${text.length} characters — Google truncates around 60; the ending may be cut off.`);
  if (!/\b(you|your)\b/i.test(text)) out.push('Address the reader directly — "you/your" makes it personal.');
  return out;
}

const $ = (id) => document.getElementById(id);
let lastScores = null;

function scoreColor(n) { return n >= 70 ? 'ts-text-success' : n >= 40 ? 'ts-text-warning' : 'ts-text-danger'; }

const KIND_LABELS = { common: 'Common', uncommon: 'Uncommon', emotional: 'Emotional', power: 'Power', number: 'Number' };

function render() {
  const text = $('headline').value.trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  $('wordCount').textContent = words.length;
  $('charCount').textContent = text.length;
  $('wordMeter').style.width = Math.min(100, (words.length / 25) * 100) + '%';
  $('wordMeter').style.background = words.length >= 6 && words.length <= 12 ? 'var(--color-success)' : 'var(--color-warning)';
  $('charMeter').style.width = Math.min(100, (text.length / 100) * 100) + '%';
  $('charMeter').style.background = text.length > 0 && text.length <= 60 ? 'var(--color-success)' : 'var(--color-warning)';

  if (!text) { hideOutput('output'); lastScores = null; return; }

  const s = scoreHeadline(text);
  lastScores = s;
  $('totalScore').textContent = s.total;
  $('totalScore').className = 'biz-score-num ' + scoreColor(s.total);
  $('sClarity').textContent = s.clarity;
  $('sEmotional').textContent = s.emotional;
  $('sSpecific').textContent = s.specific;
  $('sSeo').textContent = s.seo;

  $('wordBalance').innerHTML = '<p class="ts-card-label">Word balance</p>' +
    wordBalance(text).map(({ word, kind }) =>
      `<span class="hl-word hl-word-${kind}" title="${KIND_LABELS[kind]} word">${escapeHtml(word)}</span>`).join(' ');

  const sug = suggestions(text, s);
  $('suggestions').innerHTML = sug.length
    ? '<p class="ts-card-label">To improve</p><ul style="padding-left:18px;font-size:13px;line-height:1.8">' +
      sug.map(x => `<li>${escapeHtml(x)}</li>`).join('') + '</ul>'
    : '<p class="ts-text-success" style="font-size:13px">✓ Strong headline — no obvious gaps.</p>';

  showOutput('output');
}

$('headline').addEventListener('input', render);

// ── Comparison history ──────────────────────────────────────────────────────
function getHistory() { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } }
function renderHistory() {
  const h = getHistory();
  const best = h.length ? Math.max(...h.map(x => x.score)) : 0;
  $('compareList').innerHTML = h.length
    ? h.map(x => `<div class="biz-row" style="justify-content:space-between;padding:8px 0;border-top:0.5px solid var(--color-border)">
        <span style="font-size:13px">${escapeHtml(x.text)}</span>
        <span class="ts-badge ${x.score === best ? 'ok' : ''}">${x.score}${x.score === best && h.length > 1 ? ' 🏆' : ''}</span>
      </div>`).join('')
    : '<p class="biz-muted">Score a few headlines and save them here to compare.</p>';
}
$('scoreBtn').addEventListener('click', () => {
  const text = $('headline').value.trim();
  if (!text || !lastScores) return;
  const h = getHistory();
  if (!h.some(x => x.text === text)) h.unshift({ text, score: lastScores.total });
  localStorage.setItem(LS, JSON.stringify(h.slice(0, 10)));
  renderHistory();
});
$('clearCompare').addEventListener('click', () => { localStorage.removeItem(LS); renderHistory(); });

// ── AI rewrites ─────────────────────────────────────────────────────────────
const HEADLINE_PROMPT = (headline, scores) => `You are a marketing copywriter.
Rewrite this headline in 3 different ways that score higher on clarity,
emotional pull, and specificity. Keep each under 12 words.
Original: "${headline}"
Current weaknesses: clarity ${scores.clarity}/100, emotional ${scores.emotional}/100.
Output ONLY 3 alternatives, one per line, no numbering, no quotes.`;

// Formula rewrites for when on-device AI is off.
function formulaRewrites(text) {
  const base = text.replace(/[.!?]+$/, '');
  const noNumber = !/\d/.test(base);
  return [
    noNumber ? `7 Ways to ${base.charAt(0).toLowerCase() + base.slice(1)}` : `${base} (Step-by-Step)`,
    `How to ${base.charAt(0).toLowerCase() + base.slice(1)} — Without the Guesswork`,
    `The Proven Way to ${base.charAt(0).toLowerCase() + base.slice(1)}`,
  ];
}

async function generate() {
  const text = $('headline').value.trim();
  const status = $('aiStatus');
  if (!text || !lastScores) { status.className = 'biz-ai-status fallback'; status.textContent = 'Type a headline first.'; return; }

  const renderAlts = (lines, note) => {
    $('alternatives').innerHTML = lines.map(l => {
      const s = scoreHeadline(l);
      return `<div class="biz-item-card" style="padding:12px 14px;margin-bottom:8px"><div class="biz-row" style="justify-content:space-between"><span>${escapeHtml(l)}</span><span class="ts-badge ${s.total >= 70 ? 'ok' : ''}">${s.total}/100</span></div></div>`;
    }).join('');
    if (note) { status.className = 'biz-ai-status fallback'; status.textContent = note; }
  };

  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    renderAlts(formulaRewrites(text),
      'On-device AI unavailable — these use proven headline formulas. Enable Chrome\'s built-in AI for rewrites tailored to your wording.');
    return;
  }
  $('genBtn').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Generating…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(HEADLINE_PROMPT(text, lastScores));
    if (session.destroy) session.destroy();
    const lines = raw.split('\n').map(l => l.replace(/^[-*\d.]+\s*/, '').trim()).filter(Boolean).slice(0, 3);
    renderAlts(lines);
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI.';
  } catch (e) {
    status.className = 'biz-ai-status fallback'; status.textContent = 'AI error — try again.';
  } finally {
    $('genBtn').disabled = false;
  }
}
$('genBtn').addEventListener('click', generate);

render();
renderHistory();
