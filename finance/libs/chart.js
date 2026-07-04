// Minimal SVG line + area chart — no chart library, pure JS.
// renderLineChart(svgEl, points, opts)
//   points: array of numbers (single series, area-filled)
//   opts.series: [{ points, color }] — extra overlay lines (dashed, no area),
//     scaled on the same axis as the main series.

function renderLineChart(svg, points, opts = {}) {
  const W = 600, H = 200, pad = 8;
  if (!points.length) { svg.innerHTML = ''; return; }
  const extra = opts.series || [];
  const all = points.concat(...extra.map(s => s.points));
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const range = max - min || 1;
  const toXY = (arr) => {
    const stepX = (W - pad * 2) / Math.max(1, arr.length - 1);
    return arr.map((v, i) => [pad + i * stepX, H - pad - ((v - min) / range) * (H - pad * 2)]);
  };
  const pathOf = (xy) => xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const xy = toXY(points);
  const linePath = pathOf(xy);
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
    ${extra.map(s => `<path d="${pathOf(toXY(s.points))}" fill="none" stroke="${s.color || 'var(--color-muted)'}" stroke-width="1.5" stroke-dasharray="4 3"/>`).join('')}
    ${xy.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" class="biz-chart-dot"/>`).join('')}
    <line class="biz-chart-cursor" x1="0" y1="${pad}" x2="0" y2="${H - pad}" visibility="hidden"/>
    <circle class="biz-chart-focus" r="4.5" visibility="hidden"/>
  `;

  // ── Hover interactivity: crosshair + tooltip on the nearest point ────────
  let tip = svg.parentElement && svg.parentElement.querySelector('.biz-chart-tip');
  if (!tip && svg.parentElement) {
    tip = document.createElement('div');
    tip.className = 'biz-chart-tip';
    tip.hidden = true;
    svg.parentElement.style.position = svg.parentElement.style.position || 'relative';
    svg.parentElement.appendChild(tip);
  }
  const fmtVal = opts.format || ((v) => (typeof tapdotMoney !== 'undefined' ? tapdotMoney.fmt(v) : Math.round(v).toLocaleString()));
  const label = opts.label || ((i) => `#${i}`);
  const cursor = svg.querySelector('.biz-chart-cursor');
  const focus = svg.querySelector('.biz-chart-focus');

  svg.onmousemove = (e) => {
    if (!tip) return;
    const rect = svg.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width * W;
    const stepX = (W - pad * 2) / Math.max(1, points.length - 1);
    const i = Math.max(0, Math.min(points.length - 1, Math.round((relX - pad) / stepX)));
    const [px, py] = xy[i];
    cursor.setAttribute('x1', px); cursor.setAttribute('x2', px);
    cursor.setAttribute('visibility', 'visible');
    focus.setAttribute('cx', px); focus.setAttribute('cy', py);
    focus.setAttribute('visibility', 'visible');
    const extras = extra.map(s => `<span class="biz-chart-tip-extra">${fmtVal(s.points[i] ?? 0)}</span>`).join('');
    tip.innerHTML = `<b>${label(i)}</b> ${fmtVal(points[i])}${extras}`;
    tip.hidden = false;
    const tipX = px / W * rect.width;
    tip.style.left = Math.max(60, Math.min(rect.width - 60, tipX)) + 'px';
    tip.style.top = (py / H * rect.height - 12) + 'px';
  };
  svg.onmouseleave = () => {
    if (tip) tip.hidden = true;
    cursor.setAttribute('visibility', 'hidden');
    focus.setAttribute('visibility', 'hidden');
  };
}
