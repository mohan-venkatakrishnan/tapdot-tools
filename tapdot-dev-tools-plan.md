# tapdot Dev Tools — Complete Build Plan
## tools.tapdot.org/dev

Thirteen privacy-first developer tools. Every tool runs entirely in the browser —
no server, no account, no data sent anywhere. Built as standalone HTML files, hosted
on GitHub Pages under tools.tapdot.org. Analytics via Cloudflare Web Analytics.

Developers paste API keys, internal configs, production queries, JWT tokens, and
proprietary schemas into online tools constantly. Every tool in this collection
solves a real daily dev need while guaranteeing that sensitive data never leaves
the browser.

---

## All thirteen tools

| Tool | URL | Core job |
|---|---|---|
| JSONLab | tools.tapdot.org/dev/json | Format, validate, minify, diff, tree-view JSON |
| JSONConvert | tools.tapdot.org/dev/jsonconvert | JSON ↔ YAML ↔ TOML ↔ CSV ↔ XML conversions |
| JWTRead | tools.tapdot.org/dev/jwt | Decode and inspect JWT tokens locally |
| YAMLCheck | tools.tapdot.org/dev/yaml | YAML validator and formatter |
| CSVExplore | tools.tapdot.org/dev/csv | Paste CSV, instant table view, sort and filter |
| MarkdownLive | tools.tapdot.org/dev/markdown | Split-pane Markdown editor with live preview |
| HTMLPreview | tools.tapdot.org/dev/html | Render raw HTML in a sandboxed iframe |
| SQLFormat | tools.tapdot.org/dev/sql | Format and beautify SQL queries |
| ColourContrast | tools.tapdot.org/dev/contrast | WCAG AA/AAA contrast checker |
| UUIDGen | tools.tapdot.org/dev/uuid | UUID v4/v7, ULID, nanoid, random tokens |
| TimezoneNow | tools.tapdot.org/dev/timezone | World clock and meeting overlap finder |
| RegexLab | tools.tapdot.org/dev/regex | Live regex tester with match highlighting |
| CronLab | tools.tapdot.org/dev/cron | Full cron workbench — parse, build, NL convert |

---

## Design system — inherits tapdot shared system

All thirteen tools use the same shared.css and shared.js from the study/write
collections. No new design tokens needed. The dev collection inherits:

```
--color-accent:      #5B6CF0    tapdot brand blue
--color-bg:          #FFFFFF
--color-bg-soft:     #F8F8FB
--color-surface:     #FFFFFF
--color-border:      #E5E5F0
--color-text:        #0F0F1A
--color-muted:       #6B6B80
--font-body:         'Inter', system-ui
--font-mono:         'JetBrains Mono', monospace
```

**Dev-specific addition:** Most tools in this collection output code or structured
data — use `--font-mono` for all output areas. Add this to `dev/dev.css`:

```css
/* dev/dev.css — imported by all dev tools in addition to shared.css */

/* Two-panel layout for workbench tools (RegexLab, CronLab, MarkdownLive) */
.ts-workbench {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}

@media (max-width: 700px) {
  .ts-workbench { grid-template-columns: 1fr; }
}

/* Four-panel layout for CronLab */
.ts-workbench-4 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 16px;
  margin-top: 20px;
}

/* Syntax highlighted output */
.ts-code-output {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  background: var(--color-bg-soft);
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  overflow-x: auto;
  white-space: pre;
  tab-size: 2;
}

/* Match highlight (RegexLab, CronLab) */
.ts-match {
  background: #FFF3CD;
  border-radius: 2px;
  padding: 0 1px;
}

[data-theme="dark"] .ts-match {
  background: rgba(251, 191, 36, 0.25);
  color: #FCD34D;
}

/* Error line marker */
.ts-error-line {
  background: rgba(220, 38, 38, 0.08);
  border-left: 2px solid var(--color-danger);
  padding-left: 8px;
}

/* Field annotation row (CronLab) */
.ts-field-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  font-size: 11px;
  color: var(--color-muted);
  font-family: var(--font-mono);
  margin-top: 6px;
}

.ts-field-row span {
  text-align: center;
  padding: 4px;
  background: var(--color-bg-soft);
  border-radius: var(--radius-sm);
  border: 0.5px solid var(--color-border);
}

.ts-field-row span.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Pill tabs (JSONLab mode switcher, CronLab format toggle) */
.ts-pill-tabs {
  display: flex;
  gap: 4px;
  background: var(--color-bg-soft);
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 3px;
  width: fit-content;
}

.ts-pill-tab {
  padding: 5px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}

.ts-pill-tab.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

/* Timezone table (TimezoneNow, CronLab next runs) */
.ts-tz-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-family: var(--font-mono);
}

.ts-tz-table th {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
  padding: 8px 12px;
  border-bottom: 0.5px solid var(--color-border);
  text-align: left;
}

.ts-tz-table td {
  padding: 7px 12px;
  border-bottom: 0.5px solid var(--color-border);
  color: var(--color-text);
}

.ts-tz-table tr:last-child td { border-bottom: none; }
.ts-tz-table tr:hover td { background: var(--color-bg-soft); }

/* Calendar heatmap (CronLab) */
.ts-heatmap {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  margin-top: 12px;
}

.ts-heatmap-cell {
  aspect-ratio: 1;
  border-radius: 3px;
  background: var(--color-bg-soft);
  border: 0.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: var(--color-muted);
  cursor: default;
}

.ts-heatmap-cell[data-count="1"] { background: #C7D2FE; border-color: #A5B4FC; }
.ts-heatmap-cell[data-count="2"] { background: #818CF8; border-color: #6366F1; color: white; }
.ts-heatmap-cell[data-count="3"] { background: #5B6CF0; border-color: #4555E0; color: white; }
.ts-heatmap-cell[data-count="4"] { background: #3730A3; border-color: #312E81; color: white; }

/* NL input strip (CronLab) */
.ts-nl-strip {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  margin-top: 12px;
}

.ts-nl-strip input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text);
  font-family: var(--font-body);
  outline: none;
}

.ts-nl-strip input::placeholder { color: var(--color-muted); }
```

---

## File structure

```
tools/
├── shared/
│   ├── shared.css          ← from study/write plan — already built
│   └── shared.js           ← from study/write plan — already built
├── dev/
│   ├── dev.css             ← dev-specific additions (build first)
│   ├── index.html          ← tools.tapdot.org/dev hub
│   ├── json/
│   │   ├── index.html
│   │   └── json.js
│   ├── jsonconvert/
│   │   ├── index.html
│   │   └── jsonconvert.js
│   ├── jwt/
│   │   ├── index.html
│   │   └── jwt.js
│   ├── yaml/
│   │   ├── index.html
│   │   └── yaml.js
│   ├── csv/
│   │   ├── index.html
│   │   └── csv.js
│   ├── markdown/
│   │   ├── index.html
│   │   └── markdown.js
│   ├── html/
│   │   ├── index.html
│   │   └── html.js
│   ├── sql/
│   │   ├── index.html
│   │   └── sql.js
│   ├── contrast/
│   │   ├── index.html
│   │   └── contrast.js
│   ├── uuid/
│   │   ├── index.html
│   │   └── uuid.js
│   ├── timezone/
│   │   ├── index.html
│   │   └── timezone.js
│   ├── regex/
│   │   ├── index.html
│   │   └── regex.js
│   └── cron/
│       ├── index.html
│       └── cron.js
```

