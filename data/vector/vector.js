// VectorLens — inspect embeddings: project them to 2D, cluster them, and run
// cosine similarity search. Everything runs in this tab; embeddings are exactly
// the kind of data you should not be pasting into a website you don't control.

const $ = (id) => document.getElementById(id);

let items = [];        // [{label, text, vec:Float64Array}]
let dims = 0;
let coords = [];       // 2D projection
let clusters = [];     // cluster index per item
let selected = -1;
let explained = 0;

/* ── Parsing ──────────────────────────────────────────────────────────────── */

// Accepts, in order of how often they turn up in practice:
//   • JSON array of objects with an embedding/vector/values field
//   • JSON array of plain number arrays
//   • OpenAI response shape: {data:[{embedding:[…], index}]}
//   • JSONL, one object per line
//   • CSV/TSV where the numeric columns are the vector
function parseEmbeddings(raw) {
  const text = raw.trim();
  if (!text) return { items: [], error: '' };

  const pickVec = (o) => {
    for (const k of ['embedding', 'vector', 'values', 'embeddings', 'vec']) {
      if (Array.isArray(o[k])) return o[k];
    }
    return null;
  };
  const pickLabel = (o, i) => {
    for (const k of ['label', 'id', 'name', 'title', 'key', '_id']) {
      if (o[k] != null && typeof o[k] !== 'object') return String(o[k]);
    }
    return `item ${i + 1}`;
  };
  const pickText = (o) => {
    for (const k of ['text', 'content', 'chunk', 'document', 'input', 'page_content']) {
      if (typeof o[k] === 'string') return o[k];
    }
    return '';
  };

  const fromObjects = (arr) => arr.map((o, i) => {
    if (Array.isArray(o)) return { label: `item ${i + 1}`, text: '', vec: o };
    const v = pickVec(o);
    return v ? { label: pickLabel(o, i), text: pickText(o), vec: v } : null;
  }).filter(Boolean);

  // JSON first
  if (text[0] === '[' || text[0] === '{') {
    try {
      const data = JSON.parse(text);
      let arr = null;
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray(data.data)) arr = data.data;
      else if (Array.isArray(data.embeddings)) arr = data.embeddings;
      else if (Array.isArray(data.items)) arr = data.items;
      else if (Array.isArray(data.vectors)) arr = data.vectors;
      if (arr) {
        const out = fromObjects(arr);
        if (out.length) return { items: out, error: '' };
        return { items: [], error: 'That JSON parsed, but no embedding/vector array was found inside it.' };
      }
    } catch { /* fall through to JSONL/CSV */ }
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // JSONL
  if (lines[0][0] === '{' || lines[0][0] === '[') {
    const objs = [];
    for (const line of lines) {
      try { objs.push(JSON.parse(line)); } catch { /* skip bad line */ }
    }
    const out = fromObjects(objs);
    if (out.length) return { items: out, error: '' };
  }

  // CSV / TSV — numeric columns are the vector, the first non-numeric column
  // (if any) becomes the label.
  const delim = lines[0].includes('\t') ? '\t' : ',';
  const rows = lines.map(l => l.split(delim).map(c => c.trim().replace(/^"|"$/g, '')));
  let start = 0;
  if (rows[0].some(c => c !== '' && isNaN(Number(c)))) {
    // header row, unless the row IS the data with a leading label
    const numericCount = rows[0].filter(c => c !== '' && !isNaN(Number(c))).length;
    if (numericCount < rows[0].length - 1) start = 1;
  }
  const out = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    const labelIdx = r.findIndex(c => c !== '' && isNaN(Number(c)));
    const vec = r.filter((c, j) => j !== labelIdx && c !== '' && !isNaN(Number(c))).map(Number);
    if (vec.length > 1) out.push({ label: labelIdx >= 0 ? r[labelIdx] : `row ${i + 1 - start}`, text: '', vec });
  }
  if (out.length) return { items: out, error: '' };

  return { items: [], error: 'Could not find embeddings. Expected JSON, JSONL or CSV — see the format notes below.' };
}

/* ── Linear algebra ───────────────────────────────────────────────────────── */

function norm(v) { let s = 0; for (let i = 0; i < v.length; i++) s += v[i] * v[i]; return Math.sqrt(s); }
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function cosine(a, b) { const d = norm(a) * norm(b); return d === 0 ? 0 : dot(a, b) / d; }

