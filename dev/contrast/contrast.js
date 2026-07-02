// ColourContrast — WCAG AA/AAA checker (pure math, local)

const $ = (id) => document.getElementById(id);

function hexToRGB(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
function relativeLuminance({ r, g, b }) {
  const toLinear = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRGB(hex1)), l2 = relativeLuminance(hexToRGB(hex2));
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}
function wcagResults(ratio) {
  const r = parseFloat(ratio);
  return { aaNormal: r >= 4.5, aaLarge: r >= 3.0, aaUI: r >= 3.0, aaaNormal: r >= 7.0, aaaLarge: r >= 4.5 };
}
function rgbToHex({ r, g, b }) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join(''); }
function suggestAccessible(fg, bg, targetRatio = 4.5) {
  const bgL = relativeLuminance(hexToRGB(bg));
  const rgb = hexToRGB(fg);
  const isDark = bgL > 0.5;
  for (let i = 0; i <= 255; i += 5) {
    const adjusted = isDark
      ? { r: rgb.r - i, g: rgb.g - i, b: rgb.b - i }
      : { r: rgb.r + i, g: rgb.g + i, b: rgb.b + i };
    const hex = rgbToHex(adjusted);
    if (parseFloat(contrastRatio(hex, bg)) >= targetRatio) return hex;
  }
  return isDark ? '#000000' : '#FFFFFF';
}

const norm = (h) => { h = h.trim(); if (!h.startsWith('#')) h = '#' + h; return h; };
const valid = (h) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h);

function update() {
  const fg = norm($('fgHex').value), bg = norm($('bgHex').value);
  if (!valid(fg) || !valid(bg)) { $('ratio').textContent = '—'; return; }
  const ratio = contrastRatio(fg, bg);
  $('ratio').textContent = ratio + ':1';
  const preview = $('preview');
  preview.style.color = fg; preview.style.background = bg;
  const w = wcagResults(ratio);
  const cell = (name, ok) =>
    `<div class="ts-stat"><span class="ts-stat-num" style="color:${ok ? 'var(--color-success)' : 'var(--color-danger)'}">${ok ? '✓' : '✗'}</span><span class="ts-stat-label">${name}</span></div>`;
  $('results').innerHTML =
    cell('AA normal', w.aaNormal) + cell('AA large', w.aaLarge) + cell('AA UI', w.aaUI) +
    cell('AAA normal', w.aaaNormal) + cell('AAA large', w.aaaLarge);
}

// Sync color <-> hex, both directions
function bind(colorId, hexId) {
  $(colorId).addEventListener('input', () => { $(hexId).value = $(colorId).value.toUpperCase(); update(); });
  $(hexId).addEventListener('input', () => { const v = norm($(hexId).value); if (valid(v)) $(colorId).value = v; update(); });
}
bind('fg', 'fgHex');
bind('bg', 'bgHex');

$('swap').addEventListener('click', () => {
  const f = $('fgHex').value; $('fgHex').value = $('bgHex').value; $('bgHex').value = f;
  const fc = $('fg').value; $('fg').value = $('bg').value; $('bg').value = fc;
  update();
});
$('suggest').addEventListener('click', () => {
  const fg = norm($('fgHex').value), bg = norm($('bgHex').value);
  if (!valid(fg) || !valid(bg)) return;
  const s = suggestAccessible(fg, bg).toUpperCase();
  $('fgHex').value = s; $('fg').value = s; update();
});

update();
