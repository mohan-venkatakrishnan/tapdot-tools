// ContractRead — plain-English contract summary via on-device AI (tapdotAI)

const $ = (id) => document.getElementById(id);

const SUMMARY_PROMPT = (text) => `You are summarising a legal contract for a non-lawyer.
Focus on: 1) Main obligations of each party 2) Payment terms 3) Termination conditions 4) Any unusual or risky clauses.
Use plain English, short sentences, and clear headings. Keep it under 300 words.

Contract text: """${text.slice(0, 6000)}"""`;

async function summarize() {
  const text = $('input').value.trim();
  const status = $('aiStatus');
  if (!text) { status.className = 'biz-ai-status fallback'; status.textContent = 'Paste some contract text first.'; return; }

  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI is not available in this browser. Enable Chrome\'s built-in AI (see BiasCheck for setup steps) to use ContractRead.';
    hideOutput('output');
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
