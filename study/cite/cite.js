// CiteMaker — 7 styles (APA, MLA, Chicago, Harvard, IEEE, Vancouver, ASA)
// x 5 source types (Website, Book, Journal, Video, News)

let currentStyle = 'apa';
let currentType = 'website';
let fieldsState = {}; // persists values across type switches

// ── Field catalogue ──────────────────────────────────────────────────────

const FIELD_META = {
  author:         { label: 'Author', placeholder: 'Last, First' },
  title:          { label: 'Title', placeholder: 'Title of the work' },
  containerTitle: { label: 'Journal / Publication', placeholder: 'e.g. Nature, The New York Times' },
  publisher:      { label: 'Publisher / Site', placeholder: 'Publisher or website name' },
  city:           { label: 'City', placeholder: 'Publisher city' },
  edition:        { label: 'Edition', placeholder: 'e.g. 2nd (optional)' },
  volume:         { label: 'Volume', placeholder: 'e.g. 12' },
  issue:          { label: 'Issue', placeholder: 'e.g. 3' },
  pages:          { label: 'Pages', placeholder: 'e.g. 45-60' },
  doi:            { label: 'DOI', placeholder: '10.xxxx/xxxx (optional)' },
  platform:       { label: 'Platform', placeholder: 'e.g. YouTube' },
  year:           { label: 'Year', placeholder: '2026' },
  month:          { label: 'Month', placeholder: 'e.g. July (optional)' },
  day:            { label: 'Day', placeholder: 'e.g. 4 (optional)' },
  url:            { label: 'URL', placeholder: 'https://…' },
};

const TYPE_FIELDS = {
  website: ['author', 'title', 'publisher', 'year', 'month', 'day', 'url'],
  book:    ['author', 'title', 'year', 'publisher', 'city', 'edition'],
  journal: ['author', 'title', 'containerTitle', 'year', 'volume', 'issue', 'pages', 'doi', 'url'],
  video:   ['author', 'title', 'platform', 'year', 'month', 'day', 'url'],
  news:    ['author', 'title', 'containerTitle', 'year', 'month', 'day', 'pages', 'url'],
};

function renderFields() {
  const wrap = document.getElementById('manualFields');
  const ids = TYPE_FIELDS[currentType];
  wrap.innerHTML = ids.map((id) => {
    const meta = FIELD_META[id];
    const full = id === 'title' || id === 'containerTitle';
    return `<div${full ? ' class="cite-field-full"' : ''}>
      <label class="ts-label" for="f_${id}">${meta.label}</label>
      <input class="ts-input" id="f_${id}" placeholder="${meta.placeholder}" value="${escapeHtml(fieldsState[id] || '')}" />
    </div>`;
  }).join('');
  wrap.querySelectorAll('input').forEach((inp) => {
    inp.addEventListener('input', () => { fieldsState[inp.id.slice(2)] = inp.value; });
  });
}

function currentFields() {
  const f = {};
  TYPE_FIELDS[currentType].forEach((id) => { f[id] = (fieldsState[id] || '').trim(); });
  return f;
}

// ── Style + type + mode switching ────────────────────────────────────────

