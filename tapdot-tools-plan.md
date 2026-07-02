# tapdot Tools — Complete Build Plan
## tools.tapdot.org/study + tools.tapdot.org/write

Eight privacy-first web tools across two collections. Every tool runs entirely in the
browser — no server, no account, no data sent anywhere. Built as standalone HTML files,
hosted free on GitHub Pages, served under tools.tapdot.org via a custom subdomain.
Analytics via Cloudflare Web Analytics — cookieless, free, no personal data.

---

## All eight tools

### Study collection — tools.tapdot.org/study

| Tool | URL | Core job |
|---|---|---|
| CiteMaker | tools.tapdot.org/study/cite | APA / MLA / Chicago / Harvard citations |
| FlashForge | tools.tapdot.org/study/flashcards | Flashcards from pasted notes + spaced repetition |
| GradeCalc | tools.tapdot.org/study/grades | GPA, weighted grades, final exam calculator |
| BiasCheck | tools.tapdot.org/study/bias | Media bias analysis, on-device AI |

### Write collection — tools.tapdot.org/write

| Tool | URL | Core job |
|---|---|---|
| ReadScore | tools.tapdot.org/write/readscore | Readability analysis — Flesch-Kincaid, passive voice |
| WordCount Pro | tools.tapdot.org/write/wordcount | Words, chars, reading time, keyword density |
| LoremCraft | tools.tapdot.org/write/lorem | Placeholder text in 10 styles |
| ThreadCraft | tools.tapdot.org/write/thread | Split long text into tweet thread |

---

## Design system — shared across all eight tools

All eight tools share one design language that extends tapdot.org's existing aesthetic.
The tapdot brand uses `#5b6cf0` as its accent, white backgrounds, Inter typeface, clean
spacing, and a personal honest tone. The tools subdomain inherits all of this exactly.

### tapdot design tokens (match tapdot.org exactly)

```css
/* ── Colours ───────────────────────────────────────────────────────────── */
--color-bg:          #FFFFFF    /* Pure white — matches tapdot.org */
--color-bg-soft:     #F8F8FB    /* Subtle page background */
--color-surface:     #FFFFFF    /* Cards, inputs */
--color-border:      #E5E5F0    /* Borders — slightly cool gray */
--color-text:        #0F0F1A    /* Near-black — tapdot's body text */
--color-muted:       #6B6B80    /* Secondary labels, hints */
--color-accent:      #5B6CF0    /* tapdot brand blue — exact match */
--color-accent-soft: #EEF0FF    /* Accent tint */
--color-accent-dark: #4555E0    /* Hover state */
--color-success:     #1D9E75    /* Valid / complete */
--color-warning:     #D97706    /* Caution */
--color-danger:      #DC2626    /* Error */

/* Dark mode */
--color-bg-dark:          #0F0F1A
--color-bg-soft-dark:     #16161F
--color-surface-dark:     #1C1C2A
--color-border-dark:      #2A2A3A
--color-text-dark:        #F0F0F8
--color-muted-dark:       #9090A8
```

### Typography

```
Body:     'Inter', system-ui — 400/500 weight — all UI text
Mono:     'JetBrains Mono', monospace — citations, counts, code output
```

Inter is loaded from Google Fonts with `display=swap`. JetBrains Mono only on
tools that output monospaced content (CiteMaker, WordCount Pro, ThreadCraft).

No display face — tapdot.org uses Inter throughout. Consistency over personality here.

### Layout — every tool follows this exact shell

```
┌─────────────────────────────────────────────┐
│  [tapdot logo]   Tool Name      [dark mode] │  ← nav, sticky, 56px tall
├─────────────────────────────────────────────┤
│                                             │
│   Tool title                                │  ← hero, max-width 680px centred
│   One-line description                      │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  Primary input (textarea / form)    │   │  ← main input area
│   └─────────────────────────────────────┘   │
│                                             │
│   [Action button]                           │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  Output area (appears after action) │   │  ← results, hidden until used
│   └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Built by tapdot · Privacy · tapdot.org     │  ← footer
└─────────────────────────────────────────────┘
```

- Max content width: 680px, centred
- Page padding: 24px horizontal on mobile, 40px on desktop
- Section gap: 24px
- No sidebar. No tabs. No modal overlays. One job per page.

### Component tokens

```css
--radius-sm:    6px;
--radius-md:    10px;
--radius-lg:    14px;
--shadow-sm:    0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md:    0 4px 12px rgba(0,0,0,0.08);
--font-body:    'Inter', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', monospace;
--transition:   0.15s ease;
```

### Shared nav HTML (copy into every tool)

```html
<nav class="ts-nav">
  <a href="https://tapdot.org" class="ts-nav-logo">
    <img src="/assets/tapdot-icon.png" width="22" height="22" alt="tapdot" />
    <span>tapdot</span>
  </a>
  <span class="ts-nav-divider">/</span>
  <span class="ts-nav-tool">TOOL_NAME_HERE</span>
  <button class="ts-dark-toggle" id="darkToggle" aria-label="Toggle dark mode">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
    </svg>
  </button>
</nav>
```

### Shared footer HTML (copy into every tool)

```html
<footer class="ts-footer">
  <span>Built by <a href="https://tapdot.org">tapdot</a></span>
  <span class="ts-footer-dot">·</span>
  <a href="/privacy.html">Privacy</a>
  <span class="ts-footer-dot">·</span>
  <span>All processing happens in your browser</span>
</footer>
```

