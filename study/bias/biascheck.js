// BiasCheck — media literacy analysis via on-device AI (Gemini Nano) with fallback

const BIAS_PROMPT = (text) => `You are a media literacy educator.
Analyse this news excerpt for a student learning critical thinking.
Respond ONLY in this XML format with no extra text:

<loaded_words>up to 6 emotionally charged words/phrases from the text, separated by |</loaded_words>
<framing>3-4 sentences: what angle this takes, what it emphasises, what it omits</framing>
<patterns>up to 3 rhetorical patterns: Name: where it appears in this specific text</patterns>
<questions>3 critical questions a reader should ask, one per line starting with -</questions>

Text: """${text.slice(0, 1500)}"""`;

function parseBiasResponse(raw) {
  const extract = (tag) => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1].trim() : '';
  };
  return {
    loadedWords: extract('loaded_words').split('|').map(w => w.trim()).filter(Boolean),
    framing:     extract('framing'),
    patterns:    extract('patterns').split('\n').map(l => l.trim()).filter(Boolean),
    questions:   extract('questions').split('\n')
                   .filter(l => l.startsWith('-')).map(l => l.slice(1).trim()),
  };
}

// ── Fallback (no on-device AI) ──────────────────────────────────────────────

const LOADED_WORDS_LIST = [
  'radical','extreme','alarming','devastating','crisis','threat','shocking',
  'outrageous','corrupt','dangerous','regime','elite','so-called','alleged',
  'reportedly','claims','mainstream media','ordinary people','slammed','blasted',
  'chaos','disaster','unprecedented','bombshell','explosive','stunning'
];

function fallbackAnalysis(text) {
  const lower = text.toLowerCase();
  const found = LOADED_WORDS_LIST.filter(w => lower.includes(w));
  return {
    loadedWords: found,
    framing: 'On-device AI is not available in this browser, so this is a basic word-level analysis only. Enable Chrome’s built-in AI (see the guide above) for the full framing analysis.',
    patterns: [],
    questions: [
      'Who is the source and what perspective might they represent?',
      'What evidence supports the main claims made here?',
      'What context or other viewpoints might be missing from this piece?',
    ]
  };
}

// ── On-device AI: availability + session (new + legacy APIs) ────────────────

// Returns 'available' | 'downloadable' | 'downloading' | 'unavailable'
async function aiAvailability() {
  try {
    // Modern Prompt API: global LanguageModel
    if (typeof self !== 'undefined' && self.LanguageModel && self.LanguageModel.availability) {
      const a = await self.LanguageModel.availability();
      if (a === 'available' || a === 'readily') return 'available';
      if (a === 'downloadable' || a === 'after-download') return 'downloadable';
      if (a === 'downloading') return 'downloading';
      return 'unavailable';
    }
    // Legacy: window.ai.languageModel / window.ai.assistant
    const ai = (typeof window !== 'undefined') ? window.ai : null;
    const ns = ai && (ai.languageModel || ai.assistant);
    if (ns && ns.capabilities) {
      const caps = await ns.capabilities();
      const v = caps && caps.available;
      if (v === 'readily') return 'available';
      if (v === 'after-download') return 'downloadable';
      if (v && v !== 'no') return 'downloading';
    }
  } catch (e) { /* fall through */ }
  return 'unavailable';
}

// Create a session (triggers a one-time model download if needed).
async function createSession(onProgress) {
  const monitor = (m) => {
    if (m && m.addEventListener) {
      m.addEventListener('downloadprogress', (e) => {
        const pct = e.total ? e.loaded / e.total : e.loaded; // 0..1
        if (onProgress) onProgress(Math.round(Math.min(1, pct || 0) * 100));
      });
    }
  };
  if (typeof self !== 'undefined' && self.LanguageModel && self.LanguageModel.create) {
    return await self.LanguageModel.create({ monitor });
  }
  const ai = (typeof window !== 'undefined') ? window.ai : null;
  const ns = ai && (ai.languageModel || ai.assistant);
  if (ns && ns.create) return await ns.create({ monitor });
  throw new Error('No on-device AI API');
}

// ── State + UI ──────────────────────────────────────────────────────────────

let aiState = 'unavailable';
const statusEl = () => document.getElementById('engineStatus');
const flagsEl  = () => document.getElementById('flagsGuide');

function setStatus(cls, text) {
  const s = statusEl();
  s.className = 'bc-status ' + cls;
  s.textContent = text;
}

async function detectEngine() {
  aiState = await aiAvailability();
  if (aiState === 'available') {
    setStatus('ready', 'On-device AI ready');
    flagsEl().classList.add('ts-hidden');
  } else if (aiState === 'downloadable' || aiState === 'downloading') {
    setStatus('ready', 'On-device AI available — the model downloads once, on your first analysis');
    flagsEl().classList.add('ts-hidden');
  } else {
    setStatus('fallback', 'On-device AI unavailable — using basic analysis');
    flagsEl().classList.remove('ts-hidden');
  }
}

// ── Analyse ─────────────────────────────────────────────────────────────────

async function analyse() {
  const text = document.getElementById('input').value.trim();
  if (!text) return;
  const btn = document.getElementById('analyzeBtn');

  let result;
  if (aiState !== 'unavailable') {
    btn.disabled = true;
    setStatus('working', 'Analysing on-device…');
    try {
      const session = await createSession((pct) =>
        setStatus('working', `Downloading model… ${pct}%`));
      setStatus('working', 'Analysing on-device…');
      const raw = await session.prompt(BIAS_PROMPT(text));
      if (session.destroy) session.destroy();
      result = parseBiasResponse(raw);
      if (!result.framing && !result.loadedWords.length) result = fallbackAnalysis(text);
      aiState = 'available';
      setStatus('ready', 'On-device AI ready');
      flagsEl().classList.add('ts-hidden');
    } catch (e) {
      result = fallbackAnalysis(text);
      aiState = 'unavailable';
      setStatus('fallback', 'On-device AI unavailable — showing basic analysis');
      flagsEl().classList.remove('ts-hidden');
    } finally {
      btn.disabled = false;
    }
  } else {
    result = fallbackAnalysis(text);
  }
  render(result);
}

function render(r) {
  const chips = document.getElementById('loadedWords');
  chips.innerHTML = r.loadedWords.length
    ? r.loadedWords.map(w => `<span class="bc-chip">${escapeHtml(w)}</span>`).join('')
    : '<span class="bc-empty">No strongly loaded language detected.</span>';

  document.getElementById('framing').textContent = r.framing || '—';

  const patternsCard = document.getElementById('patternsCard');
  const patterns = document.getElementById('patterns');
  if (r.patterns.length) {
    patternsCard.classList.remove('ts-hidden');
    patterns.innerHTML = r.patterns.map(p => `<li>${escapeHtml(p)}</li>`).join('');
  } else {
    patternsCard.classList.add('ts-hidden');
  }

  document.getElementById('questions').innerHTML =
    r.questions.map(q => `<li>${escapeHtml(q)}</li>`).join('');

  showOutput('output');
}

// ── Wire up ───────────────────────────────────────────────────────────────

document.getElementById('analyzeBtn').addEventListener('click', analyse);

document.getElementById('flagsGuide').addEventListener('click', (e) => {
  const btn = e.target.closest('.bc-flag-copy');
  if (btn) copyText(btn.dataset.copy, btn);
});

document.getElementById('flagsLink').addEventListener('click', () => {
  const g = flagsEl();
  g.classList.toggle('ts-hidden');
  if (!g.classList.contains('ts-hidden')) g.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

detectEngine();
