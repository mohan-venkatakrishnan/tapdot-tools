// OnboardingChecklist — customisable Day1/Week1/Month1 checklist, saved locally

const LS = 'tapdot-onboarding-templates';
const $ = (id) => document.getElementById(id);

function defaultChecklist() {
  return {
    name: 'New hire onboarding',
    groups: {
      'Day 1': [
        { text: 'Send welcome email and agenda', owner: '', done: false },
        { text: 'Set up workstation and accounts', owner: '', done: false },
        { text: 'IT equipment and access provisioned', owner: '', done: false },
        { text: 'Office tour and team introductions', owner: '', done: false },
        { text: 'Review company handbook', owner: '', done: false },
      ],
      'Week 1': [
        { text: 'Meet with direct manager', owner: '', done: false },
        { text: 'Complete mandatory compliance training', owner: '', done: false },
        { text: 'Set up payroll and benefits', owner: '', done: false },
        { text: 'Review role expectations and 90-day plan', owner: '', done: false },
        { text: 'Shadow team members', owner: '', done: false },
      ],
      'Month 1': [
        { text: '30-day check-in with manager', owner: '', done: false },
        { text: 'Complete onboarding feedback survey', owner: '', done: false },
        { text: 'Set initial performance goals', owner: '', done: false },
        { text: 'Join relevant Slack channels and meetings', owner: '', done: false },
      ],
    },
  };
}

function getTemplates() { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } }
function setTemplates(list) { localStorage.setItem(LS, JSON.stringify(list.slice(0, 5))); }

let current = defaultChecklist();

function renderGroups() {
  $('groups').innerHTML = Object.entries(current.groups).map(([label, items]) => `
    <div class="ts-card checklist-group">
      <h3>${escapeHtml(label)}</h3>
      ${items.map((item, i) => `
        <div class="checklist-item ${item.done ? 'done' : ''}" data-group="${escapeHtml(label)}" data-i="${i}">
          <input type="checkbox" ${item.done ? 'checked' : ''} data-f="done" />
          <input type="text" value="${escapeHtml(item.text)}" data-f="text" />
          <input type="text" class="owner" placeholder="Owner" value="${escapeHtml(item.owner)}" data-f="owner" />
          <button class="biz-rm" data-rm="1">×</button>
        </div>`).join('')}
      <button class="ts-btn ts-btn-ghost ts-mt-sm" data-addto="${escapeHtml(label)}" style="height:32px;padding:0 12px">+ Add task</button>
    </div>`).join('');
  renderProgress();
}
function renderProgress() {
  const all = Object.values(current.groups).flat();
  const done = all.filter(i => i.done).length;
  $('progressPct').textContent = all.length ? Math.round((done / all.length) * 100) + '%' : '0%';
}

$('groups').addEventListener('input', (e) => {
  const row = e.target.closest('.checklist-item'); if (!row) return;
  const group = row.dataset.group, i = +row.dataset.i, f = e.target.dataset.f;
  current.groups[group][i][f] = f === 'done' ? e.target.checked : e.target.value;
  if (f === 'done') renderGroups(); else renderProgress();
});
$('groups').addEventListener('click', (e) => {
  const rm = e.target.closest('[data-rm]');
  if (rm) { const row = rm.closest('.checklist-item'); current.groups[row.dataset.group].splice(+row.dataset.i, 1); renderGroups(); return; }
  const add = e.target.closest('[data-addto]');
  if (add) { current.groups[add.dataset.addto].push({ text: 'New task', owner: '', done: false }); renderGroups(); }
});

$('templateName').addEventListener('input', () => { current.name = $('templateName').value; });

function refreshTemplateSelect() {
  const templates = getTemplates();
  $('loadTemplate').innerHTML = '<option value="">Load a saved template…</option>' +
    templates.map((t, i) => `<option value="${i}">${escapeHtml(t.name)}</option>`).join('');
}
$('saveTemplate').addEventListener('click', () => {
  const templates = getTemplates();
  templates.unshift(JSON.parse(JSON.stringify(current)));
  setTemplates(templates);
  refreshTemplateSelect();
});
$('loadTemplate').addEventListener('change', () => {
  const idx = $('loadTemplate').value;
  if (idx === '') return;
  current = JSON.parse(JSON.stringify(getTemplates()[+idx]));
  $('templateName').value = current.name;
  renderGroups();
});

$('copyMd').addEventListener('click', (e) => {
  const lines = [`# ${current.name}`, ''];
  Object.entries(current.groups).forEach(([label, items]) => {
    lines.push(`## ${label}`);
    items.forEach(i => lines.push(`- [${i.done ? 'x' : ' '}] ${i.text}${i.owner ? ` (${i.owner})` : ''}`));
    lines.push('');
  });
  copyText(lines.join('\n'), e.target);
});
$('downloadCsv').addEventListener('click', () => {
  const rows = [['Section', 'Task', 'Owner', 'Done']];
  Object.entries(current.groups).forEach(([label, items]) => items.forEach(i => rows.push([label, i.text, i.owner, i.done ? 'Yes' : 'No'])));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'onboarding-checklist.csv'; a.click();
  URL.revokeObjectURL(a.href);
});

refreshTemplateSelect();
renderGroups();
