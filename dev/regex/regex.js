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
};
$('presets').addEventListener('change', () => {
  const preset = PRESETS[$('presets').value];
  if (!preset) return;
  $('pattern').value = preset.p;
  $('test').value = preset.t;
  render();
});

$('flags').addEventListener('click', (e) => { const f = e.target.closest('.rx-flag'); if (f) { f.classList.toggle('on'); render(); } });
$('pattern').addEventListener('input', render);
$('test').addEventListener('input', render);
$('replace').addEventListener('input', render);
render();
