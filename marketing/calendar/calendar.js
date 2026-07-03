// SocialCalendar — month content calendar, saved locally

const LS = 'tapdot-social-calendar';
const $ = (id) => document.getElementById(id);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLATFORM_ICON = { instagram: '📷', linkedin: '💼', x: '𝕏', tiktok: '🎵', facebook: '📘' };

function getPosts() { try { return JSON.parse(localStorage.getItem(LS)).posts || []; } catch { return []; } }
function setPosts(posts) { localStorage.setItem(LS, JSON.stringify({ posts })); }

let viewYear, viewMonth;
{ const now = new Date(); viewYear = now.getFullYear(); viewMonth = now.getMonth(); }
let editingId = null;

function isoDate(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

function renderHead() {
  $('calHead').innerHTML = WEEKDAYS.map(d => `<div class="biz-cal-head">${d}</div>`).join('');
}

function render() {
  $('monthLabel').textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const filter = $('platformFilter').value;
  const posts = getPosts().filter(p => !filter || p.platform === filter);
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = new Date();
  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += '<div class="biz-cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = isoDate(viewYear, viewMonth, d);
    const dayPosts = posts.filter(p => p.date === date);
    cells += `<div class="biz-cal-cell${date === todayIso ? ' today' : ''}" data-date="${date}">
      <div class="d">${d}${date === todayIso ? ' · today' : ''}</div>
      ${dayPosts.slice(0, 3).map(p => `<div class="biz-cal-post" data-id="${p.id}">${PLATFORM_ICON[p.platform] || ''} ${escapeHtml((p.copy || '').slice(0, 16) || '(no text)')}</div>`).join('')}
      ${dayPosts.length > 3 ? `<div class="biz-muted" style="font-size:9px">+${dayPosts.length - 3} more</div>` : ''}
    </div>`;
  }
  $('calGrid').innerHTML = cells;
  renderUpcoming();
}

// Next 7 days at a glance — saves hunting through the grid.
function renderUpcoming() {
  const el = $('upcomingList');
  if (!el) return;
  const today = new Date();
  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const weekOut = new Date(today.getTime() + 7 * 86400000);
  const weekIso = isoDate(weekOut.getFullYear(), weekOut.getMonth(), weekOut.getDate());
  const upcoming = getPosts()
    .filter(p => p.date >= todayIso && p.date <= weekIso)
    .sort((a, b) => a.date.localeCompare(b.date));
  el.innerHTML = upcoming.length
    ? upcoming.map(p => `<div class="biz-row" style="justify-content:space-between;padding:6px 0;border-top:0.5px solid var(--color-border)">
        <span style="font-size:13px">${PLATFORM_ICON[p.platform] || ''} ${escapeHtml((p.copy || '(no text)').slice(0, 60))}</span>
        <span class="biz-muted">${p.date}${p.status === 'draft' ? ' · draft' : ''}</span>
      </div>`).join('')
    : '<p class="biz-muted">Nothing scheduled in the next 7 days.</p>';
}

function openEditor(date, post) {
  editingId = post ? post.id : null;
  $('editorLabel').textContent = post ? 'Edit post' : 'Add a post';
  $('pDate').value = date || post.date;
  $('pPlatform').value = post ? post.platform : 'instagram';
  $('pCopy').value = post ? post.copy : '';
  $('pStatus').value = post ? post.status : 'draft';
  $('deleteBtn').classList.toggle('ts-hidden', !post);
  $('editorCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

$('calGrid').addEventListener('click', (e) => {
  const postEl = e.target.closest('.biz-cal-post');
  if (postEl) {
    const post = getPosts().find(p => p.id === postEl.dataset.id);
    if (post) { openEditor(null, post); return; }
  }
  const cell = e.target.closest('.biz-cal-cell:not(.empty)');
  if (cell) openEditor(cell.dataset.date, null);
});

$('saveBtn').addEventListener('click', () => {
  const date = $('pDate').value;
  if (!date) return;
  const posts = getPosts();
  const data = { date, platform: $('pPlatform').value, copy: $('pCopy').value, status: $('pStatus').value, notes: '' };
  if (editingId) {
    const i = posts.findIndex(p => p.id === editingId);
    if (i >= 0) posts[i] = { ...posts[i], ...data };
  } else {
    posts.push({ id: 'post_' + Math.random().toString(36).slice(2, 10), ...data });
  }
  setPosts(posts);
  editingId = null;
  $('deleteBtn').classList.add('ts-hidden');
  $('pCopy').value = '';
  render();
});
$('deleteBtn').addEventListener('click', () => {
  if (!editingId) return;
  setPosts(getPosts().filter(p => p.id !== editingId));
  editingId = null;
  $('deleteBtn').classList.add('ts-hidden');
  $('editorLabel').textContent = 'Add a post';
  $('pCopy').value = '';
  render();
});

$('prevMonth').addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });
$('nextMonth').addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });
$('platformFilter').addEventListener('change', render);

$('exportCsv').addEventListener('click', () => {
  const posts = getPosts().filter(p => p.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`));
  const header = 'Date,Platform,Status,Copy';
  const rows = posts.map(p => [p.date, p.platform, p.status, p.copy].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `social-calendar-${viewYear}-${viewMonth + 1}.csv`; a.click();
  URL.revokeObjectURL(a.href);
});

renderHead();
render();
