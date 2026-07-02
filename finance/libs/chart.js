// Minimal SVG line + area chart — no chart library, pure JS.
// renderLineChart(svgEl, points, opts) — points: array of numbers (y-values).

function renderLineChart(svg, points, opts = {}) {
  const W = 600, H = 200, pad = 8;
  if (!points.length) { svg.innerHTML = ''; return; }
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const stepX = (W - pad * 2) / Math.max(1, points.length - 1);
  const xy = points.map((v, i) => [pad + i * stepX, H - pad - ((v - min) / range) * (H - pad * 2)]);
  const linePath = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${xy[xy.length - 1][0].toFixed(1)},${H - pad} L${xy[0][0].toFixed(1)},${H - pad} Z`;
  const gradId = 'grad_' + Math.random().toString(36).slice(2, 9);

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--grad-a)" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="var(--grad-a)" stop-opacity="0"/>
    </linearGradient></defs>
    <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" class="biz-chart-axis"/>
    <path d="${areaPath}" fill="url(#${gradId})"/>
    <path d="${linePath}" class="biz-chart-line"/>
    ${xy.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" class="biz-chart-dot"/>`).join('')}
  `;
}