No per-tool CSS files — `shared.css` + `dev.css` covers all components. Keep it lean.

---

## Tool 1 — JSONLab
### tools.tapdot.org/dev/json

**Meta**
```
title:       JSONLab — JSON Formatter & Validator | tapdot
description: Format, validate, minify, diff and tree-view JSON in your browser.
             No server. Safe for API keys and confidential configs.
```

**Privacy angle:** Security guides explicitly warn against pasting JSON into tools like
CodeBeautify — "never paste API keys or authentication tokens into a third-party
validator." JSONLab is the safe alternative.

**Four modes via pill tabs: Format · Validate · Minify · Diff**

**Format mode**
- Paste JSON → instant pretty-print with configurable indent (2/4 spaces, tab)
- Syntax highlighting: keys in accent colour, strings in green, numbers in blue,
  booleans and null in amber — all done with a lightweight JS tokeniser, no library
- Tree view toggle: collapsible object/array tree alongside the formatted view
- Copy formatted, Download as .json

**Validate mode**
- Real-time validation as you type
- Error message with exact line number and character position
- Common error hints: "Did you mean double quotes?", "Trailing comma detected"
- JSON Schema validation: paste a schema in the second panel, validate against it

**Minify mode**
- Strips whitespace, outputs single-line JSON
- Shows size before/after with % reduction
- Copy minified

**Diff mode**
- Two panels side by side — paste two JSON objects
- Highlights added keys (green), removed keys (red), changed values (amber)
- Shows a plain-text summary: "3 added, 1 removed, 2 changed"

**Implementation**
```javascript
// json.js — lightweight tokeniser for syntax highlighting
function highlightJSON(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'ts-json-num';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'ts-json-key' : 'ts-json-str';
        } else if (/true|false/.test(match)) {
          cls = 'ts-json-bool';
        } else if (/null/.test(match)) {
          cls = 'ts-json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

function formatJSON(raw, indent = 2) {
  try {
    const parsed = JSON.parse(raw);
    return { ok: true, formatted: JSON.stringify(parsed, null, indent) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function diffJSON(a, b) {
  try {
    const objA = JSON.parse(a);
    const objB = JSON.parse(b);
    return deepDiff(objA, objB, '');
  } catch (e) {
    return { error: e.message };
  }
}

function deepDiff(a, b, path) {
  const changes = [];
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key;
    if (!(key in a)) {
      changes.push({ type: 'added',   path: fullPath, value: b[key] });
    } else if (!(key in b)) {
      changes.push({ type: 'removed', path: fullPath, value: a[key] });
    } else if (typeof a[key] === 'object' && typeof b[key] === 'object') {
      changes.push(...deepDiff(a[key], b[key], fullPath));
    } else if (a[key] !== b[key]) {
      changes.push({ type: 'changed', path: fullPath, from: a[key], to: b[key] });
    }
  }
  return changes;
}
```

---

## Tool 2 — JSONConvert
### tools.tapdot.org/dev/jsonconvert

**Meta**
```
title:       JSONConvert — JSON to YAML, CSV, XML, TOML | tapdot
description: Convert JSON to YAML, CSV, XML, TOML and back. All conversions happen
             in your browser. Safe for sensitive payloads and configs.
```

**Supported conversions**
- JSON → YAML
- JSON → TOML
- JSON → CSV (flattens nested objects)
- JSON → XML
- YAML → JSON
- CSV → JSON
- XML → JSON (basic)

**Layout:** Source panel (left) + output panel (right). Direction selector in the
middle. Convert button. Both panels have copy buttons.

**Libraries to bundle locally (download and include as local files)**
- `js-yaml` — YAML parse/stringify (MIT licence, 55KB minified)
- `@iarna/toml` — TOML parse/stringify (MIT licence)
- No library needed for CSV, XML — implement with vanilla JS

**JSON → YAML implementation**
```javascript
// Requires js-yaml bundled locally as yaml.min.js
function jsonToYAML(jsonStr) {
  const obj = JSON.parse(jsonStr);
  return jsyaml.dump(obj, { indent: 2, lineWidth: 80 });
}

function yamlToJSON(yamlStr) {
  const obj = jsyaml.load(yamlStr);
  return JSON.stringify(obj, null, 2);
}
```

**JSON → CSV (flat arrays only)**
```javascript
function jsonToCSV(jsonStr) {
  const data = JSON.parse(jsonStr);
  const arr  = Array.isArray(data) ? data : [data];
  if (!arr.length) return '';
  const headers = Object.keys(arr[0]);
  const rows = arr.map(row =>
    headers.map(h => {
      const val = row[h] ?? '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
```

**JSON → XML**
```javascript
function jsonToXML(jsonStr, rootTag = 'root') {
  const obj = JSON.parse(jsonStr);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${objToXML(obj, rootTag)}`;
}

function objToXML(obj, tag) {
  if (Array.isArray(obj)) {
    return obj.map(item => objToXML(item, 'item')).join('\n');
  }
  if (typeof obj !== 'object' || obj === null) {
    return `<${tag}>${escapeXML(String(obj))}</${tag}>`;
  }
  const inner = Object.entries(obj)
    .map(([k, v]) => objToXML(v, k))
    .join('\n');
  return `<${tag}>\n${inner}\n</${tag}>`;
}

function escapeXML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

---

## Tool 3 — JWTRead
### tools.tapdot.org/dev/jwt

**Meta**
```
title:       JWTRead — JWT Decoder | tapdot
description: Decode and inspect JWT tokens in your browser. No server.
             jwt.io sends your token to their servers — JWTRead never does.
```

**Privacy angle:** This is the most privacy-sensitive dev tool on the list. JWT tokens
contain authentication credentials. jwt.io is the default tool every developer uses,
but it's a third-party server. JWTRead decodes entirely client-side using atob().

**Layout**
- Token input (large textarea, monospace)
- Three decoded panels: Header · Payload · Signature
- Each panel is a formatted, syntax-highlighted JSON block
- Algorithm badge (HS256, RS256, etc.) shown prominently
- Expiry status: green "Valid" or red "Expired" based on `exp` claim
- Time remaining or time since expiry shown in human-readable format
- Claim reference: hover over standard claims (sub, iat, exp, iss, aud) to see
  what they mean — helpful for developers new to JWT

