// QuickNote — private multi-note notepad, debounced autosave, .txt/.md export

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'tapdot-quicknote-notes';
const MAX_NOTES = 10;
const AUTOSAVE_DELAY = 500;

function loadNotes() {
  try {
    const notes = JSON.parse(localStorage.getItem(STORE_KEY));
    if (notes && notes.length) return notes;
  } catch (e) {}
  return [{ id: 'n' + Date.now(), title: 'Untitled note', body: '' }];
}
function saveNotes(notes) { localStorage.setItem(STORE_KEY, JSON.stringify(notes)); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

let notes = loadNotes();
let activeId = notes[0].id;
let saveTimer = null;

function activeNote() { return notes.find(n => n.id === activeId) || notes[0]; }

function renderTabs() {
  $('noteTabs').innerHTML = notes.map(n => `
    <button class="note-tab ${n.id === activeId ? 'active' : ''}" data-id="${n.id}">${escapeHtml(n.title || 'Untitled note')}</button>
  `).join('');
  $('noteTabs').querySelectorAll('.note-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeId = tab.dataset.id;
      renderTabs();
      renderEditor();
    });
  });
}

function renderEditor() {
  const note = activeNote();
  $('noteTitle').value = note.title;
  $('noteBody').value = note.body;
  updateWordCount();
  $('saveStatus').textContent = 'Saved';
}

function updateWordCount() {
  const text = $('noteBody').value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  $('wordCount').textContent = `${words} word${words === 1 ? '' : 's'}`;
}

function scheduleSave() {
  $('saveStatus').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const note = activeNote();
    note.title = $('noteTitle').value;
    note.body = $('noteBody').value;
    saveNotes(notes);
    renderTabs();
    $('saveStatus').textContent = 'Saved';
  }, AUTOSAVE_DELAY);
}

$('noteTitle').addEventListener('input', scheduleSave);
$('noteBody').addEventListener('input', () => { updateWordCount(); scheduleSave(); });

$('newNote').addEventListener('click', () => {
  if (notes.length >= MAX_NOTES) { alert(`You can keep up to ${MAX_NOTES} notes.`); return; }
  const note = { id: 'n' + Date.now(), title: 'Untitled note', body: '' };
  notes.push(note);
  activeId = note.id;
  saveNotes(notes);
  renderTabs();
  renderEditor();
});

$('deleteNote').addEventListener('click', () => {
  if (notes.length <= 1) { alert('You need at least one note.'); return; }
  if (!confirm('Delete this note? This cannot be undone.')) return;
  notes = notes.filter(n => n.id !== activeId);
  activeId = notes[0].id;
  saveNotes(notes);
  renderTabs();
  renderEditor();
});

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('exportTxt').addEventListener('click', () => {
  const note = activeNote();
  downloadFile(`${(note.title || 'note').replace(/[^\w-]+/g, '-')}.txt`, note.body, 'text/plain');
});
$('exportMd').addEventListener('click', () => {
  const note = activeNote();
  downloadFile(`${(note.title || 'note').replace(/[^\w-]+/g, '-')}.md`, `# ${note.title}\n\n${note.body}`, 'text/markdown');
});

renderTabs();
renderEditor();
