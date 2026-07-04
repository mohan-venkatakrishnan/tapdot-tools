// PhotoTune — fully local canvas photo editor: filters, rotate, flip, resize, export

const $ = (id) => document.getElementById(id);
const canvas = $('photoCanvas');
const ctx = canvas.getContext('2d');

let img = null;          // the source ImageBitmap/Image
let rotation = 0;        // 0/90/180/270
let flipX = 1, flipY = 1;

function filterString() {
  return `brightness(${$('bright').value}%) contrast(${$('contrast').value}%) saturate(${$('sat').value}%) sepia(${$('sepia').value}%) blur(${$('blur').value}px)`;
}

function draw() {
  if (!img) return;
  const rotated = rotation % 180 !== 0;
  const w = rotated ? img.height : img.width;
  const h = rotated ? img.width : img.height;
  // Display at most 900px wide for performance; export uses full res.
  const scale = Math.min(1, 900 / w);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  renderTo(ctx, canvas.width, canvas.height);
  $('vBright').textContent = $('bright').value + '%';
  $('vContrast').textContent = $('contrast').value + '%';
  $('vSat').textContent = $('sat').value + '%';
  $('vSepia').textContent = $('sepia').value + '%';
  $('vBlur').textContent = $('blur').value + 'px';
  $('photoInfo').textContent = `${img.width}×${img.height} source · edited locally`;
}

function renderTo(c, outW, outH) {
  c.save();
  c.filter = filterString();
  c.translate(outW / 2, outH / 2);
  c.rotate(rotation * Math.PI / 180);
  c.scale(flipX, flipY);
  const rotated = rotation % 180 !== 0;
  const dw = rotated ? outH : outW;
  const dh = rotated ? outW : outH;
  c.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  c.restore();
}

$('loadBtn').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    img = image;
    rotation = 0; flipX = 1; flipY = 1;
    $('controls').classList.remove('ts-hidden');
    $('maxW').value = img.width;
    draw();
    URL.revokeObjectURL(url);
  };
  image.src = url;
});

['bright', 'contrast', 'sat', 'sepia', 'blur'].forEach(id => $(id).addEventListener('input', draw));
$('rotBtn').addEventListener('click', () => { rotation = (rotation + 90) % 360; draw(); });
$('flipH').addEventListener('click', () => { flipX *= -1; draw(); });
$('flipV').addEventListener('click', () => { flipY *= -1; draw(); });
$('resetBtn').addEventListener('click', () => {
  rotation = 0; flipX = 1; flipY = 1;
  ['bright', 'contrast', 'sat'].forEach(id => $(id).value = 100);
  $('sepia').value = 0; $('blur').value = 0;
  draw();
});

$('exportBtn').addEventListener('click', () => {
  if (!img) return;
  const rotated = rotation % 180 !== 0;
  const srcW = rotated ? img.height : img.width;
  const srcH = rotated ? img.width : img.height;
  const targetW = Math.min(parseInt($('maxW').value, 10) || srcW, srcW);
  const targetH = Math.round(srcH * (targetW / srcW));
  const out = document.createElement('canvas');
  out.width = targetW; out.height = targetH;
  renderTo(out.getContext('2d'), targetW, targetH);
  const fmt = $('expFmt').value;
  const a = document.createElement('a');
  a.href = out.toDataURL('image/' + fmt, 0.92);
  a.download = 'phototune.' + (fmt === 'jpeg' ? 'jpg' : 'png');
  a.click();
});
