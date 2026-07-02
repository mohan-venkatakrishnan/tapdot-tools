// ShadowStudio — layered CSS box-shadow builder with presets

const $ = (id) => document.getElementById(id);
const MAX_LAYERS = 5;

const PRESETS = {
  flat: [{ x: 0, y: 2, blur: 4, spread: 0, color: '#000000', alpha: 15, inset: false }],
  material: [
    { x: 0, y: 1, blur: 3, spread: 0, color: '#000000', alpha: 24, inset: false },
    { x: 0, y: 8, blur: 16, spread: -4, color: '#000000', alpha: 20, inset: false },
  ],
  neumorphic: [
    { x: 8, y: 8, blur: 16, spread: 0, color: '#a3b1c6', alpha: 60, inset: false },
    { x: -8, y: -8, blur: 16, spread: 0, color: '#ffffff', alpha: 80, inset: false },
  ],
  glass: [
    { x: 0, y: 4, blur: 30, spread: 0, color: '#000000', alpha: 12, inset: false },
    { x: 0, y: 1, blur: 0, spread: 0, color: '#ffffff', alpha: 40, inset: true },
  ],
};

let layers = PRESETS.material.map(l => ({ ...l }));

function hexToRgba(hex, alphaPct) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${(alphaPct / 100).toFixed(2)})`;
}

function shadowCSS() {
  return layers.map(l =>
    `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${hexToRgba(l.color, l.alpha)}`
  ).join(',\n  ');
}

function render() {
  $('previewCard').style.boxShadow = shadowCSS();
  $('exportOutput').textContent = `box-shadow:\n  ${shadowCSS()};`;

  $('layerList').innerHTML = layers.map((l, i) => `
    <div class="shadow-layer">
      <div><label class="ts-label">X <span class="val">${l.x}</span></label><input type="number" class="ts-input" data-field="x" data-idx="${i}" value="${l.x}" /></div>
      <div><label class="ts-label">Y <span class="val">${l.y}</span></label><input type="number" class="ts-input" data-field="y" data-idx="${i}" value="${l.y}" /></div>
      <div><label class="ts-label">Blur</label><input type="number" class="ts-input" data-field="blur" data-idx="${i}" value="${l.blur}" min="0" /></div>
      <div><label class="ts-label">Spread</label><input type="number" class="ts-input" data-field="spread" data-idx="${i}" value="${l.spread}" /></div>
      <div><label class="ts-label">Colour</label><input type="color" data-field="color" data-idx="${i}" value="${l.color}" /></div>
      <div><label class="ts-label">Opacity <span class="val">${l.alpha}%</span></label><input type="range" min="0" max="100" data-field="alpha" data-idx="${i}" value="${l.alpha}" /></div>
      <div class="biz-row layer-controls" style="flex-direction:column;align-items:stretch;gap:4px">
        <label class="ts-label" style="margin:0"><input type="checkbox" data-field="inset" data-idx="${i}" ${l.inset ? 'checked' : ''} /> Inset</label>
        <button class="biz-rm" data-rm="${i}" aria-label="Remove layer" ${layers.length <= 1 ? 'disabled' : ''}>✕</button>
      </div>
    </div>
  `).join('');

  $('layerList').querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = parseInt(el.dataset.idx, 10);
      const field = el.dataset.field;
      layers[idx][field] = field === 'inset' ? el.checked : (field === 'color' ? el.value : parseFloat(el.value) || 0);
      render();
    });
  });
  $('layerList').querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      layers.splice(parseInt(btn.dataset.rm, 10), 1);
      render();
    });
  });
}

$('addLayer').addEventListener('click', () => {
  if (layers.length >= MAX_LAYERS) return;
  layers.push({ x: 0, y: 4, blur: 8, spread: 0, color: '#000000', alpha: 20, inset: false });
  render();
});
document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    layers = PRESETS[btn.dataset.preset].map(l => ({ ...l }));
    render();
  });
});
$('copyExport').addEventListener('click', () => copyText($('exportOutput').textContent, $('copyExport')));

render();
