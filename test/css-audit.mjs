// CSS audit — two checks:
// 1. UNSTYLED CONTROLS: <button>/<input>/<select>/<textarea> in HTML or JS template
//    literals that carry NO class at all (they render as browser-default controls).
// 2. UNDEFINED CLASSES: static class attributes referencing classes not defined in
//    any CSS file (skips template-literal/dynamic classes and known JS state hooks).
// Run: cd test && node css-audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'test', 'assets', 'shots']);

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), exts, out);
    } else if (exts.includes(path.extname(e.name))) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

const defined = new Set();
for (const f of walk(ROOT, ['.css'])) {
  const css = fs.readFileSync(f, 'utf8');
  for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(m[1]);
}

// Elements styled acceptably without a class when inside a styled container,
// or classless by design:
const TAG_RE = /<(button|input|select|textarea)\b([^>]*)>/g;
const unstyled = [];
for (const f of walk(ROOT, ['.html', '.js'])) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  for (const m of src.matchAll(TAG_RE)) {
    const [, tag, attrs] = m;
    if (/class\s*=/.test(attrs)) continue;
    // input types that are custom-styled globally or intentionally native:
    if (tag === 'input' && /type="(checkbox|radio|color|range|hidden|file)"/.test(attrs)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    unstyled.push(`${rel}:${line}  <${tag} ${attrs.trim().slice(0, 60)}>`);
  }
}

// Undefined classes from STATIC class attributes only (no ${...}).
const IGNORE = new Set([
  // state classes styled via compound selectors
  'active', 'visible', 'in', 'playing', 'done', 'show', 'logged', 'period', 'predicted',
  'empty', 'winner', 'on', 'working', 'fallback', 'ok', 'to-read', 'reading', 'over',
  'selected', 'd-in', 'work', 'ov',
  // JS hooks / secondary classes on elements already styled by another class
  // (verified 2026-07-03 — see git history of this file)
  'gc-tab', 'gc-name', 'gc-credits', 'gc-grade', 'w-name', 'w-score', 'w-weight', 'w-max',
  'ff-front', 'ff-tile-q', 'ff-tile-a', 'b-mode', 'b-val', 'cite-style-segment',
  'd-front', 'i', 'tzm-dots', 'tzm-arcs', 'tzm-markers',
]);
const undef = new Map();
for (const f of walk(ROOT, ['.html', '.js'])) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  for (const m of src.matchAll(/class="([^"$]+)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!cls || IGNORE.has(cls) || defined.has(cls)) continue;
      if (!/^[a-zA-Z][\w-]*$/.test(cls)) continue;
      if (!undef.has(cls)) undef.set(cls, new Set());
      undef.get(cls).add(rel);
    }
  }
}

// Unstyled controls are WARNINGS only: many are styled via descendant selectors
// (.biz-matrix input, .ts-table input, .ts-nl-strip input, .dev-toolbar button, …).
// Review new entries by hand when they appear.
let fail = 0;
if (unstyled.length) {
  console.log('── UNSTYLED CONTROLS (warnings — verify descendant-selector coverage) ──');
  unstyled.forEach(u => console.log(u));
}
if (undef.size) {
  console.log('\n── UNDEFINED CLASSES (used statically, defined nowhere) ──');
  for (const [cls, files] of [...undef].sort()) {
    fail++;
    console.log(`.${cls}`);
    files.forEach(f => console.log(`    ${f}`));
  }
}
console.log(`\n${fail} issues`);
process.exit(fail ? 1 : 0);