**Implementation — pure JS, no library needed**
```javascript
function decodeJWT(token) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT — must have 3 parts');

  function base64Decode(str) {
    // JWT uses base64url encoding — replace URL-safe chars and pad
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
                      .padEnd(str.length + (4 - str.length % 4) % 4, '=');
    return JSON.parse(atob(base64));
  }

  const header  = base64Decode(parts[0]);
  const payload = base64Decode(parts[1]);
  const sigRaw  = parts[2];

  const now     = Math.floor(Date.now() / 1000);
  const expired = payload.exp ? payload.exp < now : null;
  const timeInfo = payload.exp
    ? expired
      ? `Expired ${formatDuration(now - payload.exp)} ago`
      : `Expires in ${formatDuration(payload.exp - now)}`
    : 'No expiry claim';

  return { header, payload, sigRaw, expired, timeInfo, algorithm: header.alg };
}

function formatDuration(secs) {
  if (secs < 60)   return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs/60)}m ${secs%60}s`;
  if (secs < 86400) return `${Math.floor(secs/3600)}h ${Math.floor((secs%3600)/60)}m`;
  return `${Math.floor(secs/86400)}d ${Math.floor((secs%86400)/3600)}h`;
}
```

**Signature note:** JWTRead decodes and displays the signature but cannot verify it
without the secret key. Show a clear note: "Signature displayed for inspection only.
Verification requires the secret key and is intentionally not supported here — never
paste private keys into any web tool."

---

## Tool 4 — YAMLCheck
### tools.tapdot.org/dev/yaml

**Meta**
```
title:       YAMLCheck — YAML Validator & Formatter | tapdot
description: Validate and format YAML in your browser. Safe for Docker Compose,
             GitHub Actions, and Kubernetes configs that contain secrets.
```

**Privacy angle:** Developers paste Kubernetes configs, GitHub Actions workflows, and
Docker Compose files — all of which may contain environment variables, secrets, and
internal service names — into online YAML validators. YAMLCheck processes locally.

**Features**
- Real-time validation as you type
- Error message with line number and column
- Format / prettify YAML with consistent indentation
- Indent size selector (2 spaces / 4 spaces)
- JSON → YAML quick convert (for devs who think in JSON)
- Line count, key count, depth shown as stats
- Copy formatted, download as .yaml

**Implementation (requires js-yaml bundled locally)**
```javascript
function validateYAML(raw) {
  try {
    const parsed = jsyaml.load(raw);
    return { ok: true, parsed };
  } catch (e) {
    // js-yaml provides line/column in e.mark
    return {
      ok: false,
      error: e.message,
      line:  e.mark?.line   != null ? e.mark.line + 1   : null,
      col:   e.mark?.column != null ? e.mark.column + 1 : null,
    };
  }
}

function formatYAML(raw, indent = 2) {
  const result = validateYAML(raw);
  if (!result.ok) return result;
  const formatted = jsyaml.dump(result.parsed, { indent, lineWidth: 120 });
  return { ok: true, formatted };
}

function countYAMLStats(parsed, depth = 0) {
  if (typeof parsed !== 'object' || parsed === null) return { keys: 0, depth };
  const keys   = Object.keys(parsed).length;
  const depths = Object.values(parsed).map(v => countYAMLStats(v, depth + 1).depth);
  return { keys, depth: Math.max(depth, ...depths) };
}
```

---

## Tool 5 — CSVExplore
### tools.tapdot.org/dev/csv

**Meta**
```
title:       CSVExplore — Private CSV Viewer & Analyser | tapdot
description: Paste CSV and see it as a sortable, filterable table instantly.
             No file upload. Your data never leaves your browser.
```

**Features**
- Paste or drop a .csv file — parsed immediately
- Renders as a clean table: sticky header row, alternating row tints
- Click column header to sort (ascending/descending toggle)
- Filter row: type to filter across all columns
- Stats bar: row count, column count, detected column types
- Column type detection: number, date, text, boolean
- Basic column stats on click: min, max, mean (for numeric columns),
  unique value count (for text columns)
- Copy table as TSV, download filtered view as CSV

**RFC 4180 compliant parser (no library)**
```javascript
function parseCSV(raw) {
  const rows   = [];
  let   row    = [];
  let   field  = '';
  let   inQuote = false;

  for (let i = 0; i < raw.length; i++) {
    const ch   = raw[i];
    const next = raw[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"')           { inQuote = false; }
      else                           { field += ch; }
    } else {
      if      (ch === '"')  { inQuote = true; }
      else if (ch === ',')  { row.push(field); field = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field); field = '';
        rows.push(row);  row = [];
      } else { field += ch; }
    }
  }

  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };

  const [headers, ...dataRows] = rows;
  return { headers, rows: dataRows };
}

function detectColumnType(values) {
  const nonEmpty = values.filter(v => v.trim() !== '');
  if (nonEmpty.every(v => !isNaN(Number(v)))) return 'number';
  if (nonEmpty.every(v => !isNaN(Date.parse(v)))) return 'date';
  if (nonEmpty.every(v => ['true','false','yes','no','1','0'].includes(v.toLowerCase()))) return 'boolean';
  return 'text';
}

function columnStats(values, type) {
  const nonEmpty = values.filter(v => v.trim() !== '');
  if (type === 'number') {
    const nums = nonEmpty.map(Number);
    return {
      min:  Math.min(...nums),
      max:  Math.max(...nums),
      mean: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),
      nulls: values.length - nonEmpty.length,
    };
  }
  const unique = new Set(nonEmpty).size;
  return { unique, nulls: values.length - nonEmpty.length };
}
```

---

## Tool 6 — MarkdownLive
### tools.tapdot.org/dev/markdown

**Meta**
```
title:       MarkdownLive — Markdown Editor with Live Preview | tapdot
description: Split-pane Markdown editor with live preview. Autosaves to your browser.
             No cloud sync. No account. StackEdit and Dillinger sync to cloud by default.
```

**Layout:** Two-panel workbench (uses `.ts-workbench` class)
- Left: plain textarea with line numbers
- Right: rendered HTML preview, updates as you type
- Toolbar: Bold, Italic, Heading, Link, Image, Code, List, Blockquote, Table, HR
- Word count and reading time in the status bar
- Dark mode applies to both panels
- Autosaves to localStorage every 2 seconds (key: `tapdot-md-content`)
- Export: download as .md or copy rendered HTML

**Markdown parser — no library, implement core spec**
```javascript
function parseMarkdown(md) {
  let html = md
    // Escape HTML
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    // Headings
    .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
    // Bold, italic, code
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,          '<em>$1</em>')
    .replace(/`([^`]+)`/g,          '<code>$1</code>')
    // Links and images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,  '<a href="$2">$1</a>')
    // Blockquote
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr />')
    // Unordered list
    .replace(/^\*\s+(.+)$/gm,  '<li>$1</li>')
    .replace(/^-\s+(.+)$/gm,   '<li>$1</li>')
    // Ordered list
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Code blocks
    .replace(/```[\s\S]*?```/g, m => `<pre><code>${m.slice(3,-3).trim()}</code></pre>`)
    // Paragraphs (double newline)
    .replace(/\n\n+/g, '\n\n')
    .split('\n\n')
    .map(block => block.startsWith('<') ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  return html;
}
```

