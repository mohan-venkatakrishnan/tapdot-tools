// SpacingCalc — linear or multiplicative spacing scale, visual preview, CSS/Tailwind/JSON export

const $ = (id) => document.getElementById(id);
const SCALE_STEPS = 16;

function generateScale(baseUnit, method) {
  return Array.from({ length: SCALE_STEPS }, (_, i) => {
    const step = i + 1;
    const px = method === 'linear' ? baseUnit * step : baseUnit * Math.pow(1.5, step - 1);
    return { name: `sp-${step}`, px: Math.round(px * 100) / 100, rem: (px / 16).toFixed(4) };
  });
}

let currentScale = [];
let currentFormat = 'css';

function render() {
  const baseUnit = parseFloat($('baseUnit').value) || 4;
  const method = $('method').value;
  currentScale = generateScale(baseUnit, method);
  const maxPx = currentScale[currentScale.length - 1].px;

  $('spacingList').innerHTML = currentScale.map(s => `
    <div class="spacing-row">
      <span class="spacing-label">${s.name}</span>
      <span class="spacing-bar" style="width:${Math.min(100, (s.px / maxPx) * 100)}%"></span>
      <span class="spacing-value">${s.px}px</span>
    </div>
  `).join('');

  renderExport();
}

function renderExport() {
  let text = '';
  if (currentFormat === 'css') {
    text = ':root {\n' + currentScale.map(s => `  --${s.name}: ${s.rem}rem;`).join('\n') + '\n}';
  } else if (currentFormat === 'tailwind') {
    text = 'spacing: {\n' + currentScale.map((s, i) => `  '${i + 1}': '${s.rem}rem',`).join('\n') + '\n}';
  } else {
    text = JSON.stringify(Object.fromEntries(currentScale.map(s => [s.name, { value: `${s.rem}rem`, px: s.px }])), null, 2);
  }
  $('exportOutput').textContent = text;
}

['baseUnit', 'method'].forEach(id => $(id).addEventListener('input', render));
$('exportTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fmt]');
  if (!btn) return;
  $('exportTabs').querySelectorAll('.ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFormat = btn.dataset.fmt;
  renderExport();
});
$('copyExport').addEventListener('click', () => copyText($('exportOutput').textContent, $('copyExport')));

render();
