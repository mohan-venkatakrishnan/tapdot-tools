// IconExplorer — search/filter a curated icon set, copy as SVG/JSX/Vue/path data

const $ = (id) => document.getElementById(id);
let copyFmt = 'svg';

function populateCategories() {
  const cats = [...new Set(ICON_LIBRARY.map(i => i.category))].sort();
  $('categoryFilter').innerHTML = '<option value="">All categories</option>' +
    cats.map(c => `<option value="${c}">${c[0].toUpperCase() + c.slice(1)}</option>`).join('');
}

function buildSvg(icon, { stroke, color, size } = {}) {
  stroke = stroke || 2;
  color = color || 'currentColor';
  size = size || 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${icon.paths}</svg>`;
}

function formatFor(icon, fmt) {
  const strokeWidth = $('strokeWidth').value;
  const color = $('iconColor').value;
  if (fmt === 'svg') return buildSvg(icon, { stroke: strokeWidth, color });
  if (fmt === 'path') return icon.paths;
  if (fmt === 'jsx') {
    return `function Icon${capitalize(icon.name)}(props) {\n  return (\n    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="${color}" strokeWidth={${strokeWidth}} strokeLinecap="round" strokeLinejoin="round" {...props}>\n      ${icon.paths}\n    </svg>\n  );\n}`;
  }
  if (fmt === 'vue') {
    return `<template>\n  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">\n    ${icon.paths}\n  </svg>\n</template>`;
  }
  return buildSvg(icon, { stroke: strokeWidth, color });
}

function capitalize(s) { return s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(''); }

function showToast() {
  const toast = $('copiedToast');
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 1400);
}

function render() {
  const q = $('iconSearch').value.trim().toLowerCase();
  const cat = $('categoryFilter').value;
  const stroke = $('strokeWidth').value;
  const color = $('iconColor').value;
  $('strokeVal').textContent = stroke;

  const filtered = ICON_LIBRARY.filter(i =>
    (!q || i.name.includes(q)) && (!cat || i.category === cat)
  );

  $('iconGrid').innerHTML = filtered.map(icon => `
    <div class="icon-tile" data-name="${icon.name}" title="Copy ${icon.name}">
      ${buildSvg(icon, { stroke, color, size: 22 })}
      <span class="icon-name">${icon.name}</span>
    </div>
  `).join('') || '<p class="biz-muted">No icons match.</p>';

  $('iconGrid').querySelectorAll('.icon-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const icon = ICON_LIBRARY.find(i => i.name === tile.dataset.name);
      copyText(formatFor(icon, copyFmt), null);
      showToast();
    });
  });
}

populateCategories();
['iconSearch', 'categoryFilter', 'strokeWidth', 'iconColor'].forEach(id => $(id).addEventListener('input', render));
$('copyFmt').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fmt]');
  if (!btn) return;
  $('copyFmt').querySelectorAll('.ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  copyFmt = btn.dataset.fmt;
});

render();
