// SVGClean — regex-based SVG bloat stripper. Not a full SVGO reimplementation:
// no XML parser is used, just targeted passes for the cruft real editors emit.

const $ = (id) => document.getElementById(id);

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

const EDITOR_NAMESPACES = ['inkscape', 'sodipodi', 'dc', 'cc', 'rdf', 'sketch', 'figma'];

function stripComments(svg) {
  return svg.replace(/<\?xml[^>]*\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
}

function stripEditorNamespaces(svg) {
  let out = svg;
  // xmlns:inkscape="…" style attribute declarations
  for (const ns of EDITOR_NAMESPACES) {
    out = out.replace(new RegExp(`\\s+xmlns:${ns}="[^"]*"`, 'g'), '');
    // any attribute like inkscape:label="…" or sodipodi:nodetypes="…"
    out = out.replace(new RegExp(`\\s+${ns}:[\\w-]+="[^"]*"`, 'g'), '');
  }
  // Illustrator/Figma export leftovers
  out = out.replace(/\s+data-name="[^"]*"/g, '');
  out = out.replace(/\s+xml:space="[^"]*"/g, '');
  out = out.replace(/\s+enable-background="[^"]*"/g, '');
  return out;
}

function stripMeta(svg) {
  return svg
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<desc>[\s\S]*?<\/desc>/gi, '')
    .replace(/<metadata>[\s\S]*?<\/metadata>/gi, '');
}

function stripEmpty(svg) {
  let out = svg;
  let prev;
  // Iterate: removing an empty group can expose its now-empty parent.
  do {
    prev = out;
    out = out.replace(/<(g|defs)(\s[^>]*)?>\s*<\/\1>/gi, '');
    out = out.replace(/<(g|defs)(\s[^>]*)?\/>/gi, '');
  } while (out !== prev && out.length < prev.length);
  return out;
}

function collapseWhitespace(svg) {
  return svg
    .replace(/>\s+</g, '><')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '')
    .trim();
}

function roundPrecision(svg, places) {
  return svg.replace(/-?\d+\.\d+/g, (m) => {
    const rounded = parseFloat(parseFloat(m).toFixed(places));
    return String(rounded);
  });
}

function clean(svg, opts) {
  let out = svg;
  if (opts.comments) out = stripComments(out);
  if (opts.editor) out = stripEditorNamespaces(out);
  if (opts.meta) out = stripMeta(out);
  if (opts.empty) out = stripEmpty(out);
  if (opts.precision) out = roundPrecision(out, opts.places);
  if (opts.whitespace) out = collapseWhitespace(out);
  return out;
}

function renderPreview(container, svg) {
  container.innerHTML = '';
  try {
    const wrap = document.createElement('div');
    wrap.innerHTML = svg;
    const el = wrap.querySelector('svg');
    if (el) {
      el.style.maxWidth = '100%';
      el.style.maxHeight = '160px';
      container.appendChild(el);
    }
  } catch (e) { /* not renderable — leave preview blank */ }
}

function run() {
  const src = $('input').value;
  const output = $('output'), inSize = $('inSize'), outSize = $('outSize'), savings = $('savings');
  if (!src.trim()) {
    output.textContent = '';
    inSize.textContent = '—'; outSize.textContent = '—'; savings.textContent = '';
    $('origPreview').innerHTML = ''; $('cleanPreview').innerHTML = '';
    return;
  }
  const opts = {
    comments: $('optComments').checked,
    editor: $('optEditor').checked,
    meta: $('optMeta').checked,
    empty: $('optEmpty').checked,
    whitespace: $('optWhitespace').checked,
    precision: $('optPrecision').checked,
    places: Math.min(6, Math.max(0, parseInt($('precision').value, 10) || 0)),
  };
  const cleaned = clean(src, opts);
  const origBytes = new Blob([src]).size;
  const outBytes = new Blob([cleaned]).size;
  output.textContent = cleaned;
  inSize.textContent = fmtBytes(origBytes);
  outSize.textContent = fmtBytes(outBytes);
  const pct = origBytes > 0 ? Math.round((1 - outBytes / origBytes) * 100) : 0;
  savings.textContent = pct > 0 ? `${pct}% smaller` : (pct < 0 ? `${-pct}% larger` : 'No change');
  renderPreview($('origPreview'), src);
  renderPreview($('cleanPreview'), cleaned);
}

$('input').addEventListener('input', run);
document.querySelectorAll('#precisionRow input, .ts-card input[type="checkbox"]').forEach(el => el.addEventListener('input', run));
$('copyOut').addEventListener('click', (e) => copyText($('output').textContent, e.target));

// Seed with a small illustrative sample so the tool isn't blank on load.
$('input').value = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Adobe Illustrator -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" data-name="Layer 1" viewBox="0 0 24 24">
  <title>icon</title>
  <metadata><rdf:RDF></rdf:RDF></metadata>
  <g>
    <g></g>
    <path d="M12.00001 2.00002L22.123456 20.999999L1.876544 20.999999Z" inkscape:connector-curvature="0"/>
  </g>
</svg>`;
run();
