// ReadingList — save-for-later list with status, notes, filters, Markdown export

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'tapdot-reading-list';

function loadItems() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; } }
function saveItems(items) { localStorage.setItem(STORE_KEY, JSON.stringify(items)); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

let statusFilter = '';
let typeFilter = '';

const STATUS_LABEL = { 'to-read': 'To read', reading: 'Reading', done: 'Done' };
const STATUS_CYCLE = ['to-read', 'reading', 'done'];

function render() {
  const items = loadItems().filter(i =>
    (!statusFilter || i.status === statusFilter) && (!typeFilter || i.type === typeFilter)
  );

  $('readingList').innerHTML = items.length ? items.map(i => `
    <div class="reading-item">
      <div class="reading-item-main">
        <div class="reading-item-title">${i.url ? `<a href="${escapeHtml(i.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(i.title)}</a>` : escapeHtml(i.title)}</div>
        <div class="reading-item-meta">${i.author ? escapeHtml(i.author) + ' · ' : ''}${i.type}</div>
        <textarea class="ts-input" data-notes="${i.id}" placeholder="Notes…" style="margin-top:8px;min-height:44px">${escapeHtml(i.notes || '')}</textarea>
        <div><span class="reading-status-badge ${i.status}" data-cycle="${i.id}" style="cursor:pointer">${STATUS_LABEL[i.status]} — click to change</span></div>
      </div>
      <button class="biz-rm" data-rm="${i.id}" aria-label="Remove">✕</button>
    </div>
  `).join('') : '<p class="biz-muted">Nothing here yet.</p>';

  $('readingList').querySelectorAll('[data-cycle]').forEach(badge => {
    badge.addEventListener('click', () => {
      const items2 = loadItems();
      const item = items2.find(x => x.id === badge.dataset.cycle);
      const idx = STATUS_CYCLE.indexOf(item.status);
      item.status = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      saveItems(items2);
      render();
    });
  });
  $('readingList').querySelectorAll('[data-notes]').forEach(ta => {
    ta.addEventListener('change', () => {
      const items2 = loadItems();
      items2.find(x => x.id === ta.dataset.notes).notes = ta.value;
      saveItems(items2);
    });
  });
  $('readingList').querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      saveItems(loadItems().filter(i => i.id !== btn.dataset.rm));
      render();
    });
  });
}

$('addItem').addEventListener('click', () => {
  const title = $('itemTitle').value.trim();
  if (!title) return;
  const items = loadItems();
  items.push({
    id: 'r' + Date.now(),
    title,
    author: $('itemAuthor').value.trim(),
    url: $('itemUrl').value.trim(),
    type: $('itemType').value,
    status: 'to-read',
    notes: '',
  });
  saveItems(items);
  $('itemTitle').value = ''; $('itemAuthor').value = ''; $('itemUrl').value = '';
  render();
});

$('statusFilter').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-status]');
  if (!btn) return;
  $('statusFilter').querySelectorAll('.ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  statusFilter = btn.dataset.status;
  render();
});
$('typeFilter').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-type]');
  if (!btn) return;
  $('typeFilter').querySelectorAll('.ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  typeFilter = btn.dataset.type;
  render();
});

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
$('exportMd').addEventListener('click', () => {
  const items = loadItems();
  const md = '# Reading list\n\n' + items.map(i =>
    `- [${STATUS_LABEL[i.status]}] ${i.url ? `[${i.title}](${i.url})` : i.title}${i.author ? ` — ${i.author}` : ''} (${i.type})${i.notes ? `\n  > ${i.notes}` : ''}`
  ).join('\n');
  downloadFile('reading-list.md', md, 'text/markdown');
});

render();
