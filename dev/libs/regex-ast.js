/**
 * regex-ast.js — a small, dependency-free regular-expression parser plus two
 * renderers built on top of it:
 *
 *   rxParse(pattern)        → AST
 *   rxExplain(ast)          → flat list of {depth, code, text} explanation rows
 *   rxRailroad(ast, opts)   → an SVG string (a regexper-style railroad diagram)
 *
 * Written by hand rather than pulled in as a library, matching how the rest of
 * this site treats third-party code. The parser is deliberately tolerant: its
 * job is to *describe* a pattern the browser has already accepted, not to
 * re-validate it, so anything it doesn't recognise degrades to a literal rather
 * than throwing.
 *
 * All exported names are rx-prefixed — shared.js owns ICONS / ICON_PATHS /
 * STEPS / TOOL_REGISTRY / COLLECTION_LABELS / tapdotAI in the same global
 * scope, and colliding with those silently breaks the whole page (see the v13
 * changelog entry).
 */

/* ────────────────────────────── Parser ────────────────────────────── */

const RX_ESCAPES = {
  d: 'any digit (0-9)',
  D: 'any character that is not a digit',
  w: 'any word character (a-z, A-Z, 0-9, _)',
  W: 'any character that is not a word character',
  s: 'any whitespace (space, tab, newline)',
  S: 'any character that is not whitespace',
  b: 'a word boundary',
  B: 'a position that is not a word boundary',
  n: 'a newline',
  r: 'a carriage return',
  t: 'a tab',
  f: 'a form feed',
  v: 'a vertical tab',
  0: 'a NUL character',
};

function rxParse(pattern) {
  let i = 0;
  let groupNumber = 0;

  const peek = (o = 0) => pattern[i + o];
  const eof = () => i >= pattern.length;

  function parseAlternation() {
    const options = [parseSequence()];
    while (peek() === '|') { i++; options.push(parseSequence()); }
    return options.length === 1 ? options[0] : { type: 'alt', options };
  }

  function parseSequence() {
    const items = [];
    while (!eof() && peek() !== '|' && peek() !== ')') {
      const atom = parseAtom();
      if (atom) items.push(parseQuantifier(atom));
    }
    return { type: 'seq', items };
  }

  function parseQuantifier(atom) {
    const c = peek();
    let min, max;
    if (c === '*') { min = 0; max = Infinity; i++; }
    else if (c === '+') { min = 1; max = Infinity; i++; }
    else if (c === '?') { min = 0; max = 1; i++; }
    else if (c === '{') {
      // Only treat `{` as a quantifier if it really looks like one — `a{foo}`
      // is a literal brace in JS regex, not a repeat.
      const m = /^\{(\d*)(,?)(\d*)\}/.exec(pattern.slice(i));
      if (!m || (m[1] === '' && m[3] === '')) return atom;
      min = m[1] === '' ? 0 : parseInt(m[1], 10);
      max = m[2] === '' ? min : (m[3] === '' ? Infinity : parseInt(m[3], 10));
      i += m[0].length;
    } else return atom;

    let lazy = false, possessive = false;
    if (peek() === '?') { lazy = true; i++; }
    else if (peek() === '+') { possessive = true; i++; }
    return { type: 'repeat', min, max, lazy, possessive, child: atom };
  }

  function parseAtom() {
    const c = peek();

    if (c === '(') return parseGroup();
    if (c === '[') return parseCharClass();
    if (c === '^' || c === '$') { i++; return { type: 'anchor', raw: c }; }
    if (c === '.') { i++; return { type: 'any' }; }
    if (c === '\\') return parseEscape();
    i++;
    return { type: 'char', value: c };
  }

  function parseGroup() {
    i++; // consume '('
    let kind = 'capture', name = null, number = null;

    if (peek() === '?') {
      const two = pattern.slice(i, i + 2);
      if (two === '?:') { kind = 'noncapture'; i += 2; }
      else if (two === '?=') { kind = 'lookahead'; i += 2; }
      else if (two === '?!') { kind = 'neglookahead'; i += 2; }
      else if (pattern.slice(i, i + 3) === '?<=') { kind = 'lookbehind'; i += 3; }
      else if (pattern.slice(i, i + 3) === '?<!') { kind = 'neglookbehind'; i += 3; }
      else if (peek(1) === '<') {
        const m = /^\?<([^>]*)>/.exec(pattern.slice(i));
        if (m) { kind = 'named'; name = m[1]; i += m[0].length; number = ++groupNumber; }
        else { i++; }
      } else i++;
    } else {
      number = ++groupNumber;
    }

    const child = parseAlternation();
    if (peek() === ')') i++;
    return { type: 'group', kind, name, number, child };
  }

  function parseCharClass() {
    const start = i;
    i++; // consume '['
    let negated = false;
    if (peek() === '^') { negated = true; i++; }
    const parts = [];
    // A ']' in the first position is a literal, per regex rules.
    if (peek() === ']') { parts.push({ kind: 'char', value: ']' }); i++; }

    while (!eof() && peek() !== ']') {
      let item;
      if (peek() === '\\') {
        i++;
        const e = peek(); i++;
        item = RX_ESCAPES[e] ? { kind: 'escape', value: e } : { kind: 'char', value: e };
      } else {
        item = { kind: 'char', value: peek() };
        i++;
      }
      // Range: only chars can bound a range, and only if a '-' actually follows.
      if (item.kind === 'char' && peek() === '-' && peek(1) && peek(1) !== ']') {
        i++;
        let hi;
        if (peek() === '\\') { i++; hi = peek(); i++; } else { hi = peek(); i++; }
        parts.push({ kind: 'range', from: item.value, to: hi });
      } else {
        parts.push(item);
      }
    }
    if (peek() === ']') i++;
    return { type: 'class', negated, parts, raw: pattern.slice(start, i) };
  }

  function parseEscape() {
    i++; // consume '\'
    const c = peek();
    if (c === undefined) return { type: 'char', value: '\\' };

    // Backreference by number, or by \k<name>
    if (/[1-9]/.test(c)) {
      const m = /^\d+/.exec(pattern.slice(i));
      i += m[0].length;
      return { type: 'backref', ref: m[0] };
    }
    if (c === 'k' && peek(1) === '<') {
      const m = /^k<([^>]*)>/.exec(pattern.slice(i));
      if (m) { i += m[0].length; return { type: 'backref', ref: m[1], named: true }; }
    }
    // Unicode / hex escapes stay as opaque literals — we describe, not decode.
    if (c === 'u' || c === 'x') {
      const m = c === 'u'
        ? /^u(\{[0-9a-fA-F]+\}|[0-9a-fA-F]{4})/.exec(pattern.slice(i))
        : /^x[0-9a-fA-F]{2}/.exec(pattern.slice(i));
      if (m) { i += m[0].length; return { type: 'escape', value: c, raw: '\\' + m[0] }; }
    }
    i++;
    if (RX_ESCAPES[c]) {
      return (c === 'b' || c === 'B')
        ? { type: 'anchor', raw: '\\' + c }
        : { type: 'escape', value: c, raw: '\\' + c };
    }
    return { type: 'char', value: c, escaped: true };
  }

  const ast = parseAlternation();
  return { ast, groupCount: groupNumber };
}