// PCA via power iteration on the CENTERED data matrix. Forming the d×d
// covariance matrix would be O(n·d²) — at 1536 dimensions that's billions of
// operations and locks the tab. Iterating v ← Xᵀ(Xv) is O(n·d) per step and
// gives the same leading eigenvectors.
function pca2(vectors, d) {
  const n = vectors.length;
  const mean = new Float64Array(d);
  for (const v of vectors) for (let i = 0; i < d; i++) mean[i] += v[i];
  for (let i = 0; i < d; i++) mean[i] /= n;

  const X = vectors.map((v) => {
    const c = new Float64Array(d);
    for (let i = 0; i < d; i++) c[i] = v[i] - mean[i];
    return c;
  });

  let totalVar = 0;
  for (const c of X) totalVar += dot(c, c);

  const component = (deflate) => {
    let v = new Float64Array(d);
    // Deterministic seed — a random start would make the plot jump around on
    // every re-render for no benefit.
    for (let i = 0; i < d; i++) v[i] = Math.sin(i + 1) + Math.cos((i + 1) * 0.7);
    let nv = norm(v); for (let i = 0; i < d; i++) v[i] /= nv;

    for (let iter = 0; iter < 60; iter++) {
      const out = new Float64Array(d);
      for (const c of X) {
        let proj = dot(c, v);
        if (deflate) proj -= dot(c, deflate) * dot(deflate, v);
        for (let i = 0; i < d; i++) out[i] += proj * c[i];
      }
      if (deflate) {
        const p = dot(out, deflate);
        for (let i = 0; i < d; i++) out[i] -= p * deflate[i];
      }
      nv = norm(out);
      if (nv === 0) break;
      for (let i = 0; i < d; i++) out[i] /= nv;
      let delta = 0;
      for (let i = 0; i < d; i++) delta += Math.abs(out[i] - v[i]);
      v = out;
      if (delta < 1e-9) break;
    }
    return v;
  };

  const p1 = component(null);
  const p2 = component(p1);

  let var1 = 0, var2 = 0;
  const pts = X.map((c) => {
    const a = dot(c, p1), b = dot(c, p2);
    var1 += a * a; var2 += b * b;
    return [a, b];
  });
  explained = totalVar > 0 ? ((var1 + var2) / totalVar) * 100 : 0;
  return pts;
}

// Lloyd's k-means on L2-normalised vectors, so Euclidean distance ranks the
// same way cosine similarity does.
function kmeans(vectors, d, k) {
  const n = vectors.length;
  if (k <= 1 || n <= k) return new Array(n).fill(0);
  const unit = vectors.map((v) => {
    const c = new Float64Array(d); const nn = norm(v) || 1;
    for (let i = 0; i < d; i++) c[i] = v[i] / nn;
    return c;
  });
  // k-means++-ish deterministic seeding: spread the initial centroids out.
  const centroids = [];
  centroids.push(Float64Array.from(unit[0]));
  while (centroids.length < k) {
    let best = -1, bestDist = -1;
    for (let i = 0; i < n; i++) {
      let nearest = Infinity;
      for (const c of centroids) {
        let s = 0; for (let j = 0; j < d; j++) { const t = unit[i][j] - c[j]; s += t * t; }
        nearest = Math.min(nearest, s);
      }
      if (nearest > bestDist) { bestDist = nearest; best = i; }
    }
    centroids.push(Float64Array.from(unit[best]));
  }

  const assign = new Array(n).fill(0);
  for (let iter = 0; iter < 25; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < k; c++) {
        let s = 0; for (let j = 0; j < d; j++) { const t = unit[i][j] - centroids[c][j]; s += t * t; }
        if (s < bd) { bd = s; bi = c; }
      }
      if (assign[i] !== bi) { assign[i] = bi; moved = true; }
    }
    for (let c = 0; c < k; c++) centroids[c].fill(0);
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      counts[assign[i]]++;
      for (let j = 0; j < d; j++) centroids[assign[i]][j] += unit[i][j];
    }
    for (let c = 0; c < k; c++) {
      if (!counts[c]) continue;
      for (let j = 0; j < d; j++) centroids[c][j] /= counts[c];
    }
    if (!moved) break;
  }
  return assign;
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

const PLOT_W = 720, PLOT_H = 480, PLOT_PAD = 30;

