// SchemaViz — turn SQL DDL into an interactive ER diagram.
//
// Everything is local: the DDL is parsed in-page (data/libs/ddl-parser.js) and
// drawn as SVG. No database connection is involved or possible — a browser
// cannot open the raw TCP sockets MySQL/Postgres speak, and routing a real
// connection through a proxy would mean your credentials leaving this machine.

const $ = (id) => document.getElementById(id);
const LS_POS = 'tapdot-schemaviz-pos';
const LS_SQL = 'tapdot-schemaviz-sql';

const HEAD_H = 32, ROW_H = 20, PAD_X = 12, CHAR_W = 6.9, MIN_W = 170;

let parsed = null;
let positions = {};       // table name → {x, y}
let view = { x: 0, y: 0, w: 1200, h: 800 };
let selected = null;
let layoutSignature = '';

/* ── Sizing & layout ──────────────────────────────────────────────────────── */

function tableSize(t) {
  const rows = t.columns.length;
  let widest = t.name.length + 8;
  for (const c of t.columns) widest = Math.max(widest, c.name.length + c.type.length + 6);
  return { w: Math.max(MIN_W, Math.round(widest * CHAR_W) + PAD_X * 2), h: HEAD_H + rows * ROW_H + 8 };
}

// Layered layout: tables that reference each other end up in adjacent columns,
// which keeps edges short and mostly one-directional. Components are stacked
// vertically so unrelated clusters don't overlap.
function autoLayout(p) {
  const sizes = new Map(p.tables.map(t => [t.name, tableSize(t)]));
  const adj = new Map(p.tables.map(t => [t.name, new Set()]));
  for (const r of p.relations) {
    if (r.from === r.to) continue;
    adj.get(r.from)?.add(r.to);
    adj.get(r.to)?.add(r.from);
  }

  const seen = new Set();
  const pos = {};
  const COL_GAP = 80, ROW_GAP = 40;
  let originY = 0;

  const order = [...p.tables].sort((a, b) => (adj.get(b.name).size - adj.get(a.name).size) || a.name.localeCompare(b.name));

  for (const start of order) {
    if (seen.has(start.name)) continue;

    // BFS from the most-connected unvisited table to assign layers.
    const layers = [];
    const depth = new Map([[start.name, 0]]);
    const queue = [start.name];
    seen.add(start.name);
    while (queue.length) {
      const n = queue.shift();
      const d = depth.get(n);
      (layers[d] ||= []).push(n);
      for (const m of adj.get(n) || []) {
        if (seen.has(m)) continue;
        seen.add(m); depth.set(m, d + 1); queue.push(m);
      }
    }

    let x = 0, componentH = 0;
    for (const layer of layers) {
      layer.sort();
      const colW = Math.max(...layer.map(n => sizes.get(n).w));
      let y = originY;
      for (const n of layer) {
        pos[n] = { x, y };
        y += sizes.get(n).h + ROW_GAP;
      }
      componentH = Math.max(componentH, y - originY);
      x += colW + COL_GAP;
    }
    originY += componentH + ROW_GAP * 2;
  }
  return pos;
}

function contentBounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of parsed.tables) {
    const p = positions[t.name]; if (!p) continue;
    const s = tableSize(t);
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.w); maxY = Math.max(maxY, p.y + s.h);
  }
  if (minX === Infinity) return { x: 0, y: 0, w: 800, h: 600 };
  const M = 40;
  return { x: minX - M, y: minY - M, w: (maxX - minX) + M * 2, h: (maxY - minY) + M * 2 };
}

