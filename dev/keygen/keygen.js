// KeyGen — RSA/ECDSA keypair generation via WebCrypto, PEM export

const $ = (id) => document.getElementById(id);

const SPECS = {
  'rsa-2048': { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  'rsa-4096': { name: 'RSASSA-PKCS1-v1_5', modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  'ec-p256': { name: 'ECDSA', namedCurve: 'P-256' },
  'ec-p384': { name: 'ECDSA', namedCurve: 'P-384' },
};

function derToPem(buf, label) {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const lines = b64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

$('genBtn').addEventListener('click', async () => {
  const spec = SPECS[$('keyType').value];
  const status = $('status');
  $('genBtn').disabled = true;
  status.textContent = 'Generating…';
  try {
    const pair = await crypto.subtle.generateKey(spec, true, ['sign', 'verify']);
    const [priv, pub] = await Promise.all([
      crypto.subtle.exportKey('pkcs8', pair.privateKey),
      crypto.subtle.exportKey('spki', pair.publicKey),
    ]);
    $('privOut').textContent = derToPem(priv, 'PRIVATE KEY');
    $('pubOut').textContent = derToPem(pub, 'PUBLIC KEY');
    status.textContent = `Generated a ${$('keyType').selectedOptions[0].textContent} keypair locally.`;
  } catch (e) {
    status.textContent = 'Failed: ' + e.message;
  } finally {
    $('genBtn').disabled = false;
  }
});

$('copyPriv').addEventListener('click', (e) => copyText($('privOut').textContent, e.target));
$('copyPub').addEventListener('click', (e) => copyText($('pubOut').textContent, e.target));

$('genBtn').click();
