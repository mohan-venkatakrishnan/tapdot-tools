// RegexLab — live regex tester (native RegExp)

const $ = (id) => document.getElementById(id);

function currentFlags() {
  return [...document.querySelectorAll('#flags .rx-flag.on')].map(f => f.dataset.f).join('');
}

function runRegex(pattern, flags, testStr) {
  try {
    const re = new RegExp(pattern, flags);
    const matches = [];
    if (flags.includes('g')) {
      let m;
      while ((m = re.exec(testStr)) !== null) {
        matches.push({ full: m[0], index: m.index, end: m.index + m[0].length, groups: m.slice(1), named: m.groups || {} });
        if (m[0].length === 0) re.lastIndex++;
      }
    } else {
      const m = re.exec(testStr);
      if (m) matches.push({ full: m[0], index: m.index, end: m.index + m[0].length, groups: m.slice(1), named: m.groups || {} });
    }
    return { ok: true, matches };
  } catch (e) { return { ok: false, error: e.message }; }
}

function highlightMatches(testStr, matches) {
  if (!matches.length) return escapeHtml(testStr);
  let result = '', last = 0;
  for (const m of matches) {
    result += escapeHtml(testStr.slice(last, m.index));
    result += `<mark class="ts-match">${escapeHtml(testStr.slice(m.index, m.end))}</mark>`;
    last = m.end;
  }
  return result + escapeHtml(testStr.slice(last));
}

function render() {
  const pattern = $('pattern').value;
  const flags = currentFlags();
  const testStr = $('test').value;
  const err = $('err');
  if (!pattern) { $('highlight').innerHTML = escapeHtml(testStr); $('matches').innerHTML = ''; $('count').textContent = '0 matches'; err.textContent = ''; $('replaced').textContent = ''; return; }

  const res = runRegex(pattern, flags, testStr);
  if (!res.ok) {
    err.textContent = res.error;
    $('count').textContent = 'error';
    $('highlight').innerHTML = escapeHtml(testStr);
    $('matches').innerHTML = ''; $('replaced').textContent = '';
    return;
  }
  err.textContent = '';
  $('count').textContent = `${res.matches.length} match${res.matches.length === 1 ? '' : 'es'}`;
  $('highlight').innerHTML = highlightMatches(testStr, res.matches);

  $('matches').innerHTML = res.matches.length
    ? res.matches.map((m, i) => {
        const groups = m.groups.map((g, gi) => `<span class="ts-json-num">[${gi + 1}]</span> ${escapeHtml(String(g))}`).join('  ');
        const named = Object.entries(m.named).map(([k, v]) => `<span class="ts-json-key">${escapeHtml(k)}</span>: ${escapeHtml(String(v))}`).join('  ');
        return `<div>Match ${i + 1}: <span class="ts-json-str">"${escapeHtml(m.full)}"</span> at ${m.index}–${m.end}${groups ? '  ' + groups : ''}${named ? '  ' + named : ''}</div>`;
      }).join('')
    : '<span class="dev-muted">No matches.</span>';

  // Replace preview
  const rep = $('replace').value;
  if (rep) {
    try { $('replaced').textContent = testStr.replace(new RegExp(pattern, flags), rep); }
    catch (e) { $('replaced').textContent = ''; }
  } else $('replaced').textContent = '';
}

$('flags').addEventListener('click', (e) => { const f = e.target.closest('.rx-flag'); if (f) { f.classList.toggle('on'); render(); } });
$('pattern').addEventListener('input', render);
$('test').addEventListener('input', render);
$('replace').addEventListener('input', render);
render();
