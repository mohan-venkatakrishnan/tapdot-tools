// NotebookView — render a Jupyter .ipynb entirely in the browser.
//
// A notebook is just JSON, and its plots are already base64-encoded inside that
// JSON, so a full render needs no network and no kernel. Files are read with
// FileReader and never uploaded.

const $ = (id) => document.getElementById(id);

let nb = null;
let showCode = true, showOutputs = true;

/* ── Markdown (compact renderer, same spirit as MarkdownLive's) ───────────── */

function mdInline(s) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_, alt, src) =>
      /^(https?:|data:image\/)/i.test(src) ? `<img alt="${alt}" src="${src}" />` : `<em>[image: ${alt}]</em>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_, txt, href) =>
      /^(https?:|#|\/)/i.test(href) ? `<a href="${href}" rel="noopener noreferrer" target="_blank">${txt}</a>` : txt)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
}

function renderMarkdown(src) {
  const lines = src.split('\n');
  let html = '', i = 0, inList = null;
  const closeList = () => { if (inList) { html += `</${inList}>`; inList = null; } };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      closeList();
      html += `<pre class="nb-md-pre"><code>${highlight(buf.join('\n'), lang || 'python')}</code></pre>`;
      continue;
    }

    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      closeList();
      const level = m[1].length;
      const id = 'h-' + m[2].toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
      html += `<h${level} id="${id}" class="nb-h">${mdInline(m[2])}</h${level}>`;
      i++; continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) { closeList(); html += '<hr />'; i++; continue; }
    if ((m = line.match(/^\s*>\s?(.*)$/))) { closeList(); html += `<blockquote>${mdInline(m[1])}</blockquote>`; i++; continue; }

    if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
      if (inList !== 'ul') { closeList(); html += '<ul>'; inList = 'ul'; }
      html += `<li>${mdInline(m[1])}</li>`; i++; continue;
    }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      if (inList !== 'ol') { closeList(); html += '<ol>'; inList = 'ol'; }
      html += `<li>${mdInline(m[1])}</li>`; i++; continue;
    }

    // GFM table
    if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s:-]*\|[\s|:-]*$/.test(lines[i + 1])) {
      closeList();
      const cells = (r) => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
      html += '<table class="ts-table"><thead><tr>' + cells(line).map(c => `<th>${mdInline(c)}</th>`).join('') + '</tr></thead><tbody>';
      i += 2;
      while (i < lines.length && lines[i].includes('|')) {
        html += '<tr>' + cells(lines[i]).map(c => `<td>${mdInline(c)}</td>`).join('') + '</tr>';
        i++;
      }
      html += '</tbody></table>';
      continue;
    }

    if (!line.trim()) { closeList(); i++; continue; }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*[-*+]\s|\s*\d+[.)]\s|\s*>)/.test(lines[i])) para.push(lines[i++]);
    closeList();
    html += `<p>${mdInline(para.join(' '))}</p>`;
  }
  closeList();
  return html;
}

/* ── Syntax highlighting (Python-first, good enough for R/Julia/JS too) ───── */

const KEYWORDS = {
  python: 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case',
  javascript: 'async await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while yield',
  r: 'if else repeat while function for in next break TRUE FALSE NULL Inf NaN NA',
  julia: 'function end if else elseif for while return using import struct mutable const local global begin do',
  sql: 'select from where group by order having join left right inner outer on as insert update delete create table alter drop values into set distinct limit',
};

function highlight(code, lang) {
  const key = (lang || 'python').toLowerCase();
  const kw = new Set((KEYWORDS[key] || KEYWORDS.python).split(/\s+/));
  let out = '';
  // One pass over the source, classifying strings/comments/numbers/identifiers.
  // Doing this with a single mega-regex over escaped HTML is what produces the
  // classic "highlighter breaks on a # inside a string" bug, so this walks it.
  let i = 0;
  const isIdent = (c) => /[A-Za-z0-9_$]/.test(c);
  while (i < code.length) {
    const c = code[i];

    if (c === '#' && key !== 'javascript') { let j = i; while (j < code.length && code[j] !== '\n') j++; out += `<span class="tok-com">${escapeHtml(code.slice(i, j))}</span>`; i = j; continue; }
    if (c === '/' && code[i + 1] === '/') { let j = i; while (j < code.length && code[j] !== '\n') j++; out += `<span class="tok-com">${escapeHtml(code.slice(i, j))}</span>`; i = j; continue; }
    if (c === '"' || c === "'") {
      const triple = code.slice(i, i + 3);
      if (triple === '"""' || triple === "'''") {
        const end = code.indexOf(triple, i + 3);
        const j = end === -1 ? code.length : end + 3;
        out += `<span class="tok-str">${escapeHtml(code.slice(i, j))}</span>`; i = j; continue;
      }
      let j = i + 1;
      while (j < code.length && code[j] !== c) { if (code[j] === '\\') j++; j++; }
      out += `<span class="tok-str">${escapeHtml(code.slice(i, j + 1))}</span>`; i = j + 1; continue;
    }
    if (/[0-9]/.test(c) && (i === 0 || !isIdent(code[i - 1]))) {
      let j = i; while (j < code.length && /[0-9a-fA-FxXoObB._+-]/.test(code[j]) && !(code[j] === '-' && !/[eE]/.test(code[j - 1]))) j++;
      out += `<span class="tok-num">${escapeHtml(code.slice(i, j))}</span>`; i = j; continue;
    }
    if (isIdent(c)) {
      let j = i; while (j < code.length && isIdent(code[j])) j++;
      const word = code.slice(i, j);
      const after = code.slice(j).match(/^\s*\(/);
      const cls = kw.has(word) ? 'tok-kw' : after ? 'tok-fn' : '';
      out += cls ? `<span class="${cls}">${escapeHtml(word)}</span>` : escapeHtml(word);
      i = j; continue;
    }
    out += escapeHtml(c); i++;
  }
  return out;
}

/* ── ANSI → HTML (tracebacks are full of colour escapes) ──────────────────── */

const ANSI_COLORS = { 30: 'ansi-blk', 31: 'ansi-red', 32: 'ansi-grn', 33: 'ansi-yel', 34: 'ansi-blu', 35: 'ansi-mag', 36: 'ansi-cyn', 37: 'ansi-wht' };

function ansiToHtml(text) {
  let out = '', open = 0;
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    out += escapeHtml(text.slice(last, m.index));
    // Codes apply IN ORDER. IPython writes tracebacks as ESC[0;31m — "reset,
    // then red" — so treating any sequence containing a 0 as a plain reset
    // silently drops the colour from every real traceback.
    const codes = m[1].split(';').map(Number);
    if (!m[1]) { while (open > 0) { out += '</span>'; open--; } }
    for (const c of codes) {
      if (c === 0) { while (open > 0) { out += '</span>'; open--; } }
      else if (c === 1) { out += '<span class="ansi-bold">'; open++; }
      else if (ANSI_COLORS[c]) { out += `<span class="${ANSI_COLORS[c]}">`; open++; }
      else if (ANSI_COLORS[c - 60]) { out += `<span class="${ANSI_COLORS[c - 60]}">`; open++; } // bright variants 90-97
    }
    last = m.index + m[0].length;
  }
  out += escapeHtml(text.slice(last));
  while (open > 0) { out += '</span>'; open--; }
  return out;
}

/* ── HTML output sanitising ───────────────────────────────────────────────── */

// A notebook's text/html outputs are worth rendering (that's how pandas
// DataFrames appear), but they are untrusted markup from a file someone may
// have been handed. Everything executable is stripped before it reaches the DOM.
function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const BAD = ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form'];
  doc.body.querySelectorAll(BAD.join(',')).forEach(el => el.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const n = attr.name.toLowerCase();
      const v = attr.value.trim().toLowerCase();
      if (n.startsWith('on')) el.removeAttribute(attr.name);
      else if ((n === 'href' || n === 'src' || n === 'xlink:href') && v.startsWith('javascript:')) el.removeAttribute(attr.name);
      else if (n === 'srcdoc') el.removeAttribute(attr.name);
    }
  });
  return doc.body.innerHTML;
}

/* ── Cell rendering ───────────────────────────────────────────────────────── */

const srcOf = (cell) => {
  const s = cell.source ?? cell.input ?? '';
  return Array.isArray(s) ? s.join('') : String(s);
};

function renderOutput(out) {
  const type = out.output_type;

  if (type === 'stream') {
    const text = Array.isArray(out.text) ? out.text.join('') : String(out.text || '');
    return `<pre class="nb-out-stream${out.name === 'stderr' ? ' nb-stderr' : ''}">${ansiToHtml(text)}</pre>`;
  }

  if (type === 'error') {
    const tb = (out.traceback || []).join('\n');
    return `<div class="nb-out-error"><div class="nb-err-name">${escapeHtml(out.ename || 'Error')}: ${escapeHtml(out.evalue || '')}</div>`
      + (tb ? `<pre class="nb-out-stream">${ansiToHtml(tb)}</pre>` : '') + '</div>';
  }

  // execute_result / display_data — pick the richest representation available,
  // in the same priority order Jupyter's own frontend uses.
  const data = out.data || {};
  const join = (v) => (Array.isArray(v) ? v.join('') : String(v ?? ''));

  for (const mime of ['image/png', 'image/jpeg']) {
    if (data[mime]) return `<div class="nb-out-img"><img alt="output image" src="data:${mime};base64,${join(data[mime]).replace(/\s+/g, '')}" /></div>`;
  }
  if (data['image/svg+xml']) return `<div class="nb-out-img">${sanitizeHtml(join(data['image/svg+xml']))}</div>`;
  if (data['text/html']) return `<div class="nb-out-html">${sanitizeHtml(join(data['text/html']))}</div>`;
  if (data['application/json']) return `<pre class="nb-out-stream">${escapeHtml(JSON.stringify(data['application/json'], null, 2))}</pre>`;
  if (data['text/latex']) return `<pre class="nb-out-stream nb-latex">${escapeHtml(join(data['text/latex']))}</pre>`;
  if (data['text/plain']) return `<pre class="nb-out-stream">${ansiToHtml(join(data['text/plain']))}</pre>`;

  // v3 notebooks put these at the top level rather than under `data`.
  if (out.png) return `<div class="nb-out-img"><img alt="output image" src="data:image/png;base64,${join(out.png).replace(/\s+/g, '')}" /></div>`;
  if (out.html) return `<div class="nb-out-html">${sanitizeHtml(join(out.html))}</div>`;
  if (out.text) return `<pre class="nb-out-stream">${ansiToHtml(join(out.text))}</pre>`;

  return `<pre class="nb-out-stream dev-muted">[${escapeHtml(type || 'unknown output')}]</pre>`;
}

function renderCells() {
  const lang = (nb.metadata?.language_info?.name) || (nb.metadata?.kernelspec?.language) || 'python';
  const cells = nb.cells || nb.worksheets?.[0]?.cells || [];

  return cells.map((cell, idx) => {
    const type = cell.cell_type;
    const src = srcOf(cell);

    if (type === 'markdown') {
      return `<div class="nb-cell nb-cell-md" data-idx="${idx}">
        <div class="nb-gutter"></div>
        <div class="nb-body nb-md">${renderMarkdown(src)}</div>
      </div>`;
    }

    if (type === 'raw') {
      return `<div class="nb-cell" data-idx="${idx}"><div class="nb-gutter"></div>
        <div class="nb-body"><pre class="nb-out-stream dev-muted">${escapeHtml(src)}</pre></div></div>`;
    }

    const count = cell.execution_count ?? cell.prompt_number;
    const outputs = cell.outputs || [];
    return `<div class="nb-cell nb-cell-code" data-idx="${idx}">
      <div class="nb-gutter"><span class="nb-prompt">In [${count ?? ' '}]:</span></div>
      <div class="nb-body">
        ${showCode ? `<pre class="nb-src"><code>${highlight(src, lang)}</code></pre>` : ''}
        ${showOutputs && outputs.length ? `<div class="nb-outputs">${outputs.map(renderOutput).join('')}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderToc() {
  const cells = nb.cells || nb.worksheets?.[0]?.cells || [];
  const items = [];
  cells.forEach((cell, idx) => {
    if (cell.cell_type !== 'markdown') return;
    for (const line of srcOf(cell).split('\n')) {
      const m = line.match(/^(#{1,4})\s+(.*)$/);
      if (m) items.push({ level: m[1].length, text: m[2].replace(/[*_`]/g, ''), idx });
    }
  });
  $('toc').innerHTML = items.length
    ? items.map(i => `<button class="nb-toc-item" data-goto="${i.idx}" style="--lvl:${i.level - 1}">${escapeHtml(i.text)}</button>`).join('')
    : '<span class="dev-muted">No markdown headings in this notebook.</span>';
}

