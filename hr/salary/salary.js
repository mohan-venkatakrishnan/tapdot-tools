// SalaryBand — pay grades, compa-ratio, range visualisation

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => '$' + Math.round(n).toLocaleString();

function comparatio(salary, midpoint) { return midpoint > 0 ? ((salary / midpoint) * 100).toFixed(1) + '%' : '—'; }

let grades = [
  { name: 'L1', min: 60000, mid: 75000, max: 90000 },
  { name: 'L2', min: 80000, mid: 100000, max: 120000 },
  { name: 'L3', min: 105000, mid: 130000, max: 155000 },
];
let roles = [
  { name: 'Engineer I', grade: 'L1', salary: 68000 },
  { name: 'Engineer II', grade: 'L2', salary: 95000 },
];

function gradeRow(g, i) {
  return `<tr data-i="${i}">
    <td><input value="${escapeHtml(g.name)}" data-f="name" /></td>
    <td><input type="number" value="${g.min}" data-f="min" /></td>
    <td><input type="number" value="${g.mid}" data-f="mid" /></td>
    <td><input type="number" value="${g.max}" data-f="max" /></td>
    <td><button class="biz-rm" data-rm="${i}">×</button></td>
  </tr>`;
}
function roleRow(r, i) {
  const grade = grades.find(g => g.name === r.grade);
  const ratio = grade ? comparatio(r.salary, grade.mid) : '—';
  return `<tr data-i="${i}">
    <td><input value="${escapeHtml(r.name)}" data-f="name" /></td>
    <td><select data-f="grade">${grades.map(g => `<option value="${escapeHtml(g.name)}" ${g.name === r.grade ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select></td>
    <td><input type="number" value="${r.salary}" data-f="salary" /></td>
    <td>${ratio}</td>
    <td><button class="biz-rm" data-rm="${i}">×</button></td>
  </tr>`;
}

function renderChart() {
  const allMin = Math.min(...grades.map(g => g.min), ...roles.map(r => r.salary));
  const allMax = Math.max(...grades.map(g => g.max), ...roles.map(r => r.salary));
  const range = allMax - allMin || 1;
  const pct = (v) => ((v - allMin) / range) * 100;

  $('bandChart').innerHTML = grades.map(g => {
    const roleMarkers = roles.filter(r => r.grade === g.name).map(r =>
      `<div class="band-marker" style="left:${pct(r.salary)}%" title="${escapeHtml(r.name)}: ${fmtMoney(r.salary)}"></div>`).join('');
    return `<div class="band-row">
      <span class="biz-muted">${escapeHtml(g.name)}</span>
      <div class="band-track">
        <div class="band-fill" style="left:${pct(g.min)}%;width:${pct(g.max) - pct(g.min)}%"></div>
        <div class="band-mid" style="left:${pct(g.mid)}%"></div>
        ${roleMarkers}
      </div>
      <span class="biz-muted" style="font-family:var(--font-mono);font-size:11px">${fmtMoney(g.min)}–${fmtMoney(g.max)}</span>
    </div>`;
  }).join('');
}

function render() {
  $('gradeBody').innerHTML = grades.map(gradeRow).join('');
  $('roleBody').innerHTML = roles.map(roleRow).join('');
  renderChart();
}

$('gradeBody').addEventListener('input', (e) => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const i = +tr.dataset.i, f = e.target.dataset.f;
  grades[i][f] = f === 'name' ? e.target.value : parseFloat(e.target.value) || 0;
  render();
});
$('gradeBody').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { grades.splice(+b.dataset.rm, 1); render(); } });
$('addGrade').addEventListener('click', () => { grades.push({ name: 'New', min: 0, mid: 0, max: 0 }); render(); });

$('roleBody').addEventListener('input', (e) => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const i = +tr.dataset.i, f = e.target.dataset.f;
  roles[i][f] = f === 'salary' ? parseFloat(e.target.value) || 0 : e.target.value;
  render();
});
$('roleBody').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { roles.splice(+b.dataset.rm, 1); render(); } });
$('addRole').addEventListener('click', () => { roles.push({ name: 'New role', grade: grades[0]?.name || '', salary: 0 }); render(); });

render();
