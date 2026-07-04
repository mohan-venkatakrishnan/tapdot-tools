// AIWrite — Chrome built-in Writer API (on-device Gemini Nano)

const $ = (id) => document.getElementById(id);

function gate(state, title, msg) {
  const g = $('gate');
  g.className = 'ai-gate ' + (state === 'ok' ? 'ok' : 'no');
  g.querySelector('.ai-gate-icon').textContent = state === 'ok' ? '✅' : state === 'download' ? '⬇️' : '🚫';
  $('gateTitle').textContent = title;
  $('gateMsg').textContent = msg;
  $('toolBody').classList.toggle('ai-disabled', state === 'no');
}

async function checkSupport() {
  if (!('Writer' in self)) {
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg|OPR/.test(navigator.userAgent);
    gate('no', 'Not available in this browser',
      isChrome
        ? 'Your Chrome doesn\'t expose the built-in Writer API yet — it needs desktop Chrome 138+ with the on-device model available (a few GB of free storage, 4 GB+ GPU/RAM).'
        : 'This tool uses Chrome\'s built-in on-device AI, which only exists in Google Chrome (desktop, 138+). It cannot work in this browser — a platform limit, not a bug.');
    return false;
  }
  try {
    const avail = await Writer.availability();
    if (avail === 'unavailable') {
      gate('no', 'This device can\'t run the on-device model',
        'Chrome reports the writer model is unavailable here — usually not enough free storage or an unsupported GPU.');
      return false;
    }
    if (avail === 'available') {
      gate('ok', 'Ready — model already on this device', 'Drafts are written fully offline. Your text never leaves this machine.');
    } else {
      gate('ok', 'Supported — model will download on first use',
        'Chrome will download the on-device model (one-time, a few GB) when you click Write it. After that it works offline.');
    }
    return true;
  } catch (e) {
    gate('no', 'Could not check availability', e.message);
    return false;
  }
}

$('goBtn').addEventListener('click', async () => {
  const text = $('input').value.trim();
  const status = $('status');
  if (!text) { status.textContent = 'Add a few points about what you want to say first.'; return; }
  $('goBtn').disabled = true;
  status.textContent = 'Preparing model…';
  try {
    const writer = await Writer.create({
      tone: $('tone').value,
      length: $('length').value,
      format: $('format').value,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          status.textContent = `Downloading model… ${Math.round(e.loaded * 100)}%`;
        });
      },
    });
    status.textContent = 'Writing on-device…';
    const draft = await writer.write(text);
    writer.destroy && writer.destroy();
    $('result').textContent = draft.trim();
    showOutput('output');
    status.textContent = 'Done — written entirely on this device.';
  } catch (e) {
    status.textContent = 'Failed: ' + e.message;
  } finally {
    $('goBtn').disabled = false;
  }
});

$('copyOut').addEventListener('click', (e) => copyText($('result').textContent, e.target));
checkSupport();