### shared.css — build this file first

```css
/* tapdot tools — shared stylesheet */
/* All tools import this file */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --color-bg:           #FFFFFF;
  --color-bg-soft:      #F8F8FB;
  --color-surface:      #FFFFFF;
  --color-border:       #E5E5F0;
  --color-text:         #0F0F1A;
  --color-muted:        #6B6B80;
  --color-accent:       #5B6CF0;
  --color-accent-soft:  #EEF0FF;
  --color-accent-dark:  #4555E0;
  --color-success:      #1D9E75;
  --color-warning:      #D97706;
  --color-danger:       #DC2626;
  --radius-sm:          6px;
  --radius-md:          10px;
  --radius-lg:          14px;
  --shadow-sm:          0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:          0 4px 12px rgba(0,0,0,0.08);
  --font-body:          'Inter', system-ui, sans-serif;
  --font-mono:          'JetBrains Mono', monospace;
  --transition:         0.15s ease;
}

[data-theme="dark"] {
  --color-bg:           #0F0F1A;
  --color-bg-soft:      #16161F;
  --color-surface:      #1C1C2A;
  --color-border:       #2A2A3A;
  --color-text:         #F0F0F8;
  --color-muted:        #9090A8;
  --color-accent:       #7B8CFF;
  --color-accent-soft:  #1A1D40;
  --color-accent-dark:  #9AAAFF;
}

html { font-size: 16px; -webkit-text-size-adjust: 100%; }

body {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
  transition: background var(--transition), color var(--transition);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Nav ────────────────────────────────────────────────────────────────── */

.ts-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  height: 56px;
  background: var(--color-bg);
  border-bottom: 0.5px solid var(--color-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.ts-nav-logo {
  display: flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;
  color: var(--color-text);
  font-weight: 500;
  font-size: 14px;
}

.ts-nav-logo:hover { color: var(--color-accent); }

.ts-nav-divider {
  color: var(--color-border);
  font-size: 14px;
  user-select: none;
}

.ts-nav-tool {
  font-size: 14px;
  color: var(--color-muted);
  font-weight: 400;
}

.ts-dark-toggle {
  margin-left: auto;
  width: 34px;
  height: 34px;
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--transition), color var(--transition);
}

.ts-dark-toggle:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* ── Main content wrapper ───────────────────────────────────────────────── */

.ts-main {
  flex: 1;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

/* ── Tool header ────────────────────────────────────────────────────────── */

.ts-tool-header {
  margin-bottom: 32px;
}

.ts-tool-name {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.ts-tool-desc {
  font-size: 15px;
  color: var(--color-muted);
  line-height: 1.5;
}

/* ── Cards ──────────────────────────────────────────────────────────────── */

.ts-card {
  background: var(--color-surface);
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
}

.ts-card-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  margin-bottom: 10px;
}

/* ── Inputs ─────────────────────────────────────────────────────────────── */

.ts-textarea {
  width: 100%;
  min-height: 160px;
  padding: 12px 14px;
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-soft);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color var(--transition);
}

.ts-textarea:focus {
  border-color: var(--color-accent);
  background: var(--color-surface);
}

.ts-textarea::placeholder { color: var(--color-muted); }

.ts-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-soft);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition);
}

.ts-input:focus {
  border-color: var(--color-accent);
  background: var(--color-surface);
}

.ts-select {
  height: 40px;
  padding: 0 32px 0 12px;
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-soft);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B80' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

.ts-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition), transform var(--transition);
}

.ts-btn:active { transform: scale(0.98); }

.ts-btn-primary {
  background: var(--color-accent);
  color: #ffffff;
}

.ts-btn-primary:hover { background: var(--color-accent-dark); }

.ts-btn-secondary {
  background: var(--color-bg-soft);
  color: var(--color-text);
  border: 0.5px solid var(--color-border);
}

.ts-btn-secondary:hover { background: var(--color-accent-soft); }

.ts-btn-ghost {
  background: transparent;
  color: var(--color-muted);
  border: 0.5px solid var(--color-border);
}

.ts-btn-ghost:hover { color: var(--color-accent); border-color: var(--color-accent); }

/* ── Output area ─────────────────────────────────────────────────────────── */

.ts-output {
  display: none;
  margin-top: 24px;
}

.ts-output.visible { display: block; }

/* ── Privacy notice strip ───────────────────────────────────────────────── */

.ts-privacy-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--color-accent);
  margin-bottom: 20px;
}

.ts-privacy-strip svg { flex-shrink: 0; }

/* ── Stats row (for WordCount, ReadScore) ───────────────────────────────── */

.ts-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.ts-stat {
  background: var(--color-bg-soft);
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  text-align: center;
}

.ts-stat-num {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.ts-stat-label {
  display: block;
  font-size: 11px;
  color: var(--color-muted);
  margin-top: 4px;
}

/* ── Mono output (citations, threads) ───────────────────────────────────── */

.ts-mono-output {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text);
  background: var(--color-bg-soft);
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Footer ─────────────────────────────────────────────────────────────── */

.ts-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 24px;
  font-size: 13px;
  color: var(--color-muted);
  border-top: 0.5px solid var(--color-border);
  margin-top: auto;
}

.ts-footer a {
  color: var(--color-muted);
  text-decoration: none;
}

.ts-footer a:hover { color: var(--color-accent); }

.ts-footer-dot { color: var(--color-border); }

/* ── Utilities ──────────────────────────────────────────────────────────── */

.ts-hidden  { display: none !important; }
.ts-flex    { display: flex; align-items: center; gap: 10px; }
.ts-gap-sm  { gap: 8px; }
.ts-mt-sm   { margin-top: 12px; }
.ts-mt-md   { margin-top: 20px; }
.ts-copy-btn {
  font-size: 12px;
  color: var(--color-muted);
  cursor: pointer;
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
}
.ts-copy-btn:hover { color: var(--color-accent); }

/* ── Responsive ─────────────────────────────────────────────────────────── */

@media (max-width: 600px) {
  .ts-main { padding: 24px 16px 48px; }
  .ts-nav  { padding: 0 16px; }
  .ts-stats-grid { grid-template-columns: repeat(2, 1fr); }
}
```