/* ───────────────────────────── Explanation ───────────────────────────── */

const RX_ANCHORS = {
  '^': 'the start of the string (or of a line, with the m flag)',
  '$': 'the end of the string (or of a line, with the m flag)',
  '\\b': 'a word boundary — between a word character and a non-word character',
  '\\B': 'a position that is not a word boundary',
};

function rxQuantifierText(node) {
  const { min, max, lazy, possessive } = node;
  let base;
  if (min === 0 && max === Infinity) base = 'zero or more times';
  else if (min === 1 && max === Infinity) base = 'one or more times';
  else if (min === 0 && max === 1) base = 'optionally (zero or one time)';
  else if (max === Infinity) base = `at least ${min} times`;
  else if (min === max) base = `exactly ${min} time${min === 1 ? '' : 's'}`;
  else base = `between ${min} and ${max} times`;

  if (lazy) return `${base}, as few as possible (lazy)`;
  if (possessive) return `${base}, without backtracking (possessive)`;
  return base;
}

function rxClassText(node) {
  const parts = node.parts.map((p) => {
    if (p.kind === 'range') return `${p.from}-${p.to}`;
    if (p.kind === 'escape') return RX_ESCAPES[p.value] || `\\${p.value}`;
    return JSON.stringify(p.value).slice(1, -1);
  });
  const list = parts.length ? parts.join(', ') : 'nothing';
  return node.negated
    ? `any character EXCEPT these: ${list}`
    : `any one character from: ${list}`;
}