---

## Tool 7 — HTMLPreview
### tools.tapdot.org/dev/html

**Meta**
```
title:       HTMLPreview — HTML Renderer & Sandbox | tapdot
description: Paste raw HTML and see it rendered instantly in a safe sandbox.
             Perfect for email templates, component snippets, and prototypes.
```

**Features**
- Large textarea for HTML input
- Rendered preview in a sandboxed `<iframe>` — `sandbox="allow-scripts"` attribute
  prevents any access to parent page data
- Layout toggle: split-pane (side by side) or stacked (editor above, preview below)
- Device preview: Desktop / Tablet / Mobile width presets
- Source highlighting: basic HTML tokeniser, same approach as JSONLab
- Download rendered HTML as .html file
- Copy HTML button

**Security note:** The iframe sandbox attribute prevents the rendered HTML from accessing
cookies, localStorage, or the parent page. Add a clear label: "Rendered in a sandboxed
frame — your page cannot access browser data."

**Implementation**
```javascript
function renderHTML(html) {
  const iframe = document.getElementById('html-preview');
  // Write to srcdoc — never use src with a data: URL (CSP issues)
  iframe.srcdoc = html;
}

// Device width presets
const DEVICE_WIDTHS = {
  desktop: '100%',
  tablet:  '768px',
  mobile:  '375px',
};

function setDevice(device) {
  const iframe = document.getElementById('html-preview');
  iframe.style.width      = DEVICE_WIDTHS[device];
  iframe.style.margin     = device === 'desktop' ? '0' : '0 auto';
  iframe.style.display    = 'block';
  iframe.style.border     = '0.5px solid var(--color-border)';
  iframe.style.borderRadius = 'var(--radius-md)';
}
```

---

## Tool 8 — SQLFormat
### tools.tapdot.org/dev/sql

**Meta**
```
title:       SQLFormat — SQL Formatter | tapdot
description: Format and beautify SQL queries in your browser. Safe for queries
             containing real table names, column names, and internal logic.
```

**Privacy angle:** Developers paste production queries with real schema names, column
names, and filter values into online SQL formatters. These reveal internal database
structure. SQLFormat processes entirely locally.

**Features**
- Paste SQL → instant formatting with keyword capitalisation and consistent indentation
- Dialect selector: Generic / MySQL / PostgreSQL / SQLite
- Keyword case toggle: UPPERCASE / lowercase / Preserve
- Indent size: 2 or 4 spaces
- Syntax highlighting: keywords in accent colour, strings in green, comments in muted
- Copy formatted, download as .sql
- Line count and keyword count shown as stats

**SQL keyword list and formatter (no library)**
```javascript
const SQL_KEYWORDS = [
  'SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS',
  'ON','AND','OR','NOT','IN','IS','NULL','AS','DISTINCT','ORDER','BY','GROUP',
  'HAVING','LIMIT','OFFSET','INSERT','INTO','VALUES','UPDATE','SET','DELETE',
  'CREATE','TABLE','DROP','ALTER','INDEX','VIEW','TRIGGER','PROCEDURE','FUNCTION',
  'BEGIN','END','COMMIT','ROLLBACK','TRANSACTION','CASE','WHEN','THEN','ELSE',
  'WITH','UNION','ALL','EXISTS','BETWEEN','LIKE','ILIKE','ASC','DESC','PRIMARY',
  'KEY','FOREIGN','REFERENCES','CONSTRAINT','DEFAULT','NOT NULL','UNIQUE'
];

function formatSQL(raw, indent = 2, keywordCase = 'upper') {
  const pad    = ' '.repeat(indent);
  const kw     = (word) => {
    if (keywordCase === 'upper') return word.toUpperCase();
    if (keywordCase === 'lower') return word.toLowerCase();
    return word;
  };

  // Tokenise: preserve strings and comments, transform keywords
  const tokens = raw.split(/(\s+|'[^']*'|"[^"]*"|--[^\n]*|\/\*[\s\S]*?\*\/|[(),;])/);

  let   result  = '';
  let   depth   = 0;

  for (const token of tokens) {
    if (!token) continue;
    const upper = token.trim().toUpperCase();

    if (SQL_KEYWORDS.includes(upper)) {
      // Line-break before major clauses
      const breakBefore = ['SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER',
                           'OUTER','GROUP','ORDER','HAVING','LIMIT','UNION'].includes(upper);
      if (breakBefore && result.trim()) result += '\n';
      result += kw(token);
    } else if (token === '(') {
      result += token; depth++;
    } else if (token === ')') {
      depth--; result += token;
    } else if (token === ',') {
      result += token + '\n' + pad.repeat(Math.max(depth, 1));
    } else if (token === ';') {
      result += token + '\n';
    } else {
      result += token;
    }
  }

  return result.trim();
}
```

---

## Tool 9 — ColourContrast
### tools.tapdot.org/dev/contrast

**Meta**
```
title:       ColourContrast — WCAG Contrast Checker | tapdot
description: Check foreground and background colour contrast for WCAG AA and AAA
             compliance. Instant, private, no tracking.
```

**Features**
- Foreground colour picker + hex input
- Background colour picker + hex input
- Live contrast ratio display (e.g. "4.52:1")
- WCAG AA pass/fail for normal text (4.5:1), large text (3:1), UI components (3:1)
- WCAG AAA pass/fail for normal text (7:1), large text (4.5:1)
- Live text preview — "The quick brown fox" rendered in the chosen colours
- Swap colours button
- Suggested accessible alternatives: auto-suggest a darker/lighter version that passes

**Implementation**
```javascript
function hexToRGB(hex) {
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0,2), 16),
    g: parseInt(full.slice(2,4), 16),
    b: parseInt(full.slice(4,6), 16),
  };
}

function relativeLuminance({ r, g, b }) {
  const toLinear = c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRGB(hex1));
  const l2 = relativeLuminance(hexToRGB(hex2));
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

function wcagResults(ratio) {
  const r = parseFloat(ratio);
  return {
    aaNormal:   r >= 4.5,
    aaLarge:    r >= 3.0,
    aaUI:       r >= 3.0,
    aaaNormal:  r >= 7.0,
    aaaLarge:   r >= 4.5,
  };
}

// Suggest accessible alternative by lightening/darkening the foreground
function suggestAccessible(fg, bg, targetRatio = 4.5) {
  const bgL    = relativeLuminance(hexToRGB(bg));
  const rgb    = hexToRGB(fg);
  const isDark = bgL > 0.5;

  // Adjust brightness in the direction that improves contrast
  for (let i = 0; i <= 255; i += 5) {
    const adjusted = isDark
      ? { r: Math.max(0, rgb.r - i), g: Math.max(0, rgb.g - i), b: Math.max(0, rgb.b - i) }
      : { r: Math.min(255, rgb.r + i), g: Math.min(255, rgb.g + i), b: Math.min(255, rgb.b + i) };
    const hex  = rgbToHex(adjusted);
    const ratio = parseFloat(contrastRatio(hex, bg));
    if (ratio >= targetRatio) return hex;
  }
  return isDark ? '#000000' : '#FFFFFF';
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
```

