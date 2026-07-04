// ImageCompress — resize + recompress on a canvas, using the browser's own
// JPEG/WebP encoder (canvas.toBlob) — no WASM codec needed for this one.

const $ = (id) => document.getElementById(id);
let img = null;
let origBytes = 0;

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

$('loadBtn').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  origBytes = file.size;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    img = image;
    $('origImg').src = url;
    $('origSize').textContent = `${img.width}×${img.height} · ${fmtBytes(origBytes)}`;
    $('controls').classList.remove('ts-hidden');
    $('maxWidth').max = Math.max(img.width, 200);
    $('maxWidth').value = Math.min(img.width, 1600);
    $('vWidth').textContent = $('maxWidth').value + 'px';
    render();
  };
  image.src = url;
});

let renderTimer = null;
function schedule() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 120);
}

function render() {
  if (!img) return;
  const maxW = parseInt($('maxWidth').value, 10);
  const quality = parseInt($('quality').value, 10) / 100;
  const format = $('format').value;
  $('vWidth').textContent = maxW + 'px';
  $('vQuality').textContent = Math.round(quality * 100) + '%';
  $('quality').disabled = format === 'image/png';

  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = $('outCanvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  canvas.toBlob((blob) => {
    if (!blob) return;
    $('outSize').textContent = `${w}×${h} · ${fmtBytes(blob.size)}`;
    const pct = origBytes > 0 ? Math.round((1 - blob.size / origBytes) * 100) : 0;
    $('savings').innerHTML = pct > 0
      ? `<span class="ts-text-success">${pct}% smaller</span> than the original`
      : pct < 0
        ? `<span class="ts-text-warning">${-pct}% larger</span> than the original — try a lower quality or smaller width`
        : 'Same size as the original';
    canvas._blob = blob;
  }, format, quality);
}

['maxWidth', 'quality'].forEach(id => $(id).addEventListener('input', schedule));
$('format').addEventListener('change', render);

$('downloadBtn').addEventListener('click', () => {
  const canvas = $('outCanvas');
  if (!canvas._blob) return;
  const ext = $('format').value === 'image/webp' ? 'webp' : $('format').value === 'image/png' ? 'png' : 'jpg';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(canvas._blob);
  a.download = `compressed.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
});
