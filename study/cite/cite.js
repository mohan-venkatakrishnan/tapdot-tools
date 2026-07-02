// CiteMaker — APA / MLA / Chicago / Harvard citation generator

let currentStyle = 'apa';

// ── Style + mode switching ─────────────────────────────────────────────────

document.getElementById('styleSegment').addEventListener('click', (e) => {
  const btn = e.target.closest('.ts-segment-btn');
  if (!btn) return;
  document.querySelectorAll('#styleSegment .ts-segment-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentStyle = btn.dataset.style;
});

document.getElementById('modeSegment').addEventListener('click', (e) => {
  const btn = e.target.closest('.ts-segment-btn');
  if (!btn) return;
  document.querySelectorAll('#modeSegment .ts-segment-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const urlMode = document.getElementById('urlMode');
  if (btn.dataset.mode === 'url') urlMode.classList.remove('ts-hidden');
  else urlMode.classList.add('ts-hidden');
});

// ── URL metadata fetch ──────────────────────────────────────────────────────

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
    document.getElementById('fUrl').value = url;
    return;
  }
  document.getElementById('fTitle').value     = meta.title;
  document.getElementById('fAuthor').value    = meta.author;
  document.getElementById('fPublisher').value = meta.site;
  document.getElementById('fYear').value      = meta.year;
  document.getElementById('fUrl').value       = meta.url;
  status.className = 'cite-status ok';
  status.textContent = 'Fetched. Review the fields below and generate.';
});

// ── Citation formats ────────────────────────────────────────────────────────

function formatAPA({ author, year, title, publisher, url }) {
  const a = author ? `${author}. ` : '';
  const y = year   ? `(${year}). ` : '';
  const t = title  ? `${title}. `  : '';
  const p = publisher ? `${publisher}. ` : '';
  const u = url    ? url            : '';
  return `${a}${y}${t}${p}${u}`.trim();
}

function formatMLA({ author, title, publisher, year, url }) {
  const a = author    ? `${author}. `    : '';
  const t = title     ? `"${title}." `   : '';
  const p = publisher ? `${publisher}, ` : '';
  const y = year      ? `${year}. `      : '';
  const u = url       ? url              : '';
  return `${a}${t}${p}${y}${u}`.trim();
}

function formatChicago({ author, title, publisher, year, url }) {
  const a = author    ? `${author}. `    : '';
  const t = title     ? `"${title}." `   : '';
  const p = publisher ? `${publisher} `  : '';
  const y = year      ? `(${year}). `    : '';
  const u = url       ? url              : '';
  return `${a}${t}${p}${y}${u}`.trim();
}

function formatHarvard({ author, year, title, publisher, url }) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const a = author    ? `${author} `       : '';
  const y = year      ? `(${year}) `       : '';
  const t = title     ? `${title}. `       : '';
  const p = publisher ? `${publisher}. `   : '';
  const u = url       ? `Available at: ${url} (Accessed: ${today}).` : '';
  return `${a}${y}${t}${p}${u}`.trim();
}

const FORMATTERS = {
  apa: formatAPA, mla: formatMLA, chicago: formatChicago, harvard: formatHarvard,
};
const STYLE_LABELS = {
  apa: 'APA', mla: 'MLA', chicago: 'Chicago', harvard: 'Harvard',
};

// ── Generate ────────────────────────────────────────────────────────────────

document.getElementById('generateBtn').addEventListener('click', () => {
  const fields = {
    author:    document.getElementById('fAuthor').value.trim(),
    year:      document.getElementById('fYear').value.trim(),
    title:     document.getElementById('fTitle').value.trim(),
    publisher: document.getElementById('fPublisher').value.trim(),
    url:       document.getElementById('fUrl').value.trim(),
  };

  if (!fields.author && !fields.title && !fields.url) {
    const status = document.getElementById('fetchStatus');
    status.className = 'cite-status error';
    status.textContent = 'Add at least a title, author, or URL.';
    return;
  }

  const citation = FORMATTERS[currentStyle](fields);
  document.getElementById('outLabel').textContent = `${STYLE_LABELS[currentStyle]} citation`;
  document.getElementById('citationOut').textContent = citation;
  showOutput('output');
  document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.getElementById('copyBtn').addEventListener('click', (e) => {
  copyText(document.getElementById('citationOut').textContent, e.target);
});
