// PassHash — bcrypt / Argon2id hashing + verification via hash-wasm (real
// WebAssembly builds of the reference C implementations, vendored locally).

const $ = (id) => document.getElementById(id);
let mode = 'hash';

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

async function doHash() {
  const password = $('password').value;
  const algo = $('algo').value;
  const result = $('result'), timing = $('timing');
  if (!password) { result.textContent = 'Type a password first.'; return; }
  $('runBtn').disabled = true;
  result.textContent = 'Hashing… (Argon2 at higher memory can take a few seconds)';
  timing.textContent = '';
  const t0 = performance.now();
  try {
    let hash;
    if (algo === 'bcrypt') {
      const cost = Math.min(14, Math.max(4, parseInt($('bcryptCost').value, 10) || 10));
      hash = await hashwasm.bcrypt({ password, salt: randomBytes(16), costFactor: cost, outputType: 'encoded' });
    } else {
      const iterations = Math.min(10, Math.max(1, parseInt($('argonIter').value, 10) || 3));
      const memorySize = Math.min(262144, Math.max(8, parseInt($('argonMem').value, 10) || 19)) * 1024;
      hash = await hashwasm.argon2id({
        password, salt: randomBytes(16), parallelism: 1, iterations, memorySize,
        hashLength: 32, outputType: 'encoded',
      });
    }
    result.textContent = hash;
    $('copyOut').classList.remove('ts-hidden');
    timing.textContent = `${(performance.now() - t0).toFixed(0)}ms`;
  } catch (e) {
    result.textContent = 'Error: ' + e.message;
  } finally {
    $('runBtn').disabled = false;
  }
}

async function doVerify() {
  const password = $('password').value;
  const hash = $('existingHash').value.trim();
  const result = $('result'), timing = $('timing');
  if (!password || !hash) { result.textContent = 'Enter both a password and a hash to check it against.'; return; }
  $('runBtn').disabled = true;
  result.textContent = 'Verifying…';
  const t0 = performance.now();
  try {
    const isArgon2 = hash.startsWith('$argon2');
    const isBcrypt = /^\$2[aby]?\$/.test(hash);
    if (!isArgon2 && !isBcrypt) throw new Error('Doesn\'t look like a bcrypt ($2a/$2b/$2y$…) or Argon2 ($argon2id$…) hash.');
    const ok = isArgon2
      ? await hashwasm.argon2Verify({ password, hash })
      : await hashwasm.bcryptVerify({ password, hash });
    result.innerHTML = ok
      ? '<span class="ts-text-success">✓ Match — this password produces the given hash.</span>'
      : '<span class="ts-text-danger">✗ No match.</span>';
    timing.textContent = `${(performance.now() - t0).toFixed(0)}ms`;
  } catch (e) {
    result.textContent = 'Error: ' + e.message;
  } finally {
    $('runBtn').disabled = false;
  }
}

$('algo').addEventListener('change', () => {
  const isArgon = $('algo').value === 'argon2id';
  $('bcryptParams').classList.toggle('ts-hidden', isArgon);
  $('argonParams').classList.toggle('ts-hidden', !isArgon);
});

$('modeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-pill-tab');
  if (!b) return;
  $('modeTabs').querySelectorAll('.ts-pill-tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  $('verifyPane').classList.toggle('ts-hidden', mode !== 'verify');
  $('runBtn').textContent = mode === 'verify' ? 'Verify' : 'Hash it';
  $('result').textContent = '';
  $('copyOut').classList.add('ts-hidden');
});

$('runBtn').addEventListener('click', () => mode === 'verify' ? doVerify() : doHash());
$('copyOut').addEventListener('click', (e) => copyText($('result').textContent, e.target));