### shared.js — build this file second

```javascript
// tapdot tools — shared utilities

// ── Dark mode ─────────────────────────────────────────────────────────────

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
    const next   = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tapdot-theme', next);
  });
}

// ── Copy to clipboard ─────────────────────────────────────────────────────

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
}

// ── Show / hide output ────────────────────────────────────────────────────

function showOutput(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('visible');
}

function hideOutput(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('visible');
}

// ── Escape HTML ───────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Init on DOM ready ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initDarkToggle();
});
```

---

## Analytics — Cloudflare Web Analytics

### Setup (one-time, free)

1. Create a free account at cloudflare.com — no credit card, no DNS migration needed
2. In the Cloudflare dashboard go to **Web Analytics → Add a site**
3. Enter `tools.tapdot.org`
4. Copy the script tag Cloudflare provides

### Add to every page (paste before `</body>`)

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "YOUR_CLOUDFLARE_TOKEN"}'></script>
```

Add this to the HTML template below — one snippet in `shared.js` is not enough since
Cloudflare's beacon must be a `<script>` tag in the HTML. Add it to every tool's
`index.html` before `</body>`. Replace `YOUR_CLOUDFLARE_TOKEN` with the token from
your Cloudflare dashboard.

### What you see in the dashboard

- Page views per tool (which tools are being used)
- Visits (sessions) over time
- Top referral sources (where traffic comes from)
- Countries
- Device types (mobile vs desktop)
- Top pages

### What is never collected

No cookies. No IP addresses stored. No personal data. No fingerprinting.
No cross-site tracking. No data sent to any ad network.

---

## Privacy policy — tools.tapdot.org/privacy.html

Create this file at the root of the repo. Link from every tool footer.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — tapdot Tools</title>
  <link rel="stylesheet" href="/shared/shared.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet" />
</head>
<body>
<nav class="ts-nav">
  <a href="https://tapdot.org" class="ts-nav-logo">
    <img src="/assets/tapdot-icon.png" width="22" height="22" alt="tapdot" />
    <span>tapdot</span>
  </a>
  <span class="ts-nav-divider">/</span>
  <span class="ts-nav-tool">Privacy Policy</span>
  <button class="ts-dark-toggle" id="darkToggle" aria-label="Toggle dark mode">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
    </svg>
  </button>
</nav>

<main class="ts-main">
  <div class="ts-tool-header">
    <h1 class="ts-tool-name">Privacy Policy</h1>
    <p class="ts-tool-desc">Last updated: July 2026</p>
  </div>

  <div class="ts-card">
    <p class="ts-card-label">The short version</p>
    <p style="font-size:15px;line-height:1.7;color:var(--color-text)">
      tapdot tools run entirely in your browser. Nothing you type, paste, or generate
      is ever sent to any server. No accounts. No cookies. No trackers. Your data
      stays on your device — always.
    </p>
  </div>

  <div class="ts-card" style="margin-top:16px">
    <p class="ts-card-label">What we collect</p>
    <p style="font-size:14px;line-height:1.7;color:var(--color-text);margin-bottom:12px">
      <strong>Nothing from the tools themselves.</strong> All processing happens
      locally in your browser using JavaScript. Text you paste into CiteMaker,
      FlashForge, GradeCalc, BiasCheck, ReadScore, WordCount Pro, LoremCraft, or
      ThreadCraft is never transmitted anywhere. It never leaves your device.
    </p>
    <p style="font-size:14px;line-height:1.7;color:var(--color-text)">
      <strong>Anonymous visit counts only.</strong> We use Cloudflare Web Analytics
      to count page visits. No cookies are set and no personal data is collected.
      Your visit is never tied to your identity. Cloudflare sees only that a page
      was loaded — not who loaded it, not what you typed, not what you did.
      You can read Cloudflare's privacy policy at cloudflare.com/privacypolicy.
    </p>
  </div>

  <div class="ts-card" style="margin-top:16px">
    <p class="ts-card-label">What we do not collect</p>
    <ul style="font-size:14px;line-height:1.9;color:var(--color-text);
               padding-left:18px;margin:0">
      <li>No cookies — none, ever</li>
      <li>No IP addresses stored</li>
      <li>No personal information of any kind</li>
      <li>No cross-site tracking</li>
      <li>No advertising tracking</li>
      <li>No user accounts or sign-ups</li>
      <li>No text, documents, or content you enter into any tool</li>
    </ul>
  </div>

  <div class="ts-card" style="margin-top:16px">
    <p class="ts-card-label">Local storage</p>
    <p style="font-size:14px;line-height:1.7;color:var(--color-text)">
      Some tools (FlashForge) save your data to your browser's localStorage so your
      flashcards persist between sessions. This data never leaves your device and
      can be cleared at any time through your browser settings.
    </p>
  </div>

  <div class="ts-card" style="margin-top:16px">
    <p class="ts-card-label">Contact</p>
    <p style="font-size:14px;line-height:1.7;color:var(--color-text)">
      Questions about this privacy policy? Email
      <a href="mailto:rkmohanchn@gmail.com"
         style="color:var(--color-accent)">rkmohanchn@gmail.com</a>.
    </p>
  </div>
</main>

<footer class="ts-footer">
  <span>Built by <a href="https://tapdot.org">tapdot</a></span>
  <span class="ts-footer-dot">·</span>
  <a href="/privacy.html">Privacy</a>
  <span class="ts-footer-dot">·</span>
  <span>All processing happens in your browser</span>
</footer>

<script src="/shared/shared.js"></script>
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "YOUR_CLOUDFLARE_TOKEN"}'></script>
</body>
</html>
```