function fitView() { view = contentBounds(); applyView(); }
function applyView() { $('erd').setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`); }

/* ── Edge geometry ────────────────────────────────────────────────────────── */

// Anchor on whichever side faces the other table, and at the row of the column
// involved when we know it — the line then points at the actual field.
function anchorFor(table, other, columnName) {
  const p = positions[table.name], s = tableSize(table);
  const op = positions[other.name], os = tableSize(other);
  const cx = p.x + s.w / 2, ocx = op.x + os.w / 2;
  const idx = columnName ? table.columns.findIndex(c => c.name.toLowerCase() === String(columnName).toLowerCase()) : -1;
  const y = idx >= 0 ? p.y + HEAD_H + idx * ROW_H + ROW_H / 2 : p.y + s.h / 2;
  const right = ocx >= cx;
  return { x: right ? p.x + s.w : p.x, y: Math.min(Math.max(y, p.y + 6), p.y + s.h - 6), side: right ? 1 : -1 };
}

function edgePath(a, b) {
  const dx = Math.max(30, Math.abs(b.x - a.x) / 2);
  const c1x = a.x + a.side * dx, c2x = b.x + b.side * dx;
  return `M${a.x} ${a.y} C${c1x} ${a.y} ${c2x} ${b.y} ${b.x} ${b.y}`;
}

// Crow's foot at the "many" end, a single bar at the "one" end.
function endMarker(a, many) {
  const d = a.side * 11;
  if (!many) return `<path class="erd-foot" d="M${a.x + d * 0.55} ${a.y - 6} L${a.x + d * 0.55} ${a.y + 6}"></path>`;
  return `<path class="erd-foot" d="M${a.x + d} ${a.y - 6} L${a.x} ${a.y} L${a.x + d} ${a.y + 6} M${a.x + d} ${a.y} L${a.x} ${a.y}"></path>`;
}

function selfLoopPath(t, columnName) {
  const p = positions[t.name], s = tableSize(t);
  const idx = t.columns.findIndex(c => c.name.toLowerCase() === String(columnName).toLowerCase());
  const y = idx >= 0 ? p.y + HEAD_H + idx * ROW_H + ROW_H / 2 : p.y + s.h / 2;
  const x = p.x + s.w;
  return `M${x} ${y} C${x + 46} ${y - 4} ${x + 46} ${p.y - 18} ${p.x + s.w / 2} ${p.y - 18} C${p.x - 30} ${p.y - 18} ${p.x - 22} ${y} ${p.x} ${y}`;
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

function relatedTables(name) {
  const set = new Set([name]);
  for (const r of parsed.relations) {
    if (r.from === name) set.add(r.to);
    if (r.to === name) set.add(r.from);
  }
  return set;
}

function renderEdges() {
  if (!parsed) return '';
  const active = selected ? relatedTables(selected) : null;
  const byName = new Map(parsed.tables.map(t => [t.name, t]));
  let out = '';
  parsed.relations.forEach((r, i) => {
    const from = byName.get(r.from), to = byName.get(r.to);
    if (!from || !to || !positions[r.from] || !positions[r.to]) return;
    const dim = active && !(active.has(r.from) && active.has(r.to)) ? ' erd-dim' : '';
    const cls = `erd-edge${r.inferred ? ' erd-inferred' : ''}${dim}`;
    const title = `${r.from}.${r.fromColumns.join(', ')} → ${r.to}.${r.toColumns.join(', ')}`
      + (r.inferred ? ' (inferred from naming, not a declared foreign key)' : '')
      + (r.onDelete ? ` · ON DELETE ${r.onDelete}` : '');

    if (r.from === r.to) {
      out += `<g class="${cls}" data-rel="${i}"><title>${escapeHtml(title)}</title>`
        + `<path class="erd-line" d="${selfLoopPath(from, r.fromColumns[0])}"></path></g>`;
      return;
    }
    const a = anchorFor(from, to, r.fromColumns[0]);
    const b = anchorFor(to, from, r.toColumns[0]);
    out += `<g class="${cls}" data-rel="${i}"><title>${escapeHtml(title)}</title>`
      + `<path class="erd-line" d="${edgePath(a, b)}"></path>`
      + endMarker(a, !r.oneToOne) + endMarker(b, false)
      + `</g>`;
  });
  return out;
}

function renderTables() {
  const active = selected ? relatedTables(selected) : null;
  return parsed.tables.map((t) => {
    const p = positions[t.name]; if (!p) return '';
    const s = tableSize(t);
    const dim = active && !active.has(t.name) ? ' erd-dim' : '';
    const sel = selected === t.name ? ' erd-selected' : '';
    const fkCols = new Set(parsed.relations.filter(r => r.from === t.name).flatMap(r => r.fromColumns.map(c => c.toLowerCase())));

    const rows = t.columns.map((c, i) => {
      const isPk = t.primaryKey.some(k => k.toLowerCase() === c.name.toLowerCase());
      const isFk = fkCols.has(c.name.toLowerCase());
      const badge = isPk ? 'PK' : isFk ? 'FK' : '';
      const y = HEAD_H + i * ROW_H;
      const tip = [c.type, c.notNull ? 'NOT NULL' : 'nullable', c.autoInc ? 'auto-increment' : '',
        c.default ? `default ${c.default}` : '', c.comment || ''].filter(Boolean).join(' · ');
      return `<g class="erd-row${isPk ? ' erd-pk' : ''}">`
        + `<title>${escapeHtml(`${t.name}.${c.name} — ${tip}`)}</title>`
        + `<rect x="1" y="${y}" width="${s.w - 2}" height="${ROW_H}" class="erd-row-bg"></rect>`
        + (badge ? `<text class="erd-badge" x="${PAD_X}" y="${y + 14}">${badge}</text>` : '')
        + `<text class="erd-col" x="${PAD_X + (badge ? 24 : 0)}" y="${y + 14}">${escapeHtml(c.name)}${c.notNull ? '' : ''}</text>`
        + `<text class="erd-type" x="${s.w - PAD_X}" y="${y + 14}">${escapeHtml(c.type)}</text>`
        + `</g>`;
    }).join('');

    return `<g class="erd-table${dim}${sel}" data-table="${escapeHtml(t.name)}" transform="translate(${p.x} ${p.y})">`
      + `<rect class="erd-box" width="${s.w}" height="${s.h}" rx="10"></rect>`
      + `<rect class="erd-head" width="${s.w}" height="${HEAD_H}" rx="10"></rect>`
      + `<rect class="erd-head-fix" y="${HEAD_H - 10}" width="${s.w}" height="10"></rect>`
      + `<text class="erd-title" x="${PAD_X}" y="${HEAD_H / 2 + 4}">${escapeHtml(t.name)}</text>`
      + `<text class="erd-count" x="${s.w - PAD_X}" y="${HEAD_H / 2 + 4}">${t.columns.length}</text>`
      + rows + `</g>`;
  }).join('');
}

function render() {
  if (!parsed) return;
  $('erdEdges').innerHTML = renderEdges();
  $('erdNodes').innerHTML = renderTables();
}

/* ── Stats, table list, warnings ──────────────────────────────────────────── */

function renderSidebar() {
  const cols = parsed.tables.reduce((a, t) => a + t.columns.length, 0);
  const inferred = parsed.relations.filter(r => r.inferred).length;
  $('stats').innerHTML = [
    ['Tables', parsed.tables.length],
    ['Columns', cols],
    ['Relationships', parsed.relations.length],
    ['Dialect', parsed.dialect],
  ].map(([k, v]) => `<div class="ts-stat"><span class="ts-stat-num">${escapeHtml(String(v))}</span><span class="ts-stat-label">${k}</span></div>`).join('');

  $('tableList').innerHTML = parsed.tables.length
    ? parsed.tables.map(t => `<button class="sv-table-item" data-goto="${escapeHtml(t.name)}">
        <span class="sv-table-name">${escapeHtml(t.name)}</span>
        <span class="sv-table-meta">${t.columns.length} cols</span></button>`).join('')
    : '<span class="dev-muted">No tables found yet.</span>';

  const notes = [];
  if (inferred) notes.push(`${inferred} relationship${inferred === 1 ? '' : 's'} shown dashed ${inferred === 1 ? 'was' : 'were'} inferred from <code>&lt;table&gt;_id</code> naming — no foreign key is declared for ${inferred === 1 ? 'it' : 'them'} in this DDL.`);
  if (parsed.warnings.length) notes.push(`${parsed.warnings.length} statement${parsed.warnings.length === 1 ? '' : 's'} could not be interpreted: <span class="dev-muted">${escapeHtml(parsed.warnings.slice(0, 3).join(' · '))}${parsed.warnings.length > 3 ? ' …' : ''}</span>`);
  $('notes').innerHTML = notes.length ? notes.map(n => `<div class="ts-callout">${n}</div>`).join('') : '';
}

/* ── Parse pipeline ───────────────────────────────────────────────────────── */

function signatureOf(p) { return p.tables.map(t => t.name + ':' + t.columns.length).join('|'); }

function parseNow(keepPositions) {
  const sql = $('sql').value;
  try {
    parsed = ddlParse(sql);
  } catch (e) {
    $('err').textContent = 'Could not parse that DDL: ' + e.message;
    return;
  }
  $('err').textContent = parsed.tables.length ? '' : 'No CREATE TABLE statements found. Paste a schema dump, or load one of the examples.';

  const sig = signatureOf(parsed);
  const saved = keepPositions ? null : loadPositions(sig);
  if (saved) { positions = saved; }
  else if (sig !== layoutSignature || !keepPositions) { positions = autoLayout(parsed); }
  layoutSignature = sig;

  selected = null;
  renderSidebar();
  render();
  if (!keepPositions) fitView();
  localStorage.setItem(LS_SQL, sql);
}

function loadPositions(sig) {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_POS) || 'null');
    if (raw && raw.sig === sig) return raw.pos;
  } catch { /* ignore */ }
  return null;
}
function savePositions() {
  localStorage.setItem(LS_POS, JSON.stringify({ sig: layoutSignature, pos: positions }));
}

/* ── Interaction: drag tables, pan, zoom ──────────────────────────────────── */

const svg = () => $('erd');

function clientToSvg(ev) {
  const r = svg().getBoundingClientRect();
  return {
    x: view.x + ((ev.clientX - r.left) / r.width) * view.w,
    y: view.y + ((ev.clientY - r.top) / r.height) * view.h,
  };
}

let drag = null;

svg().addEventListener('pointerdown', (ev) => {
  const g = ev.target.closest('.erd-table');
  const pt = clientToSvg(ev);
  if (g) {
    const name = g.dataset.table;
    drag = { kind: 'table', name, dx: pt.x - positions[name].x, dy: pt.y - positions[name].y, moved: false, el: g };
  } else {
    drag = { kind: 'pan', x: pt.x, y: pt.y, moved: false };
  }
  svg().setPointerCapture(ev.pointerId);
});

svg().addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const pt = clientToSvg(ev);
  drag.moved = true;
  if (drag.kind === 'table') {
    positions[drag.name] = { x: Math.round(pt.x - drag.dx), y: Math.round(pt.y - drag.dy) };
    // Move only the dragged group and redraw edges — re-rendering every table
    // on each pointermove is visibly janky once a schema has ~30 tables.
    drag.el.setAttribute('transform', `translate(${positions[drag.name].x} ${positions[drag.name].y})`);
    $('erdEdges').innerHTML = renderEdges();
  } else {
    view.x -= pt.x - drag.x;
    view.y -= pt.y - drag.y;
    applyView();
  }
});

svg().addEventListener('pointerup', (ev) => {
  if (!drag) return;
  if (drag.kind === 'table' && !drag.moved) {
    selected = selected === drag.name ? null : drag.name;
    render();
  } else if (drag.kind === 'pan' && !drag.moved) {
    if (selected) { selected = null; render(); }
  } else if (drag.kind === 'table') {
    savePositions();
  }
  drag = null;
  svg().releasePointerCapture(ev.pointerId);
});

svg().addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const pt = clientToSvg(ev);
  const k = ev.deltaY > 0 ? 1.12 : 1 / 1.12;
  const nw = Math.min(20000, Math.max(200, view.w * k));
  const nh = nw * (view.h / view.w);
  // Zoom toward the cursor rather than the centre.
  view.x = pt.x - (pt.x - view.x) * (nw / view.w);
  view.y = pt.y - (pt.y - view.y) * (nh / view.h);
  view.w = nw; view.h = nh;
  applyView();
}, { passive: false });

$('tableList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-goto]');
  if (!b) return;
  const name = b.dataset.goto;
  const p = positions[name]; if (!p) return;
  const t = parsed.tables.find(x => x.name === name);
  const s = tableSize(t);
  view = { x: p.x + s.w / 2 - 400, y: p.y + s.h / 2 - 280, w: 800, h: 560 };
  applyView();
  selected = name;
  render();
});

/* ── Export ───────────────────────────────────────────────────────────────── */

// The live <svg> inherits its colours from the page's CSS variables, which do
// not travel with an exported file — so the export inlines a resolved copy.
function exportableSvg() {
  const src = svg().cloneNode(true);
  const b = contentBounds();
  src.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
  src.setAttribute('width', Math.round(b.w));
  src.setAttribute('height', Math.round(b.h));
  const cs = getComputedStyle(document.documentElement);
  const v = (n, fallback) => (cs.getPropertyValue(n) || fallback).trim();
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .erd-box{fill:${v('--color-bg', '#fff')};stroke:${v('--color-border', '#ddd')};stroke-width:1}
    .erd-head{fill:${v('--color-accent', '#B5822A')}}
    .erd-head-fix{fill:${v('--color-accent', '#B5822A')}}
    .erd-title{fill:#fff;font:600 13px Inter,system-ui,sans-serif}
    .erd-count{fill:rgba(255,255,255,.75);font:11px Inter,system-ui,sans-serif;text-anchor:end}
    .erd-row-bg{fill:transparent}
    .erd-pk .erd-row-bg{fill:${v('--color-accent-soft', '#FAF2E2')}}
    .erd-col{fill:${v('--color-text', '#222')};font:12px 'JetBrains Mono',monospace}
    .erd-type{fill:${v('--color-muted', '#888')};font:11px 'JetBrains Mono',monospace;text-anchor:end}
    .erd-badge{fill:${v('--color-accent', '#B5822A')};font:600 9px Inter,sans-serif}
    .erd-line{fill:none;stroke:${v('--color-muted', '#888')};stroke-width:1.5}
    .erd-inferred .erd-line{stroke-dasharray:5 4}
    .erd-foot{fill:none;stroke:${v('--color-muted', '#888')};stroke-width:1.5}
    .erd-dim{opacity:1}
  `;
  src.insertBefore(style, src.firstChild);
  src.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(src);
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

$('exportSvg').addEventListener('click', () => download('schema.svg', exportableSvg(), 'image/svg+xml'));

$('exportPng').addEventListener('click', () => {
  const b = contentBounds();
  const scale = 2; // retina-ish, so the text stays crisp when zoomed
  const img = new Image();
  const blob = new Blob([exportableSvg()], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(b.w * scale); canvas.height = Math.round(b.h * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((png) => {
      const purl = URL.createObjectURL(png);
      const a = document.createElement('a');
      a.href = purl; a.download = 'schema.png'; a.click();
      URL.revokeObjectURL(purl);
    });
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { URL.revokeObjectURL(url); $('err').textContent = 'PNG export failed — the SVG export still works.'; };
  img.src = url;
});

$('exportDbml').addEventListener('click', (e) => {
  const dbml = ddlToDBML(parsed);
  $('dbmlOut').textContent = dbml;
  $('dbmlWrap').classList.remove('ts-hidden');
  copyText(dbml, e.target);
});

$('fitBtn').addEventListener('click', fitView);
$('relayoutBtn').addEventListener('click', () => {
  positions = autoLayout(parsed);
  savePositions();
  render(); fitView();
});

/* ── Examples ─────────────────────────────────────────────────────────────── */

const EXAMPLES = {
  shop: `-- E-commerce schema (MySQL)
CREATE TABLE \`users\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`email\` VARCHAR(255) NOT NULL,
  \`display_name\` VARCHAR(100) DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_users_email\` (\`email\`)
) ENGINE=InnoDB;

CREATE TABLE \`addresses\` (
  \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`line1\` VARCHAR(200) NOT NULL,
  \`city\` VARCHAR(100) NOT NULL,
  \`country\` CHAR(2) NOT NULL,
  CONSTRAINT \`fk_addr_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
);

CREATE TABLE \`products\` (
  \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`sku\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`price_cents\` INT NOT NULL DEFAULT 0,
  \`stock\` INT NOT NULL DEFAULT 0,
  UNIQUE KEY \`uq_sku\` (\`sku\`)
);

CREATE TABLE \`orders\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`address_id\` INT NOT NULL,
  \`status\` ENUM('new','paid','shipped','cancelled') NOT NULL DEFAULT 'new',
  \`total_cents\` INT NOT NULL,
  \`placed_at\` DATETIME NOT NULL,
  CONSTRAINT \`fk_orders_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`),
  CONSTRAINT \`fk_orders_addr\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\` (\`id\`)
);

CREATE TABLE \`order_items\` (
  \`order_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` INT NOT NULL,
  \`qty\` INT NOT NULL DEFAULT 1,
  \`unit_price_cents\` INT NOT NULL,
  PRIMARY KEY (\`order_id\`, \`product_id\`),
  CONSTRAINT \`fk_oi_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_oi_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`)
);

CREATE TABLE \`reviews\` (
  \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`product_id\` INT NOT NULL,
  \`user_id\` INT NOT NULL,
  \`rating\` TINYINT NOT NULL,
  \`body\` TEXT
);`,

  saas: `-- Multi-tenant SaaS schema (PostgreSQL)
CREATE TABLE organisations (
    id           bigserial PRIMARY KEY,
    slug         text NOT NULL UNIQUE,
    name         text NOT NULL,
    plan         text NOT NULL DEFAULT 'free',
    created_at   timestamp with time zone DEFAULT now()
);

CREATE TABLE users (
    id           bigserial PRIMARY KEY,
    email        citext NOT NULL UNIQUE,
    full_name    text,
    last_seen_at timestamp with time zone
);

CREATE TABLE memberships (
    org_id       bigint NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id      bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         text NOT NULL DEFAULT 'member',
    CONSTRAINT memberships_pkey PRIMARY KEY (org_id, user_id)
);

CREATE TABLE projects (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       bigint NOT NULL,
    name         text NOT NULL,
    settings     jsonb NOT NULL DEFAULT '{}',
    archived     boolean NOT NULL DEFAULT false
);

CREATE TABLE api_keys (
    id           bigserial PRIMARY KEY,
    project_id   uuid NOT NULL,
    hashed_key   text NOT NULL UNIQUE,
    scopes       text[] NOT NULL DEFAULT '{}',
    revoked_at   timestamp with time zone
);

CREATE TABLE audit_log (
    id           bigserial PRIMARY KEY,
    org_id       bigint NOT NULL,
    actor_id     bigint,
    action       text NOT NULL,
    payload      jsonb,
    at           timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE ONLY projects ADD CONSTRAINT projects_org_fk FOREIGN KEY (org_id) REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE ONLY api_keys ADD CONSTRAINT api_keys_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY audit_log ADD CONSTRAINT audit_org_fk FOREIGN KEY (org_id) REFERENCES organisations(id);`,

  rag: `-- Vector / RAG schema (PostgreSQL + pgvector)
CREATE TABLE collections (
    id          bigserial PRIMARY KEY,
    name        text NOT NULL UNIQUE,
    embed_model text NOT NULL,
    dimensions  integer NOT NULL DEFAULT 1536
);

CREATE TABLE documents (
    id            bigserial PRIMARY KEY,
    collection_id bigint NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    source_uri    text NOT NULL,
    title         text,
    checksum      text NOT NULL,
    ingested_at   timestamp with time zone DEFAULT now()
);

CREATE TABLE chunks (
    id           bigserial PRIMARY KEY,
    document_id  bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ordinal      integer NOT NULL,
    content      text NOT NULL,
    token_count  integer NOT NULL,
    embedding    vector(1536)
);

CREATE TABLE queries (
    id          bigserial PRIMARY KEY,
    user_id     bigint,
    text        text NOT NULL,
    embedding   vector(1536),
    asked_at    timestamp with time zone DEFAULT now()
);

CREATE TABLE retrievals (
    query_id    bigint NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    chunk_id    bigint NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
    rank        integer NOT NULL,
    similarity  real NOT NULL,
    PRIMARY KEY (query_id, chunk_id)
);`,
};

$('example').addEventListener('change', () => {
  const key = $('example').value;
  if (!EXAMPLES[key]) return;
  $('sql').value = EXAMPLES[key];
  localStorage.removeItem(LS_POS);
  parseNow(false);
  $('example').value = '';
});

/* ── Init ─────────────────────────────────────────────────────────────────── */

let debounce = null;
$('sql').addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => parseNow(false), 400);
});

$('sql').value = localStorage.getItem(LS_SQL) || EXAMPLES.shop;
parseNow(false);
