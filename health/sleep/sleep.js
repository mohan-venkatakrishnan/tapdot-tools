// SleepLog — sleep/wake logging, duration + quality stats, AI pattern analysis

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'tapdot-sleep-log';

function loadNights() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; } }
function saveNights(n) { localStorage.setItem(STORE_KEY, JSON.stringify(n)); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function durationHours(bedTime, wakeTime) {
  const [bh, bm] = bedTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return (wakeMins - bedMins) / 60;
}

function bedtimeMinutes(bedTime) {
  const [h, m] = bedTime.split(':').map(Number);
  let mins = h * 60 + m;
  if (mins < 12 * 60) mins += 24 * 60;
  return mins;
}

function render() {
  const nights = loadNights().sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = nights.slice(0, 7);

  if (recent.length) {
    const avgDur = recent.reduce((s, n) => s + durationHours(n.bedTime, n.wakeTime), 0) / recent.length;
    $('avgDuration').textContent = `${avgDur.toFixed(1)}h`;
    const avgQual = recent.reduce((s, n) => s + n.quality, 0) / recent.length;
    $('avgQuality').textContent = avgQual.toFixed(1);
    if (recent.length > 1) {
      const mins = recent.map(n => bedtimeMinutes(n.bedTime));
      const mean = mins.reduce((a, b) => a + b, 0) / mins.length;
      const variance = mins.reduce((s, m) => s + (m - mean) ** 2, 0) / mins.length;
      const stdDevMins = Math.sqrt(variance);
      $('consistency').textContent = stdDevMins < 20 ? 'High' : stdDevMins < 45 ? 'Moderate' : 'Low';
    } else {
      $('consistency').textContent = '—';
    }
  } else {
    $('avgDuration').textContent = '—';
    $('avgQuality').textContent = '—';
    $('consistency').textContent = '—';
  }

  $('nightList').innerHTML = nights.length ? nights.map((n, i) => `
    <div class="log-item">
      <span class="log-main">${n.date} <span class="log-meta">${n.bedTime}–${n.wakeTime} · ${durationHours(n.bedTime, n.wakeTime).toFixed(1)}h · quality ${n.quality}/5</span></span>
      <button class="biz-rm" data-idx="${i}" aria-label="Remove">✕</button>
    </div>
  `).join('') : '<p class="biz-muted">No nights logged yet.</p>';

  $('nightList').querySelectorAll('[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sorted = loadNights().sort((a, b) => new Date(b.date) - new Date(a.date));
      sorted.splice(parseInt(btn.dataset.idx, 10), 1);
      saveNights(sorted);
      render();
    });
  });
}

$('sleepQuality').addEventListener('input', () => $('qualityVal').textContent = $('sleepQuality').value);

$('addSleep').addEventListener('click', () => {
  const date = $('sleepDate').value || new Date().toISOString().slice(0, 10);
  const bedTime = $('bedTime').value, wakeTime = $('wakeTime').value;
  if (!bedTime || !wakeTime) return;
  const nights = loadNights();
  nights.push({ date, bedTime, wakeTime, quality: parseInt($('sleepQuality').value, 10) });
  saveNights(nights);
  render();
});

async function analyze() {
  const nights = loadNights().sort((a, b) => new Date(a.date) - new Date(b.date));
  const status = $('aiStatus');
  if (nights.length < 3) { status.className = 'biz-ai-status fallback'; status.textContent = 'Log at least 3 nights first.'; return; }
  const listText = nights.map(n => `${n.date}: bed ${n.bedTime}, wake ${n.wakeTime}, duration ${durationHours(n.bedTime, n.wakeTime).toFixed(1)}h, quality ${n.quality}/5`).join('\n');
  const avail = await tapdotAI.availability();
  const existing = document.getElementById('aiAnalysisOutput');
  if (existing) existing.remove();
  if (avail === 'unavailable') {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — log a few more nights to spot trends yourself, or try Chrome with on-device AI enabled.';
    return;
  }
  $('aiAnalyze').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Analyzing…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(`Analyze this sleep log for patterns — consistency, duration trends, and quality correlations. Be factual and concise, do not give medical advice. Log:\n${listText}`);
    if (session.destroy) session.destroy();
    $('nightList').insertAdjacentHTML('beforebegin', `<pre class="ts-mono-output" id="aiAnalysisOutput">${escapeHtml(raw.trim())}</pre>`);
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI.';
  } catch (e) {
    status.className = 'biz-ai-status fallback'; status.textContent = 'AI error — try again.';
  } finally {
    $('aiAnalyze').disabled = false;
  }
}
$('aiAnalyze').addEventListener('click', analyze);

render();
