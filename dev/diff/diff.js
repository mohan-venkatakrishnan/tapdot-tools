// DiffCheck — line-based LCS diff, unified view

const $ = (id) => document.getElementById(id);

// Classic LCS-based line diff. Returns ops: {type: 'same'|'add'|'del', line}.
function diffLines(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  const n = A.length, m = B.length;
  // LCS table (fine for typical pasted documents; cap to keep memory sane)
  if (n * m > 4_000_000) return null;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push({ type: 'same', line: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', line: A[i] }); i++; }
    else { ops.push({ type: 'add', line: B[j] }); j++; }
  }
  while (i < n) { ops.push({ type: 'del', line: A[i] }); i++; }
  while (j < m) { ops.push({ type: 'add', line: B[j] }); j++; }
  return ops;
}

let diffTimer = null;
let blockCount = 0, currentBlock = -1;

function render() {
  const left = $('left').value, right = $('right').value;
  blockCount = 0; currentBlock = -1;
  updateNav();
  if (!left && !right) { $('diffOut').innerHTML = '<span class="dev-muted">Paste text on both sides to compare.</span>'; $('diffStats').textContent = ''; return; }
  const ops = diffLines(left, right);
  if (!ops) { $('diffOut').innerHTML = '<span class="dev-muted">Too large to diff in the browser — try smaller sections.</span>'; return; }
  let add = 0, del = 0, inBlock = false;
  $('diffOut').innerHTML = ops.map(op => {
    const changed = op.type !== 'same';
    // The first changed line after a run of unchanged lines starts a new block.
    let anchor = '';
    if (changed && !inBlock) { anchor = ` data-block="${blockCount}"`; blockCount++; }
    inBlock = changed;
    if (op.type === 'add') { add++; return `<div class="diff-add"${anchor}>+ ${escapeHtml(op.line)}</div>`; }
    if (op.type === 'del') { del++; return `<div class="diff-del"${anchor}>− ${escapeHtml(op.line)}</div>`; }
    return `<div class="diff-same">  ${escapeHtml(op.line)}</div>`;
  }).join('');
  $('diffStats').textContent = add + del === 0 ? 'Identical' : `+${add} −${del}`;
  $('diffStats').className = 'dev-badge ' + (add + del === 0 ? 'ok' : '');
  updateNav();
}

function updateNav() {
  $('diffPos').textContent = blockCount ? `${currentBlock + 1 > 0 ? currentBlock + 1 : '–'} / ${blockCount} changes` : '';
  $('prevDiff').disabled = blockCount === 0;
  $('nextDiff').disabled = blockCount === 0;
}

function jumpTo(idx) {
  if (!blockCount) return;
  currentBlock = ((idx % blockCount) + blockCount) % blockCount;
  const el = $('diffOut').querySelector(`[data-block="${currentBlock}"]`);
  if (!el) return;
  document.querySelectorAll('.diff-current').forEach(x => x.classList.remove('diff-current'));
  el.classList.add('diff-current');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  updateNav();
}
$('nextDiff').addEventListener('click', () => jumpTo(currentBlock + 1));
$('prevDiff').addEventListener('click', () => jumpTo(currentBlock - 1));

['left', 'right'].forEach(id => $(id).addEventListener('input', () => {
  clearTimeout(diffTimer);
  diffTimer = setTimeout(render, 250);
}));
render();
