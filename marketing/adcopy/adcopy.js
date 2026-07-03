// AdCopyWriter — platform-aware ad copy via on-device AI

const LIMITS = {
  google:   { headline: 30, description: 90 },
  meta:     { primary: 125, headline: 40, cta: 20 },
  linkedin: { intro: 150, headline: 70 },
};
const FIELD_LABELS = {
  headline: 'Headline', description: 'Description', primary: 'Primary text', cta: 'Call to action', intro: 'Intro text',
};

const $ = (id) => document.getElementById(id);
let platform = 'google';

document.getElementById('platformTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-pill-tab'); if (!b) return;
  document.querySelectorAll('#platformTabs .ts-pill-tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  platform = b.dataset.platform;
});

function promptFor(platform, brief) {
  const fields = Object.keys(LIMITS[platform]);
  const limitDesc = fields.map(f => `${f} (max ${LIMITS[platform][f]} characters)`).join(', ');
  return `You write ${platform} ad copy. Product: "${brief.product}". Target audience: "${brief.audience}".
Unique selling point: "${brief.usp}". Tone: ${brief.tone}.
Generate exactly 3 ad variants. Each variant is a JSON object with these fields: ${limitDesc}.
Respond with ONLY a JSON array of 3 objects, no markdown, no explanation. Example shape: [{"${fields[0]}":"..."}]`;
}

function extractJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// Render the variant as it would actually appear on the platform.
function adMockup(v) {
  if (platform === 'google') {
    return `<div class="ad-preview-google">
      <div class="ad-url"><span class="ad-badge">Ad</span>www.example.com</div>
      <div class="ad-headline">${escapeHtml(v.headline || '')}</div>
      <div class="ad-desc">${escapeHtml(v.description || '')}</div>
    </div>`;
  }
  if (platform === 'meta') {
    return `<div class="ad-preview-meta">
      <div class="ad-head"><span class="ad-avatar"></span><div><div class="ad-page">Your Brand</div><div class="ad-sponsored">Sponsored</div></div></div>
      <div class="ad-primary">${escapeHtml(v.primary || '')}</div>
      <div class="ad-media"></div>
      <div class="ad-foot"><span class="ad-foot-headline">${escapeHtml(v.headline || '')}</span><span class="ad-cta-btn">${escapeHtml(v.cta || 'Learn more')}</span></div>
    </div>`;
  }
  return `<div class="ad-preview-meta">
    <div class="ad-head"><span class="ad-avatar"></span><div><div class="ad-page">Your Brand</div><div class="ad-sponsored">Promoted</div></div></div>
    <div class="ad-primary">${escapeHtml(v.intro || '')}</div>
    <div class="ad-media"></div>
    <div class="ad-foot"><span class="ad-foot-headline">${escapeHtml(v.headline || '')}</span></div>
  </div>`;
}

function renderVariants(variants) {
  const fields = Object.keys(LIMITS[platform]);
  $('variants').innerHTML = variants.map((v, i) => {
    const rows = fields.map(f => {
      const val = v[f] || '';
      const limit = LIMITS[platform][f];
      const over = val.length > limit;
      return `<div class="ts-mt-sm">
        <div class="biz-row" style="justify-content:space-between">
          <span class="biz-muted">${FIELD_LABELS[f]}</span>
          <span class="ts-badge ${over ? 'over' : 'ok'}">${val.length}/${limit}</span>
        </div>
        <div class="biz-row" style="justify-content:space-between">
          <span>${escapeHtml(val)}</span>
          <button class="ts-copy-btn" data-v="${escapeHtml(val)}">Copy</button>
        </div>
      </div>`;
    }).join('');
    return `<div class="ts-card"><p class="ts-card-label">Variant ${i + 1}</p>${adMockup(v)}${rows}</div>`;
  }).join('');
  showOutput('output');
}

// Rule-based fallback: formulaic but usable variants, trimmed to platform limits.
function trimTo(text, limit) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}
function templateVariants(brief) {
  const L = LIMITS[platform];
  const cta = 'Get started today';
  const combos = [
    { h: `${brief.product} — built for ${brief.audience}`, d: `${brief.usp}. Made for ${brief.audience}. ${cta}.` },
    { h: `${brief.usp}`, d: `${brief.product} gives ${brief.audience} ${brief.usp.toLowerCase()}. ${cta}.` },
    { h: `Meet ${brief.product}`, d: `The way ${brief.audience} get ${brief.usp.toLowerCase()}. Try ${brief.product} now.` },
  ];
  return combos.map(c => {
    const v = {};
    if ('headline' in L) v.headline = trimTo(c.h, L.headline);
    if ('description' in L) v.description = trimTo(c.d, L.description);
    if ('primary' in L) v.primary = trimTo(c.d, L.primary);
    if ('cta' in L) v.cta = trimTo(cta, L.cta);
    if ('intro' in L) v.intro = trimTo(c.d, L.intro);
    return v;
  });
}

async function generate() {
  const brief = {
    product: $('product').value.trim() || 'this product',
    audience: $('audience').value.trim() || 'general audience',
    usp: $('usp').value.trim() || 'a great experience',
    tone: $('tone').value,
  };
  const status = $('aiStatus');
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    renderVariants(templateVariants(brief));
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — these are formula-based starting points. Enable Chrome\'s built-in AI for tone-aware copy written from your brief.';
    return;
  }
  $('genBtn').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Generating…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(promptFor(platform, brief));
    if (session.destroy) session.destroy();
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed) || !parsed.length) throw new Error('unparseable');
    renderVariants(parsed.slice(0, 3));
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI. Character limits are checked automatically.';
  } catch (e) {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'Could not generate copy — try rephrasing the brief, or try again.';
  } finally {
    $('genBtn').disabled = false;
  }
}
$('genBtn').addEventListener('click', generate);
document.getElementById('variants').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) copyText(b.dataset.v, b); });