---

## Standard HTML shell — every tool uses this template

Replace the CAPS placeholders per tool. The structure is identical across all eight tools.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TOOL_TITLE — tapdot</title>
  <meta name="description" content="TOOL_DESCRIPTION" />
  <meta property="og:title" content="TOOL_TITLE — tapdot" />
  <meta property="og:description" content="TOOL_DESCRIPTION" />
  <link rel="canonical" href="https://tools.tapdot.org/TOOL_PATH/" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet" />
  <link rel="stylesheet" href="/shared/shared.css" />
  <link rel="stylesheet" href="TOOL_NAME.css" />
</head>
<body>

<nav class="ts-nav">
  <a href="https://tapdot.org" class="ts-nav-logo">
    <img src="/assets/tapdot-icon.png" width="22" height="22" alt="tapdot" />
    <span>tapdot</span>
  </a>
  <span class="ts-nav-divider">/</span>
  <span class="ts-nav-tool">TOOL_SHORT_NAME</span>
  <button class="ts-dark-toggle" id="darkToggle" aria-label="Toggle dark mode">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
    </svg>
  </button>
</nav>

<main class="ts-main">

  <div class="ts-tool-header">
    <h1 class="ts-tool-name">TOOL_TITLE</h1>
    <p class="ts-tool-desc">TOOL_ONE_LINE_DESCRIPTION</p>
  </div>

  <div class="ts-privacy-strip">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    Everything runs in your browser — nothing is sent anywhere
  </div>

  <!-- TOOL-SPECIFIC CONTENT GOES HERE -->

</main>

<footer class="ts-footer">
  <span>Built by <a href="https://tapdot.org">tapdot</a></span>
  <span class="ts-footer-dot">·</span>
  <a href="/privacy.html">Privacy</a>
  <span class="ts-footer-dot">·</span>
  <span>All processing happens in your browser</span>
</footer>

<script src="/shared/shared.js"></script>
<script src="TOOL_NAME.js" defer></script>
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "YOUR_CLOUDFLARE_TOKEN"}'></script>
</body>
</html>
```

---

## Complete file structure

```
tools/                              ← GitHub repo root
├── CNAME                           ← contains: tools.tapdot.org
├── index.html                      ← tools.tapdot.org hub page
├── privacy.html                    ← shared privacy policy
├── shared/
│   ├── shared.css                  ← design system (build first)
│   └── shared.js                   ← dark mode, utilities (build second)
├── assets/
│   └── tapdot-icon.png             ← copy from tapdot.org
├── study/
│   ├── index.html                  ← tools.tapdot.org/study hub
│   ├── cite/
│   │   ├── index.html
│   │   ├── cite.js
│   │   └── cite.css
│   ├── flashcards/
│   │   ├── index.html
│   │   ├── flashforge.js
│   │   └── flashforge.css
│   ├── grades/
│   │   ├── index.html
│   │   ├── gradecalc.js
│   │   └── gradecalc.css
│   └── bias/
│       ├── index.html
│       ├── biascheck.js
│       └── biascheck.css
└── write/
    ├── index.html                  ← tools.tapdot.org/write hub
    ├── readscore/
    │   ├── index.html
    │   ├── readscore.js
    │   └── readscore.css
    ├── wordcount/
    │   ├── index.html
    │   ├── wordcount.js
    │   └── wordcount.css
    ├── lorem/
    │   ├── index.html
    │   ├── lorem.js
    │   └── lorem.css
    └── thread/
        ├── index.html
        ├── thread.js
        └── thread.css
```

---

## Study tools — implementation

### CiteMaker — tools.tapdot.org/study/cite

**Meta tags**
```
title:       CiteMaker — Free Citation Generator | tapdot
description: Generate APA, MLA, Chicago and Harvard citations instantly.
             No signup, no ads. All processing happens in your browser.