---

## Tool 10 — UUIDGen
### tools.tapdot.org/dev/uuid

**Meta**
```
title:       UUIDGen — UUID & Token Generator | tapdot
description: Generate UUID v4, UUID v7, ULID, nanoid, and random tokens in your
             browser. IDs are generated locally — never sent to any server.
```

**Privacy angle:** Some UUID generators call an API endpoint to generate IDs — something
that should be entirely local. UUIDGen uses the Web Crypto API (`crypto.getRandomValues`).

**Features**
- Format selector: UUID v4 / UUID v7 / ULID / nanoid / Random hex / Random base64
- Quantity: 1 to 1000
- Generate button + "Regenerate" shortcut
- Copy single or copy all
- Download as .txt
- Format explanation: hover over each format to see what it is and when to use it

**Implementation using Web Crypto API**
```javascript
function uuidV4() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant bits
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16),
          hex.slice(16,20), hex.slice(20)].join('-');
}

function uuidV7() {
  // UUID v7: Unix timestamp ms in the high bits
  const ms    = BigInt(Date.now());
  const rand  = crypto.getRandomValues(new Uint8Array(10));
  const bytes = new Uint8Array(16);
  // ms occupies bytes 0-5 (48 bits)
  const msBytes = [(ms >> 40n) & 0xFFn, (ms >> 32n) & 0xFFn, (ms >> 24n) & 0xFFn,
                   (ms >> 16n) & 0xFFn, (ms >> 8n)  & 0xFFn,  ms & 0xFFn];
  msBytes.forEach((b, i) => { bytes[i] = Number(b); });
  bytes[6] = (rand[0] & 0x0f) | 0x70; // version 7
  bytes[8] = (rand[1] & 0x3f) | 0x80; // variant
  for (let i = 9; i < 16; i++) bytes[i] = rand[i - 7];
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16),
          hex.slice(16,20), hex.slice(20)].join('-');
}

function ulid() {
  // Crockford Base32
  const CHARS   = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const time    = Date.now();
  const rand    = crypto.getRandomValues(new Uint8Array(10));

  let timeStr = '';
  let t = time;
  for (let i = 9; i >= 0; i--) {
    timeStr = CHARS[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }

  let randStr = '';
  for (let i = 0; i < 10; i++) {
    randStr += CHARS[rand[i] % 32];
  }

  return timeStr + randStr;
}

function nanoid(size = 21) {
  const ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const bytes    = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes).map(b => ALPHABET[b % ALPHABET.length]).join('');
}

function randomHex(bytes = 16) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

function randomBase64(bytes = 32) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateBatch(format, count) {
  const generators = { uuidv4: uuidV4, uuidv7: uuidV7, ulid, nanoid, hex: randomHex, base64: randomBase64 };
  const gen = generators[format] ?? uuidV4;
  return Array.from({ length: count }, gen);
}
```

---

## Tool 11 — TimezoneNow
### tools.tapdot.org/dev/timezone

**Meta**
```
title:       TimezoneNow — World Clock & Meeting Planner | tapdot
description: Add cities, see current times, find overlapping work hours for
             scheduling across timezones. Works offline.
```

**Features**
- Search and add cities/timezones from a built-in list (IANA timezone database)
- Shows current time in each timezone, updates every second
- DST indicator — shows which cities are currently in daylight saving time
- Meeting planner: drag a time slider to find overlapping business hours
- Overlap highlighter: green band shows when all added timezones are in 9am–6pm
- UTC offset shown for each timezone
- Persists added timezones to localStorage

**Implementation using browser Intl API — no library**
```javascript
// Full IANA timezone list with city names — include as a JS array in timezone.js
// (use a curated list of ~300 major cities, not the full 500+ IANA list)

function getCurrentTime(tz) {
  const now = new Date();
  return {
    time:    new Intl.DateTimeFormat('en-US', {
               timeZone: tz, hour: '2-digit', minute: '2-digit',
               second: '2-digit', hour12: false
             }).format(now),
    date:    new Intl.DateTimeFormat('en-US', {
               timeZone: tz, weekday: 'short', month: 'short', day: 'numeric'
             }).format(now),
    offset:  getUTCOffset(tz, now),
    isDST:   isDST(tz, now),
    hour:    parseInt(new Intl.DateTimeFormat('en-US', {
               timeZone: tz, hour: 'numeric', hour12: false
             }).format(now)),
  };
}

function getUTCOffset(tz, date = new Date()) {
  const utcMs  = date.getTime();
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const offset = (tzDate - new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))) / 60000;
  const sign   = offset >= 0 ? '+' : '-';
  const abs    = Math.abs(offset);
  return `UTC${sign}${String(Math.floor(abs/60)).padStart(2,'0')}:${String(abs%60).padStart(2,'0')}`;
}

function isDST(tz, date = new Date()) {
  // Compare offset in January (standard) vs current month
  const jan  = new Date(date.getFullYear(), 0, 1);
  const jul  = new Date(date.getFullYear(), 6, 1);
  const janOffset = getOffsetMinutes(tz, jan);
  const julOffset = getOffsetMinutes(tz, jul);
  const curOffset = getOffsetMinutes(tz, date);
  const stdOffset = Math.max(janOffset, julOffset); // standard = larger offset (further from UTC)
  return curOffset !== stdOffset;
}

function getOffsetMinutes(tz, date) {
  const tzDate  = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return (tzDate - utcDate) / 60000;
}

function findOverlap(timezones, workStart = 9, workEnd = 18) {
  // For each hour 0-23, check if all timezones are within work hours
  const overlaps = [];
  const now = new Date();
  for (let h = 0; h < 24; h++) {
    const testDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0);
    const allInWork = timezones.every(tz => {
      const hour = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour: 'numeric', hour12: false
      }).format(testDate));
      return hour >= workStart && hour < workEnd;
    });
    if (allInWork) overlaps.push(h);
  }
  return overlaps;
}
```

---

## Tool 12 — RegexLab
### tools.tapdot.org/dev/regex

**Meta**
```
title:       RegexLab — Regular Expression Tester | tapdot
description: Test regular expressions with live match highlighting, group capture
             view, and plain-English pattern explanation. Private, no data sent.
```

**Privacy angle:** Regex101 saves expressions server-side by default and shows ads.
RegexLab is fully local — useful for regexes that match against sensitive data like
emails, SSNs, or internal ID formats.

**Layout:** Four-panel workbench similar to regex101

