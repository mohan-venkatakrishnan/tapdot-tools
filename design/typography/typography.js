// TypographyScale — generate a 9-step type scale, preview, CSS/Tailwind export

const $ = (id) => document.getElementById(id);
const STEP_NAMES = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];

function generateScale(baseSize, ratio, steps = 9) {
  return Array.from({ length: steps }, (_, i) => {
    const step = i - 3; // -3 to +5 around base
    const px = baseSize * Math.pow(ratio, step);
    return { name: STEP_NAMES[i], px: px.toFixed(2), rem: (px / 16).toFixed(4) };
  });
}

let currentScale = [];
let currentFormat = 'css';

function render() {
  const baseSize = parseFloat($('baseSize').value) || 16;
  const ratio = parseFloat($('ratio').value) || 1.2;
  const previewText = $('previewText').value || 'The quick brown fox jumps';
  currentScale = generateScale(baseSize, ratio);

  $('scaleList').innerHTML = currentScale.map(s => `
    <div class="type-scale-row">
      <div class="type-scale-meta">${s.name}<br>${s.px}px / ${s.rem}rem</div>
      <div class="type-scale-preview" style="font-size:${s.px}px">${escapeHtml(previewText)}</div>
    </div>
  `).join('');

  renderExport();
}

function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function renderExport() {
  let text = '';
  if (currentFormat === 'css') {
    text = ':root {\n' + currentScale.map(s => `  --font-size-${s.name}: ${s.rem}rem;`).join('\n') + '\n}';
  } else {
    text = 'fontSize: {\n' + currentScale.map(s => `  '${s.name}': '${s.rem}rem',`).join('\n') + '\n}';
  }
  $('exportOutput').textContent = text;
}

['baseSize', 'ratio', 'previewText'].forEach(id => $(id).addEventListener('input', render));
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
