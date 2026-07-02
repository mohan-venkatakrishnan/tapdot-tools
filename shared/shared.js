// tapdot tools — shared utilities + shell (v4)

// ── Dark mode (runs immediately to avoid flash) ────────────────────────────

(function () {
  const stored = localStorage.getItem('tapdot-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function initDarkToggle() {
  const btn = document.getElementById('darkToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tapdot-theme', next);
  });
}

// ── Copy to clipboard ──────────────────────────────────────────────────────

function copyText(text, btn) {
  const done = () => {
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  if (done) done();
}

// ── Output show / hide ──────────────────────────────────────────────────────

function showOutput(id) { const el = document.getElementById(id); if (el) el.classList.add('visible'); }
function hideOutput(id) { const el = document.getElementById(id); if (el) el.classList.remove('visible'); }

// ── Escape HTML ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── On-device AI (Gemini Nano) — shared by BiasCheck, FlashForge, … ─────────
// Returns 'available' | 'downloadable' | 'downloading' | 'unavailable'.
const tapdotAI = {
  async availability() {
    try {
      if (typeof self !== 'undefined' && self.LanguageModel && self.LanguageModel.availability) {
        const a = await self.LanguageModel.availability();
        if (a === 'available' || a === 'readily') return 'available';
        if (a === 'downloadable' || a === 'after-download') return 'downloadable';
        if (a === 'downloading') return 'downloading';
        return 'unavailable';
      }
      const ai = (typeof window !== 'undefined') ? window.ai : null;
      const ns = ai && (ai.languageModel || ai.assistant);
      if (ns && ns.capabilities) {
        const c = await ns.capabilities();
        const v = c && c.available;
        if (v === 'readily') return 'available';
        if (v === 'after-download') return 'downloadable';
        if (v && v !== 'no') return 'downloading';
      }
    } catch (e) { /* fall through */ }
    return 'unavailable';
  },
  async createSession(onProgress) {
    const monitor = (m) => {
      if (m && m.addEventListener) {
        m.addEventListener('downloadprogress', (e) => {
          const pct = e.total ? e.loaded / e.total : e.loaded;
          if (onProgress) onProgress(Math.round(Math.min(1, pct || 0) * 100));
        });
      }
    };
    if (typeof self !== 'undefined' && self.LanguageModel && self.LanguageModel.create) {
      return await self.LanguageModel.create({ monitor });
    }
    const ai = (typeof window !== 'undefined') ? window.ai : null;
    const ns = ai && (ai.languageModel || ai.assistant);
    if (ns && ns.create) return await ns.create({ monitor });
    throw new Error('No on-device AI API');
  },
};

// ── Icon set (categories + tools) ───────────────────────────────────────────

const ICON_PATHS = {
  tools: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  study: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
  write: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  'CiteMaker': '<path d="M6 17h3l2-4V7H5v6h3z"/><path d="M16 17h3l2-4V7h-6v6h3z"/>',
  'FlashForge': '<rect x="3" y="8" width="13" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>',
  'GradeCalc': '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01"/>',
  'BiasCheck': '<path d="M12 3v18M6 21h12M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
  'ReadScore': '<path d="M4 20a8 8 0 0 1 16 0"/><path d="M12 20l4-6"/>',
  'WordCount Pro': '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  'LoremCraft': '<path d="M4 6h16M4 12h16M4 18h10"/>',
  'ThreadCraft': '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.5 8.5 0 1 1 21 11.5z"/>',
  dev: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  'JSONLab': '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/>',
  'JSONConvert': '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  'JWTRead': '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3M17 6l2 2M14 9l2 2"/>',
  'YAMLCheck': '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  'CSVExplore': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  'MarkdownLive': '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15V9l3 3 3-3v6M17 9v5M14.6 12.4L17 15l2.4-2.6"/>',
  'HTMLPreview': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 6.5h.01M9 6.5h.01"/>',
  'SQLFormat': '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  'ColourContrast': '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  'UUIDGen': '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/>',
  'TimezoneNow': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'RegexLab': '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  'CronLab': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M12 13v3l2 1"/>',
};
function svgIcon(paths) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
}
const ICONS = Object.fromEntries(Object.entries(ICON_PATHS).map(([k, v]) => [k, svgIcon(v)]));

