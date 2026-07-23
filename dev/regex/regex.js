// RegexLab — live regex tester (native RegExp)

const $ = (id) => document.getElementById(id);

function currentFlags() {
  return [...document.querySelectorAll('#flags .rx-flag.on')].map(f => f.dataset.f).join('');
}

function runRegex(pattern, flags, testStr) {
  try {
    const re = new RegExp(pattern, flags);
    const matches = [];
    const t0 = performance.now();
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
    return { ok: true, matches, ms: performance.now() - t0 };
  } catch (e) { return { ok: false, error: e.message }; }
}

// A nested quantifier — (a+)+ , (\w*)* , (?:\d+)+ — is the classic shape behind
// catastrophic backtracking: the engine can try exponentially many ways to
// split the same text. Flagged as a warning, not an error; plenty of patterns
// with this shape are fine in practice, it depends on the input.
function backtrackRisk(parsed) {
  let risky = null;
  (function walk(node, insideRepeat) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'repeat') {
      const unbounded = node.max === Infinity || node.max > 1;
      if (insideRepeat && unbounded && !risky) risky = true;
      walk(node.child, insideRepeat || unbounded);
      return;
    }
    if (node.type === 'seq') node.items.forEach(n => walk(n, insideRepeat));
    else if (node.type === 'alt') node.options.forEach(n => walk(n, insideRepeat));
    else if (node.type === 'group') walk(node.child, insideRepeat);
  })(parsed.ast, false);
  return risky;
}

// Explanation + railroad diagram, both driven by the same hand-rolled AST
// (dev/libs/regex-ast.js). The browser has already accepted the pattern by the
// time we get here — a parser hiccup must never blank the working tester, so
// both panels fail soft.
function renderAnalysis(pattern) {
  try {
    const parsed = rxParse(pattern);

    $('explain').innerHTML = rxExplain(parsed).map(r =>
      `<div class="rx-ex-row" style="--d:${r.depth}">
         <code class="rx-ex-code">${escapeHtml(r.code)}</code>
         <span class="rx-ex-text">${escapeHtml(r.text)}</span>
       </div>`).join('');

    $('diagram').innerHTML = rxRailroad(parsed);

    const groups = parsed.groupCount;
    $('exMeta').textContent = groups
      ? `${groups} capture group${groups === 1 ? '' : 's'} — available as $1…$${groups} in the replacement`
      : 'No capture groups — add ( ) around a part of the pattern to capture it.';

    $('warn').textContent = backtrackRisk(parsed)
      ? '⚠ Nested quantifier detected (a quantifier inside another). On some inputs this can backtrack catastrophically and hang the engine — test with a long non-matching string before shipping it.'
      : '';
  } catch (e) {
    $('explain').innerHTML = '<span class="dev-muted">Could not break this pattern down.</span>';
    $('diagram').innerHTML = '';
    $('exMeta').textContent = '';
    $('warn').textContent = '';
  }
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
  if (!pattern) {
    $('highlight').innerHTML = escapeHtml(testStr);
    $('matches').innerHTML = ''; $('count').textContent = '0 matches'; err.textContent = ''; $('replaced').textContent = '';
    $('explain').innerHTML = ''; $('diagram').innerHTML = ''; $('exMeta').textContent = ''; $('warn').textContent = '';
    $('timing').textContent = '';
    return;
  }

  const res = runRegex(pattern, flags, testStr);
  if (!res.ok) {
    err.textContent = res.error;
    $('count').textContent = 'error';
    $('highlight').innerHTML = escapeHtml(testStr);
    $('matches').innerHTML = ''; $('replaced').textContent = ''; $('timing').textContent = '';
    // The pattern is invalid as a whole, but the parser is tolerant enough to
    // still show what it *does* understand — often that's what reveals the typo.
    renderAnalysis(pattern);
    return;
  }
  err.textContent = '';
  $('count').textContent = `${res.matches.length} match${res.matches.length === 1 ? '' : 'es'}`;
  $('timing').textContent = `matched in ${res.ms.toFixed(2)} ms`;
  $('highlight').innerHTML = highlightMatches(testStr, res.matches);
  renderAnalysis(pattern);

  // Match table — one row per match, with every capture group broken out, the
  // way regex101's match-information panel does it.
  $('matches').innerHTML = res.matches.length
    ? `<table class="ts-table rx-match-table"><thead><tr>
         <th>#</th><th>Match</th><th>Range</th><th>Groups</th>
       </tr></thead><tbody>` +
      res.matches.map((m, i) => {
        const cells = [
          ...m.groups.map((g, gi) => `<span class="rx-g-name">${gi + 1}</span><span class="rx-g-val">${g === undefined ? '<em>undefined</em>' : escapeHtml(String(g))}</span>`),
          ...Object.entries(m.named).map(([k, v]) => `<span class="rx-g-name">${escapeHtml(k)}</span><span class="rx-g-val">${v === undefined ? '<em>undefined</em>' : escapeHtml(String(v))}</span>`),
        ];
        return `<tr>
          <td>${i + 1}</td>
          <td><span class="ts-json-str">${escapeHtml(m.full) || '<em>(empty)</em>'}</span></td>
          <td class="dev-muted">${m.index}–${m.end}</td>
          <td>${cells.length ? `<div class="rx-groups">${cells.map(c => `<span class="rx-g">${c}</span>`).join('')}</div>` : '<span class="dev-muted">—</span>'}</td>
        </tr>`;
      }).join('') + '</tbody></table>'
    : '<span class="dev-muted">No matches.</span>';

  // Replace preview
  const rep = $('replace').value;
  if (rep) {
    try { $('replaced').textContent = testStr.replace(new RegExp(pattern, flags), rep); }
    catch (e) { $('replaced').textContent = ''; }
  } else $('replaced').textContent = '';
}