```

**UI sections**
1. Format selector: four buttons — APA / MLA / Chicago / Harvard
2. Input mode toggle: URL tab vs Manual entry tab
3. URL input: paste a link, fetch metadata automatically
4. Manual form: Author, Title, Year, Publisher, URL, Access date
5. Output: monospaced citation block with Copy button

**URL metadata fetch**
```javascript
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
```

**Citation format functions**
```javascript
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
```

---

### FlashForge — tools.tapdot.org/study/flashcards

**Meta tags**
```
title:       FlashForge — Free Flashcard Maker | tapdot
description: Turn your notes into flashcards instantly. Spaced repetition built in.
             No account needed. Cards save to your browser, never to a server.
```

**UI states**
1. Empty: large textarea to paste notes + "Create cards" button
2. Card grid: all cards shown as flippable tiles, click to reveal answer
3. Study mode: one card fills the main area, Space to flip, Easy/Medium/Hard to rate
4. Done: session summary — cards reviewed, accuracy, next due

**Auto-parse logic**
```javascript
function parseNotes(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cards = [];

  // Q:/A: format
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith('Q:') && lines[i+1].startsWith('A:')) {
      cards.push({ q: lines[i].slice(2).trim(), a: lines[i+1].slice(2).trim(),
                   interval: 1, ease: 2.5, due: Date.now() });
      i++; continue;
    }
  }
  if (cards.length) return cards;

  // Term — Definition
  const dashCards = lines.map(l => {
    const sep = l.match(/\s+[—–-]\s+/);
    if (!sep) return null;
    const [q, ...rest] = l.split(sep[0]);
    return { q: q.trim(), a: rest.join('').trim(),
             interval: 1, ease: 2.5, due: Date.now() };
  }).filter(Boolean);
  if (dashCards.length) return dashCards;

  // Fallback: each line is a question
  return lines.map(l => ({
    q: l.replace(/^[-•\d.]+\s*/, '').trim(), a: '',
    interval: 1, ease: 2.5, due: Date.now()
  }));
}
```

**Spaced repetition (simplified SM-2)**
```javascript
function updateCard(card, rating) {
  const q = rating === 'easy' ? 5 : rating === 'medium' ? 3 : 1;
  if (q < 3) {
    card.interval = 1;
  } else {
    card.ease     = Math.max(1.3, card.ease + 0.1 - (5 - q) * 0.08);
    card.interval = Math.round(card.interval * card.ease);
  }
  card.due = Date.now() + card.interval * 24 * 60 * 60 * 1000;
  return card;
}
```

**localStorage keys**
```
tapdot-flashcards-cards    → JSON array of card objects
tapdot-flashcards-name     → set name string
```

---

### GradeCalc — tools.tapdot.org/study/grades

**Meta tags**
```
title:       GradeCalc — GPA & Grade Calculator | tapdot
description: GPA calculator, weighted grade calculator, and final exam calculator.
             Clean, fast, no ads. All calculations happen in your browser.
```

**Three calculators — shown as tabs**

Tab 1: GPA Calculator
- Add course rows: name + letter grade (or %) + credit hours
- Show GPA on 4.0 scale, total credits, grade points table
- "What if" mode: add hypothetical courses to project future GPA

Tab 2: Weighted Grade Calculator
- Add assignment rows: name + score + max score + weight %
- Validate weights sum to 100% (warning if not)
- Show current grade, projected final if remaining work is perfect

Tab 3: Final Exam Calculator
- Three inputs: current grade (%), exam weight (%), desired grade (%)
- Formula: `needed = (desired - current * (1 - weight/100)) / (weight/100)`
- Show result clearly — green if achievable, red if over 100%

**Grade scale**
```javascript
const LETTER_TO_GPA = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F':  0.0
};

function percentToLetter(pct) {
  if (pct >= 97) return 'A+';  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-';  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';   if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+';  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-';  if (pct >= 67) return 'D+';
  if (pct >= 63) return 'D';   if (pct >= 60) return 'D-';
  return 'F';
}

function calcGPA(courses) {
  const valid = courses.filter(c => c.credits > 0 && c.grade !== '');
  const totalPoints  = valid.reduce((s, c) =>
    s + (LETTER_TO_GPA[c.grade] ?? 0) * c.credits, 0);
  const totalCredits = valid.reduce((s, c) => s + c.credits, 0);
  return totalCredits > 0
    ? (totalPoints / totalCredits).toFixed(2)
    : '0.00';
}
```

---

### BiasCheck — tools.tapdot.org/study/bias

**Meta tags**
```
title:       BiasCheck — Media Bias Analyser | tapdot
description: Paste a news excerpt and get a plain-English analysis of loaded language,
             emotional framing, and rhetorical patterns. Private, on-device AI.
```

**Important UI note**
Add a clear disclaimer above the input: "BiasCheck analyses language patterns, not
political leanings. It helps you think critically — it doesn't tell you what to believe."

**Gemini Nano prompt (returns XML for reliable parsing)**
```javascript
const BIAS_PROMPT = (text) => `You are a media literacy educator.
Analyse this news excerpt for a student learning critical thinking.
Respond ONLY in this XML format with no extra text:

<loaded_words>up to 6 emotionally charged words/phrases from the text, separated by |</loaded_words>
<framing>3-4 sentences: what angle this takes, what it emphasises, what it omits</framing>
<patterns>up to 3 rhetorical patterns: Name: where it appears in this specific text</patterns>
<questions>3 critical questions a reader should ask, one per line starting with -</questions>

Text: """${text.slice(0, 1500)}"""`;

