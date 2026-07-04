// SketchPad — element-based local whiteboard (pen/line/arrow/rect/ellipse/text),
// undo, PNG export, localStorage autosave.

const $ = (id) => document.getElementById(id);
const LS = 'tapdot-sketchpad';
const canvas = $('skCanvas');
const ctx = canvas.getContext('2d');

let elements = [];
let tool = 'pen';
let drawing = null; // element under construction
let saveTimer = null;

function load() {
  try { elements = JSON.parse(localStorage.getItem(LS)) || []; } catch { elements = []; }
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem(LS, JSON.stringify(elements)), 500);
}

function drawArrowHead(x1, y1, x2, y2, width) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 10 + width * 2;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(angle - 0.45), y2 - len * Math.sin(angle - 0.45));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(angle + 0.45), y2 - len * Math.sin(angle + 0.45));
  ctx.stroke();
}

function drawElement(el) {
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (el.type === 'pen') {
    if (el.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(el.points[0][0], el.points[0][1]);
    el.points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();
  } else if (el.type === 'line' || el.type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(el.x1, el.y1);
    ctx.lineTo(el.x2, el.y2);
    ctx.stroke();
    if (el.type === 'arrow') drawArrowHead(el.x1, el.y1, el.x2, el.y2, el.width);
  } else if (el.type === 'rect') {
    ctx.strokeRect(Math.min(el.x1, el.x2), Math.min(el.y1, el.y2), Math.abs(el.x2 - el.x1), Math.abs(el.y2 - el.y1));
  } else if (el.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse((el.x1 + el.x2) / 2, (el.y1 + el.y2) / 2, Math.abs(el.x2 - el.x1) / 2, Math.abs(el.y2 - el.y1) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (el.type === 'text') {
    ctx.font = `${14 + el.width * 3}px Inter, sans-serif`;
    ctx.fillText(el.text, el.x1, el.y1);
  }
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  elements.forEach(drawElement);
  if (drawing) drawElement(drawing);
}

function pos(e) {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width / r.width, scaleY = canvas.height / r.height;
  const src = e.touches ? e.touches[0] : e;
  return [(src.clientX - r.left) * scaleX, (src.clientY - r.top) * scaleY];
}

function startDraw(e) {
  const [x, y] = pos(e);
  const color = $('skColor').value, width = parseInt($('skWidth').value, 10);
  if (tool === 'text') {
    const text = prompt('Text:');
    if (text) { elements.push({ type: 'text', x1: x, y1: y, text, color, width }); save(); redraw(); }
    return;
  }
  drawing = tool === 'pen'
    ? { type: 'pen', points: [[x, y]], color, width }
    : { type: tool, x1: x, y1: y, x2: x, y2: y, color, width };
  e.preventDefault();
}
function moveDraw(e) {
  if (!drawing) return;
  const [x, y] = pos(e);
  if (drawing.type === 'pen') drawing.points.push([x, y]);
  else { drawing.x2 = x; drawing.y2 = y; }
  redraw();
  e.preventDefault();
}
function endDraw() {
  if (!drawing) return;
  elements.push(drawing);
  drawing = null;
  save();
  redraw();
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', moveDraw);
window.addEventListener('mouseup', endDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', moveDraw, { passive: false });
canvas.addEventListener('touchend', endDraw);

$('toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('.sk-tool');
  if (!b) return;
  document.querySelectorAll('.sk-tool').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  tool = b.dataset.tool;
});
$('skUndo').addEventListener('click', () => { elements.pop(); save(); redraw(); });
$('skClear').addEventListener('click', () => {
  if (!elements.length || confirm('Clear the whole canvas?')) { elements = []; save(); redraw(); }
});
$('skExport').addEventListener('click', () => {
  // Export on a white background so PNGs are readable anywhere.
  const out = document.createElement('canvas');
  out.width = canvas.width; out.height = canvas.height;
  const octx = out.getContext('2d');
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(canvas, 0, 0);
  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = 'sketch.png';
  a.click();
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); elements.pop(); save(); redraw(); }
});

load();
redraw();
