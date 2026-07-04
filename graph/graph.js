// Site graph — radial layout of collections + tools, built from the same
// TOOL_REGISTRY / COLLECTION_LABELS data.js uses for the search palette and
// Browse page. Deterministic trig layout, no physics simulation needed.

const $ = (id) => document.getElementById(id);

const COLLECTIONS_ORDER = ['study', 'write', 'dev', 'marketing', 'finance', 'legal', 'hr', 'health', 'design', 'productivity', 'ai'];

const COLLECTION_COLORS = {
  study: '#12A594', write: '#D97757', dev: '#5B6CF0', marketing: '#D6537E',
  finance: '#4E9B6B', legal: '#5C6FB8', hr: '#B0609E', health: '#4E8FC4',
  design: '#8A5CD6', productivity: '#3D9AA6', ai: '#D96C4F',
};

const CENTER = { x: 500, y: 500 };
const R_COLLECTION = 190;
const R_TOOL = 400;

function buildLayout() {
  const items = TOOL_REGISTRY.filter(i => i.collection !== 'tools' && !i.url.endsWith('/privacy.html'));
  const cols = COLLECTIONS_ORDER.filter(c => items.some(i => i.collection === c));
  const collectionNodes = [];
  const toolNodes = [];

  cols.forEach((c, ci) => {
    const angle = (ci / cols.length) * Math.PI * 2 - Math.PI / 2;
    const cx = CENTER.x + R_COLLECTION * Math.cos(angle);
    const cy = CENTER.y + R_COLLECTION * Math.sin(angle);
    collectionNodes.push({ id: 'c:' + c, collection: c, label: COLLECTION_LABELS[c] || c, x: cx, y: cy, angle });

    const tools = items.filter(i => i.collection === c);
    const arc = (Math.PI * 2 / cols.length) * 0.82;
    tools.forEach((tool, ti) => {
      const spread = tools.length > 1 ? (ti / (tools.length - 1) - 0.5) * arc : 0;
      const a = angle + spread;
      const tx = CENTER.x + R_TOOL * Math.cos(a);
      const ty = CENTER.y + R_TOOL * Math.sin(a);
      toolNodes.push({ id: 'c:' + c + ':' + tool.name, collection: c, tool, x: tx, y: ty, angle: a });
    });
  });

  return { collectionNodes, toolNodes };
}

function render(filterQ) {
  const { collectionNodes, toolNodes } = buildLayout();
  const q = (filterQ || '').trim().toLowerCase();
  const matches = (t) => !q || t.tool.name.toLowerCase().includes(q) || t.tool.desc.toLowerCase().includes(q);

  let svg = '';

  // Edges: center -> collection, collection -> tool
  collectionNodes.forEach(c => {
    svg += `<path class="gn-edge" data-edge-c="${c.collection}" d="M${CENTER.x},${CENTER.y} L${c.x.toFixed(1)},${c.y.toFixed(1)}"/>`;
  });
  toolNodes.forEach(t => {
    const cn = collectionNodes.find(c => c.collection === t.collection);
    svg += `<path class="gn-edge" data-edge-c="${t.collection}" d="M${cn.x.toFixed(1)},${cn.y.toFixed(1)} L${t.x.toFixed(1)},${t.y.toFixed(1)}"/>`;
  });

  // Center node
  svg += `<g class="gn-node center"><circle cx="${CENTER.x}" cy="${CENTER.y}" r="26" fill="var(--color-accent)" fill-opacity="0.15" stroke="var(--color-accent)"/><text x="${CENTER.x}" y="${CENTER.y + 4}" text-anchor="middle">tapdot</text></g>`;

  // Collection nodes
  collectionNodes.forEach(c => {
    const color = COLLECTION_COLORS[c.collection] || 'var(--color-accent)';
    const rightSide = Math.cos(c.angle) >= 0;
    const dim = q && !toolNodes.some(t => t.collection === c.collection && matches(t));
    svg += `<g class="gn-node collection${dim ? ' dim' : ''}" data-collection="${c.collection}" data-nav="/${c.collection}/">
      <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="10" fill="${color}" fill-opacity="0.25" stroke="${color}"/>
      <text x="${(c.x + (rightSide ? 14 : -14)).toFixed(1)}" y="${(c.y + 4).toFixed(1)}" text-anchor="${rightSide ? 'start' : 'end'}" fill="${color}">${escapeHtml(c.label)}</text>
    </g>`;
  });

  // Tool nodes
  toolNodes.forEach(t => {
    const color = COLLECTION_COLORS[t.collection] || 'var(--color-accent)';
    const rightSide = Math.cos(t.angle) >= 0;
    const dim = q && !matches(t);
    svg += `<g class="gn-node tool${dim ? ' dim' : ''}" data-collection="${t.collection}" data-nav="${t.tool.url}" tabindex="0" role="link" aria-label="${escapeHtml(t.tool.name)}">
      <title>${escapeHtml(t.tool.name)} — ${escapeHtml(t.tool.desc)}</title>
      <circle cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" r="5" fill="${color}"/>
      <text x="${(t.x + (rightSide ? 9 : -9)).toFixed(1)}" y="${(t.y + 3.5).toFixed(1)}" text-anchor="${rightSide ? 'start' : 'end'}">${escapeHtml(t.tool.name)}</text>
    </g>`;
  });

  $('graphSvg').innerHTML = svg;
  wireInteractions();
}

function wireInteractions() {
  const svg = $('graphSvg');
  svg.querySelectorAll('[data-nav]').forEach(node => {
    const go = () => { location.href = node.dataset.nav; };
    node.addEventListener('click', go);
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    node.addEventListener('mouseenter', () => {
      const c = node.dataset.collection;
      svg.querySelectorAll('.gn-edge').forEach(e => e.classList.toggle('lit', e.dataset.edgeC === c));
      svg.querySelectorAll('.gn-edge').forEach(e => e.classList.toggle('dim', e.dataset.edgeC !== c));
    });
    node.addEventListener('mouseleave', () => {
      svg.querySelectorAll('.gn-edge').forEach(e => { e.classList.remove('lit'); e.classList.remove('dim'); });
    });
  });
}

$('graphSearch').addEventListener('input', (e) => render(e.target.value));
render('');
