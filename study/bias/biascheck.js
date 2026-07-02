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
    framing: 'On-device AI is not available in this browser, so this is a basic word-level analysis only. For the full framing analysis, use Chrome with the built-in AI (Gemini Nano) enabled.',
    patterns: [],
    questions: [
      'Who is the source and what perspective might they represent?',
      'What evidence supports the main claims made here?',
      'What context or other viewpoints might be missing from this piece?',
    ]
  };
}

// ── On-device AI detection (supports old and new Chrome APIs) ───────────────

async function getModelSession() {
  // New API: self.LanguageModel
  if (typeof self !== 'undefined' && self.LanguageModel) {
    const avail = await self.LanguageModel.availability();
    if (avail === 'available' || avail === 'downloadable' || avail === 'downloading') {
      return await self.LanguageModel.create();
    }
    return null;
  }
  // Legacy API: window.ai.languageModel / window.ai.assistant
  const ai = (typeof window !== 'undefined') ? window.ai : null;
  const ns = ai && (ai.languageModel || ai.assistant);
  if (ns && ns.capabilities) {
    const caps = await ns.capabilities();
    if (caps && caps.available && caps.available !== 'no') {
      return await ns.create();
    }
  }
  return null;
}

let aiAvailable = false;

async function detectEngine() {
  const status = document.getElementById('engineStatus');
  try {
    const session = await getModelSession();
    if (session) {
      aiAvailable = true;
      if (session.destroy) session.destroy();
      status.className = 'bc-status ready';
      status.textContent = 'On-device AI ready';
      return;
    }
  } catch (e) { /* fall through */ }
  aiAvailable = false;
  status.className = 'bc-status fallback';
  status.textContent = 'On-device AI unavailable — basic analysis mode';
}

// ── Analyse ─────────────────────────────────────────────────────────────────

async function analyse() {
  const text = document.getElementById('input').value.trim();
  if (!text) return;
  const status = document.getElementById('engineStatus');
  const btn = document.getElementById('analyzeBtn');

  let result;
  if (aiAvailable) {
    btn.disabled = true;
    status.className = 'bc-status working';
    status.textContent = 'Analysing on-device…';
    try {
      const session = await getModelSession();
      const raw = await session.prompt(BIAS_PROMPT(text));
      if (session.destroy) session.destroy();
      result = parseBiasResponse(raw);
      // If parsing produced nothing useful, fall back gracefully.
      if (!result.framing && !result.loadedWords.length) result = fallbackAnalysis(text);
      status.className = 'bc-status ready';
      status.textContent = 'On-device AI ready';
    } catch (e) {
      result = fallbackAnalysis(text);
      status.className = 'bc-status fallback';
      status.textContent = 'AI error — showing basic analysis';
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

document.getElementById('analyzeBtn').addEventListener('click', analyse);
detectEngine();
