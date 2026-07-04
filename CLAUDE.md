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
DNS on GoDaddy. See README.md for the one-time setup. Repo root MUST keep a `.nojekyll`
file — without it, Pages runs the legacy Jekyll build pipeline on every push, which has
no reason to succeed on a plain static HTML/CSS/JS site and failed silently (generic
"Page build failed", no details) for six pushes in a row (v10–v15) before this was
caught. `.nojekyll` makes Pages serve files as-is with no build step, matching the
project's actual architecture — never remove it.

**Base instruction: verify every deployment actually succeeds — never assume from
`git push` exit code alone.** After pushing to `main`:
1. Poll `GET /repos/mohan-venkatakrishnan/tapdot-tools/pages/builds/latest` (via the
   PAT embedded in `git remote get-url origin`) until `status` is `built` (success) or
   `errored` (failure) — don't stop at `building`.
2. If `errored`, or if `GET /actions/runs?per_page=5` shows the latest run for your
   commit as `conclusion: failure`, inspect the failed job's logs
   (`/actions/jobs/{id}/logs`) to tell a real content/build problem (fix the code) apart
   from GitHub-side infrastructure flakiness (e.g. "Deployment failed, try again later").
3. For infra flakiness: first try `POST /actions/runs/{id}/rerun-failed-jobs`. If that
   run doesn't move past `queued` within a few minutes (has happened — GitHub Actions
   runner assignment can itself stall), fall back to `git commit --allow-empty` + push,
   which reliably forces a fresh deployment.
4. Only report a deploy/ship as done once the Pages build for that exact commit SHA
   reports `built` and a live-site smoke check (`curl` a couple of routes for HTTP 200)
   confirms it. This happened for real on 2026-07-04 (v22, commit 49abad2) — the build
   succeeded but the deploy step hit a transient Pages API error; the rerun then stalled
   queued; an empty-commit push resolved it in under 2 minutes.

## Pending / not-yet-done

- Replace `YOUR_CLOUDFLARE_TOKEN` in every HTML `<script>` beacon before real launch.
- On-device AI (BiasCheck full analysis, FlashForge auto-format) needs Chrome 128+ with
  Gemini Nano flags; falls back gracefully otherwise. BiasCheck shows a flags guide.
- **The How-it-works walkthrough demos are still generic/abstract** (user feedback:
  "not really helpful"). A proper fix means researching each tool's top competitor and
  redesigning that tool's 3-step demo around its actual best-in-class UX — that's a
  per-tool design pass, not a mechanical change. Deferred; do this collection-by-collection
  alongside new tool builds, not as a single mechanical sweep.
