// AISummarize — Chrome built-in Summarizer API (on-device Gemini Nano)

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
  if (!('Summarizer' in self)) {
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg|OPR/.test(navigator.userAgent);
    gate('no', 'Not available in this browser',
      isChrome
        ? 'Your Chrome version doesn\'t expose the built-in Summarizer API yet. It needs desktop Chrome 138 or newer with the on-device model available (a few GB of free storage and 4 GB+ GPU/RAM). Mobile Chrome is not supported yet.'
        : 'This tool uses Chrome\'s built-in on-device AI, which only exists in Google Chrome (desktop, version 138+). It cannot work in this browser — that\'s a platform limit, not a bug.');
    return false;
  }
  try {
    const avail = await Summarizer.availability();
    if (avail === 'unavailable') {
      gate('no', 'This device can\'t run the on-device model',
        'Chrome reports the summarizer model is unavailable here — usually not enough free storage (needs ~4 GB) or an unsupported GPU. Nothing to configure in the tool; it\'s a device limit.');
      return false;
    }
    if (avail === 'available') {
      gate('ok', 'Ready — model already on this device', 'Summaries run fully offline. Your text never leaves this machine.');
    } else {
      gate('download', 'Supported — model will download on first use',
        'Chrome will download the on-device model (one-time, ~2–4 GB) when you click Summarize. After that it works offline.');
      $('gate').className = 'ai-gate ok';
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
  if (!text) { status.textContent = 'Paste some text first.'; return; }
  $('goBtn').disabled = true;
  status.textContent = 'Preparing model…';
  try {
    const summarizer = await Summarizer.create({
      type: $('sumType').value,
      length: $('sumLength').value,
      format: 'plain-text',
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          status.textContent = `Downloading model… ${Math.round(e.loaded * 100)}%`;
        });
      },
    });
    status.textContent = 'Summarizing on-device…';
    const summary = await summarizer.summarize(text);
    summarizer.destroy && summarizer.destroy();
    $('result').textContent = summary.trim();
    showOutput('output');
    status.textContent = 'Done — processed entirely on this device.';
  } catch (e) {
    status.textContent = 'Failed: ' + e.message;
  } finally {
    $('goBtn').disabled = false;
  }
});

$('copyOut').addEventListener('click', (e) => copyText($('result').textContent, e.target));
checkSupport();
