// BigOCheck — structural time-complexity estimate + optional on-device AI explanation

const $ = (id) => document.getElementById(id);

// Heuristic analysis: loop nesting depth, halving loops (log n), recursion,
// known costly built-ins.
function analyze(code) {
  const reasons = [];
  const lines = code.split('\n');

  // Track loop nesting via brace/indent-agnostic scan: count loop keywords and
  // their nesting using a simple brace stack for C-like, indent for Python-like.
  const loopRe = /\b(for|while)\b/;
  let maxDepth = 0;
  // Brace-based pass
  {
    let depthStack = [], braceDepth = 0;
    for (const raw of lines) {
      const line = raw.replace(/\/\/.*|#.*/g, '');
      if (loopRe.test(line)) {
        depthStack.push(braceDepth);
        const loopDepth = depthStack.filter(d => d <= braceDepth).length;
        maxDepth = Math.max(maxDepth, loopDepth);
      }
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') { braceDepth--; depthStack = depthStack.filter(d => d < braceDepth + 1); }
      }
    }
  }
  // Indent-based pass (Python) — take the max of the two.
  {
    const loopIndents = [];
    let maxIndentDepth = 0;
    for (const raw of lines) {
      const line = raw.replace(/#.*/g, '');
      if (!line.trim()) continue;
      const indent = line.match(/^\s*/)[0].length;
      while (loopIndents.length && indent <= loopIndents[loopIndents.length - 1]) loopIndents.pop();
      if (loopRe.test(line)) {
        loopIndents.push(indent);
        maxIndentDepth = Math.max(maxIndentDepth, loopIndents.length);
      }
    }
    maxDepth = Math.max(maxDepth, maxIndentDepth);
  }

  // Halving/doubling loops → logarithmic
  const logLoop = /(\/\s*=\s*2|>>=\s*1|\*\s*=\s*2|\/=2|mid|\bbinary\b)/i.test(code) &&
    /\b(while|for)\b/.test(code);

  // Recursion: function name called inside its own body
  let recursive = false, divideConquer = false;
  const fnRe = /(?:function\s+(\w+)|def\s+(\w+)|(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g;
  let fm;
  while ((fm = fnRe.exec(code)) !== null) {
    const name = fm[1] || fm[2] || fm[3];
    if (!name) continue;
    const body = code.slice(fm.index + fm[0].length);
    const calls = (body.match(new RegExp('\\b' + name + '\\s*\\(', 'g')) || []).length;
    if (calls >= 1) {
      recursive = true;
      if (calls >= 2) divideConquer = true;
    }
  }

  // Known costly built-ins inside loops
  const sortUsed = /\.(sort|sorted)\s*\(|sorted\s*\(/.test(code);
  const linearInLoop = maxDepth >= 1 && /\.(includes|indexOf|find|filter|slice|splice)\s*\(/.test(code);

  // Verdict
  let time, notes = [];
  if (divideConquer && maxDepth >= 1) { time = 'O(n log n)'; notes.push('Recursion splits the input more than once AND loops over it — the merge-sort shape.'); }
  else if (divideConquer) { time = 'O(n log n) — or O(2ⁿ) if both calls take the full input (e.g. naive fibonacci)'; notes.push('Two or more recursive calls detected; the exact class depends on how the input shrinks.'); }
  else if (recursive && logLoop) { time = 'O(log n)'; notes.push('Single recursion on a halved input — binary-search shape.'); }
  else if (recursive) { time = 'O(n)'; notes.push('Single self-recursive call — linear recursion depth.'); }
  else if (maxDepth >= 3) { time = `O(n^${maxDepth})`; notes.push(`${maxDepth} nested loops over the input.`); }
  else if (maxDepth === 2) { time = 'O(n²)'; notes.push('Two nested loops over the input.'); }
  else if (maxDepth === 1 && logLoop) { time = 'O(log n)'; notes.push('The loop halves/doubles its counter instead of stepping by 1.'); }
  else if (maxDepth === 1) { time = linearInLoop ? 'O(n²)' : 'O(n)'; notes.push(linearInLoop ? 'One loop, but a linear built-in (includes/indexOf/filter/slice) runs inside it.' : 'A single pass over the input.'); }
  else if (sortUsed) { time = 'O(n log n)'; notes.push('No explicit loops, but sort() dominates.'); }
  else { time = 'O(1)'; notes.push('No loops or recursion detected — constant work.'); }

  if (sortUsed && maxDepth >= 1) notes.push('sort() inside/alongside loops adds an O(n log n) factor.');

  const space = recursive ? 'O(n) call stack (O(log n) if the input halves)' :
    /\bnew Array|\[\]|\{\}|dict\(|list\(|map\(|set\(/i.test(code) ? 'O(n) — new collections are built' : 'O(1)';

  return { time, space, notes };
}

function render() {
  const code = $('code').value;
  if (!code.trim()) { $('timeC').textContent = '—'; $('spaceC').textContent = '—'; $('reasons').textContent = ''; return; }
  const { time, space, notes } = analyze(code);
  $('timeC').textContent = time;
  $('spaceC').textContent = space;
  $('reasons').textContent = notes.map(n => '• ' + n).join('\n');
}

$('code').addEventListener('input', render);

$('aiBtn').addEventListener('click', async () => {
  const code = $('code').value.trim();
  const status = $('aiStatus');
  if (!code) { status.textContent = 'Paste some code first.'; return; }
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    status.textContent = 'On-device AI unavailable — the structural estimate above still works without it.';
    return;
  }
  $('aiBtn').disabled = true;
  status.textContent = 'Analyzing…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(
      `Analyze the time and space complexity of this code. State the Big-O time complexity, then explain in 3-4 short sentences why, mentioning the dominant operation. Code:\n\n${code.slice(0, 4000)}`);
    if (session.destroy) session.destroy();
    $('reasons').textContent = raw.trim();
    status.textContent = 'Explained with on-device AI — cross-check against the structural estimate.';
  } catch (e) {
    status.textContent = 'AI error — structural estimate above still stands.';
  } finally {
    $('aiBtn').disabled = false;
  }
});

render();