// Short label used inside the railroad diagram boxes.
function rxLabel(node) {
  switch (node.type) {
    case 'char': return node.value === ' ' ? '␣' : node.value;
    case 'any': return 'any char';
    case 'escape': return node.raw || `\\${node.value}`;
    case 'anchor': return node.raw;
    case 'backref': return node.named ? `\\k<${node.ref}>` : `\\${node.ref}`;
    case 'class': return node.raw;
    default: return '';
  }
}

function rxExplain(parsed) {
  const rows = [];
  const push = (depth, code, text) => rows.push({ depth, code, text });

  function walk(node, depth) {
    switch (node.type) {
      case 'alt':
        push(depth, '|', `Match ONE of the following ${node.options.length} alternatives, trying them left to right:`);
        node.options.forEach((opt, n) => {
          push(depth + 1, `#${n + 1}`, `Alternative ${n + 1}`);
          walk(opt, depth + 2);
        });
        break;

      case 'seq':
        if (!node.items.length) { push(depth, '', 'Match the empty string'); break; }
        // Collapse a run of plain characters into one readable row.
        for (let n = 0; n < node.items.length; n++) {
          const run = [];
          while (n < node.items.length && node.items[n].type === 'char') { run.push(node.items[n].value); n++; }
          if (run.length) {
            const text = run.join('');
            push(depth, text, `Match the literal text "${text}"`);
            if (n >= node.items.length) break;
          }
          walk(node.items[n], depth);
        }
        break;

      case 'repeat': {
        const inner = node.child;
        const simple = ['char', 'any', 'escape', 'class', 'backref'].includes(inner.type);
        if (simple) {
          push(depth, rxRaw(node), `Match ${rxAtomText(inner)}, ${rxQuantifierText(node)}`);
        } else {
          push(depth, rxRepeatSuffix(node), `Repeat the following ${rxQuantifierText(node)}:`);
          walk(inner, depth + 1);
        }
        break;
      }

      case 'group': {
        const label = {
          capture: `Capture group ${node.number} — the matched text is saved as $${node.number}`,
          named: `Named capture group "${node.name}" (also group ${node.number})`,
          noncapture: 'Group these together WITHOUT capturing (no $n slot used)',
          lookahead: 'Lookahead — the text ahead must match this, but is NOT consumed',
          neglookahead: 'Negative lookahead — the text ahead must NOT match this',
          lookbehind: 'Lookbehind — the text before must match this, but is NOT consumed',
          neglookbehind: 'Negative lookbehind — the text before must NOT match this',
        }[node.kind];
        const code = node.kind === 'capture' ? `( )` : node.kind === 'named' ? `(?<${node.name}>)` : rxGroupPrefix(node.kind);
        push(depth, code, label);
        walk(node.child, depth + 1);
        break;
      }

      default:
        push(depth, rxLabel(node), `Match ${rxAtomText(node)}`);
    }
  }

  walk(parsed.ast, 0);
  return rows;
}

function rxGroupPrefix(kind) {
  return { noncapture: '(?:)', lookahead: '(?=)', neglookahead: '(?!)', lookbehind: '(?<=)', neglookbehind: '(?<!)' }[kind] || '()';
}

function rxRepeatSuffix(node) {
  const { min, max, lazy } = node;
  let s;
  if (min === 0 && max === Infinity) s = '*';
  else if (min === 1 && max === Infinity) s = '+';
  else if (min === 0 && max === 1) s = '?';
  else if (max === Infinity) s = `{${min},}`;
  else if (min === max) s = `{${min}}`;
  else s = `{${min},${max}}`;
  return s + (lazy ? '?' : '');
}

function rxRaw(node) { return rxLabel(node.child) + rxRepeatSuffix(node); }

function rxAtomText(node) {
  switch (node.type) {
    case 'char': return `the literal character "${node.value}"`;
    case 'any': return 'any character (except newline, unless the s flag is set)';
    case 'escape': return RX_ESCAPES[node.value] || `the escape ${node.raw || '\\' + node.value}`;
    case 'anchor': return RX_ANCHORS[node.raw] || node.raw;
    case 'class': return rxClassText(node);
    case 'backref': return `the same text that ${node.named ? `group "${node.ref}"` : `group ${node.ref}`} captured earlier`;
    default: return 'this';
  }
}

/* ─────────────────────────── Railroad diagram ─────────────────────────── */
//
// Layout is bottom-up: every node measures itself into {w, h, ascent, draw(x,y)}
// where `ascent` is the y-offset of the horizontal track line within the node's
// box, so siblings in a sequence can be aligned on a single rail.

