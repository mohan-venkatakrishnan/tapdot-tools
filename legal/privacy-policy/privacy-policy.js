// PrivacyPolicyGen — GDPR/CCPA-aware policy from a template

const $ = (id) => document.getElementById(id);
const DATA_LABELS = { email: 'email address', name: 'name', usage: 'usage and analytics data', payment: 'payment information', location: 'approximate location data' };
let cookies = 'yes';

$('cookieTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.ts-segment-btn'); if (!b) return;
  document.querySelectorAll('#cookieTabs .ts-segment-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  cookies = b.dataset.c;
  render();
});

function fmtDate(d) {
  if (!d) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function generatePolicy(f) {
  const company = f.company || '[COMPANY]';
  const website = f.website || '[WEBSITE]';
  const dataList = f.dataTypes.length ? f.dataTypes.map(d => DATA_LABELS[d]).join(', ') : 'the information you voluntarily provide';
  const cookieSection = f.cookies === 'yes'
    ? `We use cookies and similar technologies to operate the Service, remember your preferences, and understand how the Service is used. You can control cookies through your browser settings; disabling them may affect functionality.`
    : `We do not use cookies to track you across the Service.`;
  const thirdPartySection = f.thirdParty
    ? `We share limited data with the following third-party service providers, solely to operate the Service: ${f.thirdParty}. Each provider is contractually obligated to protect your data and use it only for the stated purpose.`
    : `We do not share your data with third parties except as required by law.`;

  return `PRIVACY POLICY

Last updated: ${fmtDate(f.updated)}

1. INTRODUCTION
${company} ("we", "us", or "our") operates ${website} (the "Service"). This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.

2. INFORMATION WE COLLECT
We may collect the following categories of personal data: ${dataList}.

3. HOW WE USE YOUR INFORMATION
We use collected information to: provide and maintain the Service; communicate with you; improve and personalize the Service; detect and prevent fraud or abuse; and comply with legal obligations.

4. LEGAL BASIS FOR PROCESSING (GDPR)
Where the GDPR applies, we process your data based on: your consent; performance of a contract with you; our legitimate interests in operating and improving the Service; or compliance with a legal obligation.

5. COOKIES
${cookieSection}

6. THIRD-PARTY SERVICES
${thirdPartySection}

7. DATA RETENTION
We retain personal data only for as long as necessary to fulfill the purposes described in this policy, unless a longer retention period is required by law.

8. YOUR RIGHTS
Depending on your location, you may have the right to: access the personal data we hold about you; request correction or deletion of your data; object to or restrict certain processing; and request data portability. California residents have additional rights under the CCPA, including the right to opt out of the sale of personal information — we do not sell personal information.

9. DATA SECURITY
We implement reasonable technical and organizational measures to protect your data, but no method of transmission or storage is 100% secure.

10. CHILDREN'S PRIVACY
The Service is not directed to children under 13, and we do not knowingly collect personal data from children under 13.

11. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. We will post the updated policy on this page with a revised "Last updated" date.

12. CONTACT US
For questions about this Privacy Policy or to exercise your data rights, contact us at ${f.contact || '[CONTACT EMAIL]'}.`;
}

function render() {
  const dataTypes = [...document.querySelectorAll('#dataChecks input:checked')].map(i => i.dataset.d);
  const fields = {
    company: $('company').value.trim(), website: $('website').value.trim(),
    contact: $('contact').value.trim(), updated: $('updated').value,
    dataTypes, cookies, thirdParty: $('thirdParty').value.trim(),
  };
  $('preview').textContent = generatePolicy(fields);
}

$('genBtn').addEventListener('click', render);
$('copyBtn').addEventListener('click', (e) => copyText($('preview').textContent, e.target));
$('downloadBtn').addEventListener('click', () => {
  const blob = new Blob([$('preview').textContent], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'privacy-policy.txt'; a.click();
  URL.revokeObjectURL(a.href);
});

render();
