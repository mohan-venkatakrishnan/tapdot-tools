// ContractRead — plain-English contract summary via on-device AI (tapdotAI)

const $ = (id) => document.getElementById(id);

const SUMMARY_PROMPT = (text) => `You are summarising a legal contract for a non-lawyer.
Focus on: 1) Main obligations of each party 2) Payment terms 3) Termination conditions 4) Any unusual or risky clauses.
Use plain English, short sentences, and clear headings. Keep it under 300 words.

Contract text: """${text.slice(0, 6000)}"""`;

// Keyword clause scanner — a real fallback when on-device AI is off:
// finds sentences containing known risk-clause markers so the reader knows
// where to look, even without an AI-written summary.
const RISK_CLAUSES = [
  { label: 'Termination', re: /\bterminat\w*/i },
  { label: 'Auto-renewal', re: /\b(auto[- ]?renew\w*|automatic\w* renew\w*)/i },
  { label: 'Indemnification', re: /\bindemnif\w*/i },
  { label: 'Limitation of liability', re: /\b(limitation of liability|liabilit\w* (is|shall be) limited)/i },
  { label: 'Arbitration / dispute resolution', re: /\b(arbitrat\w*|dispute resolution)/i },
  { label: 'Non-compete / non-solicitation', re: /\bnon[- ]?(compete|solicit\w*)/i },
  { label: 'Confidentiality', re: /\bconfidential\w*/i },
  { label: 'Payment terms', re: /\b(payment|fees?|invoice\w*|late charge)/i },
  { label: 'Governing law', re: /\bgoverning law|jurisdiction\b/i },
  { label: 'Assignment', re: /\bassign\w* (this agreement|its rights)/i },
];

function clauseScan(text) {
  const sentences = text.split(/(?<=[.;])\s+/);
  const found = [];
  for (const { label, re } of RISK_CLAUSES) {
    const hits = sentences.filter(s => re.test(s)).slice(0, 2);
    if (hits.length) found.push({ label, hits });
  }
  if (!found.length) return 'No common risk-clause keywords found. That does not mean the contract is safe — read it in full.';
  return found.map(f =>
    `■ ${f.label.toUpperCase()}\n${f.hits.map(h => '  ' + h.trim().slice(0, 300)).join('\n')}`
  ).join('\n\n');
}

async function summarize() {
  const text = $('input').value.trim();
  const status = $('aiStatus');
  if (!text) { status.className = 'biz-ai-status fallback'; status.textContent = 'Paste some contract text first.'; return; }

  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    $('summary').textContent = clauseScan(text);
    showOutput('output');
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — showing a keyword scan of common risk clauses instead. Enable Chrome\'s built-in AI for a plain-English summary. Not legal advice.';
    return;
  }

  $('summarizeBtn').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Reading the contract…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(SUMMARY_PROMPT(text));
    if (session.destroy) session.destroy();
    $('summary').textContent = raw.trim();
    showOutput('output');
    status.className = 'biz-ai-status ok'; status.textContent = 'Summarised with on-device AI. This is not legal advice.';
  } catch (e) {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'Could not summarise — try again, or try a shorter excerpt.';
  } finally {
    $('summarizeBtn').disabled = false;
  }
}
$('summarizeBtn').addEventListener('click', summarize);