function renderPlot() {
  if (!coords.length) { $('plot').innerHTML = ''; return; }
  const xs = coords.map(p => p[0]), ys = coords.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = (v) => PLOT_PAD + ((v - minX) / (maxX - minX || 1)) * (PLOT_W - PLOT_PAD * 2);
  const sy = (v) => PLOT_H - PLOT_PAD - ((v - minY) / (maxY - minY || 1)) * (PLOT_H - PLOT_PAD * 2);

  const neighbours = selected >= 0 ? new Set(topMatches(selected, 5).map(m => m.i)) : null;

  const dots = coords.map((p, i) => {
    const isSel = i === selected;
    const isNear = neighbours && neighbours.has(i);
    const cls = `vl-dot vl-c${clusters[i] % 8}${isSel ? ' vl-sel' : ''}${neighbours && !isSel && !isNear ? ' vl-dim' : ''}`;
    return `<circle class="${cls}" cx="${sx(p[0]).toFixed(1)}" cy="${sy(p[1]).toFixed(1)}" r="${isSel ? 8 : isNear ? 6 : 4.5}" data-i="${i}">`
      + `<title>${escapeHtml(items[i].label)}${items[i].text ? ' — ' + escapeHtml(items[i].text.slice(0, 120)) : ''}</title></circle>`;
  }).join('');

  // Lines from the selected point to its nearest neighbours.
  let links = '';
  if (selected >= 0) {
    for (const m of topMatches(selected, 5)) {
      links += `<line class="vl-link" x1="${sx(coords[selected][0]).toFixed(1)}" y1="${sy(coords[selected][1]).toFixed(1)}" x2="${sx(coords[m.i][0]).toFixed(1)}" y2="${sy(coords[m.i][1]).toFixed(1)}" />`;
    }
  }

  $('plot').innerHTML =
    `<svg class="vl-svg" viewBox="0 0 ${PLOT_W} ${PLOT_H}" role="img" aria-label="2D projection of the embeddings">
       <line class="vl-axis" x1="${PLOT_PAD}" y1="${PLOT_H - PLOT_PAD}" x2="${PLOT_W - PLOT_PAD}" y2="${PLOT_H - PLOT_PAD}" />
       <line class="vl-axis" x1="${PLOT_PAD}" y1="${PLOT_PAD}" x2="${PLOT_PAD}" y2="${PLOT_H - PLOT_PAD}" />
       <text class="vl-axis-label" x="${PLOT_W / 2}" y="${PLOT_H - 8}">principal component 1</text>
       <text class="vl-axis-label" x="12" y="${PLOT_H / 2}" transform="rotate(-90 12 ${PLOT_H / 2})">component 2</text>
       ${links}${dots}
     </svg>`;
}

