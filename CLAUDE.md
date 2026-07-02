# tapdot Tools — base spec for Claude Code

This is the source of truth for how this project is built. **Read it before adding or
changing tools, and update it whenever we change a base decision or branch a new idea.**
Live at **tools.tapdot.org** (GitHub Pages, repo `mohan-venkatakrishnan/tapdot-tools`).

## Core principles (do not break)

- **Static, browser-only.** Plain HTML/CSS/JS. No build step, no framework, no backend.
  Nothing the user types is sent anywhere. Exceptions must be disclosed in `privacy.html`
  (currently: CiteMaker URL lookup via allorigins proxy; Cloudflare analytics beacon).
- **One job per page.** Each tool is its own folder with `index.html` + `<tool>.js` + `<tool>.css`.
- **Offline-capable.** Each page works standalone after first load. On-device AI only.
- **Clean URLs + SEO.** Real page per tool with its own `<title>`/meta/canonical. We do
  NOT use a client-side router. The "SPA feel" comes from cross-document **View
  Transitions** (`@view-transition{navigation:auto}` in shared.css) + **speculation-rules
  prerender on hover** (injected by shared.js). Keep it that way.

## Collections & theming

Collections: `tools` (hub, purple), `study` (pastel teal), `write` (warm clay),
`dev` (dev tools). Accent + glow tokens per collection live in `shared/shared.css`
under `[data-collection="…"]` (plus dark variants `[data-theme="dark"][data-collection="…"]`).
Keep accents **pastel / easy on the eyes** (user preference) — not flashy.

Each page's `<html>` tag MUST set `data-collection` and (for tool pages) `data-tool`:
`<html lang="en" data-collection="study" data-tool="CiteMaker">`.
This single attribute drives: theme accent, breadcrumb, tool icon, favicon tile,
and the How-it-works walkthrough.

## Shared shell (`shared/shared.js`) — runs on DOMContentLoaded

- **Dark mode** (`initDarkToggle`, persisted in `localStorage['tapdot-theme']`).
- **Favicon tile** (`initFavicon`) — per-page colored rounded tile with the tool/category
  icon, from `ICON_PATHS` + collection color. Replaces the generic tapdot icon.
- **Background** (`initBackground`/`initParallax`) — blurred orbs + grid, mouse/scroll
  parallax. Respects `prefers-reduced-motion`.
- **Breadcrumb** (`initBreadcrumb`) — builds `tapdot / Tools / <Category> / <Tool>` from
  `data-collection`/`data-tool`. Add new collections here.
- **Tool icon** (`initToolIcon`) — icon beside the `<h1 class="ts-tool-name">` from `ICONS[tool]`.
- **How it works** (`initWalkthrough` + `initSequencer`) — bottom Step 1→2→3 card.
  Steps play **one at a time on a loop** (sequencer toggles `.playing`); demos animate
  only while their step is `.playing`. Each demo shows **real sample text** — never reuse
  a generic abstract animation across tools.
- **Scroll reveal** (`initReveal`) and **prerender** (`initSpeculation`).
- **On-device AI**: `tapdotAI.availability()` → `available|downloadable|downloading|unavailable`
  and `tapdotAI.createSession(onProgress)`. Handles modern (`self.LanguageModel`) and legacy
  (`window.ai.languageModel`) APIs. Used by BiasCheck & FlashForge. **Never** create a
  throwaway session just to detect — only read `availability()` on load; create the real
  session on a user gesture (that's what lets the model download).
- Utilities: `copyText`, `escapeHtml`, `showOutput`/`hideOutput`. Tool scripts rely on these.

Shared components in `shared/shared.css`: `.ts-nav`, `.ts-main` (max-width 680),
`.ts-card`, `.ts-btn(-primary/secondary/ghost)`, `.ts-input/.ts-textarea/.ts-select`,
`.ts-segment` (tabs), `.ts-stats-grid/.ts-stat`, `.ts-table`, `.ts-mono-output`,
`.ts-hub-grid/.ts-hub-card/.ts-hub-icon`, `.ts-privacy-strip`, `.ts-callout`, `.ts-footer`.
Reuse these; avoid bespoke styles unless necessary.

## How to add a NEW tool (checklist)

1. Create `<collection>/<slug>/` with `index.html`, `<tool>.js`, `<tool>.css`.
2. Copy an existing tool's `index.html` as a template. Set:
   - `<html lang="en" data-collection="…" data-tool="Display Name">`
   - `<title>`, meta description, `og:*`, canonical URL
   - nav (logo + dark toggle only — breadcrumb is injected by shared.js)
   - `<link rel="stylesheet" href="/shared/shared.css">` then the tool css
   - scripts: `/shared/shared.js`, then `<tool>.js` (defer), then the Cloudflare beacon
   - keep the `.ts-privacy-strip`, `.ts-tool-header` (h1.ts-tool-name + p.ts-tool-desc), footer
3. Add an icon: `ICON_PATHS['Display Name']` in shared.js (inner SVG paths, 24×24,
   stroke currentColor) AND export `assets/icons/<slug>.svg`.
4. Add the walkthrough: `STEPS['Display Name'] = [ {t,d:{k,…}}, {…}, {…} ]` in shared.js.
   Demo kinds (`d.k`): `text`, `result`, `fields`, `flip`, `rate`, `rows`, `count`,
   `hl` (highlight words), `chips`, `scan`, `stats`, `table`, `tweets`. Use real sample text.
5. Add the tool's card (with icon) to its collection hub `index.html`.
   If it's a new collection, create `<collection>/index.html`, add it to the root `index.html`,
   add the collection to `initBreadcrumb`, theme tokens in shared.css, and the favicon color map.
6. Add the Cloudflare beacon `<script>` (placeholder `YOUR_CLOUDFLARE_TOKEN`) before `</body>`.
7. Run the regression harness (below). Fix any overflow. Then commit + push.

## Regression harness (`test/`)

Playwright driving the system Chrome (no browser download). Loads every page at
mobile/tablet/desktop, fails on horizontal overflow / out-of-bounds elements, saves
screenshots to `test/shots/`. Add new routes to the `ROUTES` array in `test/regression.mjs`.
```
cd test && npm install && npm run regression
```
`test/node_modules` and `test/shots` are gitignored.

## Deploy

Push to `main` → GitHub Pages auto-deploys. Custom domain via `CNAME` (tools.tapdot.org),
DNS on GoDaddy. See README.md for the one-time setup.

## Pending / not-yet-done

- Replace `YOUR_CLOUDFLARE_TOKEN` in every HTML `<script>` beacon before real launch.
- On-device AI (BiasCheck full analysis, FlashForge auto-format) needs Chrome 128+ with
  Gemini Nano flags; falls back gracefully otherwise. BiasCheck shows a flags guide.

## Change log of base decisions

- v1: 8 tools (study + write), shared design system, GitHub Pages + CNAME.
- v2: per-collection pastel themes, breadcrumb, futuristic background/parallax,
  View-Transition instant nav, first How-it-works card, BiasCheck AI detection fix.
- v3: How-it-works moved to a bottom Step 1→2→3 walkthrough; tool/category icons +
  `assets/icons/`; persistent BiasCheck flags guide; Playwright regression harness.
- v4: unique per-tool walkthrough demos with real sample text, played sequentially;
  per-page favicon tiles; shared `tapdotAI`; FlashForge attach-file + AI auto-format.
