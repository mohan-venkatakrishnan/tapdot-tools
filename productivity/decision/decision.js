// DecisionMatrix — weighted criteria matrix, CSV/Markdown export

const $ = (id) => document.getElementById(id);

let criteria = [
  { id: 'c1', name: 'Price', weight: 4 },
  { id: 'c2', name: 'Performance', weight: 5 },
  { id: 'c3', name: 'Portability', weight: 3 },
];
let options = [
  { id: 'o1', name: 'MacBook Air', ratings: { c1: 5, c2: 7, c3: 9 } },
  { id: 'o2', name: 'ThinkPad X1', ratings: { c1: 6, c2: 8, c3: 7 } },
  { id: 'o3', name: 'Dell XPS 13', ratings: { c1: 7, c2: 7, c3: 8 } },
];
let nextId = 4;
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function weightedScore(option) {
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0) || 1;
  const sum = criteria.reduce((s, c) => s + (option.ratings[c.id] || 0) * c.weight, 0);
  return sum / totalWeight;
}

function renderCriteria() {
  $('criteriaList').innerHTML = criteria.map(c => `
    <div class="criteria-row">
      <input type="text" class="ts-input" data-crit="${c.id}" data-field="name" value="${escapeHtml(c.name)}" />
      <input type="number" class="ts-input" data-crit="${c.id}" data-field="weight" value="${c.weight}" min="1" max="5" />
      <button class="biz-rm" data-rm-crit="${c.id}" aria-label="Remove criterion" ${criteria.length <= 1 ? 'disabled' : ''}>✕</button>
    </div>
  `).join('');

  $('criteriaList').querySelectorAll('[data-crit]').forEach(el => {
    el.addEventListener('input', () => {
      const c = criteria.find(x => x.id === el.dataset.crit);
      c[el.dataset.field] = el.dataset.field === 'weight' ? (parseFloat(el.value) || 1) : el.value;
      renderMatrix();
    });
  });
  $('criteriaList').querySelectorAll('[data-rm-crit]').forEach(btn => {
    btn.addEventListener('click', () => {
      criteria = criteria.filter(c => c.id !== btn.dataset.rmCrit);
      renderCriteria();
      renderMatrix();
    });
  });
}

function renderMatrix() {
  const scores = options.map(o => ({ o, score: weightedScore(o) }));
  const maxScore = Math.max(...scores.map(s => s.score), -Infinity);

  const head = `<tr><th>Option</th>${criteria.map(c => `<th>${escapeHtml(c.name)} (×${c.weight})</th>`).join('')}<th>Score</th><th></th></tr>`;
  const rows = scores.map(({ o, score }) => `
    <tr>
      <td><input type="text" class="ts-input" data-opt="${o.id}" data-field="name" value="${escapeHtml(o.name)}" /></td>
      ${criteria.map(c => `<td><input type="number" min="1" max="10" data-opt="${o.id}" data-crit="${c.id}" value="${o.ratings[c.id] || 5}" /></td>`).join('')}
      <td class="${score === maxScore ? 'winner' : ''}">${score.toFixed(2)}${score === maxScore ? ' 🏆' : ''}</td>
      <td><button class="biz-rm" data-rm-opt="${o.id}" aria-label="Remove option" ${options.length <= 1 ? 'disabled' : ''}>✕</button></td>
    </tr>
  `).join('');

  $('matrixTable').innerHTML = head + rows;

  $('matrixTable').querySelectorAll('[data-field="name"]').forEach(el => {
    el.addEventListener('input', () => {
      options.find(o => o.id === el.dataset.opt).name = el.value;
    });
  });
  $('matrixTable').querySelectorAll('input[data-crit]').forEach(el => {
    el.addEventListener('input', () => {
      const o = options.find(x => x.id === el.dataset.opt);
      o.ratings[el.dataset.crit] = Math.min(10, Math.max(1, parseFloat(el.value) || 1));
      renderMatrix();
    });
  });
  $('matrixTable').querySelectorAll('[data-rm-opt]').forEach(btn => {
    btn.addEventListener('click', () => {
      options = options.filter(o => o.id !== btn.dataset.rmOpt);
      renderMatrix();
    });
  });
}

$('addCriterion').addEventListener('click', () => {
  criteria.push({ id: 'c' + nextId++, name: 'New criterion', weight: 3 });
  renderCriteria();
  renderMatrix();
});
$('addOption').addEventListener('click', () => {
  options.push({ id: 'o' + nextId++, name: 'New option', ratings: {} });
  renderMatrix();
});

function currentScores() {
  return options.map(o => ({ name: o.name, score: weightedScore(o) })).sort((a, b) => b.score - a.score);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('exportCsv').addEventListener('click', () => {
  const header = ['Option', ...criteria.map(c => c.name), 'Score'];
  const rows = options.map(o => [o.name, ...criteria.map(c => o.ratings[c.id] || ''), weightedScore(o).toFixed(2)]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile('decision-matrix.csv', csv, 'text/csv');
});
$('exportMd').addEventListener('click', () => {
  const header = `| Option | ${criteria.map(c => c.name).join(' | ')} | Score |`;
  const sep = `|---|${criteria.map(() => '---').join('|')}|---|`;
  const rows = options.map(o => `| ${o.name} | ${criteria.map(c => o.ratings[c.id] || '').join(' | ')} | ${weightedScore(o).toFixed(2)} |`);
  const md = `# ${$('decisionTitle').value}\n\n${header}\n${sep}\n${rows.join('\n')}\n`;
  downloadFile('decision-matrix.md', md, 'text/markdown');
});

renderCriteria();
renderMatrix();
