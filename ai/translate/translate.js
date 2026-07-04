// AITranslate — Chrome built-in Translator + LanguageDetector APIs (on-device)

const $ = (id) => document.getElementById(id);
const LANG_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });

function gate(state, title, msg) {
  const g = $('gate');
  g.className = 'ai-gate ' + (state === 'ok' ? 'ok' : 'no');
  g.querySelector('.ai-gate-icon').textContent = state === 'ok' ? '✅' : '🚫';
  $('gateTitle').textContent = title;
  $('gateMsg').textContent = msg;
  $('toolBody').classList.toggle('ai-disabled', state === 'no');
}

async function checkSupport() {
  if (!('Translator' in self)) {
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg|OPR/.test(navigator.userAgent);
    gate('no', 'Not available in this browser',
      isChrome
        ? 'Your Chrome doesn\'t expose the built-in Translator API yet — it needs desktop Chrome 138+. Language packs download on demand (small, per language pair).'
        : 'This tool uses Chrome\'s built-in on-device translation, which only exists in Google Chrome (desktop, 138+). It cannot work in this browser — a platform limit, not a bug.');
    return false;
  }
  gate('ok', 'Ready — translation runs on this device',
    'Language packs download once per language pair (a few MB), then translation works offline. Your text never leaves this machine.');
  return true;
}

let detector = null;
let translateTimer = null;

async function detectLang(text) {
  try {
    if (!('LanguageDetector' in self)) return null;
    if (!detector) detector = await LanguageDetector.create();
    const results = await detector.detect(text);
    return results && results[0] && results[0].confidence > 0.4 ? results[0].detectedLanguage : null;
  } catch { return null; }
}

async function run() {
  const text = $('input').value.trim();
  const status = $('status');
  if (!text) { $('result').textContent = ''; $('detected').textContent = ''; return; }
  if (!('Translator' in self)) return;

  const src = await detectLang(text) || 'en';
  $('detected').textContent = `Detected: ${LANG_NAMES.of(src) || src}`;
  const target = $('targetLang').value;
  if (src === target) { $('result').textContent = text; status.textContent = 'Source and target are the same language.'; return; }

  try {
    status.textContent = 'Preparing language pack…';
    const availability = await Translator.availability({ sourceLanguage: src, targetLanguage: target });
    if (availability === 'unavailable') {
      status.textContent = `Chrome can't translate ${LANG_NAMES.of(src)} → ${LANG_NAMES.of(target)} on-device yet — try a different pair.`;
      $('result').textContent = '';
      return;
    }
    const translator = await Translator.create({
      sourceLanguage: src,
      targetLanguage: target,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          status.textContent = `Downloading ${LANG_NAMES.of(target)} pack… ${Math.round(e.loaded * 100)}%`;
        });
      },
    });
    const out = await translator.translate(text);
    translator.destroy && translator.destroy();
    $('result').textContent = out;
    status.textContent = 'Translated on-device.';
  } catch (e) {
    status.textContent = 'Failed: ' + e.message;
  }
}

$('input').addEventListener('input', () => {
  clearTimeout(translateTimer);
  translateTimer = setTimeout(run, 600);
});
$('targetLang').addEventListener('change', run);
$('copyOut').addEventListener('click', (e) => copyText($('result').textContent, e.target));
checkSupport();
