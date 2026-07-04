// VoiceType — dictation via the browser's built-in SpeechRecognition API.
// Not fully local: Chrome sends microphone audio to its own speech-to-text
// servers to produce the transcript (disclosed prominently in-page + privacy.html).

const $ = (id) => document.getElementById(id);
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

const PUNCTUATION = [
  [/\bnew paragraph\b/gi, '\n\n'],
  [/\bnew line\b/gi, '\n'],
  [/\bquestion mark\b/gi, '?'],
  [/\bexclamation (mark|point)\b/gi, '!'],
  [/\bcomma\b/gi, ','],
  [/\bperiod\b/gi, '.'],
  [/\bcolon\b/gi, ':'],
  [/\bsemicolon\b/gi, ';'],
];

function applyPunctuation(text) {
  let out = text;
  for (const [re, replacement] of PUNCTUATION) out = out.replace(re, replacement);
  return out.replace(/\s+([.,!?:;])/g, '$1');
}

function gate(state, title, msg) {
  const g = $('gate');
  g.className = 'ai-gate ' + (state === 'ok' ? 'ok' : 'no');
  g.querySelector('.ai-gate-icon').textContent = state === 'ok' ? '✅' : '🚫';
  $('gateTitle').textContent = title;
  $('gateMsg').textContent = msg;
  $('toolBody').classList.toggle('ai-disabled', state === 'no');
}

function checkSupport() {
  if (!SpeechRecognitionCtor) {
    gate('no', 'Not available in this browser',
      "Your browser doesn't expose the SpeechRecognition API. Try desktop Chrome or Edge.");
    return false;
  }
  gate('ok', 'Ready', "Click Start dictating and allow microphone access when prompted.");
  return true;
}

let recognition = null;
let listening = false;

function createRecognition() {
  const rec = new SpeechRecognitionCtor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = $('lang').value;

  rec.onresult = (e) => {
    let finalChunk = '';
    let interimChunk = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcriptPiece = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalChunk += transcriptPiece;
      else interimChunk += transcriptPiece;
    }
    const ta = $('transcript');
    if (finalChunk) {
      const base = ta.value.replace(/\s+$/, '');
      const cleaned = applyPunctuation(finalChunk);
      ta.value = (base ? base + ' ' : '') + cleaned.trim() + ' ';
    }
    ta._interim = interimChunk;
    ta.scrollTop = ta.scrollHeight;
  };

  rec.onerror = (e) => {
    $('status').textContent = e.error === 'not-allowed'
      ? 'Microphone access denied.'
      : `Error: ${e.error}`;
  };

  rec.onend = () => {
    if (listening) {
      // Chrome auto-stops after a period of silence; restart to keep "continuous" dictation going.
      try { rec.start(); } catch (e) { /* already starting */ }
    }
  };

  return rec;
}

function startListening() {
  recognition = createRecognition();
  try {
    recognition.start();
    listening = true;
    $('micBtn').classList.add('listening');
    $('micBtn').textContent = '';
    $('micBtn').innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Stop dictating';
    $('status').textContent = 'Listening…';
    $('status').classList.add('listening');
  } catch (e) {
    $('status').textContent = 'Could not start: ' + e.message;
  }
}

function stopListening() {
  listening = false;
  if (recognition) recognition.stop();
  $('micBtn').classList.remove('listening');
  $('micBtn').innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Start dictating';
  $('status').textContent = '';
  $('status').classList.remove('listening');
}

$('micBtn').addEventListener('click', () => listening ? stopListening() : startListening());
$('copyBtn').addEventListener('click', (e) => copyText($('transcript').value, e.target));
$('downloadBtn').addEventListener('click', () => {
  const blob = new Blob([$('transcript').value], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'voicetype-transcript.txt';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('clearBtn').addEventListener('click', () => { $('transcript').value = ''; });
$('lang').addEventListener('change', () => { if (listening) { stopListening(); startListening(); } });

checkSupport();
