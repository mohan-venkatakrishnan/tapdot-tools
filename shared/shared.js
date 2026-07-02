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
  const depths = [0.020, -0.028, 0.016];       // mouse parallax strength
  const scrollDepths = [0.06, -0.04, 0.08];    // scroll parallax strength
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

  // Remove any existing static crumb nodes between logo and toggle.
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

// ── How it works ─────────────────────────────────────────────────────────────

const HOW_IT_WORKS = {
  'CiteMaker': { demo: 'flip', steps: ['Pick a style — APA, MLA, Chicago or Harvard', 'Paste a URL to auto-fill, or type the details', 'Copy your formatted citation'] },
  'FlashForge': { demo: 'flip', steps: ['Paste notes (Q:/A:, term — definition, or lines)', 'Cards generate automatically', 'Study & rate — spaced repetition schedules the rest'] },
  'GradeCalc': { demo: 'meter', steps: ['Choose GPA, weighted or final-exam mode', 'Add your courses or scores', 'See your result update instantly'] },
  'BiasCheck': { demo: 'mark', steps: ['Paste a news excerpt', 'On-device AI reads the language patterns', 'See loaded words, framing & questions to ask'] },
  'ReadScore': { demo: 'meter', steps: ['Paste your writing', 'Press Analyse', 'Read grade level, passive voice & long sentences'] },
  'WordCount Pro': { demo: 'type', steps: ['Type or paste your text', 'Counts update live as you write', 'Check keyword density & a character limit'] },
  'LoremCraft': { demo: 'type', steps: ['Pick a style and amount', 'Choose plain, HTML or Markdown', 'Generate & copy your placeholder text'] },
  'ThreadCraft': { demo: 'type', steps: ['Paste your long text', 'Set the limit & numbering', 'Copy each tweet or the whole thread'] },
};

function demoMarkup(type) {
  switch (type) {
    case 'flip': return '<div class="hiw-flip"><div class="hiw-flip-i">' +
      '<div class="hiw-face hiw-front">Question</div>' +
      '<div class="hiw-face hiw-back">Answer</div></div></div>';
    case 'type': return '<div class="hiw-type"><span></span><span></span><span></span><span></span></div>';
    case 'meter': return '<div class="hiw-meter-wrap"><div class="hiw-meter"><div class="hiw-meter-fill"></div></div><div class="hiw-meter-num">A</div></div>';
    case 'mark': return '<div class="hiw-mark"><mark>alarming</mark> claims about the <mark>crisis</mark> stunned <mark>ordinary people</mark></div>';
    default: return '';
  }
}

function initHowItWorks() {
  const tool = document.documentElement.dataset.tool || '';
  const cfg = HOW_IT_WORKS[tool];
  const header = document.querySelector('.ts-tool-header');
  if (!cfg || !header || document.querySelector('.ts-hiw')) return;

  const collapsed = window.innerWidth < 900; // start collapsed on mobile
  const card = document.createElement('section');
  card.className = 'ts-hiw reveal' + (collapsed ? ' collapsed' : '');
  card.innerHTML =
    '<div class="ts-hiw-head" role="button" tabindex="0" aria-expanded="' + (!collapsed) + '">' +
      '<span class="ts-hiw-title">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
        'How it works</span>' +
      '<svg class="ts-hiw-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>' +
    '</div>' +
    '<div class="ts-hiw-body">' +
      '<div class="ts-hiw-demo" data-demo="' + cfg.demo + '">' + demoMarkup(cfg.demo) + '</div>' +
      '<ol class="ts-hiw-steps">' + cfg.steps.map(s => '<li>' + escapeHtml(s) + '</li>').join('') + '</ol>' +
    '</div>';

  header.after(card);

  const head = card.querySelector('.ts-hiw-head');
  const toggle = () => {
    card.classList.toggle('collapsed');
    head.setAttribute('aria-expanded', String(!card.classList.contains('collapsed')));
  };
  head.addEventListener('click', toggle);
  head.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
}

// ── Scroll reveal ─────────────────────────────────────────────────────────

function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sel = '.ts-tool-header, .ts-card, .ts-hub-card, .ts-stats-grid, .ts-privacy-strip, .ts-callout, .gc-tab, .ts-hiw';
  const els = [...document.querySelectorAll(sel)].filter(el => !el.classList.contains('reveal') || true);
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
  initHowItWorks();
  initReveal();
  initSpeculation();
});
