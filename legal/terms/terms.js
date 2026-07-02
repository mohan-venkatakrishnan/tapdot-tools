// TermsBuilder — basic Terms of Service from a template

const $ = (id) => document.getElementById(id);

function fmtDate(d) {
  if (!d) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function generateTerms(f) {
  const company = f.company || '[COMPANY]';
  const website = f.website || '[WEBSITE]';
  return `TERMS OF SERVICE

Last updated: ${fmtDate(f.updated)}

1. ACCEPTANCE OF TERMS
By accessing or using ${website} (the "Service"), operated by ${company}, you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.

2. ELIGIBILITY
You must be at least ${f.minAge || 13} years old to use the Service. By using the Service, you represent that you meet this requirement.

3. USER ACCOUNTS
If the Service requires an account, you are responsible for maintaining the confidentiality of your credentials and for all activity under your account.

4. PROHIBITED USES
You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to the Service or its systems; (c) interfere with or disrupt the Service; (d) reverse engineer or copy any part of the Service except as permitted by law; (e) upload malicious code or content that infringes another's rights.

5. INTELLECTUAL PROPERTY
The Service and its original content, features, and functionality are owned by ${company} and are protected by copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you any right to use ${company}'s trademarks or branding without prior written consent.

6. USER CONTENT
You retain ownership of any content you submit to the Service. By submitting content, you grant ${company} a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content solely for the purpose of operating and improving the Service.

7. DISCLAIMERS
THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

8. LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${company.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.

9. TERMINATION
${company} may suspend or terminate your access to the Service at any time, with or without cause, with or without notice.

10. CHANGES TO TERMS
${company} may modify these Terms at any time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.

11. GOVERNING LAW
These Terms shall be governed by the laws of ${f.jurisdiction || '[JURISDICTION]'}, without regard to conflict of law principles.

12. CONTACT
Questions about these Terms may be sent to ${f.contact || '[CONTACT EMAIL]'}.`;
}

function render() {
  const fields = {
    company: $('company').value.trim(),
    website: $('website').value.trim(),
    jurisdiction: $('jurisdiction').value.trim(),
    contact: $('contact').value.trim(),
    minAge: $('minAge').value,
    updated: $('updated').value,
  };
  $('preview').textContent = generateTerms(fields);
}

$('genBtn').addEventListener('click', render);
$('copyBtn').addEventListener('click', (e) => copyText($('preview').textContent, e.target));
$('downloadBtn').addEventListener('click', () => {
  const blob = new Blob([$('preview').textContent], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'terms-of-service.txt'; a.click();
  URL.revokeObjectURL(a.href);
});

render();
