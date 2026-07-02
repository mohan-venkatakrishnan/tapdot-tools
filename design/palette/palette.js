// PaletteForge — generate a palette from a base colour, WCAG contrast, CSS/Tailwind export

const $ = (id) => document.getElementById(id);

function hexToRGB(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}
function hexToHSL(hex) {
  const { r, g, b } = hexToRGB(hex);
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN: h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6; break;
      case gN: h = ((bN - rN) / d + 2) / 6; break;
      case bN: h = ((rN - gN) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToHex({ h, s, l }) {
  h = ((h % 360) + 360) % 360; s = Math.min(100, Math.max(0, s)) / 100; l = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
}

function generatePalette(hexBase) {
  const hsl = hexToHSL(hexBase);
  return {
    primary: hslToHex({ ...hsl }),
    light: hslToHex({ ...hsl, l: Math.min(95, hsl.l + 40) }),
    dark: hslToHex({ ...hsl, l: Math.max(10, hsl.l - 30) }),
    accent: hslToHex({ ...hsl, h: (hsl.h + 30) % 360 }),
    complement: hslToHex({ ...hsl, h: (hsl.h + 180) % 360 }),
  };
}

function relLuminance(hex) {
  const { r, g, b } = hexToRGB(hex);
  const [rs, gs, bs] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function contrastRatio(hex1, hex2) {
  const l1 = relLuminance(hex1), l2 = relLuminance(hex2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}
function wcagBadge(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

let currentPalette = null;
let currentFormat = 'css';

function renderPalette(hexBase) {
  currentPalette = generatePalette(hexBase);
  const entries = Object.entries(currentPalette);
  $('paletteGrid').innerHTML = entries.map(([name, hex]) => {
    const hsl = hexToHSL(hex);
    return `
      <div class="palette-card" data-hex="${hex}" title="Click to copy ${hex}">
        <div class="swatch" style="background:${hex}"></div>
        <div class="meta"><div class="name">${name}</div>${hex}<br>hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)</div>
      </div>
    `;
  }).join('');
  $('paletteGrid').querySelectorAll('.palette-card').forEach(card => {
    card.addEventListener('click', () => copyText(card.dataset.hex, null));
  });

  const white = '#ffffff', black = '#000000';
  $('contrastTable').innerHTML = `
    <tr><th>Colour</th><th>vs White</th><th>vs Black</th></tr>
    ${entries.map(([name, hex]) => {
      const rw = contrastRatio(hex, white), rb = contrastRatio(hex, black);
      return `<tr><td><span class="color-swatch" style="width:16px;height:16px;display:inline-block;vertical-align:middle;background:${hex}"></span> ${name}</td>
        <td>${rw.toFixed(2)} (${wcagBadge(rw)})</td>
        <td>${rb.toFixed(2)} (${wcagBadge(rb)})</td></tr>`;
    }).join('')}
  `;
  renderExport();
}

function renderExport() {
  if (!currentPalette) return;
  const entries = Object.entries(currentPalette);
  let text = '';
  if (currentFormat === 'css') {
    text = ':root {\n' + entries.map(([n, h]) => `  --color-${n}: ${h};`).join('\n') + '\n}';
  } else if (currentFormat === 'tailwind') {
    text = 'colors: {\n' + entries.map(([n, h]) => `  '${n}': '${h}',`).join('\n') + '\n}';
  } else {
    text = entries.map(([n, h]) => {
      const hsl = hexToHSL(h);
      return `${n}: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }).join('\n');
  }
  $('exportOutput').textContent = text;
}

function setBase(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  $('baseColorPicker').value = hex;
  $('baseHex').value = hex;
  renderPalette(hex);
}

$('baseColorPicker').addEventListener('input', () => setBase($('baseColorPicker').value));
$('baseHex').addEventListener('change', () => setBase($('baseHex').value));
$('randomize').addEventListener('click', () => {
  const hex = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  setBase(hex);
});
$('exportTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fmt]');
  if (!btn) return;
  $('exportTabs').querySelectorAll('.ts-segment-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFormat = btn.dataset.fmt;
  renderExport();
});
$('copyExport').addEventListener('click', () => copyText($('exportOutput').textContent, $('copyExport')));

setBase('#4E8FC4');
