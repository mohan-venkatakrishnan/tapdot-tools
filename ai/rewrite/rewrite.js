// AIRewrite — Chrome built-in Rewriter API (on-device Gemini Nano)

const $ = (id) => document.getElementById(id);

function gate(state, title, msg) {
  const g = $('gate');
  g.className = 'ai-gate ' + (state === 'ok' ? 'ok' : 'no');
  g.querySelector('.ai-gate-icon').textContent = state === 'ok' ? '✅' : '🚫';
  $('gateTitle').textContent = title;
  $('gateMsg').textContent = msg;
  $('toolBody').classList.toggle('ai-disabled', state === 'no');
}

async function checkSupport() {
  if (!('Rewriter' in self)) {
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg|OPR/.test(navigator.userAgent);
    gate('no', 'Not available in this browser',
      isChrome
        ? 'Your Chrome doesn\'t expose the built-in Rewriter API yet — it needs desktop Chrome 138+ with the on-device model available.'
        : 'This tool uses Chrome\'s built-in on-device AI, which only exists in Google Chrome (desktop, 138+). It cannot work in this browser — a platform limit, not a bug.');
    return false;
  }
  try {
    const avail = await Rewriter.availability();
    if (avail === 'unavailable') {
      gate('no', 'This device can\'t run the on-device model',
        'Chrome reports the rewriter model is unavailable here — usually not enough free storage or an unsupported GPU.');
      return false;
    }
    gate('ok', avail === 'available' ? 'Ready — model already on this device' : 'Supported — model will download on first use',
      'Rewriting runs fully offline. Your text never leaves this machine.');
    return true;
  } catch (e) {
    gate('no', 'Could not check availability', e.message);
    return false;
  }
}

$('goBtn').addEventListener('click', async () => {
  const text = $('input').value.trim();
  const status = $('status');
  if (!text) { status.textContent = 'Paste some text first.'; return; }
  $('goBtn').disabled = true;
  status.textContent = 'Preparing model…';
  try {
    const rewriter = await Rewriter.create({
      tone: $('tone').value,
      length: $('length').value,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          status.textContent = `Downloading model… ${Math.round(e.loaded * 100)}%`;
        });
      },
    });
    status.textContent = 'Rewriting on-device…';
    const out = await rewriter.rewrite(text);
    rewriter.destroy && rewriter.destroy();
    $('result').textContent = out.trim();
    showOutput('output');
    status.textContent = 'Done — rewritten entirely on this device.';
  } catch (e) {
    status.textContent = 'Failed: ' + e.message;
  } finally {
    $('goBtn').disabled = false;
  }
});

$('copyOut').addEventListener('click', (e) => copyText($('result').textContent, e.target));
checkSupport();
