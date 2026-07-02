// OfferLetterBuilder — template-based offer letter, no AI

const $ = (id) => document.getElementById(id);
function fmtDate(d) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[DATE]'; }

function generateOffer(f) {
  const candidate = f.candidate || '[CANDIDATE NAME]';
  const company = f.company || '[COMPANY]';
  return `${fmtDate(new Date().toISOString().slice(0, 10))}

${candidate}

Dear ${candidate.split(' ')[0] || candidate},

We are delighted to offer you the position of ${f.role || '[ROLE]'} at ${company}. We were impressed by your background and are excited about the contribution you will make to our team.

POSITION DETAILS
Role: ${f.role || '[ROLE]'}
Reporting to: ${f.manager || '[MANAGER]'}
Location: ${f.location || '[LOCATION]'}
Start date: ${fmtDate(f.startDate)}

COMPENSATION
Your starting annual salary will be ${f.salary || '[SALARY]'}, paid in accordance with our standard payroll schedule. You will also be eligible for our standard benefits package, details of which will be provided separately.

CONDITIONS
This offer is contingent upon successful completion of any required background checks and verification of your eligibility to work. This is an at-will offer of employment; either you or ${company} may terminate the employment relationship at any time, with or without cause or notice, subject to applicable law.

ACCEPTANCE
Please indicate your acceptance of this offer by signing below and returning this letter by ${fmtDate(f.expiry)}. We are excited about the possibility of you joining our team.

Sincerely,

_______________________
${f.manager || '[HIRING MANAGER]'}
${company}


ACCEPTED:

_______________________          Date: _______________
${candidate}`;
}

function render() {
  const fields = {
    candidate: $('candidate').value.trim(), role: $('role').value.trim(), company: $('company').value.trim(),
    manager: $('manager').value.trim(), startDate: $('startDate').value, location: $('location').value.trim(),
    salary: $('salary').value.trim(), expiry: $('expiry').value,
  };
  $('preview').textContent = generateOffer(fields);
}

$('genBtn').addEventListener('click', render);
$('copyBtn').addEventListener('click', (e) => copyText($('preview').textContent, e.target));
$('downloadBtn').addEventListener('click', () => {
  const blob = new Blob([$('preview').textContent], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'offer-letter.txt'; a.click();
  URL.revokeObjectURL(a.href);
});

render();
