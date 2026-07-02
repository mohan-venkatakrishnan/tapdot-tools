// HTMLPreview — render raw HTML in a sandboxed iframe (srcdoc)

const $ = (id) => document.getElementById(id);
const WIDTHS = { desktop: '100%', tablet: '768px', mobile: '375px' };

function render() {
  const frame = $('frame');
  frame.srcdoc = $('input').value;
}
function setDevice() {
  const frame = $('frame');
  const d = $('device').value;
  frame.style.width = WIDTHS[d];
  frame.style.margin = d === 'desktop' ? '0' : '0 auto';
}

$('input').addEventListener('input', render);
$('device').addEventListener('change', setDevice);
$('copyHtml').addEventListener('click', (e) => copyText($('input').value, e.target));
$('dl').addEventListener('click', () => {
  const blob = new Blob([$('input').value], { type: 'text/html' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'page.html'; a.click(); URL.revokeObjectURL(a.href);
});

$('input').value = '<h1>Hello from HTMLPreview</h1>\n<p>Edit the HTML on the left — this renders in a sandboxed frame.</p>';
setDevice();
render();