function renderStats() {
  const cells = nb.cells || nb.worksheets?.[0]?.cells || [];
  const code = cells.filter(c => c.cell_type === 'code');
  const outputs = code.reduce((a, c) => a + (c.outputs?.length || 0), 0);
  const images = code.reduce((a, c) => a + (c.outputs || []).filter(o => (o.data && (o.data['image/png'] || o.data['image/jpeg'] || o.data['image/svg+xml'])) || o.png).length, 0);
  const errors = code.reduce((a, c) => a + (c.outputs || []).filter(o => o.output_type === 'error').length, 0);
  const lang = nb.metadata?.language_info?.name || nb.metadata?.kernelspec?.language || 'unknown';
  const ver = nb.metadata?.language_info?.version ? ` ${nb.metadata.language_info.version}` : '';
  const unrun = code.filter(c => (c.execution_count ?? c.prompt_number) == null).length;

  $('stats').innerHTML = [
    ['Cells', cells.length],
    ['Code', code.length],
    ['Outputs', outputs],
    ['Plots', images],
    ['Errors', errors],
    ['Kernel', lang + ver],
  ].map(([k, v]) => `<div class="ts-stat"><span class="ts-stat-num">${escapeHtml(String(v))}</span><span class="ts-stat-label">${k}</span></div>`).join('');

  const notes = [];
  if (errors) notes.push(`This notebook has <strong>${errors}</strong> cell${errors === 1 ? '' : 's'} that ended in an error — they're highlighted in red below.`);
  if (unrun) notes.push(`<strong>${unrun}</strong> code cell${unrun === 1 ? ' has' : 's have'} never been executed (no execution count), so any output you see below is from an earlier run.`);
  const counts = code.map(c => c.execution_count ?? c.prompt_number).filter(v => v != null);
  const outOfOrder = counts.some((v, i) => i > 0 && v < counts[i - 1]);
  if (outOfOrder) notes.push('Execution counts are <strong>out of order</strong> — the cells were not run top to bottom, so results may not reproduce on a fresh kernel.');
  $('notes').innerHTML = notes.map(n => `<div class="ts-callout">${n}</div>`).join('');
}

