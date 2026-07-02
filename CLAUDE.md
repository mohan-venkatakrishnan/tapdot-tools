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
- **Global search / command palette** (`initSearch`) — a search-bar button is injected
  into every nav (before the dark toggle); click it or press **Ctrl+K / Cmd+K** to open
  a Spotlight-style overlay that fuzzy-searches `TOOL_REGISTRY` and navigates via normal
  `<a href>` (so prerender/view-transitions still apply). **Every new tool/hub page MUST
  be added to `TOOL_REGISTRY` in shared.js** or it won't be searchable.
- **On-device AI**: `tapdotAI.availability()` → `available|downloadable|downloading|unavailable`
  and `tapdotAI.createSession(onProgress)`. Handles modern (`self.LanguageModel`) and legacy
  (`window.ai.languageModel`) APIs. Used by BiasCheck, FlashForge & CronLab. **Never** create a
  throwaway session just to detect — only read `availability()` on load; create the real
  session on a user gesture (that's what lets the model download).
- Utilities: `copyText`, `escapeHtml`, `showOutput`/`hideOutput`. Tool scripts rely on these.

Shared components in `shared/shared.css`: `.ts-nav` (search trigger + breadcrumb +
dark toggle), `.ts-main` (max-width 760; add `.ts-main-wide` — max-width 1180 — for hub
grids and workbench/table-heavy tools so wide screens don't force excess vertical
scrolling), `.ts-card`, `.ts-btn(-primary/secondary/ghost)`, `.ts-input/.ts-textarea/.ts-select`,
`.ts-segment` (tabs), `.ts-stats-grid/.ts-stat`, `.ts-table`, `.ts-mono-output`,
`.ts-hub-grid/.ts-hub-card/.ts-hub-icon`, `.ts-privacy-strip`, `.ts-callout`, `.ts-footer`,
`.ts-palette-*` (search overlay). Reuse these; avoid bespoke styles unless necessary.

**Interactive world map** (`dev/libs/tz/cities.js` + `dev/libs/tz/worldmap.js`, styled in
`dev/dev.css`): a themeable dot-matrix world map with a land mask rasterized once from a
public-domain SVG (see git history for the one-off script, since removed) and embedded as
a JS array — no runtime image requests. `renderWorldMap(container, {cities, selected, date,
onToggle})` draws land dots, a day/night terminator computed from `date`, pulsing markers,
and connecting arcs between selected cities. Shared by TimezoneNow and TZConvert; reuse it
for any future map-based tool rather than re-deriving a land mask.

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
6. Add an entry to `TOOL_REGISTRY` in shared.js so it's found by the Ctrl+K search palette.
7. Use `class="ts-main ts-main-wide"` instead of `class="ts-main"` if the tool has a
   workbench/table/grid layout that benefits from extra width (most dev tools do).
8. Add the Cloudflare beacon `<script>` (placeholder `YOUR_CLOUDFLARE_TOKEN`) before `</body>`.
9. Add the new route to `ROUTES` in `test/regression.mjs`, then run the test suite (below).
   Fix any overflow or JS errors. Then commit + push.

## Test suite (`test/`)

Playwright driving the system Chrome (no browser download).
```
cd test && npm install && npm test        # regression + functional
npm run regression                        # layout: mobile/tablet/desktop overflow checks,
                                           # screenshots to test/shots/
npm run functional                        # real interactions: search palette, world-map
                                           # clicks, sliders, JS-error checks — catches bugs
                                           # regression alone can't (see CronLab fix in v5)
```
Add new routes to `ROUTES` in `regression.mjs`; add new interaction checks to `functional.mjs`
when a tool has meaningful client-side behavior (not just static layout).
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
- v5: **dev collection** (tools.tapdot.org/dev) — 13 developer tools (JSONLab,
  JSONConvert, JWTRead, YAMLCheck, CSVExplore, MarkdownLive, HTMLPreview, SQLFormat,
  ColourContrast, UUIDGen, TimezoneNow, RegexLab, CronLab). Shared `dev/dev.css`;
  js-yaml bundled locally at `dev/libs/`. Dev inherits the purple accent (no theme
  override). CronLab uses `tapdotAI` for NL→cron with a rule-based fallback.
- v6: **TZConvert** (14th dev tool) — pick a date/time + source zone, drag a slider or
  click cities on an interactive world map to see conversions live, with per-day-offset
  badges. Built a reusable **world map component** (`dev/libs/tz/`) — dot-matrix land
  mask rasterized once from a public-domain SVG, day/night terminator, pulsing markers,
  connecting arcs — shared by TimezoneNow (which also gained the map). Added a global
  **Ctrl+K / Cmd+K search palette** (`TOOL_REGISTRY` in shared.js) reachable from every
  page's nav. Widened hub grids and workbench-heavy dev tools via `.ts-main-wide`
  (1180px) to cut vertical scrolling; bumped the default `.ts-main` to 760px. JWTRead
  gained a claims-explained table + a live expiry countdown. Added `test/functional.mjs`
  (Playwright interaction tests) alongside the layout regression — `npm test` runs both.