```
┌─────────────────────────────┬────────────────────────────┐
│  EXPRESSION                 │  FLAGS                     │
│  /([a-z]+)\d{2,4}/          │  [g] [i] [m] [s] [u]      │
├─────────────────────────────┴────────────────────────────┤
│  TEST STRING                                             │
│  The quick brown fox jumped over 42 lazy dogs in 2024    │
│       ─────  ─────       ──    ── ──── 42 ──── ──── ──── │  ← highlights
├──────────────────────────────────────────────────────────┤
│  MATCHES (3 found)                                       │
│  Match 1: "quick"  at index 4–9   Groups: [1]: "quick"   │
│  Match 2: "brown"  at index 10–15 Groups: [1]: "brown"   │
│  Match 3: "jumped" at index 16–22 Groups: [1]: "jumped"  │
└──────────────────────────────────────────────────────────┘
```

**Features**
- Live highlighting — matches update as you type in either field
- Named capture groups shown in the matches panel
- Flag toggles: g (global), i (case insensitive), m (multiline), s (dotAll), u (unicode)
- Replace mode: enter a replacement string, see the result live
- Error display: invalid regex shows a friendly error with the position
- Plain-English explanation: basic pattern breakdown (see implementation)
- Match count badge on the expression input
- History: last 10 expressions saved to localStorage

**Implementation**
```javascript
function runRegex(pattern, flags, testStr) {
  try {
    const re      = new RegExp(pattern, flags);
    const matches = [];
    let   match;

    if (flags.includes('g')) {
      while ((match = re.exec(testStr)) !== null) {
        matches.push({
          full:    match[0],
          index:   match.index,
          end:     match.index + match[0].length,
          groups:  match.slice(1),
          named:   match.groups ?? {},
        });
        if (match[0].length === 0) re.lastIndex++; // avoid infinite loop on empty match
      }
    } else {
      match = re.exec(testStr);
      if (match) {
        matches.push({
          full:   match[0],
          index:  match.index,
          end:    match.index + match[0].length,
          groups: match.slice(1),
          named:  match.groups ?? {},
        });
      }
    }

    return { ok: true, matches };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function highlightMatches(testStr, matches) {
  if (!matches.length) return escapeHtml(testStr);
  let result = '';
  let last   = 0;
  for (const m of matches) {
    result += escapeHtml(testStr.slice(last, m.index));
    result += `<mark class="ts-match">${escapeHtml(testStr.slice(m.index, m.end))}</mark>`;
    last = m.end;
  }
  result += escapeHtml(testStr.slice(last));
  return result;
}

// Basic plain-English explanation of common patterns
function explainPattern(pattern) {
  const explanations = [
    [/^\^/,           'Starts at the beginning of the string'],
    [/\$$/,           'Ends at the end of the string'],
    [/\\d/g,          'matches any digit (0-9)'],
    [/\\w/g,          'matches any word character (letters, digits, underscore)'],
    [/\\s/g,          'matches any whitespace character'],
    [/\\b/g,          'matches a word boundary'],
    [/\.\*/g,         'matches any character, zero or more times'],
    [/\.\+/g,         'matches any character, one or more times'],
    [/\{(\d+),(\d+)\}/g, (m,a,b) => `matches between ${a} and ${b} times`],
    [/\{(\d+)\}/g,    (m,n) => `matches exactly ${n} times`],
    [/\[([^\]]+)\]/g, (m,cls) => `matches any character in: ${cls}`],
    [/\(([^)]+)\)/g,  (m,g) => `captures group: ${g}`],
  ];
  // Return a 1-2 sentence summary — basic implementation
  return `Pattern: /${pattern}/ — ${explanations.length} known components detected.`;
}
```

---

## Tool 13 — CronLab
### tools.tapdot.org/dev/cron

**Meta**
```
title:       CronLab — Cron Expression Workbench | tapdot
description: Parse, build, and test cron expressions. Visual builder, 20 next run
             times across timezones, and natural language conversion — all private.
```

**The gap:** No single tool combines parser + visual builder + multi-timezone next
runs + natural language input in a clean, private, ad-free interface. Crontab.guru
shows only 5 next runs in one timezone and has no builder. FreeFormatter has both
parse and generate but sends to their servers and has heavy ads.

**Layout — four-panel workbench**

```
┌──────────────────────────────────────────────────────────────┐
│  EXPRESSION INPUT + FORMAT SELECTOR                          │
│  ┌──────────────────────────────────────────────────┐        │
│  │  * * * * *                                       │        │
│  └──────────────────────────────────────────────────┘        │
│  [5-field]  [6-field +sec]  [Quartz 7-field]                 │
│  ┌──────┬──────┬──────┬──────┬──────┐                        │
│  │  *   │  *   │  *   │  *   │  *   │  ← field labels       │
│  │ min  │ hour │ dom  │ mon  │ dow  │                        │
│  └──────┴──────┴──────┴──────┴──────┘                        │
│  "At every minute." — plain English explanation              │
├──────────────────────────┬───────────────────────────────────┤
│  VISUAL BUILDER          │  NEXT 20 RUNS                     │
│                          │  Timezone 1  Timezone 2  Tz 3    │
│  Minute   [Every ▾]      │  ─────────── ─────────── ──────   │
│  Hour     [Every ▾]      │  Jul 3 09:00 Jul 3 13:30 ...     │
│  Dom      [Every ▾]      │  Jul 4 09:00 Jul 4 13:30 ...     │
│  Month    [Every ▾]      │  ... (20 rows total)             │
│  Dow      [Every ▾]      │                                   │
│                          │  📅 30-day heatmap                │
│  Presets: @daily @hourly │                                   │
├──────────────────────────┴───────────────────────────────────┤
│  NATURAL LANGUAGE → CRON                    (Prompt API)     │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ "Every weekday at 9am India time"    [Convert →]      │   │
│  └───────────────────────────────────────────────────────┘   │
│  Result: 0 9 * * 1-5  [Copy]                                 │
└──────────────────────────────────────────────────────────────┘
```

**Panel 1 — Expression input + field annotations**