function rxRailroad(parsed, opts = {}) {
  const CH = 7.2;           // approx width of one monospace char at 12px
  const BOX_H = 26;
  const H_GAP = 14;
  const V_GAP = 12;
  const ALT_PAD = 26;       // horizontal room for the branch curves
  const LOOP_H = 20;        // vertical room for a repeat's loop-back arc

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const textW = (s) => Math.max(26, s.length * CH + 18);

  function box(label, cls, title) {
    const w = textW(label);
    return {
      w, h: BOX_H, ascent: BOX_H / 2,
      draw: (x, y) => `<g class="rr-node ${cls}">`
        + `<rect x="${x}" y="${y}" width="${w}" height="${BOX_H}" rx="6"></rect>`
        + (title ? `<title>${esc(title)}</title>` : '')
        + `<text x="${x + w / 2}" y="${y + BOX_H / 2 + 4}">${esc(label)}</text></g>`,
    };
  }

  const line = (x1, y1, x2, y2) => `<path class="rr-rail" d="M${x1} ${y1} L${x2} ${y2}"></path>`;

  function measure(node) {
    switch (node.type) {
      case 'seq': return measureSeq(node);
      case 'alt': return measureAlt(node);
      case 'repeat': return measureRepeat(node);
      case 'group': return measureGroup(node);
      case 'char': {
        return box(node.value === ' ' ? '␣' : node.value, 'rr-literal', `literal "${node.value}"`);
      }
      case 'class': return box(node.raw, 'rr-class', rxClassText(node));
      case 'any': return box('any char', 'rr-class', 'any character except newline');
      case 'escape': return box(node.raw || '\\' + node.value, 'rr-escape', RX_ESCAPES[node.value] || '');
      case 'anchor': return box(node.raw, 'rr-anchor', RX_ANCHORS[node.raw] || '');
      case 'backref': return box(rxLabel(node), 'rr-escape', rxAtomText(node));
      default: return box('?', 'rr-literal', '');
    }
  }

  function measureSeq(node) {
    // Merge adjacent literal chars into one box — "http" reads better than h,t,t,p.
    const items = [];
    for (let n = 0; n < node.items.length; n++) {
      if (node.items[n].type === 'char') {
        let s = '';
        while (n < node.items.length && node.items[n].type === 'char') { s += node.items[n].value; n++; }
        n--;
        items.push(box(s, 'rr-literal', `literal "${s}"`));
      } else {
        items.push(measure(node.items[n]));
      }
    }
    if (!items.length) {
      return { w: 40, h: BOX_H, ascent: BOX_H / 2, draw: (x, y) => line(x, y + BOX_H / 2, x + 40, y + BOX_H / 2) };
    }
    const ascent = Math.max(...items.map(l => l.ascent));
    const below = Math.max(...items.map(l => l.h - l.ascent));
    const w = items.reduce((a, l) => a + l.w, 0) + H_GAP * (items.length - 1);
    return {
      w, h: ascent + below, ascent,
      draw: (x, y) => {
        let out = '', cx = x;
        items.forEach((l, n) => {
          if (n > 0) { out += line(cx - H_GAP, y + ascent, cx, y + ascent); }
          out += l.draw(cx, y + ascent - l.ascent);
          cx += l.w + H_GAP;
        });
        return out;
      },
    };
  }

  function measureAlt(node) {
    const opts = node.options.map(measure);
    const innerW = Math.max(...opts.map(l => l.w));
    const w = innerW + ALT_PAD * 2;
    const h = opts.reduce((a, l) => a + l.h, 0) + V_GAP * (opts.length - 1);
    const ascent = opts[0].ascent;
    return {
      w, h, ascent,
      draw: (x, y) => {
        let out = '';
        const inY = y + ascent;
        const leftX = x, splitX = x + 10, innerX = x + ALT_PAD, rightX = x + w, joinX = x + w - 10;
        let cy = y;
        opts.forEach((l) => {
          const ly = cy + l.ascent;
          // entry: straight for the first branch, an S-bend for the others
          out += ly === inY
            ? line(leftX, inY, innerX, inY)
            : `<path class="rr-rail" d="M${leftX} ${inY} H${splitX - 6} Q${splitX} ${inY} ${splitX} ${inY + Math.sign(ly - inY) * 6} V${ly - Math.sign(ly - inY) * 6} Q${splitX} ${ly} ${splitX + 6} ${ly} H${innerX}"></path>`;
          // centre the branch, filling the slack with rail
          const bx = innerX + (innerW - l.w) / 2;
          out += line(innerX, ly, bx, ly);
          out += l.draw(bx, cy);
          out += line(bx + l.w, ly, innerX + innerW, ly);
          out += ly === inY
            ? line(innerX + innerW, inY, rightX, inY)
            : `<path class="rr-rail" d="M${innerX + innerW} ${ly} H${joinX - 6} Q${joinX} ${ly} ${joinX} ${ly - Math.sign(ly - inY) * 6} V${inY + Math.sign(ly - inY) * 6} Q${joinX} ${inY} ${joinX + 6} ${inY} H${rightX}"></path>`;
          cy += l.h + V_GAP;
        });
        return out;
      },
    };
  }

  function measureRepeat(node) {
    const c = measure(node.child);
    const PAD = 16;
    const skip = node.min === 0;           // needs a bypass line above
    const loops = node.max === Infinity || node.max > 1;
    const SKIP_H = skip ? 16 : 0;
    const w = c.w + PAD * 2;
    const ascent = c.ascent + SKIP_H;
    const h = ascent + (c.h - c.ascent) + (loops ? LOOP_H : 0);
    const label = rxRepeatSuffix(node);
    return {
      w, h, ascent,
      draw: (x, y) => {
        const ly = y + ascent;             // the main rail
        const cx = x + PAD;
        let out = line(x, ly, cx, ly) + c.draw(cx, ly - c.ascent) + line(cx + c.w, ly, x + w, ly);
        if (skip) {
          const sy = y + 4;
          out += `<path class="rr-rail" d="M${x} ${ly} H${x + 6} Q${x + 12} ${ly} ${x + 12} ${ly - 6} V${sy + 6} Q${x + 12} ${sy} ${x + 18} ${sy} H${x + w - 18} Q${x + w - 12} ${sy} ${x + w - 12} ${sy + 6} V${ly - 6} Q${x + w - 12} ${ly} ${x + w - 6} ${ly} H${x + w}"></path>`;
        }
        if (loops) {
          const by = y + h - 6;
          out += `<path class="rr-rail rr-loop" d="M${cx + c.w} ${ly} Q${cx + c.w + 10} ${ly} ${cx + c.w + 10} ${ly + 8} V${by - 6} Q${cx + c.w + 10} ${by} ${cx + c.w} ${by} H${cx} Q${cx - 10} ${by} ${cx - 10} ${by - 6} V${ly + 8} Q${cx - 10} ${ly} ${cx} ${ly}"></path>`;
          out += `<text class="rr-label" x="${x + w / 2}" y="${by + 4}">${esc(label)}</text>`;
        } else if (skip) {
          out += `<text class="rr-label" x="${x + w / 2}" y="${y + 1}">${esc(label)}</text>`;
        }
        return out;
      },
    };
  }

  function measureGroup(node) {
    const c = measure(node.child);
    const PAD = 12;
    const TITLE_H = 20;
    const title = {
      capture: `group ${node.number}`,
      named: `<${node.name}>`,
      noncapture: '(non-capturing)',
      lookahead: 'lookahead (?=)',
      neglookahead: 'negative lookahead (?!)',
      lookbehind: 'lookbehind (?<=)',
      neglookbehind: 'negative lookbehind (?<!)',
    }[node.kind] || 'group';
    const w = c.w + PAD * 2;
    const h = c.h + TITLE_H + PAD;
    const ascent = TITLE_H + c.ascent;
    const cls = node.kind.includes('look') ? 'rr-group-look' : 'rr-group-capture';
    return {
      w, h, ascent,
      draw: (x, y) => `<g class="rr-group ${cls}">`
        + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"></rect>`
        + `<text class="rr-group-title" x="${x + 8}" y="${y + 13}">${esc(title)}</text></g>`
        + c.draw(x + PAD, y + TITLE_H),
    };
  }

  const root = measure(parsed.ast);
  const M = 18;              // outer margin, plus the start/end caps
  const CAP = 16;
  const W = root.w + M * 2 + CAP * 2;
  const H = root.h + M * 2;
  const railY = M + root.ascent;

  const body =
      `<circle class="rr-cap" cx="${M}" cy="${railY}" r="5"></circle>`
    + line(M, railY, M + CAP, railY)
    + root.draw(M + CAP, M)
    + line(M + CAP + root.w, railY, W - M, railY)
    + `<circle class="rr-cap" cx="${W - M}" cy="${railY}" r="5"></circle>`;

  return `<svg class="rr-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Railroad diagram of the regular expression">${body}</svg>`;
}