function parseBiasResponse(raw) {
  const extract = (tag) => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1].trim() : '';
  };
  return {
    loadedWords: extract('loaded_words').split('|').map(w => w.trim()).filter(Boolean),
    framing:     extract('framing'),
    patterns:    extract('patterns').split('\n').filter(Boolean),
    questions:   extract('questions').split('\n')
                   .filter(l => l.startsWith('-')).map(l => l.slice(1).trim()),
  };
}
```

**Fallback when Gemini Nano is unavailable**
```javascript
const LOADED_WORDS_LIST = [
  'radical','extreme','alarming','devastating','crisis','threat','shocking',
  'outrageous','corrupt','dangerous','regime','elite','so-called','alleged',
  'reportedly','claims','mainstream media','ordinary people'
];

function fallbackAnalysis(text) {
  const lower = text.toLowerCase();
  const found = LOADED_WORDS_LIST.filter(w => lower.includes(w));
  return {
    loadedWords: found,
    framing: 'On-device AI is not available on this device. Showing basic word-level analysis only.',
    patterns: [],
    questions: [
      'Who is the source and what perspective might they represent?',
      'What evidence supports the main claims made here?',
      'What context or other viewpoints might be missing from this piece?',
    ]
  };
}
```

**Gemini Nano flag requirements**
```
chrome://flags/#prompt-api-for-gemini-nano       → Enabled
chrome://flags/#optimization-guide-on-device-model → Enabled
```

Show a friendly message if the API is unavailable explaining this — don't hide the
fallback as an error. It still provides useful output.

---

## Write tools — implementation

### ReadScore — tools.tapdot.org/write/readscore

**Meta tags**
```
title:       ReadScore — Readability Analyser | tapdot
description: Paste your writing and get Flesch-Kincaid grade level, reading time,
             sentence complexity, and passive voice count. Private, instant, free.
```

**What it analyses**
All computed locally in JS — no AI needed:

1. **Word count** — total words
2. **Sentence count** — split on `.!?` with edge case handling
3. **Syllable count** — approximated using vowel group counting
4. **Flesch Reading Ease** — `206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)`
5. **Flesch-Kincaid Grade Level** — `0.39*(words/sentences) + 11.8*(syllables/words) - 15.59`
6. **Reading time** — words / 238 (average adult reading speed)
7. **Speaking time** — words / 130 (average speaking speed)
8. **Passive voice count** — regex for `was/were/is/are/been + [past participle]` patterns
9. **Avg sentence length** — words / sentences
10. **Long sentences** — sentences over 25 words, highlighted in output

**Implementation**
```javascript
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function fleschKincaid(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const words     = text.trim().split(/\s+/).filter(Boolean);
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);

  const numSentences = Math.max(sentences.length, 1);
  const numWords     = Math.max(words.length, 1);

  const ease  = 206.835
              - 1.015  * (numWords / numSentences)
              - 84.6   * (syllables / numWords);
  const grade = 0.39   * (numWords / numSentences)
              + 11.8   * (syllables / numWords)
              - 15.59;

  const readingMins  = Math.ceil(numWords / 238);
  const speakingMins = Math.ceil(numWords / 130);

  const passivePattern = /\b(was|were|is|are|been|being|be)\s+\w+ed\b/gi;
  const passiveCount   = (text.match(passivePattern) || []).length;

  const longSentences = sentences.filter(s =>
    s.trim().split(/\s+/).length > 25
  ).length;

  return {
    words:        numWords,
    sentences:    numSentences,
    syllables,
    ease:         Math.round(Math.max(0, Math.min(100, ease))),
    grade:        Math.max(0, grade).toFixed(1),
    readingMins,
    speakingMins,
    passiveCount,
    longSentences,
    avgSentenceLen: Math.round(numWords / numSentences),
  };
}

function easeLabel(ease) {
  if (ease >= 90) return 'Very easy';
  if (ease >= 80) return 'Easy';
  if (ease >= 70) return 'Fairly easy';
  if (ease >= 60) return 'Standard';
  if (ease >= 50) return 'Fairly difficult';
  if (ease >= 30) return 'Difficult';
  return 'Very difficult';
}
```

**Output display**
Show as a stat grid (6 metric cards) + a highlighted text view where long sentences
are underlined in amber and passive voice instances are underlined in blue.

---

### WordCount Pro — tools.tapdot.org/write/wordcount

**Meta tags**
```
title:       WordCount Pro — Word & Character Counter | tapdot
description: Words, characters, sentences, paragraphs, reading time, speaking time,
             and keyword density. All local. No ads.
