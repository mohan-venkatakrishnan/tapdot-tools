// UTMBuilder — build & manage UTM tracking links, locally

const LS = 'tapdot-utm-history';
const $ = (id) => document.getElementById(id);

function slug(v) { return v.trim().toLowerCase().replace(/\s+/g, '_'); }

function buildUTM({ url, source, medium, campaign, term, content }) {
  // Forgiving: prepend https:// when the protocol is missing.
  const withProto = /^[a-z][\w+.-]*:\/\//i.test(url) ? url : 'https://' + url;
  let base;
  try { base = new URL(withProto); } catch { return null; }
  if (!base.hostname.includes('.')) return null;
  const params = { utm_source: source, utm_medium: medium, utm_campaign: campaign, utm_term: term, utm_content: content };
  Object.entries(params).forEach(([k, v]) => { if (v) base.searchParams.set(k, slug(v)); });
  return base.toString();
}

function getHistory() { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } }
function saveHistory(urls) {
  const h = [...urls, ...getHistory()].slice(0, 20);
  localStorage.setItem(LS, JSON.stringify(h));
  renderHistory();
}
function renderHistory() {
  const h = getHistory();
  $('historyList').innerHTML = h.length
    ? h.map(u => `<div class="biz-row" style="justify-content:space-between;padding:6px 0;border-top:0.5px solid var(--color-border)"><span style="font-size:12px;font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80%">${escapeHtml(u)}</span><button class="ts-copy-btn" data-u="${escapeHtml(u)}">Copy</button></div>`).join('')
    : '<p class="biz-muted">No links built yet.</p>';
}

$('modeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-pill-tab'); if (!b) return;
  document.querySelectorAll('#modeTabs .ts-pill-tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const bulk = b.dataset.mode === 'bulk';
  $('singlePane').classList.toggle('ts-hidden', bulk);
  $('bulkPane').classList.toggle('ts-hidden', !bulk);
});

function currentFields() {
  return {
    url: $('baseUrl').value.trim(), source: $('source').value.trim(), medium: $('medium').value.trim(),
    campaign: $('campaign').value.trim(), term: $('term').value.trim(), content: $('content').value.trim(),
  };
}

// Live preview — updates on every keystroke, like Google's Campaign URL Builder.
function updateLivePreview() {
  const f = currentFields();
  const missing = [];
  if (!f.url) missing.push('Base URL');
  if (!f.source) missing.push('Source');
  if (!f.medium) missing.push('Medium');
  if (!f.campaign) missing.push('Campaign');
  if (missing.length) {
    $('livePreview').textContent = 'Fill in the fields above — your tagged URL appears here as you type.';
    $('liveHint').textContent = missing.length < 4 ? `Still needed: ${missing.join(', ')}` : '';
    return;
  }
  const result = buildUTM(f);
  if (!result) {
    $('livePreview').textContent = 'That base URL looks invalid.';
    $('liveHint').textContent = '';
    return;
  }
  $('livePreview').textContent = result;
  const normalized = [f.source, f.medium, f.campaign, f.term, f.content].some(v => v && slug(v) !== v);
  $('liveHint').textContent = normalized
    ? 'Note: values are lowercased and spaces become underscores — UTM parameters are case-sensitive in analytics reports.'
    : '';
}
['baseUrl', 'source', 'medium', 'campaign', 'term', 'content'].forEach(id =>
  $(id).addEventListener('input', updateLivePreview));

$('buildBtn').addEventListener('click', (e) => {
  const f = currentFields();
  if (!f.url || !f.source || !f.medium || !f.campaign) {
    $('resultOut').textContent = 'Base URL, Source, Medium, and Campaign are required.';
    showOutput('output');
    return;
  }
  const result = buildUTM(f);
  if (!result) { $('resultOut').textContent = 'That base URL looks invalid.'; showOutput('output'); return; }
  $('resultOut').textContent = result;
  showOutput('output');
  copyText(result, e.target);
  saveHistory([result]);
});

$('bulkBuildBtn').addEventListener('click', () => {
  const urls = $('bulkUrls').value.split('\n').map(s => s.trim()).filter(Boolean);
  const fields = { source: $('bSource').value.trim(), medium: $('bMedium').value.trim(), campaign: $('bCampaign').value.trim() };
  if (!urls.length || !fields.source || !fields.medium || !fields.campaign) {
    $('resultOut').textContent = 'Add at least one URL, plus Source, Medium, and Campaign.';
    showOutput('output');
    return;
  }
  const results = urls.map(url => buildUTM({ ...fields, url })).filter(Boolean);
  $('resultOut').textContent = results.join('\n');
  showOutput('output');
  saveHistory(results);
});

$('copyOut').addEventListener('click', (e) => copyText($('resultOut').textContent, e.target));
$('historyList').addEventListener('click', (e) => { const b = e.target.closest('[data-u]'); if (b) copyText(b.dataset.u, b); });
$('clearHistory').addEventListener('click', () => { localStorage.removeItem(LS); renderHistory(); });

renderHistory();