function topMatches(idx, k) {
  const base = items[idx].vec;
  const scored = [];
  for (let i = 0; i < items.length; i++) {
    if (i === idx) continue;
    scored.push({ i, score: cosine(base, items[i].vec) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

function renderDetail() {
  if (selected < 0) {
    $('detail').innerHTML = '<span class="dev-muted">Click any point to see its nearest neighbours by cosine similarity.</span>';
    return;
  }
  const it = items[selected];
  const matches = topMatches(selected, 10);
  $('detail').innerHTML = `
    <div class="vl-sel-head">
      <span class="vl-sel-label">${escapeHtml(it.label)}</span>
      <span class="dev-muted">‖v‖ = ${norm(it.vec).toFixed(4)}</span>
    </div>
    ${it.text ? `<p class="vl-sel-text">${escapeHtml(it.text.slice(0, 400))}${it.text.length > 400 ? '…' : ''}</p>` : ''}
    <table class="ts-table"><thead><tr><th>#</th><th>Nearest neighbour</th><th>Cosine</th></tr></thead><tbody>
    ${matches.map((m, n) => `<tr class="vl-match-row" data-i="${m.i}">
      <td>${n + 1}</td>
      <td>${escapeHtml(items[m.i].label)}${items[m.i].text ? `<span class="vl-match-text">${escapeHtml(items[m.i].text.slice(0, 70))}</span>` : ''}</td>
      <td><span class="vl-score" style="--s:${Math.max(0, Math.min(1, m.score))}">${m.score.toFixed(4)}</span></td>
    </tr>`).join('')}
    </tbody></table>`;
}

function renderStats() {
  const norms = items.map(i => norm(i.vec));
  const avg = norms.reduce((a, b) => a + b, 0) / (norms.length || 1);
  const normalised = norms.every(n => Math.abs(n - 1) < 0.01);
  const k = Number($('kInput').value);
  $('stats').innerHTML = [
    ['Vectors', items.length],
    ['Dimensions', dims],
    ['Mean ‖v‖', avg.toFixed(3)],
    ['Clusters', k],
    ['Variance shown', explained.toFixed(1) + '%'],
  ].map(([a, b]) => `<div class="ts-stat"><span class="ts-stat-num">${escapeHtml(String(b))}</span><span class="ts-stat-label">${a}</span></div>`).join('');

  const notes = [];
  notes.push(`This plot shows <strong>${explained.toFixed(1)}%</strong> of the variance in your ${dims}-dimensional data. PCA is a linear projection — points that look close here are usually close in the original space, but two far-apart points can still be projected on top of each other. Trust the cosine numbers over the picture.`);
  if (normalised) notes.push('Your vectors are already L2-normalised (‖v‖ ≈ 1), so cosine similarity and dot product rank identically.');
  $('notes').innerHTML = notes.map(n => `<div class="ts-callout">${n}</div>`).join('');
}

function recompute() {
  if (!items.length) return;
  const k = Math.max(1, Math.min(8, Number($('kInput').value) || 1));
  coords = pca2(items.map(i => i.vec), dims);
  clusters = kmeans(items.map(i => i.vec), dims, k);
  renderStats();
  renderPlot();
  renderDetail();
}

/* ── Loading ──────────────────────────────────────────────────────────────── */

function load(raw) {
  const res = parseEmbeddings(raw);
  if (res.error) { $('err').textContent = res.error; return; }
  if (!res.items.length) { $('err').textContent = ''; return; }

  // Ragged input is the single most common real-world problem (a truncated
  // JSONL write, or mixing two embedding models) — say so instead of drawing
  // a nonsense plot.
  const lens = new Set(res.items.map(i => i.vec.length));
  if (lens.size > 1) {
    const counts = {};
    for (const i of res.items) counts[i.vec.length] = (counts[i.vec.length] || 0) + 1;
    $('err').textContent = `Vectors have different lengths (${Object.entries(counts).map(([l, c]) => `${c}×${l}d`).join(', ')}). They must all come from the same embedding model.`;
    return;
  }

  dims = res.items[0].vec.length;
  if (dims < 2) { $('err').textContent = 'Vectors need at least 2 dimensions.'; return; }
  if (res.items.length < 2) { $('err').textContent = 'Need at least 2 vectors to compare.'; return; }

  $('err').textContent = '';
  items = res.items.map(i => ({ ...i, vec: Float64Array.from(i.vec) }));
  selected = -1;
  $('viewer').classList.remove('ts-hidden');
  recompute();
}

$('plot').addEventListener('click', (e) => {
  const c = e.target.closest('[data-i]');
  if (!c) return;
  const i = Number(c.dataset.i);
  selected = selected === i ? -1 : i;
  renderPlot(); renderDetail();
});
$('detail').addEventListener('click', (e) => {
  const row = e.target.closest('.vl-match-row');
  if (!row) return;
  selected = Number(row.dataset.i);
  renderPlot(); renderDetail();
});

$('kInput').addEventListener('input', () => { $('kVal').textContent = $('kInput').value; recompute(); });

let deb = null;
$('input').addEventListener('input', () => {
  clearTimeout(deb);
  deb = setTimeout(() => load($('input').value), 350);
});

$('file').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('input').value = String(r.result); load($('input').value); };
  r.readAsText(f);
});

// A deterministic sample: five topic clusters in 24 dimensions, so the plot
// shows recognisable structure rather than a random cloud.
$('sampleBtn').addEventListener('click', () => {
  const TOPICS = [
    ['databases', ['postgres replication lag', 'mysql innodb buffer pool', 'sqlite wal mode', 'query planner statistics', 'b-tree index rebuild']],
    ['cooking', ['sourdough starter hydration', 'braising short ribs', 'knife sharpening angle', 'pasta water salinity', 'sear then roast']],
    ['astronomy', ['redshift of distant quasars', 'jupiter moon transits', 'solar corona temperature', 'exoplanet transit method', 'galactic rotation curve']],
    ['finance', ['compound interest schedule', 'bond yield curve inversion', 'index fund expense ratio', 'dividend reinvestment', 'currency hedging cost']],
    ['ml-ops', ['vector index recall tuning', 'embedding drift monitoring', 'gpu memory fragmentation', 'batch inference latency', 'model checkpoint sharding']],
  ];
  const D = 24;
  const out = [];
  TOPICS.forEach(([topic, phrases], t) => {
    phrases.forEach((phrase, j) => {
      const vec = [];
      for (let i = 0; i < D; i++) {
        // A per-topic centre plus a small deterministic wobble per phrase.
        const centre = Math.sin((t + 1) * 1.7 + i * 0.9);
        const wobble = Math.cos((j + 1) * 2.3 + i * 1.31) * 0.22;
        vec.push(Number((centre + wobble).toFixed(4)));
      }
      out.push({ id: `${topic}/${j + 1}`, text: phrase, embedding: vec });
    });
  });
  $('input').value = JSON.stringify(out, null, 1);
  load($('input').value);
});
