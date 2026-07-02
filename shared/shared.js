// tapdot tools — shared utilities + shell (v2)

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

// ── Icon set (categories + tools) ───────────────────────────────────────────

const ICONS = {
  study:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/></svg>',
  write:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
  'CiteMaker':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17h3l2-4V7H5v6h3z"/><path d="M16 17h3l2-4V7h-6v6h3z"/></svg>',
  'FlashForge':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="13" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>',
  'GradeCalc':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01"/></svg>',
  'BiasCheck':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M6 21h12M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/></svg>',
  'ReadScore':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20a8 8 0 0 1 16 0"/><path d="M12 20l4-6"/></svg>',
  'WordCount Pro': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>',
  'LoremCraft':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  'ThreadCraft':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>',
};

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

  window.addEventListener('mousemove', (e) => {
    tx = e.clientX - cx();
    ty = e.clientY - cy();
  }, { passive: true });

  function frame(t) {
    mx += (tx - mx) * 0.06;
    my += (ty - my) * 0.06;
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

// ── How it works — bottom walkthrough (Step 1 → 2 → 3, animated) ─────────────

const STEPS = {
  'CiteMaker': [
    { t: 'Pick a style', s: 'APA · MLA · Chicago', d: 'type' },
    { t: 'Add the source', s: 'Smith, J. — Deep Work — 2026', d: 'type' },
    { t: 'Copy the citation', s: 'Smith, J. (2026). Deep Work.', d: 'type' },
  ],
  'FlashForge': [
    { t: 'Paste your notes', s: 'Mitochondria — the powerhouse', d: 'type' },
    { t: 'Cards generate', s: 'Front → Back ready', d: 'flip' },
    { t: 'Study & rate', s: 'Easy · Medium · Hard', d: 'flip' },
  ],
  'GradeCalc': [
    { t: 'Enter courses', s: 'Biology — A — 3 cr', d: 'type' },
    { t: 'Add more grades', s: 'Math — B+ — 4 cr', d: 'type' },
    { t: 'See your GPA', s: '3.85', d: 'meter' },
  ],
  'BiasCheck': [
    { t: 'Paste an excerpt', s: 'The alarming crisis shocked…', d: 'type' },
    { t: 'AI reads patterns', s: 'alarming · crisis · shocked', d: 'mark' },
    { t: 'See the analysis', s: 'Framing + questions to ask', d: 'mark' },
  ],
  'ReadScore': [
    { t: 'Paste your writing', s: 'It was a bright cold day…', d: 'type' },
    { t: 'Press Analyse', s: 'Scanning sentences…', d: 'type' },
    { t: 'Read your score', s: 'Grade 8.2', d: 'meter' },
  ],
  'WordCount Pro': [
    { t: 'Type or paste', s: 'The quick brown fox…', d: 'type' },
    { t: 'Counts update live', s: '128 words · 642 chars', d: 'type' },
    { t: 'Keyword density', s: 'fox · 3.1%', d: 'type' },
  ],
  'LoremCraft': [
    { t: 'Pick style & amount', s: '3 paragraphs · startup', d: 'type' },
    { t: 'Choose a format', s: 'Plain · HTML · Markdown', d: 'type' },
    { t: 'Generate & copy', s: 'We disrupt the paradigm…', d: 'type' },
  ],
  'ThreadCraft': [
    { t: 'Paste long text', s: 'A long post to split…', d: 'type' },
    { t: 'Set limit & numbers', s: '280 chars · 1/n', d: 'type' },
    { t: 'Copy your thread', s: '1/3   2/3   3/3', d: 'type' },
  ],
};

function demoMarkup(type) {
  switch (type) {
    case 'flip': return '<div class="hiw-flip"><div class="hiw-flip-i">' +
      '<div class="hiw-face hiw-front">Question</div>' +
      '<div class="hiw-face hiw-back">Answer</div></div></div>';
    case 'type': return '<div class="hiw-type"><span></span><span></span><span></span><span></span></div>';
    case 'meter': return '<div class="hiw-meter-wrap"><div class="hiw-meter"><div class="hiw-meter-fill"></div></div><div class="hiw-meter-num">A</div></div>';
    case 'mark': return '<div class="hiw-mark"><mark>alarming</mark> <mark>crisis</mark> <mark>shocked</mark></div>';
    default: return '';
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
          '<div class="ts-hiw-demo" data-demo="' + st.d + '">' + demoMarkup(st.d) + '</div>' +
          '<div class="hiw2-sample">' + escapeHtml(st.s) + '</div>' +
        '</div>'
      ).join('') +
    '</div>';
  main.appendChild(section);
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
  initBackground();
  initBreadcrumb();
  initToolIcon();
  initWalkthrough();
  initReveal();
  initSpeculation();
});
