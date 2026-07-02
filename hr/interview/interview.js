// InterviewKit — structured questions + rubric via on-device AI, with a
// generic fallback question bank when AI is unavailable

const $ = (id) => document.getElementById(id);

const FALLBACK_QUESTIONS = {
  technical: ['Walk me through a technical problem you solved recently.', 'What tools or approaches do you rely on most in this domain, and why?'],
  behavioural: ['Tell me about a time you disagreed with a decision. What did you do?', 'Describe a project that didn\'t go as planned. What did you learn?'],
  situational: ['How would you handle conflicting priorities from two stakeholders?', 'What would you do in your first 30 days in this role?'],
  culture: ['What kind of team environment helps you do your best work?', 'What matters most to you in your next role?'],
};
const FALLBACK_RUBRIC = ['1 — Does not meet expectations', '2 — Partially meets expectations', '3 — Meets expectations', '4 — Exceeds expectations', '5 — Significantly exceeds expectations'];

const PROMPT = (role, competencies) => `You are a hiring manager preparing an interview kit for a "${role}" role.
Key competencies to assess: ${competencies}.
Generate interview questions across 4 categories: technical, behavioural, situational, culture (2-3 questions each).
Also generate a 1-5 scoring rubric with a short descriptor for each score.
Respond with ONLY a JSON object with this shape:
{"technical":["..."],"behavioural":["..."],"situational":["..."],"culture":["..."],"rubric":["1 — ...","2 — ...","3 — ...","4 — ...","5 — ..."]}`;

function extractJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function renderKit(kit, isAI) {
  const CATS = { technical: 'Technical', behavioural: 'Behavioural', situational: 'Situational', culture: 'Culture fit' };
  const catCards = Object.entries(CATS).map(([key, label]) =>
    `<div class="ts-card"><p class="ts-card-label">${label}</p><ol style="padding-left:18px;font-size:14px;line-height:1.9">${(kit[key] || []).map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ol></div>`
  ).join('');
  const rubricCard = `<div class="ts-card"><p class="ts-card-label">Scoring rubric</p><ul style="padding-left:18px;font-size:14px;line-height:1.9">${(kit.rubric || []).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></div>`;
  $('output').innerHTML = catCards + rubricCard;
}

async function generate() {
  const role = $('role').value.trim() || 'this role';
  const competencies = $('competencies').value.trim() || 'general fit';
  const status = $('aiStatus');
  const avail = await tapdotAI.availability();
  if (avail === 'unavailable') {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'On-device AI unavailable — showing a generic question bank instead. Enable Chrome\'s built-in AI for role-specific questions.';
    renderKit({ ...FALLBACK_QUESTIONS, rubric: FALLBACK_RUBRIC }, false);
    return;
  }
  $('genBtn').disabled = true;
  status.className = 'biz-ai-status working'; status.textContent = 'Generating…';
  try {
    const session = await tapdotAI.createSession((p) => status.textContent = `Downloading model… ${p}%`);
    const raw = await session.prompt(PROMPT(role, competencies));
    if (session.destroy) session.destroy();
    const parsed = extractJson(raw);
    if (!parsed) throw new Error('unparseable');
    renderKit(parsed, true);
    status.className = 'biz-ai-status ok'; status.textContent = 'Generated with on-device AI.';
  } catch (e) {
    status.className = 'biz-ai-status fallback';
    status.textContent = 'Could not generate — showing a generic question bank instead.';
    renderKit({ ...FALLBACK_QUESTIONS, rubric: FALLBACK_RUBRIC }, false);
  } finally {
    $('genBtn').disabled = false;
  }
}
$('genBtn').addEventListener('click', generate);