- **`tapdot-tools-master-plan.md`** (repo root) specs 7 more collections — Marketing,
  Finance, Legal, HR, Health, Design, Productivity (46 tools). Not started. Build
  collection-by-collection (its own build order is in the doc), running the full test
  suite after each collection — do not attempt all 46 in one pass; that's exactly how
  the mobile-nav and grid-shrink bugs got introduced this round.

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
- v7: **Bug-fix pass** driven by real usage feedback.
  - **Dark-mode flash fixed at the root cause**: the theme decision now runs in an
    inline `<script>` in `<head>` on every page (before first paint), not in
    `shared.js` (loaded at the bottom of `<body>`). `shared.js` only wires the toggle
    button + swaps its icon (sun ↔ moon, via `syncThemeIcon()`) — it no longer decides
    the theme. **Any new page MUST include that inline snippet in `<head>` right after
    `<meta charset>`** or it will flash light before JS runs.
  - **Nav rebuild**: added an on-page **back button** (`initBackButton` — tool → its
    collection hub → root, hidden on root) computed from `data-collection`/`data-tool`,
    not `history.back()` (unreliable if the page was opened directly). Fixed the mobile
    breadcrumb collapse bug — it was hiding ALL crumbs including "Tools" (home),
    orphaning mobile users. Now only the **middle** crumb (`.ts-nav-crumb-mid`, the
    collection level) collapses at ≤480px; the first ("Tools") and last (current page)
    always stay. Logo also drops its text label at ≤480px (icon-only) to save width.
  - **New "Tools" mark**: replaced the generic 4-square grid icon with a T + dot glyph
    echoing the actual tapdot logo (`assets/tapdot-icon.png` — a "T" with a tap-dot
    below it) — used as the root/privacy favicon and the search palette's fallback icon.
  - **Search palette now categorized + themed**: results group under collection headers
    (`.ts-palette-group`) and each result/group carries `data-collection` so it renders
    in ITS OWN pastel colour regardless of the current page's theme — no more
    single-colour palette. The search trigger button itself also now shows a
    collection-tinted background by default (previously neutral gray until hover).
  - **Searchable dropdown component** (`enhanceSearchableSelects` in shared.js): any
    `<select data-searchable>` gets progressively enhanced into a themed type-to-filter
    combobox. The original `<select>` stays in the DOM (visually hidden) and still
    fires `change`/`input`, so tool scripts need **zero changes** — just add
    `data-searchable` to a `<select>` with a long option list. Applied to the 36-city
    timezone pickers in TimezoneNow + TZConvert.
  - **Fixed a systemic CSS Grid/Flexbox bug**: nested grid/flex containers don't shrink
    below their content's intrinsic min-width unless `min-width: 0` is set at EVERY
    level of nesting (CSS's `min-size: auto` default). This caused `.ts-workbench`
    cards (and nested `.dev-row`s inside them, e.g. CronLab's builder) to overflow on
    mobile even though individual children had already shrunk. Fixed globally:
    `.ts-select { min-width: 0; max-width: 100% }`, `.ts-workbench > * { min-width: 0 }`,
    `.dev-row { min-width: 0 }`. **Apply this pattern to any new nested grid/flex
    layout** — it's the #1 cause of "child shrank fine but the card still overflowed."
  - Also fixed: world-map marker hit-circles (invisible click targets) were large
    enough (r=11) to overlap neighboring cities in dense regions like Europe, causing
    clicks on one city to register on another — shrunk to r=7.
  - **CiteMaker** expanded from 4 styles/1 source type to **7 styles** (added IEEE,
    Vancouver, ASA) **× 5 source types** (Website, Book, Journal Article, Video,
    News/Magazine), each with type-appropriate fields (volume/issue/pages for
    journals, publisher/city/edition for books, etc.) — `FORMATTERS[style](type, f)`
    in `cite.js`. Field values persist across type switches (`fieldsState`).
  - `test/functional.mjs` grew to 28 checks (was 14) — covers the FOUC fix, back
    button targets, icon swap, palette grouping, searchable-select interaction, and
    the CiteMaker style/type matrix. All 81 layout + 28 functional checks pass.
- v8: **Marketing collection** (`marketing/`) — 8 tools: UTMBuilder, HeadlineScore,
  EmailSubjectTester, AdCopyWriter, SocialCalendar, PersonaBuilder, CompetitorMatrix,
  ROICalculator. Rose pastel theme. AdCopyWriter/PersonaBuilder/HeadlineScore/
  EmailSubjectTester use `tapdotAI` with rule-based fallbacks; the rest are pure JS
  (URL building, ROI/ROAS math, comparison tables, calendar CRUD in localStorage).
- v9: **Finance collection** (`finance/`) — 8 tools: CompoundCalc, BudgetPlanner,
  MortgageCalc, InvestmentTracker, TaxEstimate, CurrencyConvert, EquityCalc,
  NetWorthTracker. Sage pastel theme. Added `finance/libs/chart.js` (shared hand-rolled
  SVG line/donut chart, no dependency). **CurrencyConvert is the one tool site-wide
  that makes a network request** (open.er-api.com, cached daily in localStorage),
  disclosed prominently in-page. Bug fixed: TaxEstimate's regime tabs were hidden on
  load because the toggle only ran inside a click handler that never fires for the
  default-active tab — now also called once at init. Bug fixed: searchable-select
  label didn't sync after CurrencyConvert's async-populated `<select>` — see the
  general `enhanceSearchableSelects` fix below (applies site-wide, not just here).
- v10: **Legal collection** (`legal/`) — 6 tools: ContractRead (AI summarization,
  "not legal advice" disclaimer), NDAGenerator, PrivacyPolicyGen, TermsBuilder,
  CopyrightChecker, LegalGlossary (128 curated real terms in `legal/glossary/
  terms.js`, deliberately quality-over-quantity vs. the plan's "500+" — instant
  search + fuzzy-prefix typo tolerance + `#hash` deep-linking). Indigo pastel theme.
  Bug fixed: LegalGlossary's fuzzy matcher compared a typo against a whole
  multi-syllable word instead of a same-length prefix, so realistic typos never
  matched — fixed to compare same-length prefixes, matching how users type
  incrementally.
- v11: **HR collection** (`hr/`) — 6 tools: SalaryBand, JobDescriptionWriter (AI +
  exclusionary-language scan), InterviewKit (AI questions + rubric), OfferLetterBuilder,
  OnboardingChecklist (Day1/Week1/Month1, localStorage templates, CSV/Markdown export),
  LeaveCalculator. Plum pastel theme. Bug fixed: OnboardingChecklist's task-text input
  had `flex:1` but no `min-width:0`, overflowing mobile — another instance of the
  systemic min-width:0 pattern from v7, now also applied to `.checklist-item`.
  General fix (not HR-specific): `enhanceSearchableSelects` now listens for `change`
  on the underlying `<select>` so its label re-syncs after async population (surfaced
  by CurrencyConvert in v9, but applies to any future async-populated searchable select).
- v12: **Health collection** (`health/`) — 6 tools: BMICalc (BMI/BMR via Mifflin-St
  Jeor/TDEE/healthy range), MedicationLog (adherence % over trailing 7/30 days),
  SymptomDiary (calendar heatmap by severity + `tapdotAI` doctor-visit summary),
  CycleTracker (period/fertile-window/ovulation prediction), WaterIntake (SVG progress
  ring, tap-to-log, streak, optional `Notification` reminders), SleepLog (duration +
  bedtime-consistency stat + `tapdotAI` pattern analysis). Sky-blue pastel theme.
  Every page carries a `.health-sensitive-note` disclosure banner (this data is
  unusually sensitive — still 100% local, never transmitted) plus a "not a substitute
  for medical advice" line on tools that could be read as diagnostic. All 6 tools use
  the same localStorage-array-of-entries pattern with a per-tool key
  (`tapdot-<tool>-log`) — no shared storage module, kept intentionally simple since
  each tool's entry shape differs. `test/regression.mjs` grew to 198 checks,
  `test/functional.mjs` to 86 — both suites pass with 0 failures.
- v13: **Design collection** (`design/`) — 6 tools: PaletteForge (base-colour → 5-shade
  palette + WCAG contrast ratios + CSS/Tailwind/HSL export), TypographyScale (9-step
  scale from base size + ratio), IconExplorer (curated ~90-icon outline set — see below
  — search/filter, live stroke-width/colour styling, copy as SVG/JSX/Vue/path-data),
  ShadowStudio (up to 5 layered box-shadows with flat/material/neumorphic/glass
  presets), SpacingCalc (linear or 1.5x-multiplicative scale, CSS/Tailwind/JSON
  export), GradientMaker (linear/radial/conic, colour stops with position + opacity).
  Violet pastel theme.
  - **IconExplorer ships a curated ~90-icon set** (`design/libs/icons.js`), not the
    plan's aspirational "5,000+" — same deliberate quality-over-quantity call as
    LegalGlossary's 128 terms vs. "500+". Icons are hand-authored generic outline
    shapes (24x24, stroke-based), not a bundled third-party library.
  - **Bug found and fixed — global identifier collisions with shared.js**: both
    `design/libs/icons.js` (`const ICONS`) and `design/spacing/spacing.js`
    (`const STEPS`) redeclared globals that `shared.js` already owns site-wide
    (`ICONS` = tool-icon lookup map, `STEPS` = walkthrough demo data) — since none of
    these scripts are ES modules, they all share one global scope per page, and the
    redeclaration threw `SyntaxError: Identifier '...' has already been declared`,
    silently breaking the whole page's JS. Renamed to `ICON_LIBRARY` and
    `SCALE_STEPS`. **Any new tool script must avoid `ICONS`, `ICON_PATHS`,
    `TOOL_REGISTRY`, `COLLECTION_LABELS`, `STEPS`, and `tapdotAI`** — those are
    shared.js's top-level globals. This class of bug is invisible to the layout
    regression suite (the page still renders, just inert) and only surfaces via a
    `pageerror` listener, which is why `test/functional.mjs`'s per-tool "no JS
    errors" check exists — it caught both instances here.
  - Bug found and fixed: `.shadow-layer` and `.gradient-stop-row` used rigid
    `grid-template-columns` with too many fixed tracks, overflowing at 375px —
    another instance of the min-width:0 grid pattern from v7, fixed by switching both
    to `flex-wrap: wrap` with `flex: 1 1 <basis>` children instead of a fixed grid.
  - Added `.ts-card-title` to `shared.css` (was missing — Health's v12 cards used the
    class already but it had no rule, so those `<h2>`s rendered unstyled; now fixed
    retroactively for Health too).
  - `test/regression.mjs` grew to 219 checks, `test/functional.mjs` to 103 — both
    suites pass with 0 failures.
- v14: **Productivity collection** (`productivity/`) — 6 tools, completing all 10
  planned collections (68 tools total: 4 study + 4 write + 14 dev + 8 marketing +
  8 finance + 6 legal + 6 hr + 6 health + 6 design + 6 productivity). FocusTimer (Pomodoro 25/5/15, browser
  notifications, session log), QuickNote (up to 10 autosaving notes, 500ms debounce,
  .txt/.md export), DecisionMatrix (weighted criteria × options, CSV/Markdown
  export), MeetingTimer (live per-second cost from attendee salaries, budget alert,
  state shareable via URL hash — base64 JSON, no server), HabitTracker (daily
  check-off, streaks, 30-day completion rate + heatmap), ReadingList (to-read/
  reading/done status cycling, notes, Markdown export). Teal-cyan pastel theme.
  Clean pass — no bugs found in regression or functional; the ICONS/STEPS global-
  collision class of bug from v13 didn't recur since no tool declared those names.
  `test/regression.mjs` grew to 240 checks, `test/functional.mjs` to 118 — both
  suites pass with 0 failures.
- v15: **Final integration pass** — all 10 collections (68 tools) now live on the
  hub. Root `index.html` got 7 new collection cards (Marketing/Finance/Legal/HR/
  Health/Design/Productivity) alongside Study/Write/Dev, plus updated hero copy and
  meta description reflecting the full tool count. `privacy.html` rewritten to
  cover all collections: the CurrencyConvert exchange-rate fetch is now disclosed
  as the second (and last) network exception alongside CiteMaker's URL lookup; the
  on-device-AI section now lists every `tapdotAI`-using tool, not just BiasCheck;
  added dedicated Health-data and Legal/HR-data sections since those collections
  handle unusually sensitive information. Ran the full `test/regression.mjs` (240
  checks) and `test/functional.mjs` (118 checks) across the entire site — both pass
  with 0 failures, confirming no regressions from the last five collections' worth
  of shared.js/shared.css changes.
- v16: **UI/UX bug-fix pass + homepage redesign** (driven by user feedback: unstyled
  buttons on UTMBuilder, default input styles in HR, weak AI fallbacks, cluttered
  homepage).
  - **Cross-collection CSS leakage fixed**: `.ts-pill-tabs`/`.ts-pill-tab` and
    `.ts-workbench` lived only in `dev/dev.css` but were used by marketing/finance/
    legal/HR pages — those pages rendered browser-default buttons / stacked layouts.
    Moved to `shared.css`. Same consolidation for `.biz-matrix` + `.biz-rm`
    (duplicated in marketing.css + finance.css, MISSING from hr.css — the HR
    default-input bug). Added `.ts-table input/select` quiet styling (ROICalculator)
    and `.ts-text-success`/`.ts-text-danger` utilities (were used, never defined).
    **Rule: any `ts-*`/`biz-*` class used by more than one collection MUST live in
    shared.css, not a collection stylesheet.**
  - **New `test/css-audit.mjs`**: statically flags (a) classes used in HTML/JS but
    defined in no CSS file (hard fail) and (b) classless form controls (warnings —
    many are styled by descendant selectors). Run alongside the other suites.
  - **AI fallbacks are now functional, not just apologetic** — every AI-dependent
    tool produces useful output without on-device AI: AdCopyWriter (formula variants
    trimmed to platform character limits), PersonaBuilder (structured skeleton built
    from the brief), EmailSubjectTester (question/urgency/personalization formula
    variants), ContractRead (risk-clause keyword scan: termination, indemnification,
    auto-renewal, arbitration, liability, etc.). Each fallback message says what
    you're getting and how to enable full AI. **Pattern for new AI tools: the
    unavailable branch must DO something useful, never just tell the user to go
    enable a flag.**
  - **Search palette knew only 4 collections**: `GROUP_ORDER`/`GROUP_LABELS` in
    `initSearch` were never updated for the 7 new collections — results sorted by
    NaN and group headers showed raw slugs. Fixed; also `[data-open-search]` on any
    element now opens the palette (used by the homepage hero).
  - **Homepage redesigned as a landing page**: hero (privacy badge, accent headline,
    hero search bar wired to the Ctrl+K palette, stat chips 68 tools/10 collections/
    0 accounts/$0) + collections grouped into three sections — "For study & writing",
    "For work", "For life" — instead of one undifferentiated 10-card wall.
    Hero styles under `.ts-hero*`/`.ts-home-section*` in shared.css.
  - `test/functional.mjs` grew to 125 checks (hero palette, group labels, adcopy +
    contract fallbacks). All 240 layout + 125 functional checks pass.
- v17: **Deep UX pass — Marketing collection** (per-tool, competitor-referenced;
  the model for future collection passes).
  - **UTMBuilder** (ref: Google Campaign URL Builder): live URL preview on every
    keystroke with "still needed: …" hints, datalist presets for source/medium,
    forgiving URLs (auto-prepends https://, rejects hostname without a dot), and
    a normalization note explaining lowercase/underscore rewriting. Build button
    now copies AND saves to history in one tap.
  - **HeadlineScore** (ref: CoSchedule Headline Analyzer): scores live as you
    type; word-balance chips classifying every word (common/uncommon/emotional/
    power/number); word + character meters with ideal-range markers (6–12 words,
    ≤60 chars for Google); actionable "to improve" suggestions; a saved-headline
    comparison list with 🏆 on the best; formula-based rewrites when AI is off.
  - **EmailSubjectTester** (ref: Mailmeteor/Omnisend previewers): honest Gmail-
    style inbox previews for desktop (~70 chars, with sender + preheader in-row,
    a dimmed competing email underneath) and mobile (~35 chars, stacked), with
    exact cut-off counts.
  - **AdCopyWriter**: every variant now renders as a real ad mockup — Google SERP
    ad (Ad badge, blue headline, dark-mode aware) or Meta/LinkedIn feed card
    (avatar, sponsored label, media placeholder, CTA button) — above the
    per-field character-limit rows.
  - Smaller: ROICalculator + CompetitorMatrix mark the winner (🏆); SocialCalendar
    highlights today and adds a "Next 7 days" list; PersonaBuilder exports any
    persona as Markdown.
  - css-audit caught two undefined wrapper classes introduced during this very
    pass (.utm-live, .hl-meter) — the audit already pays for itself.
  - `test/functional.mjs` grew to 140 checks. All 240 layout + 140 functional +
    css-audit pass.
- v18: **Deep UX pass — Dev collection.** Audited all 14 tools; most were already
  competitive (UUIDGen, JSONLab, YAMLCheck, SQLFormat, CSVExplore, ColourContrast,
  CronLab, and the timezone pair needed nothing), so this pass targeted the three
  real gaps:
  - **JWTRead** (ref: jwt.io): HMAC signature verification (HS256/HS384/HS512) via
    WebCrypto — paste the shared secret, get a live verified/invalid badge; the
    secret never leaves the page. Non-HMAC algs (RS/ES) still show inspection-only
    with the "never paste private keys" warning.
  - **RegexLab** (ref: regex101): 10 common-pattern presets (email, URL, IPv4,
    date, UUID, semver, …) that also load a matching sample test string, plus a
    21-entry syntax cheat sheet card.
  - **MarkdownLive**: GFM table support in the hand-rolled parser (header +
    |---| separator + body rows); preview table CSS already existed.
  - Test-writing gotcha worth remembering: the canonical jwt.io example token is
    signed with the secret `your-256-bit-secret`, not `secret` — the verify test
    failed on first run for exactly this reason while the implementation was fine.
  - `test/functional.mjs` grew to 148 checks. All suites pass.
- v19: **Deep UX pass — remaining collections** (Finance, Study, Write, Health,
  Productivity; Legal/HR/Design audited and already complete — doc downloads and
  the newest patterns were in place from day one).
  - **Finance**: `finance/libs/chart.js` now supports overlay series (dashed, same
    axis). CompoundCalc plots your contributions under the balance line with a
    legend spelling out the interest gap (the investor.gov insight). TaxEstimate
    adds a marginal-rate stat next to effective rate. EquityCalc renders ownership
    bars after the round. CurrencyConvert adds an xe.com-style quick-conversion
    table (1/10/100/1k/10k both directions).
  - **Study**: FlashForge decks export/import as JSON, preserving SM-2 scheduling
    state (`{name, cards}` with q/a/interval/ease/due; import backfills missing
    scheduling fields). Keyboard shortcuts already existed.
  - **Write**: ReadScore and ThreadCraft now analyze/split live (300ms debounce)
    instead of requiring a button click — the Hemingway pattern; buttons kept as
    explicit triggers.
  - **Health**: BMICalc metric/imperial toggle (lb + ft/in) that converts current
    values in place when switching so the person being measured doesn't change;
    healthy range shown in the active unit.
  - **Productivity**: FocusTimer shows the live countdown in the tab title
    (`24:59 · Focus — FocusTimer`) so it's visible from other tabs; restores the
    original title on pause.
  - `test/functional.mjs` grew to 162 checks. All 240 layout + 162 functional +
    css-audit pass. This completes the per-collection UX pass programme (v17–v19)
    across all 10 collections.
- v20: **Three new finance tools** (user request: a complete loan calculator plus
  more universally useful finance tools). Site now 71 tools; homepage counts and
  finance hub card updated.
  - **LoanCalc** (`finance/loan/`) — the comprehensive loan tool: EMI, total
    interest, interest-as-%-of-loan; unlimited lump-sum part payments (month +
    amount rows) plus optional extra-per-EMI; a strategy toggle — keep EMI &
    reduce tenure vs keep tenure & reduce EMI (recomputes EMI after each lump on
    the remaining original tenure); impact card (interest saved, paid off earlier,
    EMI change, new payoff); baseline-vs-prepaid balance projection chart using
    chart.js overlay series; year-by-year amortisation with an interest-share
    column. Simulation is month-by-month with a guard for EMIs that don't cover
    interest. Distinct from MortgageCalc (which stays simple: EMI + flat monthly
    overpayment); LoanCalc is the "everything" tool.
  - **RetireCalc** (`finance/retire/`) — corpus needed at retirement (expenses
    inflated to retirement age, then a 30-year drawdown annuity at the REAL
    post-retirement return, i.e. (1+post)/(1+inflation)−1), corpus projected from
    current savings + monthly investing, shortfall/surplus, and the monthly
    investment that closes the gap. Includes a plain-English "how it's calculated"
    paragraph and a growth chart with the needed-corpus line overlaid.
  - **InflationCalc** (`finance/inflation/`) — future cost of today's amount,
    what today's amount will buy then, % purchasing power lost, and the halving
    time (ln2/ln(1+r)); purchasing-power decay chart + year-by-year table.
  - Fixed a global mobile bug the new tools surfaced: `.ts-stat` values with long
    unbreakable strings ("$43,391 → $41,200") overflowed 375px viewports — added
    `min-width: 0` + `overflow-wrap: anywhere` to `.ts-stat`/`.ts-stat-num` in
    shared.css (another instance of the v7 min-width gotcha).
  - `test/regression.mjs` → 249 checks, `test/functional.mjs` → 173 (LoanCalc EMI
    formula accuracy, part-payment impact, reduce-tenure > reduce-EMI savings
    invariant, chart overlay; RetireCalc positivity + plain-English explainer;
    InflationCalc future-cost and halving-time accuracy). All suites pass.
- v21: **Big user-requested batch — currency formats + 9 new tools (site now 80).**
  - **`finance/libs/money.js` (`tapdotMoney`)**: shared currency-symbol picker
    ($ ₹ € £ ¥ A$ C$ S$ CHF R R$ د.إ) + number-format toggle (Million/Billion
    en-US grouping vs Lakh/Crore en-IN grouping), persisted in localStorage,
    auto-injected into every finance tool's header. Tools' local `fmtMoney`
    now delegates to `tapdotMoney.fmt`; on change the picker calls the page's
    global `render()` (falls back to reload). TaxEstimate intentionally keeps
    its own per-country symbols. **New finance tools must use tapdotMoney.**
  - **JWTRead → encode + decode** (jwt.io parity): new "Encode & sign" pill tab —
    JSON payload, HS256/384/512, WebCrypto signing, live token output, and an
    explicit disclosure that secrets never leave the page (and a warning to only
    use test secrets in ANY browser tool). Verified in tests to round-trip the
    canonical jwt.io token byte-for-byte.
  - **Base64Tool** (`dev/base64/`): live encode/decode, UTF-8 safe
    (TextEncoder→btoa), URL-safe alphabet option, byte counts, friendly errors.
  - **DiffCheck** (`dev/diff/`): LCS line diff with +/− highlighting and counts;
    debounced live; guards against quadratic blowup on huge inputs (>4M cell cap).
  - **WSTester** (`dev/websocket/`): direct browser→server WebSocket connection
    (disclosed prominently — no proxy, tapdot never sees traffic), status badge,
    timestamped send/receive log, Ctrl+Enter to send. privacy.html gained a
    WSTester section since it's inherently a network tool.
  - **CodePlay** (`dev/play/`): JSFiddle-style HTML/CSS/JS editors + sandboxed
    `srcdoc` iframe (allow-scripts only) with console.log/warn/error captured via
    a postMessage bridge; debounced auto-run; localStorage autosave.
  - **BigOCheck** (`dev/bigo/`): structural time-complexity estimator — loop
    nesting (brace AND indent passes for C-like/Python), halving-loop → O(log n),
    recursion / divide-and-conquer detection, costly built-ins (sort, includes
    in loops) — with reasons listed, plus optional on-device AI explanation.
  - **WorldClock** (`dev/worldclock/`): analog SVG clocks per city (searchable
    picker from TZ_CITIES), three themes (airport dark/Swiss, classic, minimal),
    night indicator, digital+date line, and TV fullscreen via the shared
    `initMapFullscreen` helper.
  - **SketchPad** (`design/sketch/`): element-based local whiteboard — pen, line,
    arrow, rect, ellipse, text; colour + width; undo (button & Ctrl+Z); PNG
    export on white; localStorage autosave; touch support.
  - **PhotoTune** (`design/photo/`): fully local canvas photo editor —
    brightness/contrast/saturation/sepia/blur via ctx.filter, rotate 90°, flip
    H/V, export width + PNG/JPEG. Display capped at 900px wide; export renders
    at full/chosen resolution. (Answer to "can a photo editor stay local": yes.)
  - **UnitConvert** (`productivity/convert/`): 8 categories (length, weight,
    temperature, area, volume, speed, data incl. binary units, time), live
    conversion + an all-equivalents grid. 3D presentation was considered and
    skipped deliberately — it would hurt readability for a reference tool.
  - **World map**: selected cities now show persistent name labels
    (`.tzm-label`, stroke-outlined for readability, flipped below dots near the
    top edge); hover tooltips already existed. TimezoneNow + TZConvert gained
    ⛶ Fullscreen (`initMapFullscreen` in worldmap.js) for TV/wall displays.
  - Suites: 276 layout / 197 functional / css-audit clean (one false positive —
    CodePlay's starter-example `.card` lives in user-space iframe CSS — added to
    the audit's IGNORE list with a comment).
- v22: **User-feedback batch + Chrome AI collection (site now 82 tools, 11
  collections).**
  - **DiffCheck**: Prev/Next change-block navigation with a position badge and
    a highlighted current block — no more scrolling to hunt for changes.
  - **World map**: collision-aware persistent labels (tries above/below/right/
    left, skips only when every slot clashes — Europe stays readable). Labels
    live in a SEPARATE SVG layer (.tzm-labelbox): putting them inside marker
    <g>s inflated the group bounding boxes and broke click targeting (caught by
    the functional suite). Day/night split now obvious: stronger overlay,
    dashed terminator edges, sun/moon glyphs.
  - **TZConvert**: world map first, source-time + converted-times side by side
    in a workbench; new cities added to the TOP of the list (same in
    TimezoneNow) so 'Use now' results are visible without scrolling.
  - **JWTRead → JWTStudio** (it encodes now too): encode tab gains RS256/384/512
    and ES256/384/512 — PKCS#8 PEM private-key input plus a WebCrypto
    'Generate test keypair' button that also prints the public key. WebCrypto's
    ECDSA sign output is already the raw r||s JWS wants.
  - **View source everywhere**: shared.js injects a GitHub footer link on every
    page pointing at that tool's exact folder (REPO_URL + pathname) — trust via
    auditability, ahead of the PayPal donate button.
  - **Chrome AI collection** (11th collection, coral theme, /ai/): AISummarize
    (Summarizer API — TL;DR/key-points/teaser/headline × length) and AITranslate
    (Translator + LanguageDetector, 15 target languages, debounced live).
    Both start with an explicit support GATE: green when ready, download notice
    when the model needs fetching, and a greyed-out tool (.ai-disabled) with a
    plain-English reason when the browser/device can't run it (non-Chrome,
    mobile, low storage/GPU). Never silently broken.
  - **Base UI rules added**: .ts-stat-num uses clamp() so long money values
    shrink instead of wrapping (LoanCalc complaint); stats grid min column
    150px; LoanCalc part-payment rows are nowrap with fixed/flex splits and a
    stress test (add 4 rows, desktop + 375px, no overflow).
  - **Finance charts are interactive**: chart.js grew a hover crosshair +
    nearest-point tooltip (label + all series values, money-formatted via
    tapdotMoney); loan/compound/retire/inflation pass meaningful labels.
  - Suites: 285 layout / 212 functional / css-audit clean.

- v23: **PRD-driven batch** (`tools tapdot prd 1.md` — a feedback doc with embedded
  screenshots; extract text with `grep -v "^\[image"` before reading, the base64 image
  defs blow up token budget otherwise). Site now 86 tools + a non-tool Browse page.
  - **Light mode softened**: was near-white/near-black (#FFFFFF text on #0F0F1A) —
    user feedback "too bright" vs tapdot.org's mellower light mode. Retuned to a warm
    off-white (#FAF9F6 bg, #262521 text) across all light-mode tokens.
  - **Stat-number overflow (real bug, not cosmetic)**: `clamp()`'s minimum still didn't
    fit long lakh/crore-formatted values (₹1,04,13,879) on narrow cards — the visible
    "wrap" was `overflow-wrap: anywhere` breaking mid-digit-group. Fixed generically:
    `initStatFit()` in shared.js measures every `.ts-stat-num` and steps its font-size
    down (24px→10px) until it fits on one line, re-triggered via a MutationObserver on
    `document.body` (tool scripts already re-render stat text on input, no per-tool
    changes needed) + on resize. **Any new stat display gets this for free** — don't
    hand-roll font sizing for numbers again.
  - **AITranslate box alignment**: added matching "To" label above the target-language
    select (the From/To columns had mismatched header heights) — `.ai-translate-col`/
    `.ai-translate-head` in shared.css.
  - **Search palette decluttered**: the default (empty-query) list no longer includes
    the root "Tools" hub or "Privacy Policy" — still findable by typing, just not
    competing with real tools at the top of an empty search.
  - **Browse page** (`/browse/`) — every registry tool as a pastel card grouped by
    collection (reuses `TOOL_REGISTRY`/`ICONS`/`COLLECTION_LABELS`, no new data source),
    with a collection filter segment and a name/desc search box. Linked from the
    homepage hero ("browse every tool as pastel cards").
  - **Homepage 3D flourish**: `initCardTilt()` — a light perspective tilt on hub cards
    following the cursor (skipped for `prefers-reduced-motion` and touch/no-hover
    devices). Deliberately subtle, not a gimmick.
  - **IconExplorer**: +36 icons (business, education, transport, food, extra shapes) —
    161 total, still hand-authored/curated, not a bundled library (see v13 rationale).
  - **Health animations**: WaterIntake gets a tumbler-style pour splash (droplet
    particles + ring pulse) on logging; CycleTracker's stats glow briefly after logging
    a period. Both respect `prefers-reduced-motion`.
  - **4 new dev tools** (from the PRD's "New tool suggestion" list — a large wishlist;
    shipped the quick, high-value, no-new-dependency subset and left WASM-heavy asks
    — bcrypt/Argon2, MozJPEG image compression — explicitly deferred, noted below):
    - **TimestampConvert**: Unix timestamp ⇄ date, live-ticking current epoch,
      timestamp→date across 7 common zones + ISO 8601, date→timestamp for any IANA
      zone (iterative offset convergence via `Intl.DateTimeFormat`, no timezone lib).
    - **JSONCSV**: JSON array-of-objects ⇄ CSV, dotted-path flattening for nested
      objects, RFC-4180-ish quoting, a from-scratch quoted-field CSV parser.
    - **HashGen**: SHA-1/256/384/512 for text or files via `crypto.subtle.digest`,
      with an explicit callout that these are wrong for password storage (that needs
      bcrypt/Argon2/scrypt — deliberately not implemented here, no WASM bundled).
    - **KeyGen**: RSA (2048/4096) and ECDSA (P-256/P-384) keypair generation via
      WebCrypto, exported as PKCS#8/SPKI PEM — dev/test use only, disclosed as such.
  - Deferred from the PRD (documented, not silently dropped): bcrypt/Argon2 hashing,
    client-side image-to-Base64 (partially covered by Base64Tool for text; a
    file→dataURI variant is a natural PhotoTune/Base64Tool follow-up), on-device image
    compression (MozJPEG/WebP — needs a WASM codec we don't bundle), SVG bloat
    stripper, voice-to-text (WebSpeech API), additional Chrome AI tools beyond
    Summarize/Translate (Writer/Rewriter/Prompt-API-direct/bulk sentiment/ELI5/jargon
    decoder — same gate pattern as AISummarize/AITranslate would apply cleanly to
    these later), SQL obfuscator (distinct from the existing SQLFormat pretty-printer),
    a full sitemap-style "graph view."
  - Caught and fixed a self-inflicted test bug during this pass: a functional check
    asserted the mobile 376px overflow threshold against the DEFAULT (1280px) Playwright
    viewport — a copy-paste mistake in the test, not a product bug. Removed the
    incorrect assertion; the real mobile-viewport overflow check for the same tool
    already existed and passes.
  - Suites: 300 layout / 232 functional / css-audit clean.
- v24: **Remaining PRD-deferred items + sitewide PayPal donate link (site now 90
  tools).**
  - **PassHash** (`dev/passhash/`) — real bcrypt and Argon2id, not toy implementations:
    vendored `hash-wasm`'s WASM builds of the reference C implementations
    (`dev/libs/hash-wasm-bcrypt.js` / `hash-wasm-argon2.js`, self-contained, WASM
    embedded as base64, no separate fetch — same vendoring pattern as `js-yaml.min.js`).
    Hash and Verify pill-tabs, adjustable bcrypt cost factor (4–14) and Argon2id
    iterations/memory, an explicit "for development and testing only" callout (a
    browser tab is not where production password hashes should be generated).
    Deliberately did NOT hand-roll Blowfish S-boxes or Argon2's memory-hard mixing
    function from memory — correctness-critical crypto code shouldn't be transcribed
    from training data; verified the vendored WASM round-trips (hash→verify→reject-
    wrong-password) before shipping.
  - **ImageCompress** (`design/imagecompress/`) — resize + recompress images using
    the browser's own `canvas.toBlob()` encoder (JPEG/WebP/PNG), no WASM codec
    needed since this isn't MozJPEG-specific compression, just native re-encoding.
    Max-width and quality sliders, live before/after size comparison with % saved.
  - **AIWrite** and **AIRewrite** (`ai/write/`, `ai/rewrite/`) — the last two Chrome
    built-in AI tools from the deferred list, using the `Writer` and `Rewriter`
    APIs. Same gate pattern as AISummarize/AITranslate (`availability()` on load,
    session created on the user's click, never a throwaway detection session).
    AIWrite drafts from bullet points (tone/length/format); AIRewrite changes tone
    or length of existing text.
  - **PayPal "buy me a coffee" footer link, sitewide** (user request) — `initDonateLink()`
    in `shared/shared.js`, modeled directly on the existing `initSourceLink()` pattern:
    appends a `.ts-footer-dot` separator + `<a href="https://paypal.me/MohanVenkatakrishnan">`
    into every page's `.ts-footer` automatically, no per-page HTML edits needed.
    Called from the same `DOMContentLoaded` handler as every other shared init.
  - Still explicitly deferred (unchanged from v23): SVG bloat stripper, voice-to-text
    (WebSpeech API), SQL obfuscator, sitemap-style graph view.
  - Suites: 312 layout / 243 functional / css-audit clean (0 issues).
