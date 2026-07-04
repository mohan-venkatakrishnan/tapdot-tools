// Browse — every tool in TOOL_REGISTRY as a pastel card, grouped by collection

const $ = (id) => document.getElementById(id);

const COLLECTIONS_ORDER = ['study', 'write', 'dev', 'marketing', 'finance', 'legal', 'hr', 'health', 'design', 'productivity', 'ai'];

function iconFor(item) {
  return (typeof ICONS !== 'undefined') ? (ICONS[item.name] || ICONS[item.collection] || ICONS.tools) : '';
}

let activeCollection = '';

function renderFilters() {
  const cols = COLLECTIONS_ORDER.filter(c => TOOL_REGISTRY.some(i => i.collection === c));
  $('browseFilter').innerHTML = '<button class="ts-segment-btn active" data-c="">All</button>' +
    cols.map(c => `<button class="ts-segment-btn" data-c="${c}">${COLLECTION_LABELS[c] || c}</button>`).join('');
}

function render() {
  const q = $('browseSearch').value.trim().toLowerCase();
  const items = TOOL_REGISTRY.filter(i => i.collection !== 'tools' && !i.url.endsWith('/privacy.html'))
    .filter(i => !activeCollection || i.collection === activeCollection)
    .filter(i => !q || i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));

  const groups = {};
  items.forEach(i => { (groups[i.collection] ||= []).push(i); });

  $('browseGrid').innerHTML = COLLECTIONS_ORDER.filter(c => groups[c] && groups[c].length).map(c => `
    <section class="browse-group" data-collection="${c}">
      <h2 class="browse-group-title">${COLLECTION_LABELS[c] || c}</h2>
      <div class="browse-cards">
        ${groups[c].map(item => `
          <a class="browse-card" href="${item.url}" data-collection="${c}">
            <span class="browse-card-icon" aria-hidden="true">${iconFor(item)}</span>
            <span class="browse-card-name">${escapeHtml(item.name)}</span>
            <span class="browse-card-desc">${escapeHtml(item.desc)}</span>
          </a>
        `).join('')}
      </div>
    </section>
  `).join('') || '<p class="biz-muted">No tools match that search.</p>';
}

$('browseSearch').addEventListener('input', render);
$('browseFilter').addEventListener('click', (e) => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  $('browseFilter').querySelectorAll('.ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  activeCollection = b.dataset.c;
  render();
});

renderFilters();
render();