document.getElementById('styleSegment').addEventListener('click', (e) => {
  const btn = e.target.closest('.ts-segment-btn'); if (!btn) return;
  document.querySelectorAll('#styleSegment .ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentStyle = btn.dataset.style;
});

document.getElementById('typeSegment').addEventListener('click', (e) => {
  const btn = e.target.closest('.ts-segment-btn'); if (!btn) return;
  document.querySelectorAll('#typeSegment .ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentType = btn.dataset.type;
  renderFields();
});

document.getElementById('modeSegment').addEventListener('click', (e) => {
  const btn = e.target.closest('.ts-segment-btn'); if (!btn) return;
  document.querySelectorAll('#modeSegment .ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const urlMode = document.getElementById('urlMode');
  if (btn.dataset.mode === 'url') urlMode.classList.remove('ts-hidden');
  else urlMode.classList.add('ts-hidden');
});

// ── URL metadata fetch (website sources) ─────────────────────────────────

async function fetchUrlMetadata(url) {
  try {
    const proxy  = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const resp   = await fetch(proxy);
    const data   = await resp.json();
    const parser = new DOMParser();
    const doc    = parser.parseFromString(data.contents, 'text/html');
    const getMeta = (name) =>
      doc.querySelector(`meta[property="${name}"]`)?.content
      ?? doc.querySelector(`meta[name="${name}"]`)?.content ?? '';
    return {
      title:  getMeta('og:title') || doc.title || '',
      author: getMeta('article:author') || getMeta('author') || '',
      site:   getMeta('og:site_name') || new URL(url).hostname,
      year:   new Date().getFullYear().toString(),
      url,
    };
  } catch { return null; }
}

document.getElementById('fetchBtn').addEventListener('click', async () => {
  const url = document.getElementById('urlInput').value.trim();
  const status = document.getElementById('fetchStatus');
  if (!url) { status.className = 'cite-status error'; status.textContent = 'Enter a URL first.'; return; }

  status.className = 'cite-status';
  status.textContent = 'Fetching…';
  const meta = await fetchUrlMetadata(url);
  if (!meta) {
    status.className = 'cite-status error';
    status.textContent = 'Could not fetch that page. Fill the fields manually below.';
    fieldsState.url = url;
    renderFields();
    return;
  }
  // A URL fetch only makes sense for a website source — switch to it.
  currentType = 'website';
  document.querySelectorAll('#typeSegment .ts-segment-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'website'));
  fieldsState = { ...fieldsState, title: meta.title, author: meta.author, publisher: meta.site, year: meta.year, url: meta.url };
  renderFields();
  status.className = 'cite-status ok';
  status.textContent = 'Fetched. Review the fields below and generate.';
});

// ── Citation formatting ──────────────────────────────────────────────────

function today() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function j(...parts) { return parts.filter(Boolean).join(' '); }
function monthDay(f) { return j(f.month, f.day ? f.day + ',' : ''); }

const FORMATTERS = {
  apa(type, f) {
    const date = f.year ? `(${j(f.year, monthDay(f))}). ` : '';
    switch (type) {
      case 'website': return j(f.author && f.author + '.', date, f.title && f.title + '.', f.publisher && f.publisher + '.', f.url);
      case 'book':    return j(f.author && f.author + '.', f.year && `(${f.year}). `, f.title && f.title + (f.edition ? ` (${f.edition} ed.).` : '.'), f.publisher && f.publisher + '.');
      case 'journal': return j(f.author && f.author + '.', f.year && `(${f.year}). `, f.title && f.title + '.', f.containerTitle && `${f.containerTitle},`, f.volume && `${f.volume}${f.issue ? `(${f.issue})` : ''},`, f.pages && `${f.pages}.`, f.doi ? `https://doi.org/${f.doi}` : f.url);
      case 'video':   return j(f.author && f.author + '.', date, f.title && `${f.title} [Video].`, f.platform && f.platform + '.', f.url);
      case 'news':    return j(f.author && f.author + '.', date, f.title && f.title + '.', f.containerTitle && f.containerTitle + '.', f.url);
    }
  },
  mla(type, f) {
    switch (type) {
      case 'website': return j(f.author && f.author + '.', f.title && `"${f.title}."`, f.publisher && `${f.publisher},`, monthDay(f) && `${monthDay(f)} ${f.year},`, !monthDay(f) && f.year && `${f.year},`, f.url + (f.url ? '.' : ''));
      case 'book':    return j(f.author && f.author + '.', f.title && `${f.title}.`, f.publisher && `${f.publisher},`, f.year && `${f.year}.`);
      case 'journal': return j(f.author && f.author + '.', f.title && `"${f.title}."`, f.containerTitle && `${f.containerTitle},`, f.volume && `vol. ${f.volume},`, f.issue && `no. ${f.issue},`, f.year && `${f.year},`, f.pages && `pp. ${f.pages}.`);
      case 'video':   return j(f.author && f.author + '.', f.title && `"${f.title}."`, f.platform && `${f.platform},`, monthDay(f) && `${monthDay(f)} ${f.year},`, !monthDay(f) && f.year && `${f.year},`, f.url + (f.url ? '.' : ''));
      case 'news':    return j(f.author && f.author + '.', f.title && `"${f.title}."`, f.containerTitle && `${f.containerTitle},`, monthDay(f) && `${monthDay(f)} ${f.year},`, !monthDay(f) && f.year && `${f.year},`, f.url + (f.url ? '.' : ''));
    }
  },
  chicago(type, f) {
    const yr = f.year ? `${f.year}. ` : '';
    switch (type) {
      case 'website': return j(f.author && f.author + '.', yr, f.title && `"${f.title}."`, f.publisher && f.publisher + '.', f.url + (f.url ? '.' : ''));
      case 'book':    return j(f.author && f.author + '.', yr, f.title && `${f.title}.`, f.city && `${f.city}:`, f.publisher && f.publisher + '.');
      case 'journal': return j(f.author && f.author + '.', yr, f.title && `"${f.title}."`, f.containerTitle && `${f.containerTitle}`, f.volume && `${f.volume}`, f.issue && `(${f.issue}):`, f.pages && `${f.pages}.`);
      case 'video':   return j(f.author && f.author + '.', yr, f.title && `"${f.title}."`, f.platform && `${f.platform} video.`, f.url + (f.url ? '.' : ''));
      case 'news':    return j(f.author && f.author + '.', yr, f.title && `"${f.title}."`, f.containerTitle && `${f.containerTitle},`, monthDay(f) + (monthDay(f) ? '.' : ''));
    }
  },
  harvard(type, f) {
    const avail = f.url ? `Available at: ${f.url} (Accessed: ${today()}).` : '';
    switch (type) {
      case 'website': return j(f.author, f.year && `(${f.year})`, f.title && `${f.title}.`, f.publisher && `${f.publisher}.`, avail);
      case 'book':    return j(f.author, f.year && `(${f.year})`, f.title && `${f.title}.`, f.edition && `${f.edition}.`, f.city && `${f.city}:`, f.publisher && `${f.publisher}.`);
      case 'journal': return j(f.author, f.year && `(${f.year})`, f.title && `'${f.title}',`, f.containerTitle && `${f.containerTitle},`, f.volume && `${f.volume}${f.issue ? `(${f.issue})` : ''},`, f.pages && `pp. ${f.pages}.`);
      case 'video':   return j(f.author, f.year && `(${f.year})`, f.title && `${f.title}.`, avail);
      case 'news':    return j(f.author, f.year && `(${f.year})`, f.title && `'${f.title}',`, f.containerTitle && `${f.containerTitle},`, monthDay(f) + (monthDay(f) ? '.' : ''));
    }
  },
  ieee(type, f) {
    switch (type) {
      case 'website': return j(f.author && `${f.author},`, f.title && `"${f.title},"`, f.publisher && `${f.publisher},`, f.year && `${f.year}.`, f.url && `[Online]. Available: ${f.url}`);
      case 'book':    return j(f.author && `${f.author},`, f.title && `${f.title},`, f.edition && `${f.edition} ed.`, f.city && `${f.city}:`, f.publisher && `${f.publisher},`, f.year && `${f.year}.`);
      case 'journal': return j(f.author && `${f.author},`, f.title && `"${f.title},"`, f.containerTitle && `${f.containerTitle},`, f.volume && `vol. ${f.volume},`, f.issue && `no. ${f.issue},`, f.pages && `pp. ${f.pages},`, f.year && `${f.year}.`);
      case 'video':   return j(f.author && `${f.author},`, f.title && `"${f.title},"`, f.platform && `${f.platform},`, f.year && `${f.year}.`, f.url && `[Online Video]. Available: ${f.url}`);
      case 'news':    return j(f.author && `${f.author},`, f.title && `"${f.title},"`, f.containerTitle && `${f.containerTitle},`, monthDay(f), f.year && `${f.year}.`);
    }
  },
  vancouver(type, f) {
    switch (type) {
      case 'website': return j(f.author && `${f.author}.`, f.title && `${f.title}`, '[Internet].', f.publisher && `${f.publisher};`, f.year && `${f.year}.`, f.url && `Available from: ${f.url}`);
      case 'book':    return j(f.author && `${f.author}.`, f.title && `${f.title}.`, f.edition && `${f.edition}.`, f.city && `${f.city}:`, f.publisher && `${f.publisher};`, f.year && `${f.year}.`);
      case 'journal': return j(f.author && `${f.author}.`, f.title && `${f.title}.`, f.containerTitle && `${f.containerTitle}.`, f.year && `${f.year};`, f.volume && `${f.volume}${f.issue ? `(${f.issue})` : ''}:`, f.pages && `${f.pages}.`);
      case 'video':   return j(f.author && `${f.author}.`, f.title && `${f.title}`, '[Video].', f.platform && `${f.platform};`, f.year && `${f.year}.`, f.url && `Available from: ${f.url}`);
      case 'news':    return j(f.author && `${f.author}.`, f.title && `${f.title}.`, f.containerTitle && `${f.containerTitle}.`, f.year, monthDay(f) + '.');
    }
  },
  asa(type, f) {
    const yr = f.year ? `${f.year}. ` : '';
    const retrieved = f.url ? `Retrieved ${today()} (${f.url}).` : '';
    switch (type) {
      case 'website': return j(f.author && f.author + '.', yr, f.title && `"${f.title}."`, f.publisher && `${f.publisher}.`, retrieved);
      case 'book':    return j(f.author && f.author + '.', yr, f.title && `${f.title}.`, f.city && `${f.city}:`, f.publisher && `${f.publisher}.`);
      case 'journal': return j(f.author && f.author + '.', yr, f.title && `"${f.title}."`, f.containerTitle && `${f.containerTitle}`, f.volume && `${f.volume}${f.issue ? `(${f.issue})` : ''}:`, f.pages && `${f.pages}.`);
      case 'video':   return j(f.author && f.author + '.', yr, f.title && `"${f.title}."`, f.platform && `${f.platform} video.`, retrieved);
      case 'news':    return j(f.author && f.author + '.', yr, f.title && `"${f.title}."`, f.containerTitle && `${f.containerTitle},`, monthDay(f) + '.');
    }
  },
};

const STYLE_LABELS = { apa: 'APA', mla: 'MLA', chicago: 'Chicago', harvard: 'Harvard', ieee: 'IEEE', vancouver: 'Vancouver', asa: 'ASA' };

// ── Generate ──────────────────────────────────────────────────────────────

document.getElementById('generateBtn').addEventListener('click', () => {
  const fields = currentFields();
  const status = document.getElementById('fetchStatus');
  if (!fields.author && !fields.title && !fields.url) {
    status.className = 'cite-status error';
    status.textContent = 'Add at least a title, author, or URL.';
    return;
  }
  status.textContent = '';

  const citation = (FORMATTERS[currentStyle](currentType, fields) || '').trim();
  document.getElementById('outLabel').textContent = `${STYLE_LABELS[currentStyle]} citation`;
  document.getElementById('citationOut').textContent = citation;
  showOutput('output');
  document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.getElementById('copyBtn').addEventListener('click', (e) => {
  copyText(document.getElementById('citationOut').textContent, e.target);
});

renderFields();