```javascript
// cron.js

// Cron field definitions
const FIELDS_5 = [
  { name: 'Minute',       range: [0, 59],  label: 'min' },
  { name: 'Hour',         range: [0, 23],  label: 'hour' },
  { name: 'Day of month', range: [1, 31],  label: 'dom' },
  { name: 'Month',        range: [1, 12],  label: 'mon' },
  { name: 'Day of week',  range: [0, 7],   label: 'dow' },
];

const FIELDS_6 = [
  { name: 'Second',       range: [0, 59],  label: 'sec' },
  ...FIELDS_5
];

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN',
                     'JUL','AUG','SEP','OCT','NOV','DEC'];
const DOW_NAMES   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function parseExpression(expr, format = '5field') {
  const parts = expr.trim().split(/\s+/);
  const expected = format === '5field' ? 5 : format === '6field' ? 6 : 7;

  if (parts.length !== expected) {
    return { ok: false, error: `Expected ${expected} fields, got ${parts.length}` };
  }

  const fields = format === '5field' ? FIELDS_5 : FIELDS_6;
  const errors = [];

  parts.forEach((part, i) => {
    const field = fields[i];
    if (part === '*' || part === '?') return;

    // Validate each value in the field
    const values = part.split(',');
    for (const val of values) {
      if (/^\*\/\d+$/.test(val)) {
        const step = parseInt(val.slice(2));
        if (step < 1) errors.push(`${field.label}: step must be ≥ 1`);
        continue;
      }
      if (/^\d+-\d+$/.test(val)) {
        const [a, b] = val.split('-').map(Number);
        if (a > b) errors.push(`${field.label}: range start must be ≤ end`);
        if (a < field.range[0] || b > field.range[1]) {
          errors.push(`${field.label}: range ${a}-${b} outside valid range ${field.range[0]}-${field.range[1]}`);
        }
        continue;
      }
      const num = parseInt(val);
      if (isNaN(num)) {
        // Allow named months/days
        const named = field.label === 'mon' ? MONTH_NAMES : DOW_NAMES;
        if (!named.includes(val.toUpperCase())) {
          errors.push(`${field.label}: "${val}" is not valid`);
        }
        continue;
      }
      if (num < field.range[0] || num > field.range[1]) {
        errors.push(`${field.label}: ${num} outside valid range ${field.range[0]}-${field.range[1]}`);
      }
    }
  });

  return errors.length ? { ok: false, error: errors.join(' · ') } : { ok: true, parts };
}

function toEnglish(parts, format = '5field') {
  // Map each field to a readable phrase
  const [min, hour, dom, mon, dow] = format === '5field' ? parts : parts.slice(1);

  if (parts.every(p => p === '*')) return 'At every minute';
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`;

  const hourStr = hour === '*' ? 'every hour' : `${hour.padStart(2,'0')}:00`;
  const minStr  = min  === '*' ? 'every minute' : `minute ${min}`;
  const dowStr  = dow  === '*' ? 'every day of the week'
                               : `on ${dow.split(',').map(d => DOW_NAMES[d] ?? d).join(', ')}`;
  const monStr  = mon  === '*' ? '' : ` in ${mon.split(',').map(m => MONTH_NAMES[m-1] ?? m).join(', ')}`;
  const domStr  = dom  === '*' ? '' : ` on day ${dom} of the month`;

  return `At ${minStr} past ${hourStr}, ${dowStr}${domStr}${monStr}`;
}
```

**Panel 2 — Visual builder**

```javascript
// Builder state — mirrors the expression fields
const builderState = {
  minute: { mode: 'every', value: null, step: null, range: null },
  hour:   { mode: 'every', value: null, step: null, range: null },
  dom:    { mode: 'every', value: null, step: null, range: null },
  month:  { mode: 'every', value: null, step: null, range: null },
  dow:    { mode: 'every', value: null, step: null, range: null },
};

// mode can be: 'every' | 'at' | 'every-n' | 'range' | 'specific'
function stateToExpression(state) {
  return Object.values(state).map(field => {
    if (field.mode === 'every')   return '*';
    if (field.mode === 'every-n') return `*/${field.step}`;
    if (field.mode === 'at')      return String(field.value);
    if (field.mode === 'range')   return `${field.range[0]}-${field.range[1]}`;
    if (field.mode === 'specific') return field.value.join(',');
    return '*';
  }).join(' ');
}

// Presets
const PRESETS = {
  '@yearly':   '0 0 1 1 *',
  '@monthly':  '0 0 1 * *',
  '@weekly':   '0 0 * * 0',
  '@daily':    '0 0 * * *',
  '@hourly':   '0 * * * *',
  '@reboot':   '@reboot',
};
```

**Panel 3 — Next 20 run times across timezones**

```javascript
function getNextRuns(expr, timezone1, timezone2, timezone3, count = 20) {
  // Parse the expression and compute next N occurrences
  // Walk forward minute by minute from now — efficient for most expressions
  // For very infrequent expressions (yearly), walk by day

  const runs = [];
  let   current = new Date();
  current.setSeconds(0, 0);
  current = new Date(current.getTime() + 60000); // start from next minute

  const parts  = expr.trim().split(/\s+/);
  const [minF, hourF, domF, monF, dowF] = parts;
  const maxIter = 527040; // 1 year of minutes

  for (let i = 0; i < maxIter && runs.length < count; i++) {
    if (matchesField(current.getUTCMinutes(), minF, 0, 59)  &&
        matchesField(current.getUTCHours(),   hourF, 0, 23) &&
        matchesField(current.getUTCDate(),    domF, 1, 31)  &&
        matchesField(current.getUTCMonth()+1, monF, 1, 12) &&
        matchesField(current.getUTCDay(),     dowF, 0, 7)) {
      runs.push({
        utc: new Date(current),
        tz1: formatInTZ(current, timezone1),
        tz2: timezone2 ? formatInTZ(current, timezone2) : null,
        tz3: timezone3 ? formatInTZ(current, timezone3) : null,
      });
    }
    current = new Date(current.getTime() + 60000);
  }

  return runs;
}

function matchesField(value, field, min, max) {
  if (field === '*' || field === '?') return true;
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2));
    return (value - min) % step === 0;
  }
  return field.split(',').some(part => {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      return value >= a && value <= b;
    }
    return parseInt(part) === value || (value === 7 && parseInt(part) === 0);
  });
}

function formatInTZ(date, tz) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    month:  'short', day:    'numeric',
    hour:   '2-digit', minute: '2-digit',
    hour12: false,
  }).format(date);
}
```

**30-day calendar heatmap**

```javascript
function buildHeatmap(runs) {
  const today    = new Date();
  const cells    = [];
  const runDates = new Set(runs.map(r => r.utc.toDateString()));

  for (let d = 0; d < 30; d++) {
    const date  = new Date(today);
    date.setDate(today.getDate() + d);
    const count = runs.filter(r =>
      r.utc.toDateString() === date.toDateString()
    ).length;
    cells.push({ date, count: Math.min(count, 4) });
  }
  return cells;
}
```

**Panel 4 — Natural language → cron (Chrome Prompt API)**

```javascript
const NL_CRON_PROMPT = (description) => `Convert this schedule description to a cron expression.
Respond with ONLY the cron expression (5 fields: minute hour day-of-month month day-of-week).
No explanation. No markdown. Just the 5-field cron expression.

Schedule: "${description}"

Examples:
"Every day at midnight" → 0 0 * * *
"Every weekday at 9am" → 0 9 * * 1-5
"Every 15 minutes" → */15 * * * *
"First day of every month at 3pm" → 0 15 1 * *
"Every Sunday at noon" → 0 12 * * 0`;