function renderAll() {
  if (!nb) return;
  renderStats();
  renderToc();
  $('cells').innerHTML = renderCells();
  $('viewer').classList.remove('ts-hidden');
}

/* ── Loading ──────────────────────────────────────────────────────────────── */

function loadJson(text, name) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) { $('err').textContent = 'That file is not valid JSON — a .ipynb is a JSON document. ' + e.message; return; }
  if (!data.cells && !data.worksheets) {
    $('err').textContent = 'That JSON has no "cells" array, so it does not look like a Jupyter notebook.';
    return;
  }
  $('err').textContent = '';
  nb = data;
  $('fileName').textContent = name ? `${name} · nbformat ${data.nbformat ?? '?'}.${data.nbformat_minor ?? 0}` : '';
  renderAll();
}

function readFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => loadJson(String(r.result), file.name);
  r.onerror = () => { $('err').textContent = 'Could not read that file.'; };
  r.readAsText(file);
}

$('file').addEventListener('change', (e) => readFile(e.target.files[0]));

const drop = $('drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('nb-drop-over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('nb-drop-over'); }));
drop.addEventListener('drop', (e) => readFile(e.dataTransfer.files[0]));
drop.addEventListener('click', () => $('file').click());

$('pasteBtn').addEventListener('click', () => {
  $('pasteWrap').classList.toggle('ts-hidden');
  if (!$('pasteWrap').classList.contains('ts-hidden')) $('paste').focus();
});
$('paste').addEventListener('input', () => {
  const v = $('paste').value.trim();
  if (v.length > 20) loadJson(v, 'pasted notebook');
});