```

**Real-time** — updates on every keystroke, no button needed.

**What it counts**
```javascript
function countAll(text) {
  const words       = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars       = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const sentences   = (text.match(/[.!?]+/g) || []).length;
  const paragraphs  = text.split(/\n{2,}/).filter(p => p.trim()).length;
  const readingMins = Math.ceil(words / 238);
  const speakingMins = Math.ceil(words / 130);

  // Keyword density — top 10 words (excluding stop words)
  const STOP_WORDS = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'is','are','was','were','be','been','being','have','has','had','do','does',
    'did','will','would','could','should','may','might','must','shall','that',
    'this','these','those','it','its','i','you','he','she','we','they','my',
    'your','his','her','our','their','not','no','so','as','if','by','from'
  ]);

  const freq = {};
  text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: words > 0 ? ((count / words) * 100).toFixed(1) : '0.0'
    }));

  return { words, chars, charsNoSpace, sentences, paragraphs,
           readingMins, speakingMins, keywords };
}
```

**Output display**
- 6 stat cards: Words / Characters / Sentences / Paragraphs / Read time / Speak time
- Keyword density table: word | count | % — top 10 excluding stop words
- Character limit check: optional input where user types a limit (e.g. 280 for Twitter),
  shows remaining characters with colour feedback (green → amber → red)

---

### LoremCraft — tools.tapdot.org/write/lorem

**Meta tags**
```
title:       LoremCraft — Placeholder Text Generator | tapdot
description: Generate placeholder text in 10 styles — classic Lorem, realistic English,
             startup jargon, and more. Choose length and format. Instant, private.
```

**Controls**
- Style selector (10 options)
- Amount: paragraphs (1–10) / sentences (1–50) / words (10–500)
- Output format: plain text / HTML `<p>` tags / Markdown

**10 text styles**

```javascript
const STYLES = {
  classic:   'Classic Lorem Ipsum',
  english:   'Realistic English',
  startup:   'Startup Jargon',
  legal:     'Legal Language',
  tech:      'Technical Documentation',
  casual:    'Casual Conversation',
  academic:  'Academic Writing',
  headlines: 'News Headlines',
  product:   'Product Descriptions',
  minimal:   'Minimal Single-Word Blocks',
};
```

Each style is a pool of sentences that get sampled and assembled randomly. Store pools
as arrays in `lorem.js` — no API needed, purely local generation. The pools should be
large enough (50+ sentences each) to avoid obviously repetitive output.

Example pool entries:
```javascript
const POOLS = {
  startup: [
    "We're disrupting the paradigm with synergistic blockchain solutions.",
    "Our AI-driven platform leverages machine learning to unlock value at scale.",
    "This quarter we're doubling down on our core competencies to move the needle.",
    "We're building a best-in-class experience for the next generation of users.",
    // ... 50+ more
  ],
  legal: [
    "Notwithstanding the foregoing, the parties hereto agree to the following terms.",
    "The indemnifying party shall hold harmless the indemnified party from any claims.",
    "This agreement shall be construed in accordance with the laws of the jurisdiction.",
    // ... 50+ more
  ],
  // etc.
};
```

---

### ThreadCraft — tools.tapdot.org/write/thread

**Meta tags**
```
title:       ThreadCraft — Twitter Thread Formatter | tapdot
description: Paste any long text and split it into a numbered tweet thread.
             Character count per tweet. No Twitter login required.
```

**Controls**
- Paste area: long text input
- Character limit: 280 (default, editable — some users want 240 for safety margin)
- Thread number format: toggle between `1/` prefix, emoji numbers, or plain numbers
- Split mode: auto (smart sentence boundary) or manual (user marks splits with `---`)

**Auto-split logic**
```javascript
function splitIntoTweets(text, limit = 270) {
  // Reserve ~10 chars for the tweet number (e.g. "12/") 
  const usable  = limit - 5;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const tweets  = [];
  let   current = '';

  for (const sentence of sentences) {
    const candidate = current ? current + ' ' + sentence.trim()
                               : sentence.trim();
    if (candidate.length <= usable) {
      current = candidate;
    } else {
      if (current) tweets.push(current.trim());
      // If a single sentence is too long, split at word boundary
      if (sentence.trim().length > usable) {
        const words = sentence.trim().split(' ');
        let chunk = '';
        for (const word of words) {
          const next = chunk ? chunk + ' ' + word : word;
          if (next.length <= usable) {
            chunk = next;
          } else {
            if (chunk) tweets.push(chunk.trim());
            chunk = word;
          }
        }
        if (chunk) current = chunk;
      } else {
        current = sentence.trim();
      }
    }
  }
  if (current.trim()) tweets.push(current.trim());

  // Add numbering
  const total = tweets.length;
  return tweets.map((t, i) => `${i + 1}/${total} ${t}`);
}
```

**Output display**
- Each tweet in its own card with character count badge
- Over-limit tweets flagged in red
- "Copy all" button copies the full thread as plain text with blank lines between tweets
- "Copy tweet N" on each individual card

---

## Hub pages

### tools.tapdot.org (root hub)

Brief intro + two collection cards linking to /study and /write.
Same nav and footer as all tools.

```
tools.tapdot.org
├── Study tools — for students and researchers
│   CiteMaker · FlashForge · GradeCalc · BiasCheck
└── Write tools — for writers and creators
    ReadScore · WordCount Pro · LoremCraft · ThreadCraft
```

### tools.tapdot.org/study (study hub)

Four tool cards in a 2×2 grid. Each card: tool name, one-line description, "Open tool →"
link. Same tapdot aesthetic — white card, subtle border, accent hover.

### tools.tapdot.org/write (write hub)

Same layout as study hub but for the four write tools.

---

## GitHub Pages hosting — step by step

### Step 1 — Create the repository

1. Go to github.com and create a new public repository named `tapdot-tools`
2. Do not initialise with a README

### Step 2 — Push files

```bash
cd your-project-folder
git init
git add .
git commit -m "Initial commit — study and write tools"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tapdot-tools.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to repository → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**
5. Wait 2–3 minutes — GitHub will show you the deployment URL

