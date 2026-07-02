// GradientMaker — linear/radial/conic CSS gradient builder with colour stops

const $ = (id) => document.getElementById(id);

let type = 'linear';
let angle = 90;
let stops = [
  { color: '#4E8FC4', alpha: 100, pos: 0 },
  { color: '#8A5CD6', alpha: 100, pos: 100 },
];
let exportFmt = 'css';

function hexToRgba(hex, alphaPct) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return alphaPct >= 100 ? hex : `rgba(${r}, ${g}, ${b}, ${(alphaPct / 100).toFixed(2)})`;
}

function stopsCSS() {
  return [...stops].sort((a, b) => a.pos - b.pos)
    .map(s => `${hexToRgba(s.color, s.alpha)} ${s.pos}%`).join(', ');
}

function gradientValue() {
  if (type === 'linear') return `linear-gradient(${angle}deg, ${stopsCSS()})`;
  if (type === 'radial') return `radial-gradient(circle, ${stopsCSS()})`;
  return `conic-gradient(from ${angle}deg, ${stopsCSS()})`;
}

function render() {
  $('gradientPreview').style.backgroundImage = gradientValue();
  $('angleField').style.display = type === 'radial' ? 'none' : '';
  $('angleVal').textContent = `${angle}°`;

  $('stopList').innerHTML = stops.map((s, i) => `
    <div class="gradient-stop-row">
      <input type="color" data-field="color" data-idx="${i}" value="${s.color}" />
      <input type="range" min="0" max="100" data-field="pos" data-idx="${i}" value="${s.pos}" />
      <span class="pos-val">${s.pos}%</span>
      <input type="range" min="0" max="100" data-field="alpha" data-idx="${i}" value="${s.alpha}" title="Opacity" />
      <button class="biz-rm" data-rm="${i}" aria-label="Remove stop" ${stops.length <= 2 ? 'disabled' : ''}>✕</button>
    </div>
  `).join('');

  $('stopList').querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = parseInt(el.dataset.idx, 10);
      const field = el.dataset.field;
      stops[idx][field] = field === 'color' ? el.value : parseFloat(el.value);
      render();
    });
  });
  $('stopList').querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      stops.splice(parseInt(btn.dataset.rm, 10), 1);
      render();
    });
  });

  renderExport();
}

function renderExport() {
  const value = gradientValue();
  if (exportFmt === 'css') {
    $('exportOutput').textContent = `background: ${value};`;
  } else {
    $('exportOutput').textContent = `<div class="bg-[${value.replace(/\s/g, '_')}]"></div>`;
  }
}

$('angle').addEventListener('input', () => { angle = parseInt($('angle').value, 10); render(); });
$('addStop').addEventListener('click', () => {
  stops.push({ color: '#ffffff', alpha: 100, pos: 50 });
  render();
});
$('typeTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-type]');
  if (!btn) return;
  $('typeTabs').querySelectorAll('.ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  type = btn.dataset.type;
  render();
});
document.querySelectorAll('.gradient-bg-toggle [data-bg]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gradient-bg-toggle [data-bg]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const map = { white: '#ffffff', black: '#111111', card: 'var(--color-surface)', page: 'var(--color-bg)' };
    $('gradientPreview').style.backgroundColor = map[btn.dataset.bg];
  });
});
$('exportTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fmt]');
  if (!btn) return;
  $('exportTabs').querySelectorAll('.ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  exportFmt = btn.dataset.fmt;
  renderExport();
});
$('copyExport').addEventListener('click', () => copyText($('exportOutput').textContent, $('copyExport')));

render();