$('toc').addEventListener('click', (e) => {
  const b = e.target.closest('[data-goto]');
  if (!b) return;
  const el = $('cells').querySelector(`[data-idx="${b.dataset.goto}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('toggleCode').addEventListener('click', (e) => {
  showCode = !showCode;
  e.target.textContent = showCode ? 'Hide code' : 'Show code';
  renderAll();
});
$('toggleOut').addEventListener('click', (e) => {
  showOutputs = !showOutputs;
  e.target.textContent = showOutputs ? 'Hide outputs' : 'Show outputs';
  renderAll();
});

$('copyCode').addEventListener('click', (e) => {
  const cells = nb ? (nb.cells || nb.worksheets?.[0]?.cells || []) : [];
  const code = cells.filter(c => c.cell_type === 'code').map(srcOf).join('\n\n# %%\n');
  copyText(code, e.target);
});

// A sample notebook so the tool shows what it does before you have a file to
// hand — a real matplotlib figure, a pandas table, a traceback, all inline.
$('sampleBtn').addEventListener('click', () => {
  loadJson(JSON.stringify(SAMPLE_NB), 'sample-analysis.ipynb');
});

const SAMPLE_NB = {
  nbformat: 4, nbformat_minor: 5,
  metadata: { kernelspec: { language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3.11.6' } },
  cells: [
    { cell_type: 'markdown', source: ['# Sales analysis\n', '\n', 'A short walk through the quarterly numbers.\n', '\n', '## Loading the data\n'] },
    {
      cell_type: 'code', execution_count: 1,
      source: ['import pandas as pd\n', 'import numpy as np\n', '\n', 'df = pd.read_csv("sales.csv")  # 4 quarters\n', 'df.head()'],
      outputs: [{
        output_type: 'execute_result', execution_count: 1,
        data: {
          'text/html': ['<table class="dataframe"><thead><tr><th>quarter</th><th>region</th><th>revenue</th></tr></thead>',
            '<tbody><tr><td>Q1</td><td>EMEA</td><td>412000</td></tr><tr><td>Q2</td><td>EMEA</td><td>438500</td></tr>',
            '<tr><td>Q3</td><td>EMEA</td><td>501200</td></tr><tr><td>Q4</td><td>EMEA</td><td>560900</td></tr></tbody></table>'],
          'text/plain': ['  quarter region  revenue\n0      Q1   EMEA   412000\n1      Q2   EMEA   438500'],
        },
      }],
    },
    { cell_type: 'markdown', source: ['## Growth rate\n', '\n', 'Quarter-on-quarter change, as a percentage:\n'] },
    {
      cell_type: 'code', execution_count: 2,
      source: ['growth = df["revenue"].pct_change() * 100\n', 'print(growth.round(2).to_string())'],
      outputs: [{ output_type: 'stream', name: 'stdout', text: ['0      NaN\n1     6.43\n2    14.30\n3    11.91\n'] }],
    },
    { cell_type: 'markdown', source: ['## The chart\n'] },
    {
      cell_type: 'code', execution_count: 3,
      source: ['import matplotlib.pyplot as plt\n', '\n', 'fig, ax = plt.subplots(figsize=(4, 2.2))\n', 'ax.plot(df["quarter"], df["revenue"], marker="o")\n', 'ax.set_title("Revenue by quarter")\n', 'plt.show()'],
      outputs: [{
        output_type: 'display_data',
        data: {
          'image/svg+xml': ['<svg xmlns="http://www.w3.org/2000/svg" width="380" height="200" viewBox="0 0 380 200">',
            '<rect width="380" height="200" fill="#ffffff"/>',
            '<polyline fill="none" stroke="#B5822A" stroke-width="2.5" points="40,160 130,140 220,86 310,50"/>',
            '<circle cx="40" cy="160" r="4" fill="#B5822A"/><circle cx="130" cy="140" r="4" fill="#B5822A"/>',
            '<circle cx="220" cy="86" r="4" fill="#B5822A"/><circle cx="310" cy="50" r="4" fill="#B5822A"/>',
            '<line x1="30" y1="180" x2="360" y2="180" stroke="#999"/><line x1="30" y1="20" x2="30" y2="180" stroke="#999"/>',
            '<text x="40" y="196" font-size="11" fill="#555">Q1</text><text x="130" y="196" font-size="11" fill="#555">Q2</text>',
            '<text x="220" y="196" font-size="11" fill="#555">Q3</text><text x="310" y="196" font-size="11" fill="#555">Q4</text>',
            '<text x="120" y="16" font-size="12" fill="#222">Revenue by quarter</text></svg>'],
          'text/plain': ['<Figure size 400x220 with 1 Axes>'],
        },
      }],
    },
    { cell_type: 'markdown', source: ['## A cell that failed\n', '\n', 'Left in deliberately, so you can see how tracebacks render.\n'] },
    {
      cell_type: 'code', execution_count: 4,
      source: ['df["profit"].sum()'],
      outputs: [{
        output_type: 'error', ename: 'KeyError', evalue: "'profit'",
        traceback: [
          '[0;31m---------------------------------------------------------------------------[0m',
          '[0;31mKeyError[0m                                  Traceback (most recent call last)',
          '[0;32m<ipython-input-4>[0m in [0;36m<module>[0m',
          '[0;32m----> 1[0;31m df["profit"].sum()',
          '[0;31mKeyError[0m: \'profit\'',
        ],
      }],
    },
    { cell_type: 'code', execution_count: null, source: ['# never run\n', 'df.to_parquet("out.parquet")'], outputs: [] },
  ],
};