async function naturalLanguageToCron(description) {
  const available = await LanguageModel.availability();

  if (available === 'unavailable') {
    // Fallback: rule-based NL parser for common patterns
    return fallbackNLParser(description);
  }

  const session  = await LanguageModel.create();
  const response = await session.prompt(NL_CRON_PROMPT(description));
  session.destroy();

  const cron = response.trim().replace(/`/g, '');
  // Validate the result is actually a valid cron expression
  const parsed = parseExpression(cron);
  if (!parsed.ok) throw new Error('AI returned an invalid expression — try rephrasing');
  return cron;
}

// Rule-based fallback for when Gemini Nano is unavailable
function fallbackNLParser(description) {
  const d = description.toLowerCase();

  if (d.includes('every minute'))           return '* * * * *';
  if (d.includes('every hour'))             return '0 * * * *';
  if (d.includes('every day at midnight'))  return '0 0 * * *';
  if (d.includes('every day at noon'))      return '0 12 * * *';
  if (d.includes('every weekday'))          return '0 9 * * 1-5';
  if (d.includes('every monday'))           return '0 9 * * 1';
  if (d.includes('every sunday'))           return '0 9 * * 0';
  if (d.includes('first of the month'))     return '0 0 1 * *';
  if (d.match(/every (\d+) minutes?/)) {
    const mins = d.match(/every (\d+) minutes?/)[1];
    return `*/${mins} * * * *`;
  }
  if (d.match(/at (\d+)(am|pm)/)) {
    const [, h, period] = d.match(/at (\d+)(am|pm)/);
    let hour = parseInt(h);
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return `0 ${hour} * * *`;
  }

  return null; // Cannot parse — show helpful message
}
```

**History — last 10 expressions in localStorage**

```javascript
function saveToHistory(expr) {
  const history = JSON.parse(localStorage.getItem('tapdot-cron-history') || '[]');
  const updated = [expr, ...history.filter(e => e !== expr)].slice(0, 10);
  localStorage.setItem('tapdot-cron-history', JSON.stringify(updated));
}

function loadHistory() {
  return JSON.parse(localStorage.getItem('tapdot-cron-history') || '[]');
}
```

**Flags for Gemini Nano (if using NL → cron feature)**
```
chrome://flags/#prompt-api-for-gemini-nano → Enabled
```

The tool works fully without Gemini Nano — the NL panel shows a fallback rule-based
parser and a note explaining that on-device AI is not available on this device.

---

## Hub page — tools.tapdot.org/dev

The dev hub lists all 13 tools in a grid, grouped by category:

**Document and data tools**
JSONLab · JSONConvert · JWTRead · YAMLCheck · CSVExplore

**Code and markup**
MarkdownLive · HTMLPreview · SQLFormat

**Utilities and generators**
ColourContrast · UUIDGen · TimezoneNow

**Workbench tools**
RegexLab · CronLab

---

## Claude Code build order

Build in this exact sequence — easiest to most complex:

1.  `dev/dev.css` — shared dev-specific styles (build before anything else)
2.  `dev/index.html` — dev hub page
3.  `dev/contrast/` — ColourContrast (pure math, no parsing)
4.  `dev/uuid/` — UUIDGen (Web Crypto API only)
5.  `dev/jwt/` — JWTRead (atob only, no library)
6.  `dev/json/` — JSONLab (tokeniser + diff logic)
7.  `dev/yaml/` — YAMLCheck (requires js-yaml — download and bundle locally)
8.  `dev/jsonconvert/` — JSONConvert (requires js-yaml, implement CSV/XML)
9.  `dev/csv/` — CSVExplore (RFC 4180 parser + table render)
10. `dev/sql/` — SQLFormat (tokeniser + formatter)
11. `dev/markdown/` — MarkdownLive (parser + live preview + autosave)
12. `dev/html/` — HTMLPreview (iframe sandbox)
13. `dev/timezone/` — TimezoneNow (Intl API + overlap finder)
14. `dev/regex/` — RegexLab (4-panel workbench + history)
15. `dev/cron/` — CronLab (4-panel workbench + NL conversion — build last)

**For js-yaml:** Download `js-yaml.min.js` from the js-yaml GitHub releases page and
save to `dev/libs/js-yaml.min.js`. Include with a relative path in yaml and jsonconvert
tools. Do not load from a CDN — this must work offline.

---

## SEO — per tool meta tags

| Tool | Primary keyword | Title |
|---|---|---|
| JSONLab | JSON formatter | JSONLab — JSON Formatter & Validator \| tapdot |
| JSONConvert | JSON to YAML converter | JSONConvert — JSON YAML CSV XML Converter \| tapdot |
| JWTRead | JWT decoder | JWTRead — JWT Token Decoder \| tapdot |
| YAMLCheck | YAML validator | YAMLCheck — YAML Validator & Formatter \| tapdot |
| CSVExplore | CSV viewer online | CSVExplore — Private CSV Viewer \| tapdot |
| MarkdownLive | markdown editor | MarkdownLive — Markdown Editor with Preview \| tapdot |
| HTMLPreview | HTML renderer | HTMLPreview — HTML Renderer & Sandbox \| tapdot |
| SQLFormat | SQL formatter | SQLFormat — SQL Formatter & Beautifier \| tapdot |
| ColourContrast | WCAG contrast checker | ColourContrast — WCAG Contrast Checker \| tapdot |
| UUIDGen | UUID generator | UUIDGen — UUID & Token Generator \| tapdot |
| TimezoneNow | world clock | TimezoneNow — World Clock & Meeting Planner \| tapdot |
| RegexLab | regex tester | RegexLab — Regex Tester & Debugger \| tapdot |
| CronLab | cron expression tester | CronLab — Cron Expression Workbench \| tapdot |

---

## Analytics

Same Cloudflare Web Analytics setup as study and write collections:

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "YOUR_CLOUDFLARE_TOKEN"}'></script>
```

Add to every tool's `index.html` before `</body>`. Replace token after setting up
Cloudflare Web Analytics for tools.tapdot.org.

---

## Launch checklist

- [ ] All 13 tools load at their correct URLs
- [ ] HTTPS enforced — green padlock
- [ ] Dark mode works on all tools
- [ ] All tools work offline after first load
- [ ] No third-party network requests during tool use (DevTools → Network)
  Exception: Cloudflare beacon fires once on page load — expected
- [ ] js-yaml bundled locally — not loaded from any CDN
- [ ] JWTRead: valid and expired tokens both render correctly
- [ ] ColourContrast: contrast ratio matches WebAIM's tool for same inputs
- [ ] UUIDGen: generated IDs pass UUID v4 format validation
- [ ] CronLab: `* * * * *` produces 20 next run times with correct timestamps
- [ ] CronLab: natural language fallback works when Gemini Nano is unavailable
- [ ] RegexLab: invalid regex shows error without crashing the page
- [ ] CSVExplore: handles quoted fields with embedded commas
- [ ] HTMLPreview: sandboxed iframe cannot access parent localStorage
- [ ] All title and meta description tags set correctly
- [ ] Cloudflare token replaced in all HTML files
- [ ] Footer links to privacy.html on every page
