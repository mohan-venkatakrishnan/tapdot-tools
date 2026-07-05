# tapdot Desktop

The native Electron wrapper for [tapdot tools](https://tools.tapdot.org) — same
92 tools, same HTML/CSS/JS, loaded from local disk instead of a server. Lives
inside the `tapdot-tools` repo (not a separate repo/submodule) so the site and
the desktop app always ship the same tool code — one source of truth, no sync
step to forget.

## Local development

```bash
cd electron
npm install
npm start          # copies tools/ from the parent repo, then launches the app
```

`npm start` runs `copy-tools.mjs` first, which copies `shared/`, `assets/`,
`privacy.html`, `index.html`, and every collection folder (`dev/`, `study/`,
etc.) from the repo root into `electron/tools/`. That folder is gitignored —
it's generated, never hand-edited.

## Regenerating the tool catalog

The sidebar's tool list (`src/renderer/tools-catalog.js`) is generated from
`shared/shared.js`'s `TOOL_REGISTRY` — the exact same data the web site's
search palette uses. After adding, removing, or renaming a tool on the site:

```bash
node ../scripts/generate-desktop-catalog.mjs
```

Do this before every release; it's not run automatically on every `npm start`
to avoid surprising diffs mid-development.

## Building distributables

```bash
npm run dist:mac      # .dmg (arm64 + x64)
npm run dist:win      # .exe (NSIS installer)
npm run dist:linux    # .AppImage + .deb
npm run dist          # all three (requires the right host OS/toolchain per target)
```

Before a real release, replace the placeholder `assets/icon.png` (currently a
copy of the web favicon, 256×256 — fine for dev, too small for a polished app
icon) and generate `icon.icns` (macOS) / `icon.ico` (Windows) from a proper
512×512+ source image.

## Code signing — not done yet

Neither macOS nor Windows builds are signed. That means:
- **macOS**: Gatekeeper blocks the app on first launch ("unidentified
  developer"). Users right-click → Open to bypass it, once.
- **Windows**: SmartScreen shows a warning. Users click "More info" → "Run
  anyway", once.

Signing costs money (~$99/year for an Apple Developer ID, ~$200–400/year for
an EV Windows certificate) that a one-person, non-profit tool doesn't currently
spend. The download page (`/desktop/`) explains this directly instead of
hiding it — see that page's "Why these warnings appear" section.

## What's different from the browser version

- **No analytics at all.** The web version's Cloudflare page-visit beacon is
  deliberately excluded from the desktop CSP (`static.cloudflareinsights.com`
  isn't whitelisted) — the script tag is still present in the copied tool
  files, it just can't reach the network.
- **localStorage is per-app**, not per-browser. FlashForge decks, QuickNote
  content, etc. saved in the desktop app live in Electron's own data
  directory, separate from any browser's data for the same tools.
- **Chrome's built-in on-device AI APIs aren't available** (Summarizer,
  Translator, Writer, Rewriter, Prompt API) — they're Chrome-specific, not
  part of Electron's bundled Chromium runtime. This hits two different kinds
  of tools differently:
  - The four dedicated `/ai/` tools (AISummarize, AITranslate, AIWrite,
    AIRewrite) have no non-AI mode — their whole purpose is the on-device
    model — so they show their existing "not available in this browser" gate,
    same as opening them in Firefox or Safari today.
  - Tools where AI is one *optional* feature (ContractRead,
    JobDescriptionWriter, InterviewKit, HeadlineScore, AdCopyWriter,
    PersonaBuilder, EmailSubjectTester, CronLab's natural-language input,
    etc.) already ship a functional rule-based fallback for exactly this
    case — same code path as any non-Chrome browser, nothing desktop-specific
    to build.
- **CurrencyConvert still works.** Its daily exchange-rate fetch to
  `open.er-api.com` is explicitly allowed through the CSP; every other tool
  makes zero network requests.

## Publishing a release

```bash
npm version patch          # bumps electron/package.json + creates a git tag
git push origin main --tags
```

A tag push matching `v*` triggers `.github/workflows/release-desktop.yml`,
which builds all three platforms in parallel and attaches the installers to
a GitHub Release. `electron-updater` then delivers that release to every
already-installed copy of the app automatically.