### Step 4 — Add the CNAME file

Create a file called `CNAME` (no extension) in the repo root:
```
tools.tapdot.org
```

Commit and push:
```bash
echo "tools.tapdot.org" > CNAME
git add CNAME
git commit -m "Add CNAME for tools.tapdot.org"
git push
```

### Step 5 — Add DNS record in GoDaddy

1. Log in to GoDaddy → **My Products → DNS** for tapdot.org
2. Click **Add New Record**
3. Add a **CNAME record**:

```
Type:   CNAME
Name:   tools
Value:  YOUR_USERNAME.github.io
TTL:    1 hour
```

**If GoDaddy doesn't allow CNAME at subdomain level**, use four A records instead:
```
Type:   A
Name:   tools
Value:  185.199.108.153   (add all four — one record each)
        185.199.109.153
        185.199.110.153
        185.199.111.153
```

### Step 6 — Configure custom domain in GitHub Pages

1. Go back to repository → **Settings → Pages**
2. Under **Custom domain**, type `tools.tapdot.org`
3. Click **Save**
4. Wait 10 minutes to 2 hours for DNS to propagate
5. Once the green checkmark appears, tick **Enforce HTTPS**

GitHub auto-provisions a free SSL certificate via Let's Encrypt.

### Step 7 — Verify all URLs

After DNS propagates, confirm all eight tools load correctly:

```
https://tools.tapdot.org/
https://tools.tapdot.org/study/
https://tools.tapdot.org/study/cite/
https://tools.tapdot.org/study/flashcards/
https://tools.tapdot.org/study/grades/
https://tools.tapdot.org/study/bias/
https://tools.tapdot.org/write/
https://tools.tapdot.org/write/readscore/
https://tools.tapdot.org/write/wordcount/
https://tools.tapdot.org/write/lorem/
https://tools.tapdot.org/write/thread/
https://tools.tapdot.org/privacy.html
```

### Step 8 — Ongoing deployment

Every time you update a tool:
```bash
git add .
git commit -m "Fix: CiteMaker MLA format punctuation"
git push
```

GitHub Pages auto-deploys within 1–2 minutes. No CI/CD needed.

---

## Claude Code build order

Hand this document to Claude Code and instruct it to build in this exact order:

1. `shared/shared.css` — design tokens, all components
2. `shared/shared.js` — dark mode, utilities
3. `privacy.html` — privacy policy page
4. `index.html` — root hub page
5. `study/index.html` — study hub
6. `study/cite/` — CiteMaker (pure JS, no AI dependency)
7. `study/grades/` — GradeCalc (pure JS, no AI dependency)
8. `write/wordcount/` — WordCount Pro (pure JS, real-time)
9. `write/readscore/` — ReadScore (pure JS, text analysis)
10. `write/lorem/` — LoremCraft (pure JS, word pools)
11. `write/thread/` — ThreadCraft (pure JS, string splitting)
12. `study/flashcards/` — FlashForge (JS + localStorage)
13. `write/index.html` — write hub
14. `study/bias/` — BiasCheck (Gemini Nano + fallback — build last)

Build and manually test each tool in Chrome before moving to the next.
Tools 6–12 work offline immediately. Tool 14 requires Gemini Nano setup.

**After all tools are built, add the Cloudflare beacon script to every HTML file.**
Replace `YOUR_CLOUDFLARE_TOKEN` with the real token from your Cloudflare dashboard.

---

## SEO — per tool meta tags summary

| Tool | Primary keyword | Title tag |
|---|---|---|
| CiteMaker | citation generator | CiteMaker — Free Citation Generator \| tapdot |
| FlashForge | flashcard maker online | FlashForge — Free Flashcard Maker \| tapdot |
| GradeCalc | grade calculator | GradeCalc — GPA & Grade Calculator \| tapdot |
| BiasCheck | media bias checker | BiasCheck — Media Bias Analyser \| tapdot |
| ReadScore | readability checker | ReadScore — Readability Analyser \| tapdot |
| WordCount Pro | word counter | WordCount Pro — Word Counter \| tapdot |
| LoremCraft | lorem ipsum generator | LoremCraft — Placeholder Text Generator \| tapdot |
| ThreadCraft | twitter thread maker | ThreadCraft — Tweet Thread Formatter \| tapdot |

---

## Launch checklist

Before going live, verify every item:

- [ ] All 8 tools load at their correct URLs
- [ ] HTTPS enforced — green padlock on all pages
- [ ] Dark mode works and persists across sessions on all tools
- [ ] All tools work fully offline after first page load
- [ ] DevTools → Network tab shows zero third-party requests during tool use
  (Cloudflare beacon fires once on page load — this is expected and acceptable)
- [ ] Mobile-responsive down to 375px on all tools
- [ ] BiasCheck fallback works when Gemini Nano is unavailable
- [ ] FlashForge cards persist correctly in localStorage across sessions
- [ ] Privacy policy loads at tools.tapdot.org/privacy.html
- [ ] Every tool footer links to the privacy policy
- [ ] tapdot logo in nav links back to tapdot.org
- [ ] All title and meta description tags are correct
- [ ] Cloudflare analytics token replaced in all HTML files
- [ ] Cloudflare dashboard shows data coming in after first test visit