// Common patterns with sample test strings so the preset "just works".
const PRESETS = {
  email: { p: '[\\w.+-]+@[\\w-]+\\.[\\w.]+', t: 'Contact us: sales@example.com or support+tickets@sub.example.co.uk — not this: foo@bar' },
  url: { p: 'https?:\\/\\/[\\w.-]+(?:\\/[\\w\\/._~:?#\\[\\]@!$&\'()*+,;=%-]*)?', t: 'Docs at https://example.com/docs?page=2 and http://sub.test.org/path — but not ftp://old.example.com' },
  ipv4: { p: '\\b(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\b', t: 'Servers: 192.168.1.1, 10.0.0.255, and 8.8.8.8 — invalid: 999.1.1.1' },
  date: { p: '\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b', t: 'Deployed 2026-07-03, next release 2026-12-01. Bad date: 2026-13-45' },
  time: { p: '\\b(?:[01]\\d|2[0-3]):[0-5]\\d\\b', t: 'Standup at 09:30, demo at 14:00, party at 23:59 — not 25:00' },
  uuid: { p: '\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b', t: 'id: 550e8400-e29b-41d4-a716-446655440000 trace: f47ac10b-58cc-4372-a567-0e02b2c3d479' },
  hexcolor: { p: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b', t: 'Brand colours: #4E8FC4, #fff, and #8A5CD6 — not #GGGGGG' },
  phone: { p: '\\+?\\d{1,3}[\\s-]?\\(?\\d{2,4}\\)?[\\s-]?\\d{3,4}[\\s-]?\\d{3,4}', t: 'Call +1 (555) 123-4567 or +44 20 7946 0958' },
  slug: { p: '\\b[a-z0-9]+(?:-[a-z0-9]+)+\\b', t: 'Posts: my-first-post and ux-pass-2026 but not My_Post' },
  semver: { p: '\\b\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?\\b', t: 'Upgrading from 1.2.3 to 2.0.0-beta.1, skipping 1.9' },
  htmltag: { p: '<(\\w+)(?:\\s[^>]*)?>(.*?)</\\1>', t: '<p class="lead">Hello there</p> and <span>inline</span> — <br/> has no closing tag' },
  querystring: { p: '[?&](?<key>[\\w-]+)=(?<value>[^&#]*)', t: '/search?q=regex&page=2&sort=new#results' },
  mdlink: { p: '\\[([^\\]]+)\\]\\(([^)]+)\\)', t: 'See the [docs](https://example.com/docs) and the [changelog](/CHANGELOG.md).' },
  dupword: { p: '\\b(\\w+)\\s+\\1\\b', t: 'This this is a common typo, and so so is that one — but not these words.' },
  logline: { p: '^\\[(?<time>[\\d:]+)\\]\\s+(?<level>ERROR|WARN|INFO)\\s+(?<msg>.*)$', t: '[09:14:02] INFO  server started on :8080\n[09:14:07] WARN  cache miss rate 42%\n[09:15:31] ERROR upstream timeout after 30s' },
  password: { p: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{8,}$', t: 'Str0ng!Pass\nweakpass\nNoDigits!Here\nAlmost1There' },
};
// A few presets are anchored per-line and only make sense with the m flag —
// setting the pattern without it would show the user a preset that "doesn't
// work", so the preset owns its flags.
const PRESET_FLAGS = { logline: 'gm', password: 'gm' };

$('presets').addEventListener('change', () => {
  const key = $('presets').value;
  const preset = PRESETS[key];
  if (!preset) return;
  $('pattern').value = preset.p;
  $('test').value = preset.t;
  const flags = PRESET_FLAGS[key] || 'g';
  document.querySelectorAll('#flags .rx-flag').forEach(f => f.classList.toggle('on', flags.includes(f.dataset.f)));
  render();
});

$('flags').addEventListener('click', (e) => { const f = e.target.closest('.rx-flag'); if (f) { f.classList.toggle('on'); render(); } });
$('pattern').addEventListener('input', render);
$('test').addEventListener('input', render);
$('replace').addEventListener('input', render);
render();