// Per-page favicon "tile" reflecting the collection / tool.
function initFavicon() {
  const col = document.documentElement.dataset.collection || 'tools';
  const tool = document.documentElement.dataset.tool || '';
  const color = { tools: '#5B6CF0', study: '#12A594', write: '#D97757', dev: '#5B6CF0' }[col] || '#5B6CF0';
  const paths = ICON_PATHS[tool] || ICON_PATHS[col] || ICON_PATHS.tools;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<rect width="24" height="24" rx="6" fill="' + color + '"/>' +
    '<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</g></svg>';
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.type = 'image/svg+xml';
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ── Futuristic background ────────────────────────────────────────────────────

function initBackground() {
  if (document.querySelector('.ts-bg')) return;
  const bg = document.createElement('div');
  bg.className = 'ts-bg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML =
    '<div class="ts-bg-grid"></div>' +
    '<div class="ts-bg-orb o1"></div>' +
    '<div class="ts-bg-orb o2"></div>' +
    '<div class="ts-bg-orb o3"></div>';
  document.body.appendChild(bg);
  initParallax(bg);
}

function initParallax(bg) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const orbs = [...bg.querySelectorAll('.ts-bg-orb')];
  const depths = [0.020, -0.028, 0.016];
  const scrollDepths = [0.06, -0.04, 0.08];
  const drift = [
    { x: 26, y: 20, s: 0.00021 },
    { x: -30, y: 24, s: 0.00017 },
    { x: 22, y: -26, s: 0.00025 },
  ];
  let tx = 0, ty = 0, mx = 0, my = 0;
  const cx = () => window.innerWidth / 2, cy = () => window.innerHeight / 2;
  window.addEventListener('mousemove', (e) => { tx = e.clientX - cx(); ty = e.clientY - cy(); }, { passive: true });
  function frame(t) {
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    const sy = window.scrollY || 0;
    orbs.forEach((orb, i) => {
      const dr = drift[i];
      const dx = Math.sin(t * dr.s) * dr.x + mx * depths[i];
      const dy = Math.cos(t * dr.s * 1.1) * dr.y + my * depths[i] + sy * scrollDepths[i];
      orb.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── Breadcrumb nav (tapdot / Tools / <Category> / <Tool>) ───────────────────

function initBreadcrumb() {
  const nav = document.querySelector('.ts-nav');
  if (!nav) return;
  const logo = nav.querySelector('.ts-nav-logo');
  const toggle = document.getElementById('darkToggle');
  if (!logo) return;

  let node = logo.nextSibling;
  while (node && node !== toggle) {
    const next = node.nextSibling;
    if (node.nodeType === 1 &&
        (node.classList.contains('ts-nav-divider') ||
         node.classList.contains('ts-nav-tool') ||
         node.classList.contains('ts-nav-crumb'))) {
      node.remove();
    }
    node = next;
  }

  const col = document.documentElement.dataset.collection || 'tools';
  const tool = document.documentElement.dataset.tool || '';
  const crumbs = [{ label: 'Tools', href: '/' }];
  if (col === 'study') crumbs.push({ label: 'Study', href: '/study/' });
  if (col === 'write') crumbs.push({ label: 'Write', href: '/write/' });
  if (col === 'dev') crumbs.push({ label: 'Dev', href: '/dev/' });
  if (tool) crumbs.push({ label: tool, href: null });

  const frag = document.createDocumentFragment();
  crumbs.forEach((c, i) => {
    const div = document.createElement('span');
    div.className = 'ts-nav-divider'; div.textContent = '/';
    frag.appendChild(div);
    const last = i === crumbs.length - 1;
    if (c.href && !last) {
      const a = document.createElement('a');
      a.className = 'ts-nav-crumb'; a.href = c.href; a.textContent = c.label;
      frag.appendChild(a);
    } else {
      const s = document.createElement('span');
      s.className = 'ts-nav-tool'; s.textContent = c.label;
      frag.appendChild(s);
    }
  });
  logo.after(frag);
}

// ── Tool icon beside the page title ─────────────────────────────────────────

function initToolIcon() {
  const tool = document.documentElement.dataset.tool || '';
  const icon = ICONS[tool];
  const h1 = document.querySelector('.ts-tool-header .ts-tool-name');
  if (!icon || !h1 || h1.parentElement.classList.contains('ts-tool-head-row')) return;
  const row = document.createElement('div');
  row.className = 'ts-tool-head-row';
  const span = document.createElement('span');
  span.className = 'ts-tool-icon'; span.setAttribute('aria-hidden', 'true');
  span.innerHTML = icon;
  h1.replaceWith(row);
  row.appendChild(span);
  row.appendChild(h1);
}

// ── How it works — bottom walkthrough (unique demos, played step by step) ────
// To add a tool: add STEPS['ToolName'] = [ {t, d:{k, ...}}, ...3 ]. See CLAUDE.md.

const STEPS = {
  'CiteMaker': [
    { t: 'Pick a style', d: { k: 'chips', items: ['APA', 'MLA', 'Chicago', 'Harvard'], on: 0 } },
    { t: 'Add the source', d: { k: 'fields', rows: [['Author', 'Smith, J.'], ['Title', 'Deep Work'], ['Year', '2026']] } },
    { t: 'Copy the citation', d: { k: 'result', text: 'Smith, J. (2026). Deep Work.' } },
  ],
  'FlashForge': [
    { t: 'Paste or import notes', d: { k: 'text', text: 'Mitochondria - the powerhouse' } },
    { t: 'Cards generate', d: { k: 'flip', front: 'What is the mitochondria?', back: 'The powerhouse of the cell' } },
    { t: 'Study & rate', d: { k: 'rate' } },
  ],
  'GradeCalc': [
    { t: 'Enter courses', d: { k: 'rows', rows: [['Biology', 'A', '3 cr']] } },
    { t: 'Add more grades', d: { k: 'rows', rows: [['Biology', 'A', '3 cr'], ['Math', 'B+', '4 cr']] } },
    { t: 'See your GPA', d: { k: 'count', to: 3.85, label: 'GPA' } },
  ],
  'BiasCheck': [
    { t: 'Paste an excerpt', d: { k: 'text', text: 'The alarming crisis shocked many.' } },
    { t: 'AI reads patterns', d: { k: 'hl', text: 'The alarming crisis shocked many.', marks: ['alarming', 'crisis', 'shocked'] } },
    { t: 'See the analysis', d: { k: 'chips', items: ['alarming', 'crisis', 'shocked'] } },
  ],
  'ReadScore': [
    { t: 'Paste your writing', d: { k: 'text', text: 'It was a bright cold day in April.' } },
    { t: 'Press Analyse', d: { k: 'scan', text: 'It was a bright cold day in April.' } },
    { t: 'Read your score', d: { k: 'count', to: 8.2, label: 'Grade level' } },
  ],
  'WordCount Pro': [
    { t: 'Type or paste', d: { k: 'text', text: 'The quick brown fox jumps.' } },
    { t: 'Counts update live', d: { k: 'stats', items: [['128', 'words'], ['642', 'chars']] } },
    { t: 'Keyword density', d: { k: 'table', rows: [['fox', '3.1%'], ['quick', '2.4%']] } },
  ],
  'LoremCraft': [
    { t: 'Pick style & amount', d: { k: 'chips', items: ['Startup', '3 paragraphs'], on: 0 } },
    { t: 'Choose a format', d: { k: 'chips', items: ['Plain', 'HTML', 'Markdown'], on: 1 } },
    { t: 'Generate & copy', d: { k: 'text', text: 'Lorem ipsum dolor sit amet.' } },
  ],
  'ThreadCraft': [
    { t: 'Paste long text', d: { k: 'text', text: 'A long post worth splitting.' } },
    { t: 'Set limit & numbers', d: { k: 'chips', items: ['280 chars', '1/n'], on: 0 } },
    { t: 'Copy your thread', d: { k: 'tweets', items: ['1/3  Intro to...', '2/3  The key...', '3/3  In short...'] } },
  ],
  'JSONLab': [
    { t: 'Paste JSON', d: { k: 'text', text: '{"user":"jo","ok":true}' } },
    { t: 'Format & validate', d: { k: 'result', text: '{ "user": "jo" }' } },
    { t: 'Copy, minify or diff', d: { k: 'chips', items: ['Format', 'Minify', 'Diff'], on: 0 } },
  ],
  'JSONConvert': [
    { t: 'Paste JSON', d: { k: 'text', text: '{"port":8080}' } },
    { t: 'Choose a target', d: { k: 'chips', items: ['YAML', 'CSV', 'XML'], on: 0 } },
    { t: 'Get the result', d: { k: 'result', text: 'port: 8080' } },
  ],
  'JWTRead': [
    { t: 'Paste your token', d: { k: 'text', text: 'eyJhbGciOiJIUzI1Ni...' } },
    { t: 'Decoded locally', d: { k: 'rows', rows: [['alg', 'HS256'], ['sub', '1234']] } },
    { t: 'Check expiry', d: { k: 'chips', items: ['Valid'], on: 0 } },
  ],
  'YAMLCheck': [
    { t: 'Paste YAML', d: { k: 'text', text: 'name: build' } },
    { t: 'Validate', d: { k: 'chips', items: ['Valid ✓'], on: 0 } },
    { t: 'Format & copy', d: { k: 'result', text: 'name: build' } },
  ],
  'CSVExplore': [
    { t: 'Paste CSV', d: { k: 'text', text: 'name,age,city' } },
    { t: 'Instant table', d: { k: 'table', rows: [['name', 'age'], ['Jo', '29']] } },
    { t: 'Sort & filter', d: { k: 'chips', items: ['Sort', 'Filter'], on: 0 } },
  ],
  'MarkdownLive': [
    { t: 'Type Markdown', d: { k: 'text', text: '# Hello **world**' } },
    { t: 'Live preview', d: { k: 'result', text: 'Hello world' } },
    { t: 'Autosaves locally', d: { k: 'chips', items: ['.md', 'HTML'], on: 0 } },
  ],
  'HTMLPreview': [
    { t: 'Paste HTML', d: { k: 'text', text: '<h1>Hi</h1>' } },
    { t: 'Sandboxed render', d: { k: 'result', text: 'Hi' } },
    { t: 'Desktop / mobile', d: { k: 'chips', items: ['Desktop', 'Tablet', 'Mobile'], on: 0 } },
  ],
  'SQLFormat': [
    { t: 'Paste a query', d: { k: 'text', text: 'select * from users' } },
    { t: 'Format it', d: { k: 'result', text: 'SELECT * FROM users' } },
    { t: 'Copy clean SQL', d: { k: 'chips', items: ['UPPER', 'lower'], on: 0 } },
  ],
  'ColourContrast': [
    { t: 'Pick two colours', d: { k: 'chips', items: ['#0F0F1A', '#FFFFFF'], on: 0 } },
    { t: 'See the ratio', d: { k: 'count', to: 16.1, label: 'contrast' } },
    { t: 'AA / AAA check', d: { k: 'chips', items: ['AA ✓', 'AAA ✓'], on: 0 } },
  ],
  'UUIDGen': [
    { t: 'Pick a format', d: { k: 'chips', items: ['v4', 'v7', 'ULID', 'nanoid'], on: 0 } },
    { t: 'Generate locally', d: { k: 'text', text: '9f1c2a7e-4b3d-...' } },
    { t: 'Copy or download', d: { k: 'count', to: 100, label: 'at once' } },
  ],
  'TimezoneNow': [
    { t: 'Add cities', d: { k: 'chips', items: ['NYC', 'London', 'Tokyo'], on: 0 } },
    { t: 'Live clocks', d: { k: 'rows', rows: [['London', '14:30'], ['Tokyo', '22:30']] } },
    { t: 'Find overlap', d: { k: 'chips', items: ['9-6 overlap'], on: 0 } },
  ],
  'RegexLab': [
    { t: 'Write a pattern', d: { k: 'text', text: '[a-z]+\\d+' } },
    { t: 'Live matches', d: { k: 'hl', text: 'abc12 xy99 zz', marks: ['abc12', 'xy99'] } },
    { t: 'Groups & replace', d: { k: 'chips', items: ['2 matches'], on: 0 } },
  ],
  'CronLab': [
    { t: 'Enter an expression', d: { k: 'text', text: '0 9 * * 1-5' } },
    { t: 'Plain English', d: { k: 'result', text: 'Weekdays at 09:00' } },
    { t: 'Next 20 runs', d: { k: 'rows', rows: [['Mon', '09:00'], ['Tue', '09:00']] } },
  ],
};

function dType(text, delay) {
  const len = [...String(text)].length;
  const ds = delay ? (';animation-delay:' + delay) : '';
  return '<span class="d-type" style="--len:' + len + ds + '">' + escapeHtml(text) + '</span>';
}

function demoMarkup(d) {
  switch (d.k) {
    case 'text':
      return '<div class="d-scr">' + dType(d.text) + '</div>';
    case 'result':
      return '<div class="d-scr d-result">' + dType(d.text) + '<span class="d-check">✓</span></div>';
    case 'fields':
      return '<div class="d-scr d-fields">' + d.rows.map(([k, v], i) =>
        '<div class="d-field"><span class="d-k">' + escapeHtml(k) + '</span>' +
        dType(v, (i * 0.55) + 's') + '</div>').join('') + '</div>';
    case 'flip':
      return '<div class="d-scr"><div class="d-flip"><div class="d-flip-i">' +
        '<div class="d-face d-front">' + escapeHtml(d.front) + '</div>' +
        '<div class="d-face d-back">' + escapeHtml(d.back) + '</div></div></div></div>';
    case 'rate':
      return '<div class="d-scr d-rate">' +
        '<span class="d-pill d-in" style="--d:0s">Hard</span>' +
        '<span class="d-pill d-in" style="--d:.15s">Medium</span>' +
        '<span class="d-pill on d-in" style="--d:.3s">Easy</span></div>';
    case 'rows':
      return '<div class="d-scr d-rows">' + d.rows.map((r, i) =>
        '<div class="d-row d-in" style="--d:' + (i * 0.25) + 's">' +
        r.map(c => '<span>' + escapeHtml(c) + '</span>').join('') + '</div>').join('') + '</div>';
    case 'count':
      return '<div class="d-scr d-count"><span class="d-num" data-to="' + d.to + '">0</span>' +
        '<span class="d-clabel">' + escapeHtml(d.label) + '</span></div>';
    case 'hl': {
      let html = escapeHtml(d.text);
      d.marks.forEach((m, i) => {
        html = html.replace(escapeHtml(m),
          '<span class="d-mk" style="--d:' + (i * 0.4) + 's">' + escapeHtml(m) + '</span>');
      });
      return '<div class="d-scr"><div class="d-hl">' + html + '</div></div>';
    }
    case 'chips':
      return '<div class="d-scr d-chips">' + d.items.map((c, i) =>
        '<span class="d-chip ' + (d.on === i ? 'on ' : '') + 'd-in" style="--d:' + (i * 0.15) + 's">' +
        escapeHtml(c) + '</span>').join('') + '</div>';
    case 'scan':
      return '<div class="d-scr"><div class="d-scan"><span>' + escapeHtml(d.text) + '</span><i class="d-sweep"></i></div></div>';
    case 'stats':
      return '<div class="d-scr d-stats">' + d.items.map(([n, l], i) =>
        '<div class="d-stat d-in" style="--d:' + (i * 0.2) + 's"><b>' + escapeHtml(n) + '</b><small>' +
        escapeHtml(l) + '</small></div>').join('') + '</div>';
    case 'table':
      return '<div class="d-scr d-tbl">' + d.rows.map((r, i) =>
        '<div class="d-trow d-in" style="--d:' + (i * 0.2) + 's"><span>' + escapeHtml(r[0]) + '</span><span>' +
        escapeHtml(r[1]) + '</span></div>').join('') + '</div>';
    case 'tweets':
      return '<div class="d-scr d-tweets">' + d.items.map((c, i) =>
        '<span class="d-tweet d-in" style="--d:' + (i * 0.25) + 's">' + escapeHtml(c) + '</span>').join('') + '</div>';
    default:
      return '';
  }
}

function initWalkthrough() {
  const tool = document.documentElement.dataset.tool || '';
  const steps = STEPS[tool];
  const main = document.querySelector('.ts-main');
  if (!steps || !main || document.querySelector('.hiw2')) return;

  const section = document.createElement('section');
  section.className = 'hiw2 reveal';
  section.innerHTML =
    '<div class="hiw2-title">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
      'How it works</div>' +
    '<div class="hiw2-steps">' +
      steps.map((st, i) =>
        '<div class="hiw2-step">' +
          '<span class="hiw2-num">' + (i + 1) + '</span>' +
          '<div class="hiw2-step-title">' + escapeHtml(st.t) + '</div>' +
          '<div class="ts-hiw-demo">' + demoMarkup(st.d) + '</div>' +
        '</div>'
      ).join('') +
    '</div>';
  main.appendChild(section);
  initSequencer(section);
}

// Play steps one at a time, looping; pause when off-screen.
function initSequencer(section) {
  const steps = [...section.querySelectorAll('.hiw2-step')];
  if (!steps.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    steps.forEach(s => s.classList.add('playing'));
    steps.forEach(runCount);
    return;
  }
  let i = -1, timer = null;
  const advance = () => {
    i = (i + 1) % steps.length;
    steps.forEach((s, j) => s.classList.toggle('playing', j === i));
    runCount(steps[i]);
  };
  const start = () => { if (timer) return; advance(); timer = setInterval(advance, 2900); };
  const stop = () => { clearInterval(timer); timer = null; };
  const io = new IntersectionObserver((es) => {
    es.forEach(e => (e.isIntersecting ? start() : stop()));
  }, { threshold: 0 });
  io.observe(section);
}

function runCount(stepEl) {
  const num = stepEl.querySelector('.d-num');
  if (!num) return;
  const to = parseFloat(num.dataset.to);
  const dec = (String(num.dataset.to).split('.')[1] || '').length;
  const t0 = performance.now(), dur = 1100;
  function tick(t) {
    const p = Math.min(1, (t - t0) / dur);
    num.textContent = (to * p).toFixed(dec);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Scroll reveal ─────────────────────────────────────────────────────────

function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sel = '.ts-tool-header, .ts-card, .ts-hub-card, .ts-stats-grid, .ts-privacy-strip, .ts-callout, .gc-tab, .hiw2';
  const els = [...document.querySelectorAll(sel)];
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  let i = 0;
  els.forEach(el => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
    el.style.transitionDelay = Math.min(i * 45, 220) + 'ms';
    io.observe(el);
    i++;
  });
}

// ── Prerender internal links on hover (instant navigation) ──────────────────

function initSpeculation() {
  if (!HTMLScriptElement.supports || !HTMLScriptElement.supports('speculationrules')) return;
  if (document.querySelector('script[type="speculationrules"]')) return;
  const s = document.createElement('script');
  s.type = 'speculationrules';
  s.textContent = JSON.stringify({
    prerender: [{
      where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/privacy.html' } }] },
      eagerness: 'moderate'
    }]
  });
  document.head.appendChild(s);
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initDarkToggle();
  initFavicon();
  initBackground();
  initBreadcrumb();
  initToolIcon();
  initWalkthrough();
  initReveal();
  initSpeculation();
});
