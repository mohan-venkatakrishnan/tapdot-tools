// HeadlineScore — rule-based scoring + on-device AI rewrites

const POWER_WORDS = ['proven', 'secret', 'instantly', 'free', 'guaranteed', 'best',
  'ultimate', 'easy', 'fast', 'boost', 'transform', 'discover', 'unlock', 'surprising',
  'essential', 'avoid', 'warning', 'mistake', 'never', 'always', 'you', 'your'];

function scoreHeadline(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const len = words.length;

  const clarity = len >= 6 && len <= 12 ? 100 : len < 6 ? len * 14 : Math.max(0, 100 - (len - 12) * 8);
  const emotional = Math.min(100, POWER_WORDS.filter(w => text.toLowerCase().includes(w)).length * 20);
  const hasNumber = /\d/.test(text);
  const hasColon = text.includes(':');
  const hasQuotes = /["']/.test(text);
  const specific = Math.min(100, (hasNumber ? 40 : 0) + (hasColon ? 30 : 0) + (hasQuotes ? 30 : 0));
  const seo = len >= 7 && len <= 11 ? 80 : len >= 5 && len <= 13 ? 60 : 40;

  const total = Math.round((clarity + emotional + specific + seo) / 4);
  return { total, clarity: Math.round(clarity), emotional, specific, seo };
}

const $ = (id) => document.getElementById(id);
let lastScores = null;

function scoreColor(n) { return n >= 70 ? 'ts-text-success' : n >= 40 ? 'ts-text-warning' : 'ts-text-danger'; }

$('scoreBtn').addEventListener('click', () => {
  const text = $('headline').value.trim();
  if (!text) return;
  const s = scoreHeadline(text);
  lastScores = s;
  $('totalScore').textContent = s.total;
  $('totalScore').className = 'biz-score-num ' + scoreColor(s.total);
  $('sClarity').textContent = s.clarity;
  $('sEmotional').textContent = s.emotional;
  $('sSpecific').textContent = s.specific;
  $('sSeo').textContent = s.seo;
  showOutput('output');
});

const HEADLINE_PROMPT = (headline, scores) => `You are a marketing copywriter.
Rewrite this headline in 3 different ways that score higher on clarity,
emotional pull, and specificity. Keep each under 12 words.
Original: "${headline}"
Current weaknesses: clarity ${scores.clarity}/100, emotional ${scores.emotional}/100.
Output ONLY 3 alternatives, one per line, no numbering, no quotes.`;

async function generate() {
  const text = $('headline').value.trim();
  const status = $('aiStatus');
  if (!text || !lastScores) { status.className = 'biz-ai-status fallback'; status.textContent = 'Score a headline first.'; return; }
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — the score above still works without it.';
    return;
  }
  $('genBtn').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Generating…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(HEADLINE_PROMPT(text, lastScores));
    if (session.destroy) session.destroy();
    const lines = raw.split('\n').map(l => l.replace(/^[-*\d.]+\s*/, '').trim()).filter(Boolean).slice(0, 3);
    $('alternatives').innerHTML = lines.map(l => {
      const s = scoreHeadline(l);
      return `<div class="biz-item-card" style="padding:12px 14px;margin-bottom:8px"><div class="biz-row" style="justify-content:space-between"><span>${escapeHtml(l)}</span><span class="ts-badge ${s.total >= 70 ? 'ok' : ''}">${s.total}/100</span></div></div>`;
    }).join('');
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI.';
  } catch (e) {
    status.className = 'biz-ai-status fallback'; status.textContent = 'AI error — try again.';
  } finally {
    $('genBtn').disabled = false;
  }
}
$('genBtn').addEventListener('click', generate);
