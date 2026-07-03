// EmailSubjectTester — spam triggers, previews, sentiment, AI variants

const SPAM_TRIGGERS = [
  'free money', 'guaranteed', 'no risk', 'act now', 'limited time', 'click here',
  'winner', 'you have been selected', 'congratulations', 'earn extra cash',
  'work from home', 'million dollars', 'once in a lifetime', 'special promotion',
  'buy direct', 'order now', 'satisfaction guaranteed', 'as seen on', 'bargain',
  'best price', 'bonus', 'cash', 'cheap', 'dear friend', 'discount', 'double your',
  'earn per week', 'extra cash', 'fast cash', 'for free', 'for just',
  'free access', 'free gift', 'free info', 'free investment', 'free membership',
  'free offer', 'free preview', 'great offer', 'increase sales',
  'join millions', 'lose weight', 'lowest price', 'make money', 'no cost',
  'no fees', 'no investment', 'no obligation', 'no purchase necessary',
  'offer expires', 'only $', 'order today', 'promise you', 'pure profit',
  'risk free', 'save big', 'save up to', 'special offer', 'subject to credit',
  'this is not spam', 'thousand dollars', 'unlimited',
  'urgent', 'while supplies last', 'why pay more', 'you are a winner',
];

const POSITIVE_WORDS = ['great', 'amazing', 'exclusive', 'love', 'best', 'new', 'free', 'win', 'save', 'happy', 'celebrate', 'thank'];
const URGENT_WORDS = ['urgent', 'now', 'today', 'ends', 'last chance', 'hurry', 'expires', 'final', 'deadline'];
const NEGATIVE_WORDS = ['sorry', 'problem', 'issue', 'fail', 'sad', 'warning', 'cancel', 'missed'];

const $ = (id) => document.getElementById(id);

function countEmoji(text) {
  const m = text.match(/\p{Extended_Pictographic}/gu);
  return m ? m.length : 0;
}
function findSpamWords(text) {
  const lower = text.toLowerCase();
  return SPAM_TRIGGERS.filter(w => lower.includes(w));
}
function detectSentiment(text) {
  const lower = text.toLowerCase();
  const urgent = URGENT_WORDS.some(w => lower.includes(w));
  const neg = NEGATIVE_WORDS.filter(w => lower.includes(w)).length;
  const pos = POSITIVE_WORDS.filter(w => lower.includes(w)).length;
  if (urgent) return 'Urgent';
  if (neg > pos) return 'Negative';
  if (pos > 0) return 'Positive';
  return 'Neutral';
}
function hasPersonalization(text) { return /\{[a-z_]+\}|\{\{[a-z_]+\}\}/i.test(text); }

function render() {
  const subject = $('subject').value;
  const preheader = $('preheader').value;
  $('charCount').textContent = subject.length;
  $('emojiCount').textContent = countEmoji(subject);
  const spam = findSpamWords(subject);
  $('spamCount').textContent = spam.length;
  $('sentiment').textContent = subject ? detectSentiment(subject) : '—';

  // Truncate exactly like real inboxes so the preview is honest.
  const MOBILE_LIMIT = 35, DESKTOP_LIMIT = 70;
  const truncate = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
  const subj = subject || 'Your subject appears here';
  const pre = preheader || (subject ? '' : 'Your preheader continues here');
  $('desktopSubject').textContent = truncate(subj, DESKTOP_LIMIT);
  $('desktopPreheader').textContent = pre ? '— ' + pre : '';
  $('mobilePreview').textContent = truncate(subj, MOBILE_LIMIT);
  $('preheaderPreview').textContent = truncate(pre || subj, 45);
  const mobileOver = subject.length > MOBILE_LIMIT, desktopOver = subject.length > DESKTOP_LIMIT;
  $('previewNote').textContent = !subject ? ''
    : mobileOver
      ? `${subject.length - MOBILE_LIMIT} characters cut off on mobile${desktopOver ? `, ${subject.length - DESKTOP_LIMIT} on desktop` : ''} — front-load the key words.`
      : '✓ Fits fully on both mobile and desktop.';

  $('spamCard').classList.toggle('ts-hidden', !spam.length);
  $('spamWords').innerHTML = spam.map(w => `<span class="ts-badge warn">${escapeHtml(w)}</span>`).join('');

  if (hasPersonalization(subject)) {
    $('previewNote').textContent += ' Personalization token detected.';
  }
}

['subject', 'preheader'].forEach(id => $(id).addEventListener('input', render));

const AI_PROMPT = (subject, sentiment) => `You are an email marketing copywriter.
Rewrite this email subject line in 3 different ways that could improve open rates.
Keep each under 60 characters. Current sentiment: ${sentiment}.
Original: "${subject}"
Output ONLY 3 alternatives, one per line, no numbering, no quotes.`;

// Formula-based variants (question, urgency, personalization) for when AI is off.
function ruleVariants(subject) {
  const base = subject.replace(/[.!?]+$/, '');
  const short = base.length > 42 ? base.slice(0, 42).replace(/\s+\S*$/, '') + '…' : base;
  return [
    `${short}?`.replace(/\?\?$/, '?'),
    `Last chance: ${short.charAt(0).toLowerCase() + short.slice(1)}`,
    `[First name], ${short.charAt(0).toLowerCase() + short.slice(1)}`,
  ].map(v => v.length > 60 ? v.slice(0, 60) : v);
}

async function generateVariants() {
  const subject = $('subject').value.trim();
  const status = $('aiStatus');
  if (!subject) { status.className = 'biz-ai-status fallback'; status.textContent = 'Type a subject line first.'; return; }
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    const variants = ruleVariants(subject);
    $('variants').innerHTML = variants.map(l => `<div class="biz-item-card" style="padding:10px 14px;margin-bottom:8px"><div class="biz-row" style="justify-content:space-between"><span>${escapeHtml(l)}</span><button class="ts-copy-btn" data-v="${escapeHtml(l)}">Copy</button></div></div>`).join('');
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — these variants use proven subject-line formulas instead. Enable Chrome\'s built-in AI for rewrites tailored to your wording.';
    return;
  }
  $('genBtn').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Generating…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(AI_PROMPT(subject, detectSentiment(subject)));
    if (session.destroy) session.destroy();
    const lines = raw.split('\n').map(l => l.replace(/^[-*\d.]+\s*/, '').trim()).filter(Boolean).slice(0, 3);
    $('variants').innerHTML = lines.map(l => `<div class="biz-item-card" style="padding:10px 14px;margin-bottom:8px"><div class="biz-row" style="justify-content:space-between"><span>${escapeHtml(l)}</span><button class="ts-copy-btn" data-v="${escapeHtml(l)}">Copy</button></div></div>`).join('');
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI.';
  } catch (e) {
    status.className = 'biz-ai-status fallback'; status.textContent = 'AI error — try again.';
  } finally {
    $('genBtn').disabled = false;
  }
}
$('genBtn').addEventListener('click', generateVariants);
$('variants').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) copyText(b.dataset.v, b); });

render();
