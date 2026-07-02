// MarkdownLive — block parser + live preview + localStorage autosave

const LS = 'tapdot-md-content';
const $ = (id) => document.getElementById(id);

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inline(s) {
  return esc(s)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function parseMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let html = '', i = 0;
  const isBlock = (l) => /^(#{1,6}\s|```|>\s?|\s*([-*+]|\d+\.)\s)/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; html += `<pre><code>${esc(buf.join('\n'))}</code></pre>`; continue;
    }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; i++; continue; }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line); const tag = ordered ? 'ol' : 'ul'; const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) { items.push(inline(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''))); i++; }
      html += `<${tag}>` + items.map(x => `<li>${x}</li>`).join('') + `</${tag}>`; continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(inline(lines[i].replace(/^>\s?/, ''))); i++; }
      html += `<blockquote>${buf.join('<br>')}</blockquote>`; continue;
    }
    if (/^(---+|\*\*\*+)$/.test(line.trim())) { html += '<hr>'; i++; continue; }
    if (line.trim() === '') { i++; continue; }
    const buf = []; while (i < lines.length && lines[i].trim() !== '' && !isBlock(lines[i])) { buf.push(lines[i]); i++; }
    html += `<p>${inline(buf.join('\n')).replace(/\n/g, '<br>')}</p>`;
  }
  return html;
}

let saveTimer = null;
function render() {
  const md = $('input').value;
  $('preview').innerHTML = parseMarkdown(md);
  const words = md.trim() ? md.trim().split(/\s+/).length : 0;
  const mins = Math.max(1, Math.ceil(words / 238));
  $('status').textContent = `${words} words · ~${mins} min read`;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(LS, md);
    $('status').textContent = `${words} words · ~${mins} min read · saved`;
  }, 1500);
}

function surround(before, after) {
  const ta = $('input');
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.slice(s, e) || 'text';
  ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
  ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length;
  render();
}
function prefixLine(prefix) {
  const ta = $('input'); const s = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
  ta.value = ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart);
  ta.focus(); render();
}

const ACTIONS = {
  bold: () => surround('**', '**'),
  italic: () => surround('*', '*'),
  code: () => surround('`', '`'),
  h1: () => prefixLine('# '),
  ul: () => prefixLine('- '),
  quote: () => prefixLine('> '),
  link: () => surround('[', '](https://)'),
  hr: () => { const ta = $('input'); ta.value += '\n\n---\n'; render(); },
};

$('toolbar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && ACTIONS[b.dataset.a]) ACTIONS[b.dataset.a](); });
$('input').addEventListener('input', render);
$('dlMd').addEventListener('click', () => {
  const blob = new Blob([$('input').value], { type: 'text/markdown' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'document.md'; a.click(); URL.revokeObjectURL(a.href);
});
$('copyHtml').addEventListener('click', (e) => copyText($('preview').innerHTML, e.target));

$('input').value = localStorage.getItem(LS) || '# Welcome to MarkdownLive\n\nType **Markdown** on the left and see it render on the right.\n\n- Autosaves to your browser\n- No cloud, no account\n\n> Everything stays on your device.';
render();
