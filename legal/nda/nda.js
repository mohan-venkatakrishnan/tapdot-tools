// NDAGenerator — mutual or one-way NDA from a template

const $ = (id) => document.getElementById(id);
let ndaType = 'mutual';

$('typeTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-segment-btn'); if (!b) return;
  document.querySelectorAll('#typeTabs .ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  ndaType = b.dataset.t;
  render();
});

function fmtDate(d) {
  if (!d) return '[DATE]';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function generateNDA(f) {
  const partyA = f.partyA || '[PARTY A]';
  const partyB = f.partyB || '[PARTY B]';
  const roleLine = f.type === 'mutual'
    ? `${partyA} and ${partyB} (each a "Party" and together the "Parties") anticipate disclosing confidential information to each other.`
    : `${partyA} (the "Disclosing Party") may disclose confidential information to ${partyB} (the "Receiving Party").`;
  const obligationLine = f.type === 'mutual'
    ? 'Each Party agrees to hold in confidence and not disclose the other Party\'s Confidential Information to any third party.'
    : 'The Receiving Party agrees to hold in confidence and not disclose the Disclosing Party\'s Confidential Information to any third party.';

  return `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement (the "Agreement") is entered into as of ${fmtDate(f.date)} (the "Effective Date") by and between ${partyA} and ${partyB}.

1. PURPOSE
${roleLine}

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means ${f.scope || 'all non-public information disclosed by one Party to the other'}, whether disclosed orally, in writing, or by any other means, and designated as confidential or that reasonably should be understood to be confidential given the nature of the information.

3. OBLIGATIONS
${obligationLine} Each Party shall use the Confidential Information solely for the purpose of evaluating or pursuing the business relationship between the Parties, and shall protect it using at least the same degree of care it uses for its own confidential information, but no less than reasonable care.

4. EXCLUSIONS
Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the receiving party; (b) was rightfully known prior to disclosure; (c) is rightfully received from a third party without duty of confidentiality; or (d) is independently developed without use of the Confidential Information.

5. TERM
This Agreement shall remain in effect for ${f.duration || '[DURATION]'} years from the Effective Date, after which the confidentiality obligations shall survive with respect to Confidential Information disclosed during the term.

6. NO LICENSE
Nothing in this Agreement grants either Party any rights to the other Party's Confidential Information beyond the limited right to review such information for the stated purpose.

7. RETURN OF MATERIALS
Upon request, each Party shall promptly return or destroy all materials containing the other Party's Confidential Information.

8. NO OBLIGATION
This Agreement does not obligate either Party to disclose any information or to enter into any further business relationship.

9. GOVERNING LAW
This Agreement shall be governed by the laws of ${f.jurisdiction || '[JURISDICTION]'}, without regard to conflict of law principles.

10. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior discussions and agreements.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

${partyA}                                    ${partyB}
By: _______________________              By: _______________________
Name:                                     Name:
Title:                                    Title:`;
}

function render() {
  const fields = {
    type: ndaType,
    partyA: $('partyA').value.trim(),
    partyB: $('partyB').value.trim(),
    date: $('ndaDate').value,
    duration: $('duration').value,
    jurisdiction: $('jurisdiction').value.trim(),
    scope: $('scope').value.trim(),
  };
  $('preview').textContent = generateNDA(fields);
}

$('genBtn').addEventListener('click', render);
$('copyBtn').addEventListener('click', (e) => copyText($('preview').textContent, e.target));
$('downloadBtn').addEventListener('click', () => {
  const blob = new Blob([$('preview').textContent], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nda.txt'; a.click();
  URL.revokeObjectURL(a.href);
});

render();
